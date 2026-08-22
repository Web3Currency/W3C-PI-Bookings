import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { executeAutomaticProviderPayout } from "../services/automaticPayoutService";
import { ensureConversationForBooking } from "./pi-chat";

const router: IRouter = Router();

function getSupabaseConfig() { const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url: url.replace(/\/$/, ""), key } : null; }
async function supabaseRequest(path: string, init: RequestInit = {}) { const config = getSupabaseConfig(); if (!config) return null; const headers = new Headers(init.headers); headers.set("apikey", config.key); headers.set("Content-Type", "application/json"); headers.set("Prefer", headers.get("Prefer") || "return=representation"); if (config.key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${config.key}`); return fetch(`${config.url}/rest/v1/${path}`, { ...init, headers }); }
async function getProviderByPiUid(piUid: string) { const response = await supabaseRequest(`providers?select=id,pi_uid&pi_uid=eq.${encodeURIComponent(piUid)}&limit=1`); if (response) { if (!response.ok) throw new Error(`Supabase provider lookup failed (${response.status}).`); const rows = await response.json() as Array<{ id: string; pi_uid: string }>; return rows[0] || null; } if (!pool) return null; const result = await pool.query(`SELECT id, pi_uid FROM public.providers WHERE pi_uid = $1 LIMIT 1`, [piUid]); return result.rows[0] || null; }
async function updateBookingViaSupabase(bookingId: string, providerId: string, updates: Record<string, unknown>) { const response = await supabaseRequest(`bookings?id=eq.${encodeURIComponent(bookingId)}&provider_id=eq.${encodeURIComponent(providerId)}`, { method: "PATCH", body: JSON.stringify(updates) }); if (!response) return null; if (!response.ok) throw new Error((await response.text().catch(() => "")) || `Supabase booking update failed (${response.status}).`); return await response.json() as any[]; }
async function verifyPiAccessToken(accessToken: string) { const response = await fetch("https://api.minepi.com/v2/me", { headers: { Authorization: `Bearer ${accessToken.trim()}` } }); if (!response.ok) return null; const user = await response.json() as { uid?: string; username?: string }; return user.uid ? user : null; }
function normalizePiUsername(username?: string | null) { return String(username || "").trim().replace(/^@+/, "").toLowerCase(); }

router.post("/pi/bookings/:bookingId/accept", async (req, res) => { const bookingId = req.params.bookingId; const { accessToken } = req.body as { accessToken?: string }; if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) return void res.status(400).json({ error: "A valid bookingId is required." }); if (!accessToken?.trim()) return void res.status(401).json({ error: "Pi access token is required." }); try { const piUser = await verifyPiAccessToken(accessToken); if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." }); const provider = await getProviderByPiUid(piUser.uid); if (!provider) return void res.status(403).json({ error: "No provider profile is linked to this Pi account." }); const rows = await updateBookingViaSupabase(bookingId, provider.id, { status: "In Progress", updated_at: new Date().toISOString() }); if (rows) { if (!rows.length) return void res.status(409).json({ error: "Booking is not available for acceptance or is not assigned to this provider." }); try { await ensureConversationForBooking(bookingId); } catch (chatErr: any) { req.log.error({ chatErr, bookingId }, "Booking accepted but chat conversation creation failed"); } return void res.json({ success: true, booking: rows[0] }); } return void res.status(500).json({ error: "Booking database connection is not configured on the API server." }); } catch (err: any) { req.log.error({ err, bookingId }, "Provider booking acceptance failed"); return void res.status(500).json({ error: err?.message || "Failed to accept booking." }); } });

router.post("/pi/bookings/:bookingId/reject", async (req, res) => { const bookingId = req.params.bookingId; const { accessToken, rejectionReason } = req.body as { accessToken?: string; rejectionReason?: string }; if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) return void res.status(400).json({ error: "A valid bookingId is required." }); if (!accessToken?.trim()) return void res.status(401).json({ error: "Pi access token is required." }); if (!rejectionReason?.trim()) return void res.status(400).json({ error: "A rejection reason is required." }); try { const piUser = await verifyPiAccessToken(accessToken); if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." }); const provider = await getProviderByPiUid(piUser.uid); if (!provider) return void res.status(403).json({ error: "No provider profile is linked to this Pi account." }); const now = new Date().toISOString(); const rows = await updateBookingViaSupabase(bookingId, provider.id, { status: "Cancelled", rejection_reason: rejectionReason.trim(), cancelled_at: now, updated_at: now }); if (!rows?.length) return void res.status(409).json({ error: "Booking is not available for rejection or is not assigned to this provider." }); return void res.json({ success: true, booking: rows[0] }); } catch (err: any) { req.log.error({ err, bookingId }, "Provider booking rejection failed"); return void res.status(500).json({ error: err?.message || "Failed to reject booking." }); } });

router.post("/pi/bookings/:bookingId/complete", async (req, res) => {
  const bookingId = req.params.bookingId; const { accessToken } = req.body as { accessToken?: string };
  if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) return void res.status(400).json({ error: "A valid bookingId is required." });
  if (!accessToken?.trim()) return void res.status(401).json({ error: "Pi access token is required." });
  try {
    const piUser = await verifyPiAccessToken(accessToken); if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const lookup = await supabaseRequest(`bookings?id=eq.${encodeURIComponent(bookingId)}&status=eq.In%20Progress&escrow_status=eq.paid_escrowed&select=id,client_pi_uid,customer_pi_username,status,escrow_status`);
    if (!lookup?.ok) throw new Error((await lookup?.text().catch(() => "")) || "Booking lookup failed.");
    const rows = await lookup.json() as any[]; if (!rows.length) return void res.status(409).json({ error: "Booking is not in progress or escrow is not currently held." });
    const booking = rows[0]; const storedUid = booking.client_pi_uid || null; const storedUsername = booking.customer_pi_username || null;
    if (storedUid && storedUid !== piUser.uid) return void res.status(403).json({ error: "This booking belongs to a different Pi account." });
    if (!storedUid && storedUsername && piUser.username && normalizePiUsername(storedUsername) !== normalizePiUsername(piUser.username)) return void res.status(403).json({ error: "This booking belongs to a different Pi account." });
    const now = new Date().toISOString();
    const filters = storedUid ? `id=eq.${encodeURIComponent(bookingId)}&client_pi_uid=eq.${encodeURIComponent(piUser.uid)}` : `id=eq.${encodeURIComponent(bookingId)}`;
    const confirmed = await supabaseRequest(`bookings?${filters}&status=eq.In%20Progress&escrow_status=eq.paid_escrowed`, { method: "PATCH", body: JSON.stringify({ escrow_status: "completion_confirmed", confirmed_at: now, updated_at: now, ...(storedUid ? {} : { client_pi_uid: piUser.uid }) }) });
    if (!confirmed?.ok) throw new Error((await confirmed?.text().catch(() => "")) || "Booking completion update failed.");
    const confirmedRows = await confirmed.json() as any[]; if (!confirmedRows.length) return void res.status(409).json({ error: "Booking could not be confirmed. It may have changed state." });
    const payout = await executeAutomaticProviderPayout(bookingId);
    if (payout.status === "failed") {
      req.log.error({ bookingId, payout }, "Automatic provider payout failed after completion confirmation");
      return void res.status(502).json({ error: payout.error || "Automatic provider payout failed.", booking: confirmedRows[0], payout: { status: payout.status, paymentId: payout.paymentId, txid: payout.txid } });
    }
    const finalBookingResponse = await supabaseRequest(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=*&limit=1`);
    const finalRows = finalBookingResponse?.ok ? await finalBookingResponse.json() as any[] : [];
    return void res.json({ success: true, booking: finalRows[0] || confirmedRows[0], payout: { status: payout.status, paymentId: payout.paymentId, txid: payout.txid } });
  } catch (err: any) { req.log.error({ err, bookingId }, "Client booking completion and automatic payout failed"); return void res.status(500).json({ error: err?.message || "Failed to confirm booking completion." }); }
});

export default router;
