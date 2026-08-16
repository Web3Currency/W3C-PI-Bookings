import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const config = getSupabaseConfig();
  if (!config) return null;
  const headers = new Headers(init.headers);
  headers.set("apikey", config.key);
  headers.set("Content-Type", "application/json");
  if (config.key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${config.key}`);
  return fetch(`${config.url}/rest/v1/${path}`, { ...init, headers });
}

async function getProviderByPiUid(piUid: string) {
  const response = await supabaseRequest(`providers?select=id,pi_uid&pi_uid=eq.${encodeURIComponent(piUid)}&limit=1`);
  if (response) {
    if (!response.ok) throw new Error(`Supabase provider lookup failed (${response.status}).`);
    const rows = (await response.json()) as Array<{ id: string; pi_uid: string }>;
    return rows[0] || null;
  }
  if (!pool) return null;
  const result = await pool.query(`SELECT id, pi_uid FROM public.providers WHERE pi_uid = $1 LIMIT 1`, [piUid]);
  return result.rows[0] || null;
}

async function updateBookingViaSupabase(bookingId: string, providerId: string, updates: Record<string, unknown>) {
  const response = await supabaseRequest(
    `bookings?id=eq.${encodeURIComponent(bookingId)}&provider_id=eq.${encodeURIComponent(providerId)}`,
    { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(updates) },
  );
  if (!response) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Supabase booking update failed (${response.status}).`);
  }
  return (await response.json()) as any[];
}

async function verifyPiAccessToken(accessToken: string) {
  const piResponse = await fetch("https://api.minepi.com/v2/me", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken.trim()}` },
  });
  if (!piResponse.ok) return null;
  const piUser = (await piResponse.json()) as { uid?: string; username?: string };
  return piUser.uid ? piUser : null;
}

function normalizePiUsername(username?: string | null) {
  return String(username || "").trim().replace(/^@+/, "").toLowerCase();
}

router.post("/pi/bookings/:bookingId/accept", async (req, res) => {
  const bookingId = req.params.bookingId;
  const { accessToken } = req.body as { accessToken?: string };
  if (!bookingId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) return void res.status(400).json({ error: "A valid bookingId is required." });
  if (!accessToken || typeof accessToken !== "string" || accessToken.trim() === "") return void res.status(401).json({ error: "Pi access token is required." });
  try {
    const piUser = await verifyPiAccessToken(accessToken);
    if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const provider = await getProviderByPiUid(piUser.uid);
    if (!provider) return void res.status(403).json({ error: "No provider profile is linked to this Pi account." });
    const supabaseRows = await updateBookingViaSupabase(bookingId, provider.id, { status: "In Progress", updated_at: new Date().toISOString() });
    if (supabaseRows) {
      if (supabaseRows.length === 0) return void res.status(409).json({ error: "Booking is not available for acceptance or is not assigned to this provider." });
      return void res.json({ success: true, booking: supabaseRows[0] });
    }
    if (!pool) return void res.status(500).json({ error: "Booking database connection is not configured on the API server." });
    const result = await pool.query(`UPDATE public.bookings AS b SET status = 'In Progress', updated_at = NOW() WHERE b.id = $1 AND b.provider_id = $2 AND b.status IN ('Pending', 'Confirmed') AND b.escrow_status = 'paid_escrowed' RETURNING b.id, b.status, b.escrow_status, b.provider_id, b.updated_at`, [bookingId, provider.id]);
    if (result.rowCount === 0) return void res.status(409).json({ error: "Booking is not available for acceptance or is not assigned to this provider." });
    return void res.json({ success: true, booking: result.rows[0] });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "Provider booking acceptance failed");
    return void res.status(500).json({ error: err?.message || "Failed to accept booking." });
  }
});

router.post("/pi/bookings/:bookingId/reject", async (req, res) => {
  const bookingId = req.params.bookingId;
  const { accessToken, rejectionReason, payoutTxHash } = req.body as { accessToken?: string; rejectionReason?: string; payoutTxHash?: string };
  if (!bookingId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) return void res.status(400).json({ error: "A valid bookingId is required." });
  if (!accessToken || typeof accessToken !== "string" || accessToken.trim() === "") return void res.status(401).json({ error: "Pi access token is required." });
  if (!rejectionReason || rejectionReason.trim() === "") return void res.status(400).json({ error: "A rejection reason is required." });
  try {
    const piUser = await verifyPiAccessToken(accessToken);
    if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const provider = await getProviderByPiUid(piUser.uid);
    if (!provider) return void res.status(403).json({ error: "No provider profile is linked to this Pi account." });
    const updates = { status: "Cancelled", escrow_status: "refunded", rejection_reason: rejectionReason.trim(), refunded_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...(payoutTxHash ? { payout_tx_hash: payoutTxHash } : {}) };
    const supabaseRows = await updateBookingViaSupabase(bookingId, provider.id, updates);
    if (supabaseRows) {
      if (supabaseRows.length === 0) return void res.status(409).json({ error: "Booking is not available for rejection or is not assigned to this provider." });
      return void res.json({ success: true, booking: supabaseRows[0] });
    }
    if (!pool) return void res.status(500).json({ error: "Booking database connection is not configured on the API server." });
    const result = await pool.query(`UPDATE public.bookings AS b SET status = 'Cancelled', escrow_status = 'refunded', rejection_reason = $3, refunded_at = NOW(), updated_at = NOW(), payout_tx_hash = COALESCE($4, payout_tx_hash) WHERE b.id = $1 AND b.provider_id = $2 AND b.status IN ('Pending', 'Confirmed') AND b.escrow_status = 'paid_escrowed' RETURNING b.id, b.status, b.escrow_status, b.provider_id, b.updated_at`, [bookingId, provider.id, rejectionReason.trim(), payoutTxHash || null]);
    if (result.rowCount === 0) return void res.status(409).json({ error: "Booking is not available for rejection or is not assigned to this provider." });
    return void res.json({ success: true, booking: result.rows[0] });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "Provider booking rejection failed");
    return void res.status(500).json({ error: err?.message || "Failed to reject booking." });
  }
});

router.post("/pi/bookings/:bookingId/complete", async (req, res) => {
  const bookingId = req.params.bookingId;
  const { accessToken } = req.body as { accessToken?: string };
  if (!bookingId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) return void res.status(400).json({ error: "A valid bookingId is required." });
  if (!accessToken || typeof accessToken !== "string" || accessToken.trim() === "") return void res.status(401).json({ error: "Pi access token is required." });
  try {
    const piUser = await verifyPiAccessToken(accessToken);
    if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const clientUid = piUser.uid;
    const now = new Date().toISOString();
    const supabaseResponse = await supabaseRequest(`bookings?id=eq.${encodeURIComponent(bookingId)}&status=eq.In%20Progress&escrow_status=eq.paid_escrowed&select=id,client_pi_uid,customer_pi_username,status,escrow_status`, { method: "GET" });
    if (supabaseResponse) {
      if (!supabaseResponse.ok) { const text = await supabaseResponse.text().catch(() => ""); throw new Error(text || `Supabase booking lookup failed (${supabaseResponse.status}).`); }
      const rows = await supabaseResponse.json();
      if (!Array.isArray(rows) || rows.length === 0) return void res.status(409).json({ error: "Booking is not in progress or escrow is not currently held." });
      const booking = rows[0] as { client_pi_uid?: string | null; customer_pi_username?: string | null };
      const storedClientUid = booking.client_pi_uid || null;
      const storedUsername = booking.customer_pi_username || null;
      const verifiedUsername = piUser.username || null;
      if (storedClientUid && storedClientUid !== clientUid) return void res.status(403).json({ error: "This booking belongs to a different Pi account." });
      if (!storedClientUid && storedUsername && verifiedUsername && normalizePiUsername(storedUsername) !== normalizePiUsername(verifiedUsername)) return void res.status(403).json({ error: "This booking belongs to a different Pi account." });
      const filters = storedClientUid ? `id=eq.${encodeURIComponent(bookingId)}&client_pi_uid=eq.${encodeURIComponent(clientUid)}` : `id=eq.${encodeURIComponent(bookingId)}`;
      const patch = { escrow_status: "completion_confirmed", confirmed_at: now, updated_at: now, ...(storedClientUid ? {} : { client_pi_uid: clientUid }) };
      const updateResponse = await supabaseRequest(`bookings?${filters}&status=eq.In%20Progress&escrow_status=eq.paid_escrowed`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
      if (!updateResponse) return void res.status(500).json({ error: "Booking database connection is not configured on the API server." });
      if (!updateResponse.ok) { const text = await updateResponse.text().catch(() => ""); throw new Error(text || `Supabase booking completion update failed (${updateResponse.status}).`); }
      const updatedRows = await updateResponse.json();
      if (!Array.isArray(updatedRows) || updatedRows.length === 0) return void res.status(409).json({ error: "Booking could not be confirmed. It may have changed state." });
      return void res.json({ success: true, booking: updatedRows[0] });
    }
    if (!pool) return void res.status(500).json({ error: "Booking database connection is not configured on the API server." });
    const lookup = await pool.query(`SELECT id, client_pi_uid, customer_pi_username FROM public.bookings WHERE id = $1 AND status = 'In Progress' AND escrow_status = 'paid_escrowed' LIMIT 1`, [bookingId]);
    if (lookup.rowCount === 0) return void res.status(409).json({ error: "Booking is not in progress or escrow is not currently held." });
    const booking = lookup.rows[0];
    const verifiedUsername = piUser.username || null;
    if (booking.client_pi_uid && booking.client_pi_uid !== clientUid) return void res.status(403).json({ error: "This booking belongs to a different Pi account." });
    if (!booking.client_pi_uid && booking.customer_pi_username && verifiedUsername && normalizePiUsername(booking.customer_pi_username) !== normalizePiUsername(verifiedUsername)) return void res.status(403).json({ error: "This booking belongs to a different Pi account." });
    const result = await pool.query(`UPDATE public.bookings SET escrow_status = 'completion_confirmed', confirmed_at = NOW(), updated_at = NOW(), client_pi_uid = COALESCE(client_pi_uid, $2) WHERE id = $1 AND status = 'In Progress' AND escrow_status = 'paid_escrowed' RETURNING id, status, escrow_status, confirmed_at, client_pi_uid, updated_at`, [bookingId, clientUid]);
    if (result.rowCount === 0) return void res.status(409).json({ error: "Booking could not be confirmed. It may have changed state." });
    return void res.json({ success: true, booking: result.rows[0] });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "Client booking completion confirmation failed");
    return void res.status(500).json({ error: err?.message || "Failed to confirm booking completion." });
  }
});

export default router;
