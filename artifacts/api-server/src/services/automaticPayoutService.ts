/**
 * Server-side App-to-User (A2U) provider payout after completion confirmation.
 * The booking's stored provider_payout_pi is authoritative; otherwise use the configured 90/10 split.
 */
async function createPiClient(apiKey: string, walletPrivateSeed: string) {
  const mod: any = await import("pi-backend");
  let PiNetworkClass = mod?.default ?? mod;
  if (PiNetworkClass && typeof PiNetworkClass !== "function" && typeof PiNetworkClass.default === "function") PiNetworkClass = PiNetworkClass.default;
  if (typeof PiNetworkClass !== "function") throw new Error("pi-backend PiNetwork constructor is not available.");
  return new PiNetworkClass(apiKey, walletPrivateSeed);
}
type PayoutResult = { status: "completed" | "failed" | "recovered"; paymentId?: string; txid?: string; error?: string };
function config() { const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url: url.replace(/\/$/, ""), key } : null; }
async function sb(path: string, init: RequestInit = {}) { const c = config(); if (!c) return null; const h = new Headers(init.headers); h.set("apikey", c.key); h.set("Content-Type", "application/json"); h.set("Prefer", h.get("Prefer") || "return=representation"); if (c.key.startsWith("eyJ")) h.set("Authorization", `Bearer ${c.key}`); return fetch(`${c.url}/rest/v1/${path}`, { ...init, headers: h }); }
export async function executeAutomaticProviderPayout(bookingId: string): Promise<PayoutResult> {
  if (!config()) return { status: "failed", error: "Supabase server credentials are missing." };
  const bres = await sb(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,status,escrow_status,price_pi,platform_fee_pi,provider_payout_pi,provider_id`);
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
  const price = Number(booking.price_pi || 0);
  const amount = Number(booking.provider_payout_pi ?? (price * 0.9).toFixed(7));
  const platformFee = Number(booking.platform_fee_pi ?? (price - amount).toFixed(7));
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(platformFee) || platformFee < 0 || amount + platformFee > price + 0.0000001) return { status: "failed", error: "Stored payout split is invalid." };
  const existingRes = await sb(`payouts?booking_id=eq.${encodeURIComponent(bookingId)}&select=id,status,pi_payment_id,pi_txid&limit=1`);
  if (existingRes?.ok) {
    const existing = (await existingRes.json())[0];
    if (existing?.status === "completed") return { status: "recovered", paymentId: existing.pi_payment_id, txid: existing.pi_txid };
  }
  const apiKey = process.env.PI_API_KEY?.trim();
  const seed = (process.env.PI_WALLET_PRIVATE_SEED || process.env.PI_PRIVATE_SEED || "").trim();
  if (!apiKey) return { status: "failed", error: "PI_API_KEY is missing." };
  if (!seed) return { status: "failed", error: "Pi app wallet private seed is missing." };
  let paymentId = ""; let txid = "";
  try {
    const pi = await createPiClient(apiKey, seed);
    const payment: any = await pi.createPayment({ amount, memo: `Escrow payout for booking ${bookingId}`, metadata: { bookingId, type: "provider_payout", providerWallet: wallet, platformFeePi: platformFee }, uid });
    paymentId = String(typeof payment === "string" ? payment : (payment?.identifier || payment?.id || ""));
    if (!paymentId) return { status: "failed", error: "Pi did not return a payout payment identifier." };
    const submitted = await pi.submitPayment(paymentId);
    txid = typeof submitted === "string" ? submitted : String((submitted as any)?.txid || (submitted as any)?.transaction?.txid || "");
    if (!txid) return { status: "failed", paymentId, error: "Pi did not return a payout transaction ID." };
    await pi.completePayment(paymentId, txid);
    const now = new Date().toISOString();
    const payoutInsert = await sb("payouts", { method: "POST", body: JSON.stringify({ booking_id: bookingId, provider_id: booking.provider_id, amount_pi: amount, status: "completed", pi_payment_id: paymentId, pi_txid: txid, provider_wallet_address: wallet, completed_at: now }) });
    if (!payoutInsert?.ok) {
      const body = await payoutInsert?.text().catch(() => "");
      if (!body.includes("duplicate") && !body.includes("23505")) throw new Error(`Payout record could not be saved (${payoutInsert?.status || "unknown"}).`);
    }
    const bookingUpdate = await sb(`bookings?id=eq.${encodeURIComponent(bookingId)}&escrow_status=eq.completion_confirmed`, { method: "PATCH", body: JSON.stringify({ escrow_status: "released", status: "Completed", payout_tx_hash: txid, released_at: now, updated_at: now, platform_fee_pi: platformFee, provider_payout_pi: amount }) });
    if (!bookingUpdate?.ok) throw new Error("Payout succeeded but booking release record could not be finalized.");
    return { status: "completed", paymentId, txid };
  } catch (e: any) {
    return { status: "failed", paymentId: paymentId || undefined, txid: txid || undefined, error: e?.message || "Automatic Pi A2U payout failed." };
  }
}
