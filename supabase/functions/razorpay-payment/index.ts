// Razorpay payment edge function: creates an order, and on /verify validates
// signature and credits the wallet via the canonical ledger_recharge RPC (SoT).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const enc = new TextEncoder();

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
  const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!KEY_ID || !KEY_SECRET || !SUPABASE_URL || !SERVICE_ROLE) {
    return json({ success: false, error: "Server not configured" }, 500);
  }

  const url = new URL(req.url);
  const isVerify = url.pathname.endsWith("/verify");

  // Auth: use the caller's JWT to identify the user (anon key client + Authorization header).
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }
  const callerId = userData.user.id;

  // Service-role client for trusted DB writes (bypasses RLS).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  // ---------- VERIFY ----------
  if (isVerify) {
    const orderId = String(body.razorpay_order_id ?? "");
    const paymentId = String(body.razorpay_payment_id ?? "");
    const signature = String(body.razorpay_signature ?? "");
    if (!orderId || !paymentId || !signature) {
      return json({ credited: false, error: "Missing verify fields" }, 400);
    }

    const expected = await hmacSha256Hex(KEY_SECRET, `${orderId}|${paymentId}`);
    if (expected !== signature) {
      return json({ credited: false, error: "Invalid signature" }, 400);
    }

    // Fetch order to learn the amount + verify it's PAID (defence in depth).
    const auth = "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`);
    const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      headers: { Authorization: auth },
    });
    if (!orderRes.ok) {
      return json({ credited: false, error: "Order lookup failed" }, 502);
    }
    const order = await orderRes.json() as {
      amount: number; status: string; notes?: { user_id?: string };
    };
    if (order.status !== "paid") {
      return json({ credited: false, status: order.status, error: "Order not paid" }, 400);
    }
    if (order.notes?.user_id && order.notes.user_id !== callerId) {
      return json({ credited: false, error: "User mismatch" }, 403);
    }

    const amountINR = Number(order.amount) / 100;
    if (!Number.isFinite(amountINR) || amountINR <= 0) {
      return json({ credited: false, error: "Invalid order amount" }, 400);
    }

    // Idempotency: ledger_recharge stores p_gateway_txn_id; same paymentId twice = no-op.
    const { error: rpcErr } = await admin.rpc("ledger_recharge", {
      p_user_id: callerId,
      p_amount: amountINR,
      p_gateway: "razorpay",
      p_gateway_txn_id: paymentId,
      p_description: `Razorpay recharge ${paymentId}`,
    });
    if (rpcErr) {
      // If it's a duplicate-key (already credited) treat as success.
      const msg = rpcErr.message || "";
      const dup = msg.includes("duplicate") || msg.toLowerCase().includes("already");
      if (dup) return json({ credited: false, alreadyCredited: true, status: "PAID", amount: amountINR });
      return json({ credited: false, error: msg }, 500);
    }

    return json({ credited: true, amount: amountINR, paymentId });
  }

  // ---------- CREATE ORDER ----------
  const amount = Number(body.amount);
  const userId = String(body.userId ?? "");
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
    return json({ success: false, error: "Invalid amount (1 - 100000 INR)" }, 400);
  }
  if (!userId || userId !== callerId) {
    return json({ success: false, error: "User mismatch" }, 403);
  }

  const auth = "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`);
  const receipt = `wal_${callerId.slice(0, 8)}_${Date.now()}`.slice(0, 40);
  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt,
      notes: { user_id: callerId, purpose: "wallet_recharge" },
    }),
  });
  if (!orderRes.ok) {
    const errTxt = await orderRes.text();
    console.error("[razorpay] order create failed", orderRes.status, errTxt);
    return json({ success: false, error: "Failed to create Razorpay order" }, 502);
  }
  const order = await orderRes.json() as { id: string };
  return json({ success: true, orderId: order.id, keyId: KEY_ID, amount });
});
