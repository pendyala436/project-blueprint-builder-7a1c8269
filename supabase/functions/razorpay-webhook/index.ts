// Razorpay webhook: server-to-server payment confirmation as a safety net in
// case the browser-side verify call doesn't reach us (network drop, app close).
// Credits via ledger_recharge — idempotent on (user_id, payment_id).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const enc = new TextEncoder();

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SECRET || !SUPABASE_URL || !SERVICE_ROLE) {
    return new Response("Server not configured", { status: 500 });
  }

  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const raw = await req.text();
  const expected = await hmacSha256Hex(SECRET, raw);
  if (expected !== signature) {
    console.warn("[razorpay-webhook] invalid signature");
    return new Response("Invalid signature", { status: 400 });
  }

  let evt: any;
  try { evt = JSON.parse(raw); } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const event = String(evt.event ?? "");
  if (event !== "payment.captured" && event !== "order.paid") {
    return new Response("ignored", { status: 200 });
  }

  const payment = evt.payload?.payment?.entity;
  if (!payment) return new Response("No payment entity", { status: 200 });

  const userId = payment.notes?.user_id;
  const amountINR = Number(payment.amount) / 100;
  const paymentId = payment.id as string;
  if (!userId || !Number.isFinite(amountINR) || amountINR <= 0 || !paymentId) {
    return new Response("Missing fields", { status: 200 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error } = await admin.rpc("ledger_recharge", {
    p_user_id: userId,
    p_amount: amountINR,
    p_gateway: "razorpay",
    p_gateway_txn_id: paymentId,
    p_description: `Razorpay webhook ${event} ${paymentId}`,
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("duplicate") || msg.toLowerCase().includes("already")) {
      return new Response("already credited", { status: 200 });
    }
    console.error("[razorpay-webhook] ledger_recharge failed", msg);
    return new Response("ledger error", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
