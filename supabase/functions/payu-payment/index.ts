import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateHash(params: Record<string, string>, salt: string): string {
  // PayU hash formula: sha512(key|txnid|amount|productinfo|firstname|email|||||||||||salt)
  const hashString = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|||||||||||${salt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  // Use SubtleCrypto for SHA-512
  return hashString; // placeholder, actual hash done async below
}

async function sha512(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const merchantKey = Deno.env.get("PAYU_MERCHANT_KEY")!;
  const salt = Deno.env.get("PAYU_SALT_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // ─── INITIATE PAYMENT ─────────────────────────────────────────────
    if (req.method === "POST" && path !== "callback" && path !== "webhook") {
      const { amount, userId, returnUrl } = await req.json();

      if (!amount || !userId) {
        return new Response(
          JSON.stringify({ error: "amount and userId required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user details for PayU
      const { data: profile } = await supabase
        .from("male_profiles")
        .select("full_name, phone")
        .eq("user_id", userId)
        .maybeSingle();

      // Get user email
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email || "user@meowmeow.app";
      const firstname = profile?.full_name || "User";
      const phone = profile?.phone || "";

      const txnid = `MEOW_${userId.substring(0, 8)}_${Date.now()}`;
      const productinfo = "Wallet Recharge";

      // Create pending recharge record
      const { error: insertErr } = await supabase
        .from("pending_recharges")
        .insert({
          txn_id: txnid,
          user_id: userId,
          amount: Number(amount),
          gateway: "payu",
          status: "pending",
        });

      if (insertErr) {
        console.error("Failed to create pending recharge:", insertErr);
      }

      // Generate PayU hash
      const hashString = `${merchantKey}|${txnid}|${amount}.00|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
      const hash = await sha512(hashString);

      // PayU payment form data
      const payuBaseUrl = "https://secure.payu.in/_payment"; // Production
      // For test: "https://test.payu.in/_payment"

      const surl = `${supabaseUrl}/functions/v1/payu-payment/callback`;
      const furl = `${supabaseUrl}/functions/v1/payu-payment/callback`;

      const paymentData = {
        key: merchantKey,
        txnid,
        amount: `${Number(amount).toFixed(2)}`,
        productinfo,
        firstname,
        email,
        phone,
        surl,
        furl,
        hash,
        // PayU production URL
        payuUrl: payuBaseUrl,
      };

      return new Response(JSON.stringify({ success: true, paymentData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CALLBACK (Success/Failure from PayU) ─────────────────────────
    if (path === "callback") {
      let params: Record<string, string> = {};

      if (req.method === "POST") {
        const formData = await req.formData();
        formData.forEach((value, key) => {
          params[key] = value.toString();
        });
      }

      const { txnid, status, hash: receivedHash, mihpayid, amount } = params;

      console.log("[PayU Callback]", { txnid, status, mihpayid, amount });

      if (status === "success" && txnid) {
        // Verify reverse hash: sha512(salt|status||||||||||||||email|firstname|productinfo|amount|txnid|key)
        const reverseHashString = `${salt}|${status}|||||||||||${params.email || ""}|${params.firstname || ""}|${params.productinfo || ""}|${amount}|${txnid}|${merchantKey}`;
        const calculatedHash = await sha512(reverseHashString);

        if (calculatedHash === receivedHash) {
          // Valid payment — credit wallet
          const { data: pending } = await supabase
            .from("pending_recharges")
            .select("user_id, amount, status")
            .eq("txn_id", txnid)
            .maybeSingle();

          if (pending && pending.status === "pending") {
            // Credit wallet using atomic RPC
            const { error: creditErr } = await supabase.rpc("atomic_wallet_credit", {
              p_user_id: pending.user_id,
              p_amount: pending.amount,
              p_type: "recharge",
              p_description: `PayU Recharge - ${mihpayid}`,
              p_reference_id: txnid,
            });

            if (!creditErr) {
              await supabase
                .from("pending_recharges")
                .update({ status: "completed", gateway_txn_id: mihpayid })
                .eq("txn_id", txnid);

              console.log(`[PayU] Wallet credited ₹${pending.amount} for user ${pending.user_id}`);
            } else {
              console.error("[PayU] Credit failed:", creditErr);
              await supabase
                .from("pending_recharges")
                .update({ status: "credit_failed", gateway_txn_id: mihpayid })
                .eq("txn_id", txnid);
            }
          }
        } else {
          console.error("[PayU] Hash mismatch — possible tampering!", { txnid });
          await supabase
            .from("pending_recharges")
            .update({ status: "hash_mismatch" })
            .eq("txn_id", txnid);
        }
      } else if (txnid) {
        // Failed/cancelled
        await supabase
          .from("pending_recharges")
          .update({ status: "failed" })
          .eq("txn_id", txnid);
      }

      // Redirect user back to wallet page
      const appUrl = req.headers.get("origin") || "https://meowmeow123.lovable.app";
      const redirectUrl = `${appUrl}/wallet?payment=${status === "success" ? "success" : "failed"}&txnid=${txnid || ""}`;

      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[PayU Error]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
