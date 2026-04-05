import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cashfreeAppId = Deno.env.get("CASHFREE_APP_ID")!;
  const cashfreeSecretKey = Deno.env.get("CASHFREE_SECRET_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Production base URL
  const CASHFREE_BASE = "https://api.cashfree.com/pg";

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // ─── CREATE ORDER ─────────────────────────────────────────────
    if (req.method === "POST" && path !== "webhook" && path !== "verify") {
      const body = await req.json();
      const { amount, userId, returnUrl } = body;

      if (!amount || !userId || typeof amount !== "number" || amount < 1) {
        return new Response(
          JSON.stringify({ error: "Valid amount and userId required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Add 3% transaction fee on top of recharge amount
      const TRANSACTION_FEE_RATE = 0.03;
      const feeAmount = Math.round(amount * TRANSACTION_FEE_RATE * 100) / 100;
      const totalCharged = Math.round((amount + feeAmount) * 100) / 100;

      // Men pay totalCharged (amount + 3% fee), but only 'amount' is credited to wallet
      console.log(`[Cashfree] Recharge ₹${amount} + 3% fee ₹${feeAmount} = Total ₹${totalCharged}`);
      }

      // Get user details
      const { data: profile } = await supabase
        .from("male_profiles")
        .select("full_name, phone")
        .eq("user_id", userId)
        .maybeSingle();

      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email || "user@meowmeow.app";
      const customerName = profile?.full_name || "User";
      const customerPhone = profile?.phone || "9999999999";

      const orderId = `MEOW_${userId.substring(0, 8)}_${Date.now()}`;

      // Create pending recharge record (store wallet credit amount, not total charged)
      await supabase.from("pending_recharges").insert({
        txn_id: orderId,
        user_id: userId,
        amount: Number(amount),  // Only the wallet credit amount
        gateway: "cashfree",
        status: "pending",
      });

      // Create Cashfree order with total amount (recharge + 3% fee)
      const orderPayload = {
        order_id: orderId,
        order_amount: totalCharged.toFixed(2),  // Men pay amount + 3% fee
        order_currency: "INR",
        customer_details: {
          customer_id: userId.substring(0, 50),
          customer_name: customerName.substring(0, 100),
          customer_email: email,
          customer_phone: customerPhone.replace(/[^0-9]/g, "").substring(0, 10) || "9999999999",
        },
        order_meta: {
          return_url: returnUrl || "https://meowmeow123.lovable.app/dashboard?payment={order_status}&order_id={order_id}",
        },
      };

      console.log("[Cashfree] Creating order:", orderId, "amount:", amount);

      const cfResponse = await fetch(`${CASHFREE_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2023-08-01",
          "x-client-id": cashfreeAppId,
          "x-client-secret": cashfreeSecretKey,
        },
        body: JSON.stringify(orderPayload),
      });

      const cfData = await cfResponse.json();

      if (!cfResponse.ok || !cfData.payment_session_id) {
        console.error("[Cashfree] Order creation failed:", cfData);
        await supabase
          .from("pending_recharges")
          .update({ status: "creation_failed" })
          .eq("txn_id", orderId);

        return new Response(
          JSON.stringify({ error: "Failed to create payment order", details: cfData.message || cfData }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[Cashfree] Order created:", orderId, "session:", cfData.payment_session_id);

      return new Response(
        JSON.stringify({
          success: true,
          orderId,
          paymentSessionId: cfData.payment_session_id,
          cfOrderId: cfData.cf_order_id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── VERIFY ORDER STATUS ─────────────────────────────────────────
    if (req.method === "POST" && path === "verify") {
      const { orderId } = await req.json();

      if (!orderId) {
        return new Response(
          JSON.stringify({ error: "orderId required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get order status from Cashfree
      const cfResponse = await fetch(`${CASHFREE_BASE}/orders/${orderId}`, {
        method: "GET",
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": cashfreeAppId,
          "x-client-secret": cashfreeSecretKey,
        },
      });

      const cfData = await cfResponse.json();
      console.log("[Cashfree] Order status for", orderId, ":", cfData.order_status);

      const orderStatus = cfData.order_status; // PAID, ACTIVE, EXPIRED, etc.

      if (orderStatus === "PAID") {
        // Check pending recharge
        const { data: pending } = await supabase
          .from("pending_recharges")
          .select("user_id, amount, status")
          .eq("txn_id", orderId)
          .maybeSingle();

        if (pending && pending.status === "pending") {
          // Credit wallet atomically
          const { error: creditErr } = await supabase.rpc("atomic_wallet_credit", {
            p_user_id: pending.user_id,
            p_amount: pending.amount,
            p_type: "recharge",
            p_description: `Cashfree Recharge - ${cfData.cf_order_id || orderId}`,
            p_reference_id: orderId,
          });

          if (!creditErr) {
            await supabase
              .from("pending_recharges")
              .update({ status: "completed", gateway_txn_id: cfData.cf_order_id?.toString() || "" })
              .eq("txn_id", orderId);

            console.log(`[Cashfree] Wallet credited ₹${pending.amount} for user ${pending.user_id}`);

            return new Response(
              JSON.stringify({ success: true, status: "PAID", credited: true, amount: pending.amount }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            console.error("[Cashfree] Credit failed:", creditErr);
            await supabase
              .from("pending_recharges")
              .update({ status: "credit_failed", gateway_txn_id: cfData.cf_order_id?.toString() || "" })
              .eq("txn_id", orderId);

            return new Response(
              JSON.stringify({ success: false, status: "PAID", credited: false, error: "Credit failed" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else if (pending?.status === "completed") {
          return new Response(
            JSON.stringify({ success: true, status: "PAID", credited: true, amount: pending.amount, alreadyCredited: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (orderStatus === "EXPIRED" || orderStatus === "TERMINATED" || orderStatus === "VOID") {
        await supabase
          .from("pending_recharges")
          .update({ status: "failed" })
          .eq("txn_id", orderId)
          .eq("status", "pending");

        return new Response(
          JSON.stringify({ success: false, status: orderStatus, credited: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ACTIVE or other status = still pending
      return new Response(
        JSON.stringify({ success: false, status: orderStatus || "UNKNOWN", credited: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Cashfree Error]", err);
    return new Response(JSON.stringify({ error: "Internal server error", timestamp: new Date().toISOString() }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
