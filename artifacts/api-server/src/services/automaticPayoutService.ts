import Pi from "pi-backend";

type PayoutResult = { status: "completed" | "failed" | "recovered"; paymentId?: string; txid?: string; error?: string };

function config() { const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url: url.replace(/\/$/, ""), key } : null; }
async function sb(path: string, init: RequestInit = {}) { const c = config(); if (!c) return null; const h = new Headers(init.headers); h.set("apikey", c.key); h.set("Content-Type", "application/json"); h.set("Prefer", h.get("Prefer") || "return=representation"); if (c.key.startsWith("eyJ")) h.set("Authorization", `Bearer ${c.key}`); return fetch(`${c.url}/rest/v1/${path}`, { ...init, headers: h }); }

export async function executeAutomaticProviderPayout(bookingId: string): Promise<PayoutResult> {
  if (!config()) return { status: "failed", error: "Supabase server credentials are missing." };
  const bres = await sb(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,status,escrow_status,price_pi,provider_payout_pi,provider_id`);
  if (!bres?.ok) return { status: "failed", error: `Booking lookup failed${bres ? ` (${bres.status})` : ""}.` };
  const booking = (await bres.json())[0];
  if (!booking) return { status: "failed", error: "Booking not found." };
  if (booking.escrow_status === "released") return { status: "recovered" };
  if (booking.escrow_status !== "completion_confirmed") return { status: "failed", error: "Booking is not ready for payout." };

  const pres = await sb(`providers?id=eq.${encodeURIComponent(booking.provider_id || "")}&select=id,pi_uid,pi_wallet_address&limit=1`);
  if (!pres?.ok) return { status: "failed", error: `Provider lookup failed${pres ? ` (${pres.status})` : ""}.` };
  const provider = (await pres.json())[0];
  const uid = String(provider?.pi_uid || "").trim();
  const wallet = String(provider?.pi_wallet_address || "").trim();
  if (!uid) return { status: "failed", error: "Provider Pi UID is missing." };
  if (!wallet) return { status: "failed", error: "Provider public Pi wallet address is missing." };

  const amount = Number(booking.provider_payout_pi ?? Number(booking.price_pi || 0) * 0.9);
  if (!Number.isFinite(amount) || amount <= 0) return { status: "failed", error: "Provider payout amount is invalid." };

  const existingRes = await sb(`payouts?booking_id=eq.${encodeURIComponent(bookingId)}&select=id,status,pi_payment_id,pi_txid,failure_reason&limit=1`);
  if (!existingRes?.ok) return { status: "failed", error: "Payout lookup failed." };
  const existing = (await existingRes.json())[0];
  if (existing?.status === "completed") return reconcile(bookingId, existing.pi_payment_id, existing.pi_txid);
  if (existing && ["pending", "submitted"].includes(existing.status)) return { status: "failed", error: existing.failure_reason || "A payout is already unresolved for this booking.", paymentId: existing.pi_payment_id, txid: existing.pi_txid };

  const ins = await sb("payouts", { method: "POST", body: JSON.stringify({ booking_id: bookingId, provider_id: provider.id, amount_pi: amount, provider_wallet_address: wallet, status: "pending" }) });
  if (!ins?.ok) return { status: "failed", error: "Failed to create payout record." };
  const payout = (await ins.json())[0];
  const fail = async (error: string, paymentId?: string, txid?: string): Promise<PayoutResult> => { await sb(`payouts?id=eq.${encodeURIComponent(payout.id)}`, { method: "PATCH", body: JSON.stringify({ status: "failed", failure_reason: error, pi_payment_id: paymentId || null, pi_txid: txid || null }) }).catch(() => undefined); return { status: "failed", error, paymentId, txid }; };

  const apiKey = process.env.PI_API_KEY?.trim();
  const seed = (process.env.PI_WALLET_PRIVATE_SEED || process.env.PI_PRIVATE_SEED || "").trim();
  if (!apiKey) return fail("PI_API_KEY is missing.");
  if (!seed) return fail("Pi app wallet private seed is missing.");

  try {
    Pi.init({ apiKey, walletPrivateSeed: seed });
    const payment: any = await Pi.createPayment({ amount, memo: `Escrow payout for booking ${bookingId}`, metadata: { bookingId, type: "provider_payout", providerWallet: wallet }, uid });
    const paymentId = payment.identifier || payment.id;
    const paymentWallet = String(payment.to_address || payment.toAddress || "").trim();
    if (!paymentId) return fail("Pi did not return a payment identifier.");
    if (paymentWallet && paymentWallet !== wallet) return fail("Pi payment destination does not match the provider's registered wallet.", paymentId);
    const txid = await Pi.submitPayment(paymentId);
    const tx = typeof txid === "string" ? txid : (txid as any)?.txid;
    if (!tx) return fail("Pi did not return a transaction ID.", paymentId);
    await sb(`payouts?id=eq.${encodeURIComponent(payout.id)}`, { method: "PATCH", body: JSON.stringify({ status: "submitted", pi_payment_id: paymentId, pi_txid: tx }) });
    await Pi.completePayment(paymentId, tx);
    await sb(`payouts?id=eq.${encodeURIComponent(payout.id)}`, { method: "PATCH", body: JSON.stringify({ status: "completed", pi_payment_id: paymentId, pi_txid: tx, failure_reason: null, completed_at: new Date().toISOString() }) });
    return reconcile(bookingId, paymentId, tx);
  } catch (e: any) { return fail(e?.message || "Automatic Pi payout failed."); }
}

async function reconcile(bookingId: string, paymentId?: string, txid?: string): Promise<PayoutResult> {
  const now = new Date().toISOString();
  const r = await sb(`bookings?id=eq.${encodeURIComponent(bookingId)}&escrow_status=eq.completion_confirmed`, { method: "PATCH", body: JSON.stringify({ status: "Completed", escrow_status: "released", released_at: now, updated_at: now }) });
  if (!r?.ok) return { status: "failed", error: "Payout succeeded but booking release update failed.", paymentId, txid };
  return { status: "completed", paymentId, txid };
}
