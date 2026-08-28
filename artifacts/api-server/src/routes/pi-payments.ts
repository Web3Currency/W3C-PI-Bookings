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
  if (!paymentId) return;
  const meta = metaOf(payment);
  const amount = Number(payment?.amount);
  const now = new Date().toISOString();
  const row: Record<string, any> = {
    pi_payment_id: paymentId,
    amount_pi: Number.isFinite(amount) ? amount : null,
    status: extra?.status || (paymentCompletedOnPi(payment) ? "completed" : "approved"),
    txid: extra?.txid || payment?.transaction?.txid || null,
    client_pi_uid: String(payment?.user_uid || payment?.uid || meta.clientPiUid || "").trim() || null,
    service_id: meta.serviceId || meta.service_id || null,
    provider_id: meta.providerId || meta.provider_id || null,
    service_title: String(meta.serviceName || meta.service_title || payment?.memo || "").slice(0, 200) || null,
    booking_date: meta.date || meta.booking_date || null,
    booking_time: meta.timeSlot || meta.booking_time || null,
    metadata: meta,
    updated_at: now,
  };
  if (!row.txid) delete row.txid;
  const existing = await sb(`payment_intents?pi_payment_id=eq.${encodeURIComponent(paymentId)}&select=id&limit=1`);
  if (existing?.ok) {
    const rows = (await existing.json()) as any[];
    if (rows?.[0]?.id) {
      await sb(`payment_intents?id=eq.${encodeURIComponent(rows[0].id)}`, {
        method: "PATCH",
        body: JSON.stringify(row),
      });
      return;
    }
  }
  row.created_at = now;
  await sb("payment_intents", { method: "POST", body: JSON.stringify(row) }).catch(() => undefined);
}

async function loadPaymentIntent(paymentId: string): Promise<any | null> {
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

  let serviceRow: any = null;
  if (serviceId) {
    try {
      const sres = await sb(
        `services?id=eq.${encodeURIComponent(String(serviceId))}&select=id,provider_id,title,base_price_ngn,duration,calculated_pi_price&limit=1`,
      );
      if (sres?.ok) {
        const srows = (await sres.json()) as any[];
        serviceRow = srows?.[0] || null;
        if (serviceRow?.provider_id && !providerId) providerId = serviceRow.provider_id;
        if (serviceRow?.title && serviceTitle === "Service") {
          // keep serviceTitle from intent/meta when available
        }
      }
    } catch {
      /* non-fatal */
    }
  }

  if (!providerId && serviceId) {
    try {
      const sres = await sb(
        `services?id=eq.${encodeURIComponent(String(serviceId))}&select=provider_id&limit=1`,
      );
      if (sres?.ok) {
        const srows = (await sres.json()) as any[];
        if (srows?.[0]?.provider_id) providerId = srows[0].provider_id;
      }
    } catch {
      /* non-fatal */
    }
  }

  const customerName = String(
    meta.clientName || meta.customer_name || intentMeta.clientName || intentMeta.customer_name || "Pi User",
  ).slice(0, 120);
  const customerPiUsername = String(
    meta.clientUsername || meta.customer_pi_username || intentMeta.clientUsername || "",
  ).slice(0, 80);
  const customerPhone = String(meta.clientPhone || meta.phone || intentMeta.clientPhone || "").slice(0, 40) || null;
  const customerEmail = String(meta.clientEmail || meta.email || intentMeta.clientEmail || "").slice(0, 120) || null;
  const notes = String(meta.notes || intentMeta.notes || "").slice(0, 500) || null;

  const now = new Date().toISOString();
  const acceptanceDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const basePriceRaw =
    intentMeta.basePrice ??
    intentMeta.priceNGN ??
    intentMeta.base_price ??
    intentMeta.price_ngn ??
    meta.basePrice ??
    meta.priceNGN ??
    meta.base_price ??
    meta.price_ngn ??
    serviceRow?.base_price_ngn;
  const basePrice = Number.isFinite(Number(basePriceRaw)) ? Number(basePriceRaw) : 0;
  const durationMinutes =
    Number(
      intentMeta.durationMinutes ||
        intentMeta.duration_minutes ||
        meta.durationMinutes ||
        meta.duration_minutes ||
        serviceRow?.duration ||
        60,
    ) || 60;
  // currency intentionally omitted from insert — column does not exist on production bookings (PGRST204)
  const currency = String(intentMeta.currency || meta.currency || "NGN").slice(0, 10) || "NGN"; // log only

  const payload: Record<string, any> = {
    status: "Pending",
    payment_status: "Paid",
    escrow_status: "paid_escrowed",
    paid_at: now,
    acceptance_deadline: acceptanceDeadline,
    price_pi: amount,
    price_ngn: basePrice,
    duration_minutes: durationMinutes,
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
  if (serviceId) payload.service_id = serviceId;

  log?.info?.({
    paymentId,
    hasClientUid: Boolean(clientUid),
    hasProviderId: Boolean(providerId),
    hasDate: Boolean(bookingDate),
    hasTime: Boolean(bookingTime),
    price_ngn: basePrice,
    duration_minutes: durationMinutes,
    currency,
    amount,
    metaKeys: Object.keys(meta),
    hasIntent: Boolean(intent),
  }, "finalizeBookingFromPayment payload readiness");

  if (!providerId) {
    const missing: string[] = [];
    if (!providerId) missing.push("provider_id");
    if (!serviceId) missing.push("service_id");
    if (!clientUid) missing.push("client_pi_uid");
    return {
      status: "failed",
      error:
        "Cannot reconstruct booking: provider_id is required. Ensure payment metadata includes providerId (and serviceId). " +
        `Missing: ${missing.join(", ")}. metaKeys=[${Object.keys(meta).join(",")}]`,
    };
  }

  const insertRes = await sb("bookings", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { Prefer: "return=representation" },
  });
  if (!insertRes) {
    return { status: "failed", error: "Supabase client unavailable." };
  }
  const insertText = await insertRes.text().catch(() => "");
  let insertBody: any = {};
  try {
    insertBody = JSON.parse(insertText);
  } catch {
    insertBody = { message: insertText };
  }
  if (!insertRes.ok) {
    log?.error?.({ status: insertRes.status, body: insertBody, paymentId }, "Booking insert failed");
    const code = insertBody?.code || insertBody?.error_code;
    if (code === "23505" || String(insertBody?.message || "").includes("duplicate")) {
      const again = await sb(
        `bookings?pi_payment_id=eq.${encodeURIComponent(paymentId)}&select=id,acceptance_deadline&limit=1`,
      );
      if (again?.ok) {
        const rows = (await again.json()) as any[];
        if (rows?.[0]?.id) {
          return { status: "recovered", bookingId: rows[0].id, acceptanceDeadline: rows[0].acceptance_deadline };
        }
      }
    }
    return {
      status: "failed",
      error: insertBody?.message || insertBody?.error || `Booking insert failed (${insertRes.status})`,
    };
  }
  const created = Array.isArray(insertBody) ? insertBody[0] : insertBody;
  const bookingId = created?.id;
  if (!bookingId) {
    return { status: "failed", error: "Booking insert returned no id." };
  }
  log?.info?.({ bookingId, paymentId, acceptanceDeadline }, "Booking created from Pi payment");
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
  let payment: any;
  try {
    payment = await fetchPiPayment(cleanPaymentId);
  } catch (e: any) {
    req.log.warn({ err: e?.message, status: e?.status, paymentId: cleanPaymentId }, "Approve: Pi GET failed");
    res.status(e?.status || 502).json({ error: e?.message || "Could not fetch payment from Pi.", piBody: e?.body });
    return;
  }
  try {
    await piFetch(`/payments/${encodeURIComponent(cleanPaymentId)}/approve`, { method: "POST", body: "{}" });
  } catch (e: any) {
    req.log.warn({ err: e?.message }, "Approve: Pi approve call failed (may already be approved)");
  }
  let paymentIntentPersisted = false;
  try {
    await upsertPaymentIntent(payment, { status: "approved" });
    paymentIntentPersisted = true;
  } catch (e: any) {
    req.log.warn({ err: e?.message }, "Approve: payment_intent upsert failed");
  }
  res.status(200).json({
    success: true,
    paymentId: cleanPaymentId,
    paymentIntentPersisted,
  });
});

router.post("/pi/payments/complete", async (req, res) => {
  const { paymentId, txid } = req.body as { paymentId?: string; txid?: string };
  if (!paymentId || typeof paymentId !== "string" || paymentId.trim() === "") {
    res.status(400).json({ error: "paymentId is required." });
    return;
  }
  if (!piApiKey()) {
    res.status(500).json({ error: "Server configuration error: PI_API_KEY missing." });
    return;
  }
  const cleanPaymentId = paymentId.trim();
  const cleanTxid = typeof txid === "string" ? txid.trim() : "";
  let payment: any;
  try {
    payment = await fetchPiPayment(cleanPaymentId);
  } catch (e: any) {
    req.log.warn({ err: e?.message, status: e?.status, paymentId: cleanPaymentId }, "Complete: Pi GET failed");
    res.status(e?.status || 502).json({ error: e?.message || "Could not fetch payment from Pi.", piBody: e?.body });
    return;
  }
  if (cleanTxid) {
    try {
      await piFetch(`/payments/${encodeURIComponent(cleanPaymentId)}/complete`, {
        method: "POST",
        body: JSON.stringify({ txid: cleanTxid }),
      });
      payment = await fetchPiPayment(cleanPaymentId);
    } catch (e: any) {
      req.log.warn({ err: e?.message }, "Complete: Pi complete call failed (may already be completed)");
    }
  }
  await upsertPaymentIntent(payment, { txid: cleanTxid || payment?.transaction?.txid, status: "completed" });
  const finalized = cleanTxid || payment?.transaction?.txid
    ? await finalizeBookingFromPayment(payment, cleanTxid || payment?.transaction?.txid || "", req.log)
    : { status: "failed" as const, error: "Missing txid for booking finalization." };
  if (finalized.status === "failed") {
    res.status(502).json({
      success: false,
      error: finalized.error,
      paymentId: cleanPaymentId,
      txid: cleanTxid || null,
      bookingReconciled: false,
    });
    return;
  }
  res.status(200).json({
    success: true,
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
