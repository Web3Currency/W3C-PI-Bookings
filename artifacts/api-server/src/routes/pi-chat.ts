import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

async function verifyPiAccessToken(accessToken?: string) {
  if (!accessToken?.trim()) return null;
  const response = await fetch("https://api.minepi.com/v2/me", { headers: { Authorization: `Bearer ${accessToken.trim()}` } });
  if (!response.ok) return null;
  const user = await response.json() as { uid?: string; username?: string };
  return user.uid ? user : null;
}

async function participantConversationIds(piUid: string) {
  const result = await pool.query(
    `select cp.conversation_id
       from public.conversation_participants cp
      where lower(cp.pi_uid) = lower($1)`,
    [piUid],
  );
  return result.rows.map((row: { conversation_id: string }) => row.conversation_id);
}

async function ensureConversationForBooking(bookingId: string) {
  const existing = await pool.query(`select id from public.conversations where booking_id = $1 limit 1`, [bookingId]);
  if (existing.rows[0]) return existing.rows[0].id as string;

  const booking = await pool.query(
    `select b.id, b.client_pi_uid, b.customer_pi_username, b.provider_id,
            p.pi_uid as provider_pi_uid, p.full_name as provider_name,
            b.service_title
       from public.bookings b
       join public.providers p on p.id = b.provider_id
      where b.id = $1 limit 1`,
    [bookingId],
  );
  if (!booking.rows[0]) throw new Error("Booking not found.");
  const row = booking.rows[0];
  if (!row.client_pi_uid || !row.provider_pi_uid) throw new Error("Booking is missing a client or provider Pi UID.");

  const created = await pool.query(
    `insert into public.conversations (booking_id)
     values ($1)
     on conflict (booking_id) do update set updated_at = now()
     returning id`,
    [bookingId],
  );
  const conversationId = created.rows[0].id as string;

  await pool.query(
    `insert into public.conversation_participants (conversation_id, pi_uid, role)
     values ($1, $2, 'client'), ($1, $3, 'provider')
     on conflict (conversation_id, pi_uid) do nothing`,
    [conversationId, row.client_pi_uid, row.provider_pi_uid],
  );

  await pool.query(
    `insert into public.messages (conversation_id, sender_pi_uid, message_type, content)
     select $1, $2, 'system', $3
      where not exists (
        select 1 from public.messages where conversation_id = $1 and message_type = 'system'
          and content like 'Booking #% accepted%'
      )`,
    [conversationId, row.provider_pi_uid, `Booking #${row.id} has been accepted. You can now communicate regarding ${row.service_title || "this service"}.`],
  );

  await pool.query(`update public.conversations set updated_at = now() where id = $1`, [conversationId]);
  return conversationId;
}

async function assertParticipant(conversationId: string, piUid: string) {
  const result = await pool.query(
    `select c.id, c.booking_id
       from public.conversations c
       join public.conversation_participants cp on cp.conversation_id = c.id
      where c.id = $1 and lower(cp.pi_uid) = lower($2)
      limit 1`,
    [conversationId, piUid],
  );
  return result.rows[0] || null;
}

router.post("/pi/chat/conversations", async (req, res) => {
  const { accessToken, search } = req.body as { accessToken?: string; search?: string };
  try {
    const user = await verifyPiAccessToken(accessToken);
    if (!user) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const pattern = search?.trim() ? `%${search.trim().replace(/[%_]/g, "\\$&").toLowerCase()}%` : null;
    const result = await pool.query(
      `select c.id, c.booking_id, c.updated_at,
              other.pi_uid as other_pi_uid,
              coalesce(p.full_name, other.pi_uid) as other_name,
              p.pi_username as other_username, p.photo_url as other_photo_url,
              m.content as last_message, m.message_type as last_message_type, m.created_at as last_message_at,
              coalesce(unread.unread_count, 0) as unread_count
         from public.conversations c
         join public.conversation_participants me on me.conversation_id = c.id and lower(me.pi_uid) = lower($1)
         join public.conversation_participants other on other.conversation_id = c.id and lower(other.pi_uid) <> lower($1)
         left join public.providers p on lower(p.pi_uid) = lower(other.pi_uid)
         left join lateral (
           select content, message_type, created_at from public.messages
            where conversation_id = c.id order by created_at desc limit 1
         ) m on true
         left join lateral (
           select count(*)::int as unread_count from public.messages um
            where um.conversation_id = c.id and um.created_at > coalesce(me.last_read_at, 'epoch'::timestamptz)
              and lower(um.sender_pi_uid) <> lower($1)
         ) unread on true
        where ($2::text is null or lower(coalesce(p.pi_username, other.pi_uid)) like $2 or lower(coalesce(p.full_name, '')) like $2)
        order by c.updated_at desc`,
      [user.uid, pattern],
    );
    return void res.json({ conversations: result.rows });
  } catch (err: any) {
    req.log.error({ err }, "Chat conversation list failed");
    return void res.status(500).json({ error: err?.message || "Failed to load conversations." });
  }
});

router.post("/pi/chat/conversations/:conversationId/messages", async (req, res) => {
  const { accessToken, content } = req.body as { accessToken?: string; content?: string };
  const conversationId = req.params.conversationId;
  if (!content?.trim()) return void res.status(400).json({ error: "Message content is required." });
  try {
    const user = await verifyPiAccessToken(accessToken);
    if (!user) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const participant = await assertParticipant(conversationId, user.uid);
    if (!participant) return void res.status(403).json({ error: "You are not a participant in this conversation." });
    const inserted = await pool.query(
      `insert into public.messages (conversation_id, sender_pi_uid, message_type, content)
       values ($1, $2, 'user', $3) returning id, conversation_id, sender_pi_uid, message_type, content, created_at`,
      [conversationId, user.uid, content.trim().slice(0, 5000)],
    );
    await pool.query(`update public.conversations set updated_at = now() where id = $1`, [conversationId]);
    return void res.status(201).json({ message: inserted.rows[0] });
  } catch (err: any) {
    req.log.error({ err, conversationId }, "Chat message send failed");
    return void res.status(500).json({ error: err?.message || "Failed to send message." });
  }
});

router.post("/pi/chat/conversations/:conversationId/read", async (req, res) => {
  const { accessToken } = req.body as { accessToken?: string };
  const conversationId = req.params.conversationId;
  try {
    const user = await verifyPiAccessToken(accessToken);
    if (!user) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const participant = await assertParticipant(conversationId, user.uid);
    if (!participant) return void res.status(403).json({ error: "You are not a participant in this conversation." });
    await pool.query(`update public.conversation_participants set last_read_at = now() where conversation_id = $1 and lower(pi_uid) = lower($2)`, [conversationId, user.uid]);
    return void res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err, conversationId }, "Chat read-state update failed");
    return void res.status(500).json({ error: err?.message || "Failed to mark conversation as read." });
  }
});

router.post("/pi/chat/conversations/:conversationId/messages/list", async (req, res) => {
  const { accessToken } = req.body as { accessToken?: string };
  const conversationId = req.params.conversationId;
  try {
    const user = await verifyPiAccessToken(accessToken);
    if (!user) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const participant = await assertParticipant(conversationId, user.uid);
    if (!participant) return void res.status(403).json({ error: "You are not a participant in this conversation." });
    const result = await pool.query(
      `select id, conversation_id, sender_pi_uid, message_type, content, created_at
         from public.messages where conversation_id = $1 order by created_at asc`,
      [conversationId],
    );
    await pool.query(`update public.conversation_participants set last_read_at = now() where conversation_id = $1 and lower(pi_uid) = lower($2)`, [conversationId, user.uid]);
    return void res.json({ messages: result.rows });
  } catch (err: any) {
    req.log.error({ err, conversationId }, "Chat message list failed");
    return void res.status(500).json({ error: err?.message || "Failed to load messages." });
  }
});

export { ensureConversationForBooking };
export default router;
