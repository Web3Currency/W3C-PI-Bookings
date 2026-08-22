import { Router, type IRouter } from "express";

const router: IRouter = Router();

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Chat database configuration is unavailable.");
  const headers = new Headers(init.headers);
  headers.set("apikey", config.key);
  headers.set("Content-Type", "application/json");
  headers.set("Prefer", headers.get("Prefer") || "return=representation");
  if (config.key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${config.key}`);
  const response = await fetch(`${config.url}/rest/v1/${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Chat database request failed (${response.status}).`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

async function verifyPiAccessToken(accessToken?: string) {
  if (!accessToken?.trim()) return null;
  const response = await fetch("https://api.minepi.com/v2/me", { headers: { Authorization: `Bearer ${accessToken.trim()}` } });
  if (!response.ok) return null;
  const user = await response.json() as { uid?: string; username?: string };
  return user.uid ? user : null;
}

async function assertParticipant(conversationId: string, piUid: string) {
  const rows = await supabaseRequest(`conversation_participants?select=conversation_id&conversation_id=eq.${encodeURIComponent(conversationId)}&pi_uid=eq.${encodeURIComponent(piUid)}&limit=1`);
  return rows[0] || null;
}

async function getBookingAndProvider(bookingId: string) {
  const bookings = await supabaseRequest(`bookings?select=id,client_pi_uid,customer_pi_username,customer_name,provider_id,service_title,status& id=eq.${encodeURIComponent(bookingId)}&limit=1`.replace("?select=id,client_pi_uid,customer_pi_username,customer_name,provider_id,service_title,status& id=", "?select=id,client_pi_uid,customer_pi_username,customer_name,provider_id,service_title,status&id="));
  const booking = bookings[0];
  if (!booking) throw new Error("Booking not found.");
  if (!booking.client_pi_uid || !booking.provider_id) throw new Error("Booking is missing a client or provider identity.");
  const providers = await supabaseRequest(`providers?select=id,pi_uid,full_name,pi_username,photo_url&id=eq.${encodeURIComponent(booking.provider_id)}&limit=1`);
  const provider = providers[0];
  if (!provider?.pi_uid) throw new Error("Booking provider is missing a Pi identity.");
  return { booking, provider };
}

async function ensureConversationForBooking(bookingId: string, options: { includeAcceptanceMessage?: boolean } = {}) {
  const { booking, provider } = await getBookingAndProvider(bookingId);
  const existing = await supabaseRequest(`conversations?select=id,booking_id&booking_id=eq.${encodeURIComponent(bookingId)}&limit=1`);
  let conversationId = existing[0]?.id as string | undefined;

  if (!conversationId) {
    const created = await supabaseRequest("conversations", { method: "POST", body: JSON.stringify({ booking_id: bookingId }) });
    conversationId = created[0]?.id as string | undefined;
    if (!conversationId) throw new Error("Could not create chat conversation.");
  }

  const participants = await supabaseRequest(`conversation_participants?select=pi_uid&conversation_id=eq.${encodeURIComponent(conversationId)}`);
  const existingUids = new Set(participants.map((row: any) => row.pi_uid));
  const missing = [
    !existingUids.has(booking.client_pi_uid) ? { conversation_id: conversationId, pi_uid: booking.client_pi_uid, role: "client" } : null,
    !existingUids.has(provider.pi_uid) ? { conversation_id: conversationId, pi_uid: provider.pi_uid, role: "provider" } : null,
  ].filter(Boolean);
  if (missing.length) await supabaseRequest("conversation_participants", { method: "POST", body: JSON.stringify(missing) });

  const shouldAddAcceptanceMessage = options.includeAcceptanceMessage ?? booking.status === "In Progress";
  if (shouldAddAcceptanceMessage) {
    const systemContent = `Booking #${booking.id} has been accepted. You can now communicate regarding ${booking.service_title || "this service"}.`;
    const existingSystem = await supabaseRequest(`messages?select=id&conversation_id=eq.${encodeURIComponent(conversationId)}&message_type=eq.system&content=eq.${encodeURIComponent(systemContent)}&limit=1`);
    if (!existingSystem[0]) {
      await supabaseRequest("messages", { method: "POST", body: JSON.stringify({ conversation_id: conversationId, sender_pi_uid: provider.pi_uid, message_type: "system", content: systemContent }) });
    }
  }

  await supabaseRequest(`conversations?id=eq.${encodeURIComponent(conversationId)}`, { method: "PATCH", body: JSON.stringify({ updated_at: new Date().toISOString() }) });
  return { conversationId, booking, provider, bookingStatus: booking.status };
}

function participantView(user: { uid: string }, booking: any, provider: any) {
  const isProvider = provider.pi_uid === user.uid;
  return isProvider ? {
    other_pi_uid: booking.client_pi_uid,
    other_role: "client",
    other_name: booking.customer_name || booking.customer_pi_username || booking.client_pi_uid,
    other_username: booking.customer_pi_username || booking.client_pi_uid,
    other_photo_url: null,
  } : {
    other_pi_uid: provider.pi_uid,
    other_role: "provider",
    other_name: provider.full_name || provider.pi_username || provider.pi_uid,
    other_username: provider.pi_username || provider.pi_uid,
    other_photo_url: provider.photo_url || null,
  };
}

router.post("/pi/chat/conversations/for-booking", async (req, res) => {
  const { accessToken, bookingId } = req.body as { accessToken?: string; bookingId?: string };
  if (!bookingId) return void res.status(400).json({ error: "Booking ID is required." });
  try {
    const user = await verifyPiAccessToken(accessToken);
    if (!user) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const { booking, provider } = await getBookingAndProvider(bookingId);
    const usernameMatches = booking.customer_pi_username && user.username && String(booking.customer_pi_username).replace(/^@+/, "").toLowerCase() === String(user.username).replace(/^@+/, "").toLowerCase();
    const isClient = booking.client_pi_uid ? booking.client_pi_uid === user.uid : Boolean(usernameMatches);
    const isProvider = provider.pi_uid === user.uid;
    if (!isClient && !isProvider) return void res.status(403).json({ error: "You are not authorized to access this booking chat." });
    const ensured = await ensureConversationForBooking(bookingId, { includeAcceptanceMessage: booking.status === "In Progress" });
    return void res.json({ conversationId: ensured.conversationId, bookingStatus: ensured.bookingStatus, participant: participantView(user, booking, provider) });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "Failed to open booking chat");
    return void res.status(500).json({ error: "Unable to open this chat right now. Please try again." });
  }
});

router.post("/pi/chat/conversations", async (req, res) => {
  const { accessToken } = req.body as { accessToken?: string };
  try {
    const user = await verifyPiAccessToken(accessToken);
    if (!user) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const participants = await supabaseRequest(`conversation_participants?select=conversation_id,last_read_at,role&pi_uid=eq.${encodeURIComponent(user.uid)}`);
    const conversations = [];
    for (const participant of participants) {
      const conversationId = participant.conversation_id as string;
      const conversationRows = await supabaseRequest(`conversations?select=id,booking_id,updated_at&id=eq.${encodeURIComponent(conversationId)}&limit=1`);
      const conversation = conversationRows[0];
      if (!conversation) continue;
      const others = await supabaseRequest(`conversation_participants?select=pi_uid,role&conversation_id=eq.${encodeURIComponent(conversationId)}&pi_uid=neq.${encodeURIComponent(user.uid)}&limit=1`);
      const other = others[0];
      if (!other) continue;

      const bookings = await supabaseRequest(`bookings?select=client_pi_uid,customer_pi_username,customer_name,provider_id&id=eq.${encodeURIComponent(conversation.booking_id)}&limit=1`);
      const booking = bookings[0];
      const providers = booking?.provider_id ? await supabaseRequest(`providers?select=full_name,pi_username,photo_url,pi_uid&pi_uid=eq.${encodeURIComponent(booking.provider_id)}&limit=1`) : [];
      const provider = providers[0] || null;
      const otherInfo = provider?.pi_uid === other.pi_uid
        ? { other_name: provider.full_name || provider.pi_username || other.pi_uid, other_username: provider.pi_username || other.pi_uid, other_photo_url: provider.photo_url || null }
        : { other_name: booking?.customer_name || booking?.customer_pi_username || other.pi_uid, other_username: booking?.customer_pi_username || other.pi_uid, other_photo_url: null };

      const messages = await supabaseRequest(`messages?select=id,content,message_type,created_at,sender_pi_uid&conversation_id=eq.${encodeURIComponent(conversationId)}&order=created_at.desc&limit=1`);
      const lastMessage = messages[0] || null;
      const unreadQuery = participant.last_read_at
        ? `messages?select=id&conversation_id=eq.${encodeURIComponent(conversationId)}&created_at=gt.${encodeURIComponent(participant.last_read_at)}&sender_pi_uid=neq.${encodeURIComponent(user.uid)}`
        : `messages?select=id&conversation_id=eq.${encodeURIComponent(conversationId)}&sender_pi_uid=neq.${encodeURIComponent(user.uid)}`;
      const unread = await supabaseRequest(unreadQuery);
      conversations.push({ id: conversation.id, booking_id: conversation.booking_id, updated_at: conversation.updated_at, other_pi_uid: other.pi_uid, other_role: other.role, ...otherInfo, last_message: lastMessage?.content || null, last_message_type: lastMessage?.message_type || null, last_message_at: lastMessage?.created_at || null, unread_count: unread.length });
    }
    conversations.sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
    return void res.json({ conversations });
  } catch (err: any) {
    req.log.error({ err }, "Chat conversation list failed");
    return void res.status(500).json({ error: "Chat is temporarily unavailable. Please try again." });
  }
});

router.post("/pi/chat/conversations/:conversationId/messages", async (req, res) => {
  const { accessToken, content } = req.body as { accessToken?: string; content?: string };
  const conversationId = req.params.conversationId;
  if (!content?.trim()) return void res.status(400).json({ error: "Message content is required." });
  try {
    const user = await verifyPiAccessToken(accessToken);
    if (!user) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    if (!(await assertParticipant(conversationId, user.uid))) return void res.status(403).json({ error: "You are not a participant in this conversation." });
    const inserted = await supabaseRequest("messages", { method: "POST", body: JSON.stringify({ conversation_id: conversationId, sender_pi_uid: user.uid, message_type: "user", content: content.trim().slice(0, 5000) }) });
    await supabaseRequest(`conversations?id=eq.${encodeURIComponent(conversationId)}`, { method: "PATCH", body: JSON.stringify({ updated_at: new Date().toISOString() }) });
    return void res.status(201).json({ message: inserted[0] });
  } catch (err: any) {
    req.log.error({ err, conversationId }, "Chat message send failed");
    return void res.status(500).json({ error: "Unable to send your message right now. Please try again." });
  }
});

router.post("/pi/chat/conversations/:conversationId/read", async (req, res) => {
  const { accessToken } = req.body as { accessToken?: string };
  const conversationId = req.params.conversationId;
  try {
    const user = await verifyPiAccessToken(accessToken);
    if (!user) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    if (!(await assertParticipant(conversationId, user.uid))) return void res.status(403).json({ error: "You are not a participant in this conversation." });
    await supabaseRequest(`conversation_participants?conversation_id=eq.${encodeURIComponent(conversationId)}&pi_uid=eq.${encodeURIComponent(user.uid)}`, { method: "PATCH", body: JSON.stringify({ last_read_at: new Date().toISOString() }) });
    return void res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err, conversationId }, "Chat read-state update failed");
    return void res.status(500).json({ error: "Unable to update read status right now." });
  }
});

router.post("/pi/chat/conversations/:conversationId/messages/list", async (req, res) => {
  const { accessToken } = req.body as { accessToken?: string };
  const conversationId = req.params.conversationId;
  try {
    const user = await verifyPiAccessToken(accessToken);
    if (!user) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    if (!(await assertParticipant(conversationId, user.uid))) return void res.status(403).json({ error: "You are not a participant in this conversation." });
    const messages = await supabaseRequest(`messages?select=id,conversation_id,sender_pi_uid,message_type,content,created_at&conversation_id=eq.${encodeURIComponent(conversationId)}&order=created_at.asc`);
    await supabaseRequest(`conversation_participants?conversation_id=eq.${encodeURIComponent(conversationId)}&pi_uid=eq.${encodeURIComponent(user.uid)}`, { method: "PATCH", body: JSON.stringify({ last_read_at: new Date().toISOString() }) });
    return void res.json({ messages });
  } catch (err: any) {
    req.log.error({ err }, "Chat message list failed");
    return void res.status(500).json({ error: "Unable to load this conversation right now. Please try again." });
  }
});

export { ensureConversationForBooking };
export default router;
