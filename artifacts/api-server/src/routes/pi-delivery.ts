import { Router, type IRouter } from "express";
import { ensureConversationForBooking } from "./pi-chat";
const router: IRouter = Router();
function getSupabaseConfig() { const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url: url.replace(/\/$/, ""), key } : null; }
async function supabaseRequest(path: string, init: RequestInit = {}) { const config = getSupabaseConfig(); if (!config) throw new Error("Booking database configuration is unavailable."); const headers = new Headers(init.headers); headers.set("apikey", config.key); headers.set("Content-Type", "application/json"); headers.set("Prefer", headers.get("Prefer") || "return=representation"); if (config.key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${config.key}`); const response = await fetch(`${config.url}/rest/v1/${path}`, { ...init, headers }); if (!response.ok) throw new Error((await response.text().catch(() => "")) || `Supabase request failed (${response.status}).`); const text = await response.text(); return text ? JSON.parse(text) : []; }
async function verifyPiAccessToken(accessToken?: string) { if (!accessToken?.trim()) return null; const response = await fetch("https://api.minepi.com/v2/me", { headers: { Authorization: `Bearer ${accessToken.trim()}` } }); if (!response.ok) return null; const user = await response.json() as { uid?: string; username?: string }; return user.uid ? user : null; }
router.post("/pi/bookings/:bookingId/deliver", async (req, res) => {
  const bookingId = req.params.bookingId; const { accessToken, deliveryNotes, deliveryAttachments } = req.body as { accessToken?: string; deliveryNotes?: string; deliveryAttachments?: Array<Record<string, unknown>> };
  if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) return void res.status(400).json({ error: "A valid bookingId is required." });
  const trimmedNotes = String(deliveryNotes || "").trim(); const attachments = Array.isArray(deliveryAttachments) ? deliveryAttachments.slice(0, 20) : [];
  if (!trimmedNotes && attachments.length === 0) return void res.status(400).json({ error: "Add delivery notes or at least one deliverable reference before marking the booking as delivered." });
  try {
    const user = await verifyPiAccessToken(accessToken); if (!user) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const rows = await supabaseRequest(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,status,provider_id,escrow_status,client_pi_uid,service_title,project_deadline,revision_count&limit=1`); const booking = rows[0];
    if (!booking) return void res.status(404).json({ error: "Booking not found." }); if (!booking.provider_id) return void res.status(409).json({ error: "Booking has no assigned provider." });
    const providers = await supabaseRequest(`providers?id=eq.${encodeURIComponent(booking.provider_id)}&select=id,pi_uid&limit=1`); const provider = providers[0];
    if (!provider?.pi_uid || provider.pi_uid !== user.uid) return void res.status(403).json({ error: "Only the assigned provider can submit delivery for this booking." });
    if (booking.status !== "In Progress") return void res.status(409).json({ error: "Only an In Progress booking can be marked as delivered." });
    if (booking.escrow_status !== "paid_escrowed") return void res.status(409).json({ error: "Escrow is not currently held for this booking." });
    const now = new Date(); const nowIso = now.toISOString(); const reviewDeadline = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const updated = await supabaseRequest(`bookings?id=eq.${encodeURIComponent(bookingId)}&status=eq.In%20Progress&provider_id=eq.${encodeURIComponent(booking.provider_id)}`, { method: "PATCH", body: JSON.stringify({ status: "Delivered", delivered_at: nowIso, delivery_notes: trimmedNotes || null, delivery_attachments: attachments, client_review_status: "pending", client_review_deadline: reviewDeadline, project_deadline: null, updated_at: nowIso }) });
    if (!updated?.length) return void res.status(409).json({ error: "Booking changed state before delivery could be recorded." });
    try {
      const { conversationId } = await ensureConversationForBooking(bookingId, { includeAcceptanceMessage: false });
      const systemContent = "Provider has marked this service as delivered. Please review the deliverables and confirm completion.";
      await supabaseRequest("messages", { method: "POST", body: JSON.stringify({ conversation_id: conversationId, booking_id: bookingId, sender_pi_uid: provider.pi_uid, message_type: "system", content: systemContent }) });
      if (trimmedNotes) await supabaseRequest("messages", { method: "POST", body: JSON.stringify({ conversation_id: conversationId, booking_id: bookingId, sender_pi_uid: provider.pi_uid, message_type: "user", content: trimmedNotes.slice(0, 5000) }) });
      await supabaseRequest(`conversations?id=eq.${encodeURIComponent(conversationId)}`, { method: "PATCH", body: JSON.stringify({ booking_id: bookingId, updated_at: nowIso }) });
    } catch (chatErr: any) { req.log.error({ chatErr, bookingId }, "Delivery recorded but delivery chat messages failed"); }
    return void res.json({ success: true, booking: updated[0] });
  } catch (err: any) { req.log.error({ err, bookingId }, "Provider delivery submission failed"); return void res.status(500).json({ error: err?.message || "Failed to submit delivery." }); }
});
export default router;
