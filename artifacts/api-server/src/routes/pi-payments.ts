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

async function finalizeBookingFromPayment(
  payment: any,
  txid: string,
  log?: { info: Function; warn: Function; error: Function },
): Promise<{ bookingId?: string; status: "created" | "recovered" | "failed"; error?: string }> {
  const paymentId = String(payment?.identifier || payment?.id || "").trim();
  if (!paymentId) return { status: "failed", error: "Missing payment identifier." };

  const existing = await sb(
    `bookings?pi_payment_id=eq.${encodeURIComponent(paymentId)}&select=id,status,escrow_status,payment_status&limit=1`,
  );
  if (existing?.ok) {
    const rows = (await existing.json()) as any[];
    if (rows?.[0]?.id) {
      return { status: "recovered", bookingId: rows[0].id };
    }
  }

  if (txid) {
    const byTx = await sb(`bookings?pi_tx_hash=eq.${encodeURIComponent(txid)}&select=id&limit=1`);
    if (byTx?.ok) {
      const rows = (await byTx.json()) as any[];
      if (rows?.[0]?.id) {
        await sb(`bookings?id=eq.${encodeURIComponent(rows[0].id)}`, {
          method: "PATCH",
          body: JSON.stringify({ pi_payment_id: paymentId, updated_at: new Date().toISOString() }),
        }).catch(() => undefined);
        return { status: "recovered", bookingId: rows[0].id };
      }
    }
  }

  const meta = metaOf(payment);
  const amount = Number(payment?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "failed", error: "Pi payment amount is invalid." };
  }

  const clientUid = String(
    payment?.user_uid || payment?.uid || payment?.from_uid || payment?.user?.uid || meta.clientPiUid || "",
  ).trim();
  const serviceTitle = String(meta.serviceName || meta.service_title || payment?.memo || "Service").slice(0, 200);
  let bookingDate = String(meta.date || meta.booking_date || "").trim();
  let bookingTime = String(meta.timeSlot || meta.booking_time || "").trim();
  let providerId = meta.providerId || meta.provider_id || null;
  let serviceId = meta.serviceId || meta.service_id || null;

  // Parse memo: "Booking: TITLE (YYYY-MM-DD @ TIME)" when meta is sparse
  if ((!bookingDate || !bookingTime || !providerId) && payment?.memo) {
    const memo = String(payment.memo);
    const m = memo.match(/\((\d{4}-\d{2}-\d{2})\s*@\s*([^)]+)\)/);
    if (m) {
      if (!bookingDate) bookingDate = m[1].trim();
      if (!bookingTime) bookingTime = m[2].trim();
    }
  }

  if (!providerId && serviceId) {
    try {
      const sres = await sb(`services?id=eq.${encodeURIComponent(String(serviceId))}&select=id,provider_id,title&limit=1`);
      if (sres?.ok) {
        const srows = (await sres.json()) as any[];
        if (srows?.[0]?.provider_id) providerId = srows[0].provider_id;
      }
    } catch { /* non-fatal */ }
  }
  if (!providerId && serviceTitle && serviceTitle !== "Service") {
    try {
      let titleQuery = serviceTitle;
      if (/^Booking:\s*/i.test(titleQuery)) {
        titleQuery = titleQuery.replace(/^Booking:\s*/i, "");
        const paren = titleQuery.indexOf("(");
        if (paren > 0) titleQuery = titleQuery.slice(0, paren).trim();
        titleQuery = titleQuery.replace(/\s+with\s+PI\s+BOOKINGS.*$/i, "").trim();
      }
      if (titleQuery) {
        const sres = await sb(`services?title=ilike.${encodeURIComponent(titleQuery)}&select=id,provider_id,title&limit=5`);
        if (sres?.ok) {
          const srows = (await sres.json()) as any[];
          if (srows?.length === 1 && srows[0]?.provider_id) {
            providerId = srows[0].provider_id;
            if (!serviceId) serviceId = srows[0].id;
          } else if (srows?.length > 1) {
            const exact = srows.find((r: any) => String(r.title || "").toLowerCase() === titleQuery.toLowerCase());
            if (exact?.provider_id) {
              providerId = exact.provider_id;
              if (!serviceId) serviceId = exact.id;
            }
          }
        }
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
  const customerName = String(meta.clientName || meta.client_name || "Pi User").slice(0, 200);
  const customerPiUsername = String(meta.clientPiUsername || meta.client_pi_username || "").slice(0, 100);

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
    customer_telegram_username: String(meta.clientPhone || meta.client_phone || "").slice(0, 100) || null,
    customer_email: String(meta.clientEmail || meta.client_email || "").slice(0, 200) || null,
    service_title: serviceTitle,
    booking_date: bookingDate || null,
    booking_time: bookingTime || null,
    notes: String(meta.notes || "").slice(0, 2000) || null,
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
    serviceTitle,
  }, "finalizeBookingFromPayment payload readiness");

  if (!providerId) {
    const missingHint = missing.length ? ` Missing fields: ${missing.join(", ")}.` : " Missing fields: provider_id.";
    return {
      status: "failed",
      error:
        "Cannot reconstruct booking: provider_id is required and was not present in Pi payment metadata, payment_intents, or services lookup." +
        missingHint +
        ` metaKeys=[${Object.keys(meta).join(",")}] serviceTitle=${JSON.stringify(serviceTitle)}`,
    };
  }

  const insert = await sb(`bookings`, { method: "POST", body: JSON.stringify(payload) });
  if (!insert) return { status: "failed", error: "Supabase not configured on server." };
  if (!insert.ok) {
    const detail = await insert.text().catch(() => "");
    if (insert.status === 409 || detail.includes("23505")) {
      const again = await sb(`bookings?pi_payment_id=eq.${encodeURIComponent(paymentId)}&select=id&limit=1`);
      const rows = again?.ok ? ((await again.json()) as any[]) : [];
      if (rows?.[0]?.id) return { status: "recovered", bookingId: rows[0].id };
    }
    log?.error?.({ detail: detail.slice(0, 400), paymentId, missing }, "Failed to insert booking from payment");
    const missingHint = missing.length ? ` Missing fields: ${missing.join(", ")}.` : "";
    return { status: "failed", error: `Booking insert failed (${insert.status}): ${detail.slice(0, 300)}.${missingHint}` };
  }
  const created = (await insert.json()) as any[];
  const bookingId = created?.[0]?.id;
  if (!bookingId) return { status: "failed", error: "Booking insert returned no id." };

  await sb(`payment_intents?pi_payment_id=eq.${encodeURIComponent(paymentId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "completed", booking_id: bookingId, pi_txid: txid || null, completed_at: now, updated_at: now }),
  }).catch(() => undefined);

  log?.info?.({ paymentId, bookingId, txid }, "Booking finalized from Pi payment");
  return { status: "created", bookingId };
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
  try {
    const payment = responseData?.identifier ? responseData : await fetchPiPayment(cleanPaymentId);
    await upsertPaymentIntent(payment, { status: "approved" });
  } catch (e: any) {
    req.log.warn({ err: e?.message, paymentId: cleanPaymentId }, "Could not persist payment_intent after approve");
  }
  res.status(piResponse.status).json(responseData);
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
  res.status(200).json({ ...responseData, bookingReconciled: true, bookingId: finalized.bookingId, bookingStatus: finalized.status, paymentId: cleanPaymentId, txid: cleanTxid });
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
  req.log.info({ paymentId: cleanPaymentId, completed, hasTxid: Boolean(txid), amount: payment?.amount, user_uid: payment?.user_uid ? "[present]" : null }, "Reconcile: Pi payment status");
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
  res.status(200).json({ success: true, paymentId: cleanPaymentId, txid, bookingId: finalized.bookingId, bookingStatus: finalized.status });
});

export default router;
