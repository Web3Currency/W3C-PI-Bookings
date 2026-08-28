import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function sb(path: string, init: RequestInit = {}) {
  const c = supabaseConfig();
  if (!c) return null;
  const h = new Headers(init.headers);
  h.set("apikey", c.key);
  h.set("Content-Type", "application/json");
  h.set("Prefer", h.get("Prefer") || "return=representation");
  if (c.key.startsWith("eyJ")) h.set("Authorization", `Bearer ${c.key}`);
  return fetch(`${c.url}/rest/v1/${path}`, { ...init, headers: h });
}

function piApiKey() {
  return process.env.PI_API_KEY?.trim() || "";
}

async function piFetch(path: string, init: RequestInit = {}) {
  const apiKey = piApiKey();
  if (!apiKey) throw new Error("PI_API_KEY is missing.");
  const h = new Headers(init.headers);
  h.set("Authorization", `Key ${apiKey}`);
  h.set("Content-Type", "application/json");
  return fetch(`https://api.minepi.com/v2${path}`, { ...init, headers: h });
}

async function fetchPiPayment(paymentId: string): Promise<any | null> {
  const res = await piFetch(`/payments/${encodeURIComponent(paymentId)}`);
  const text = await res.text().catch(() => "");
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }
  if (!res.ok) {
    const err: any = new Error(data?.error || data?.message || `Pi GET payment failed (${res.status})`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

function metaOf(payment: any): Record<string, any> {
  const m = payment?.metadata;
  if (m && typeof m === "object") return m;
  if (typeof m === "string") {
    try {
      return JSON.parse(m);
    } catch {
      return {};
    }
  }
  return {};
}

function paymentCompletedOnPi(payment: any): boolean {
  const st = payment?.status;
  if (st && typeof st === "object") {
    if (st.developer_completed === true) return true;
    if (st.transaction_verified === true && st.developer_completed !== false) return true;
  }
  if (payment?.transaction?.txid) return true;
  return false;
}

async function upsertPaymentIntent(payment: any, extra?: { txid?: string; status?: string }) {
  const paymentId = String(payment?.identifier || payment?.id || "").trim();
  if (!paymentId) return null;
  const meta = metaOf(payment);
  const now = new Date().toISOString();
  const amount = Number(payment?.amount);
  const row: Record<string, any> = {
    pi_payment_id: paymentId,
    pi_txid: extra?.txid || payment?.transaction?.txid || null,
    status: extra?.status || "approved",
    amount_pi: Number.isFinite(amount) ? amount : null,
    client_pi_uid: String(payment?.user_uid || payment?.uid || meta.clientPiUid || "").trim() || null,
    client_pi_username: String(meta.clientPiUsername || meta.client_pi_username || "").trim() || null,
    client_name: String(meta.clientName || meta.client_name || "").trim() || null,
    client_phone: String(meta.clientPhone || meta.client_phone || "").trim() || null,
    client_email: String(meta.clientEmail || meta.client_email || "").trim() || null,
    notes: String(meta.notes || "").trim() || null,
    service_id: meta.serviceId || meta.service_id || null,
    service_title: meta.serviceName || meta.service_title || null,
    provider_id: meta.providerId || meta.provider_id || null,
    business_id: meta.businessId || meta.business_id || null,
    booking_date: meta.date || meta.booking_date || null,
    booking_time: meta.timeSlot || meta.booking_time || null,
    metadata: meta,
    updated_at: now,
  };
  const res = await sb(`payment_intents?on_conflict=pi_payment_id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  });
  if (!res) return null;
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.warn("[payment_intents] upsert failed", res.status, t.slice(0, 200));
    return null;
  }
  const rows = (await res.json()) as any[];
  return Array.isArray(rows) ? rows[0] : rows;
}

async function loadPaymentIntent(paymentId: string): Promise<Record<string, any> | null> {
  const res = await sb(
    `payment_intents?pi_payment_id=eq.${encodeURIComponent(paymentId)}&select=*&limit=1`,
  );
  if (!res?.ok) return null;
  const rows = (await res.json()) as any[];
  return rows?.[0] || null;
}

async function finalizeBookingFromPayment(
  payment: any,
  txid: string,
  log?: { info: Function; warn: Function; error: Function },
): Promise<{ bookingId?: string; status: "created" | "recovered" | "failed"; error?: string; acceptanceDeadline?: string }> {
  const paymentId = String(payment?.identifier || payment?.id || "").trim();
  if (!paymentId) return { status: "failed", error: "Missing payment identifier." };

  const existing = await sb(
    `bookings?pi_payment_id=eq.${encodeURIComponent(paymentId)}&select=id,status,escrow_status,payment_status,acceptance_deadline&limit=1`,
  );
  if (existing?.ok) {
    const rows = (await existing.json()) as any[];
    if (rows?.[0]?.id) {
      return { status: "recovered", bookingId: rows[0].id, acceptanceDeadline: rows[0].acceptance_deadline };
    }
  }

  if (txid) {
    const byTx = await sb(`bookings?pi_tx_hash=eq.${encodeURIComponent(txid)}&select=id,acceptance_deadline&limit=1`);
    if (byTx?.ok) {
      const rows = (await byTx.json()) as any[];
      if (rows?.[0]?.id) {
        await sb(`bookings?id=eq.${encodeURIComponent(rows[0].id)}`, {
          method: "PATCH",
          body: JSON.stringify({ pi_payment_id: paymentId, updated_at: new Date().toISOString() }),
        }).catch(() => undefined);
        return { status: "recovered", bookingId: rows[0].id, acceptanceDeadline: rows[0].acceptance_deadline };
      }
    }
  }

  const intent = await loadPaymentIntent(paymentId);
  const meta = metaOf(payment);
  const intentMeta = intent?.metadata && typeof intent.metadata === "object" ? intent.metadata : {};
  const amount = Number(payment?.amount ?? intent?.amount_pi);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "failed", error: "Pi payment amount is invalid." };
  }

  const clientUid = String(
    payment?.user_uid || payment?.uid || payment?.from_uid || payment?.user?.uid ||
    intent?.client_pi_uid || meta.clientPiUid || intentMeta.clientPiUid || "",
  ).trim();
  const serviceTitle = String(
    intent?.service_title || meta.serviceName || meta.service_title || intentMeta.serviceName || payment?.memo || "Service",
  ).slice(0, 200);
  let bookingDate = String(
    intent?.booking_date || meta.date || meta.booking_date || intentMeta.date || "",
  ).trim();
  let bookingTime = String(
    intent?.booking_time || meta.timeSlot || meta.booking_time || intentMeta.timeSlot || "",
  ).trim();
  let providerId =
    intent?.provider_id || meta.providerId || meta.provider_id || intentMeta.providerId || null;
  let serviceId =
    intent?.service_id || meta.serviceId || meta.service_id || intentMeta.serviceId || null;

  if (!providerId && serviceId) {
    try {
      const sres = await sb(`services?id=eq.${encodeURIComponent(String(serviceId))}&select=id,provider_id,title&limit=1`);
      if (sres?.ok) {
        const srows = (await sres.json()) as any[];
        if (srows?.[0]?.provider_id) providerId = srows[0].provider_id;
      }
    } catch { /* non-fatal */ }
  }
  if (!providerId && meta.businessId) {
    try {
      const pres = await sb(`providers?id=eq.${encodeURIComponent(String(meta.businessId))}&select=id&limit=1`);
      if (pres?.ok) {
        const prows = (await pres.json()) as any[];
        if (prows?.[0]?.id) providerId = prows[0].id;
      }
    } catch { /* non-fatal */ }
  }

  const now = new Date().toISOString();
  const acceptanceDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const customerName = String(
    intent?.client_name || meta.clientName || meta.client_name || intentMeta.clientName || "Pi User",
  ).slice(0, 200);
  const customerPiUsername = String(
    intent?.client_pi_username || meta.clientPiUsername || meta.client_pi_username || "",
  ).slice(0, 100);
  const customerPhone = String(
    intent?.client_phone || meta.clientPhone || meta.client_phone || "",
  ).slice(0, 100);
  const customerEmail = String(
    intent?.client_email || meta.clientEmail || meta.client_email || "",
  ).slice(0, 200);
  const notes = String(intent?.notes || meta.notes || "").slice(0, 2000);

  const missing: string[] = [];
  if (!clientUid) missing.push("client_pi_uid (Pi user_uid)");
  if (!providerId) missing.push("provider_id (metadata.providerId or services lookup)");
  if (!bookingDate) missing.push("booking_date");
  if (!bookingTime) missing.push("booking_time");

  const payload: Record<string, any> = {
    status: "Pending",
    payment_status: "Paid",
    escrow_status: "paid_escrowed",
    paid_at: now,
    acceptance_deadline: acceptanceDeadline,
    price_pi: amount,
    platform_fee_pi: Number((amount * 0.1).toFixed(7)),
    provider_payout_pi: Number((amount * 0.9).toFixed(7)),
    customer_name: customerName,
    customer_pi_username: customerPiUsername || null,
    client_pi_uid: clientUid || null,
    customer_telegram_username: customerPhone || null,
    customer_email: customerEmail || null,
    service_title: serviceTitle,
    booking_date: bookingDate || null,
    booking_time: bookingTime || null,
    notes: notes || null,
    provider_id: providerId || null,
    pi_tx_hash: txid || payment?.transaction?.txid || null,
    pi_payment_id: paymentId,
    created_at: now,
    updated_at: now,
  };

  log?.info?.({
    paymentId,
    hasClientUid: Boolean(clientUid),
    hasProviderId: Boolean(providerId),
    hasDate: Boolean(bookingDate),
    hasTime: Boolean(bookingTime),
    amount,
    metaKeys: Object.keys(meta),
    hasIntent: Boolean(intent),
  }, "finalizeBookingFromPayment payload readiness");

  if (!providerId) {
    return {
      status: "failed",
      error:
        "Cannot reconstruct booking: provider_id is required. Ensure payment metadata includes providerId (and serviceId). " +
        `Missing: ${missing.join(", ")}. metaKeys=[${Object.keys(meta).join(",")}]`,
    };
  }

  const insert = await sb(`bookings`, { method: "POST", body: JSON.stringify(payload) });
  if (!insert) return { status: "failed", error: "Supabase not configured on server." };
  if (!insert.ok) {
    const detail = await insert.text().catch(() => "");
    if (insert.status === 409 || detail.includes("23505")) {
      const again = await sb(`bookings?pi_payment_id=eq.${encodeURIComponent(paymentId)}&select=id,acceptance_deadline&limit=1`);
      const rows = again?.ok ? ((await again.json()) as any[]) : [];
      if (rows?.[0]?.id) return { status: "recovered", bookingId: rows[0].id, acceptanceDeadline: rows[0].acceptance_deadline };
    }
    log?.error?.({ detail: detail.slice(0, 500), paymentId, missing }, "Failed to insert booking from payment");
    return { status: "failed", error: `Booking insert failed (${insert.status}): ${detail.slice(0, 400)}` };
  }
  const created = (await insert.json()) as any[];
  const bookingId = created?.[0]?.id;
  if (!bookingId) return { status: "failed", error: "Booking insert returned no id." };

  await sb(`payment_intents?pi_payment_id=eq.${encodeURIComponent(paymentId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "completed", booking_id: bookingId, pi_txid: txid || null, completed_at: now, updated_at: now }),
  }).catch(() => undefined);

  log?.info?.({ paymentId, bookingId, txid, acceptanceDeadline }, "Booking finalized from Pi payment");
  return { status: "created", bookingId, acceptanceDeadline };
}

router.post("/pi/payments/approve", async (req, res) => {
  const { paymentId } = req.body as { paymentId?: string };
  if (!paymentId || typeof paymentId !== "string" || paymentId.trim() === "") {
    res.status(400).json({ error: "paymentId is required." });
    return;
  }
  if (!piApiKey()) {
    res.status(500).json({ error: "Server configuration error: PI_API_KEY missing." });
    return;
  }
  const cleanPaymentId = paymentId.trim();
  let piResponse: Response;
  try {
    piResponse = await piFetch(`/payments/${encodeURIComponent(cleanPaymentId)}/approve`, { method: "POST", body: JSON.stringify({}) });
  } catch (err: any) {
    req.log.error({ err, paymentId: cleanPaymentId }, "Network error calling Pi API approve payment");
    res.status(500).json({ error: "Could not reach Pi Network API." });
    return;
  }
  let responseData: any;
  const rawText = await piResponse.text().catch(() => "");
  try { responseData = JSON.parse(rawText); } catch { responseData = { message: rawText }; }
  if (!piResponse.ok) {
    req.log.warn({ status: piResponse.status, paymentId: cleanPaymentId, responseData }, "Pi API rejected payment approval");
    res.status(piResponse.status).json(responseData);
    return;
  }
  req.log.info({ paymentId: cleanPaymentId }, "Pi payment approved successfully");
  let intentPersisted = false;
  try {
    const payment = responseData?.identifier ? responseData : await fetchPiPayment(cleanPaymentId);
    const intent = await upsertPaymentIntent(payment, { status: "approved" });
    intentPersisted = Boolean(intent);
    if (!intentPersisted) {
      req.log.error({ paymentId: cleanPaymentId }, "payment_intent upsert returned null after approve");
    }
  } catch (e: any) {
    req.log.error({ err: e?.message, paymentId: cleanPaymentId }, "Could not persist payment_intent after approve");
  }
  res.status(piResponse.status).json({ ...responseData, paymentIntentPersisted: intentPersisted });
});

router.post("/pi/payments/complete", async (req, res) => {
  const { paymentId, txid } = req.body as { paymentId?: string; txid?: string };
  if (!paymentId || typeof paymentId !== "string" || paymentId.trim() === "") {
    res.status(400).json({ error: "paymentId is required." });
    return;
  }
  if (!txid || typeof txid !== "string" || txid.trim() === "") {
    res.status(400).json({ error: "txid is required." });
    return;
  }
  if (!piApiKey()) {
    res.status(500).json({ error: "Server configuration error: PI_API_KEY missing." });
    return;
  }
  const cleanPaymentId = paymentId.trim();
  const cleanTxid = txid.trim();
  let piResponse: Response;
  try {
    piResponse = await piFetch(`/payments/${encodeURIComponent(cleanPaymentId)}/complete`, {
      method: "POST",
      body: JSON.stringify({ txid: cleanTxid }),
    });
  } catch (err: any) {
    req.log.error({ err, paymentId: cleanPaymentId, txid: cleanTxid }, "Network error calling Pi API complete payment");
    res.status(500).json({ error: "Could not reach Pi Network API." });
    return;
  }
  let responseData: any;
  const rawText = await piResponse.text().catch(() => "");
  try { responseData = JSON.parse(rawText); } catch { responseData = { message: rawText }; }
  const alreadyDone =
    !piResponse.ok &&
    (piResponse.status === 400 || piResponse.status === 409) &&
    String(JSON.stringify(responseData)).toLowerCase().includes("already");
  if (!piResponse.ok && !alreadyDone) {
    req.log.warn({ status: piResponse.status, paymentId: cleanPaymentId, txid: cleanTxid, responseData }, "Pi API rejected payment completion");
    res.status(piResponse.status).json(responseData);
    return;
  }
  req.log.info({ paymentId: cleanPaymentId, txid: cleanTxid, alreadyDone }, "Pi payment completed successfully");
  let payment = responseData?.identifier ? responseData : null;
  try {
    if (!payment) payment = await fetchPiPayment(cleanPaymentId);
  } catch (e: any) {
    req.log.warn({ err: e?.message }, "Could not re-fetch payment after complete");
  }
  if (payment) await upsertPaymentIntent(payment, { txid: cleanTxid, status: "completed" });
  const finalized = payment
    ? await finalizeBookingFromPayment(payment, cleanTxid, req.log)
    : { status: "failed" as const, error: "No payment object to finalize booking." };
  if (finalized.status === "failed") {
    req.log.error({ paymentId: cleanPaymentId, finalized }, "Booking finalize after complete failed");
    res.status(200).json({ ...responseData, bookingReconciled: false, bookingError: finalized.error, paymentId: cleanPaymentId, txid: cleanTxid });
    return;
  }
  res.status(200).json({
    ...responseData,
    bookingReconciled: true,
    bookingId: finalized.bookingId,
    bookingStatus: finalized.status,
    acceptanceDeadline: finalized.acceptanceDeadline,
    paymentId: cleanPaymentId,
    txid: cleanTxid,
  });
});

router.post("/pi/payments/reconcile", async (req, res) => {
  const { paymentId } = req.body as { paymentId?: string };
  if (!paymentId || typeof paymentId !== "string" || paymentId.trim() === "") {
    res.status(400).json({ error: "paymentId is required." });
    return;
  }
  if (!piApiKey()) {
    res.status(500).json({ error: "Server configuration error: PI_API_KEY missing." });
    return;
  }
  const cleanPaymentId = paymentId.trim();
  let payment: any;
  try {
    payment = await fetchPiPayment(cleanPaymentId);
  } catch (e: any) {
    req.log.warn({ err: e?.message, status: e?.status, paymentId: cleanPaymentId }, "Reconcile: Pi GET failed");
    res.status(e?.status || 502).json({ error: e?.message || "Could not fetch payment from Pi.", piBody: e?.body });
    return;
  }
  const txid = String(payment?.transaction?.txid || "").trim();
  const completed = paymentCompletedOnPi(payment);
  req.log.info({ paymentId: cleanPaymentId, completed, hasTxid: Boolean(txid), amount: payment?.amount }, "Reconcile: Pi payment status");
  if (!completed || !txid) {
    res.status(409).json({
      success: false,
      error: "Payment is not completed on Pi yet (missing txid or developer_completed).",
      paymentId: cleanPaymentId,
      piStatus: payment?.status || null,
      hasTxid: Boolean(txid),
    });
    return;
  }
  try {
    const st = payment?.status;
    if (st && typeof st === "object" && st.developer_completed !== true) {
      await piFetch(`/payments/${encodeURIComponent(cleanPaymentId)}/complete`, { method: "POST", body: JSON.stringify({ txid }) });
      payment = await fetchPiPayment(cleanPaymentId);
    }
  } catch (e: any) {
    req.log.warn({ err: e?.message }, "Reconcile: complete call optional failure");
  }
  await upsertPaymentIntent(payment, { txid, status: "completed" });
  const finalized = await finalizeBookingFromPayment(payment, txid, req.log);
  if (finalized.status === "failed") {
    res.status(502).json({ success: false, error: finalized.error, paymentId: cleanPaymentId, txid });
    return;
  }
  res.status(200).json({
    success: true,
    paymentId: cleanPaymentId,
    txid,
    bookingId: finalized.bookingId,
    bookingStatus: finalized.status,
    acceptanceDeadline: finalized.acceptanceDeadline,
  });
});

export default router;
