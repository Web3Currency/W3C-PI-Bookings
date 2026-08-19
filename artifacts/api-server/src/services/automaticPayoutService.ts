type PayoutResult = {
  status: "completed" | "failed" | "recovered";
  paymentId?: string;
  txid?: string;
  error?: string;
};

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

export async function executeAutomaticProviderPayout(bookingId: string): Promise<PayoutResult> {
  const config = getSupabaseConfig();
  if (!config) return { status: "failed", error: "Server configuration error: Supabase server credentials are missing." };

  const bookingResponse = await supabaseRequest(
    `bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,status,escrow_status,price_pi,provider_payout_pi,provider_id,released_at`,
  );
  if (!bookingResponse) return { status: "failed", error: "Booking database connection is not configured on the API server." };
  if (!bookingResponse.ok) {
    const text = await bookingResponse.text().catch(() => "");
    return { status: "failed", error: text || `Supabase booking lookup failed (${bookingResponse.status}).` };
  }

  const bookings = await bookingResponse.json();
  const booking = Array.isArray(bookings) ? bookings[0] : null;
  if (!booking) return { status: "failed", error: "Booking not found." };
  if (booking.escrow_status === "released") return { status: "recovered" };
  if (booking.escrow_status !== "completion_confirmed") {
    return { status: "failed", error: "Booking is not ready for automatic payout." };
  }

  const providerResponse = await supabaseRequest(
    `providers?id=eq.${encodeURIComponent(booking.provider_id || "")}&select=id,pi_uid&limit=1`,
  );
  if (!providerResponse) return { status: "failed", error: "Provider database connection is not configured on the API server." };
  if (!providerResponse.ok) {
    const text = await providerResponse.text().catch(() => "");
    return { status: "failed", error: text || `Supabase provider lookup failed (${providerResponse.status}).` };
  }
  const providers = await providerResponse.json();
  const provider = Array.isArray(providers) ? providers[0] : null;
  const providerPiUid = provider?.pi_uid?.trim();
  if (!providerPiUid) return { status: "failed", error: "Provider Pi UID is missing. Payout cannot be sent safely." };

  const amountPi = Number(booking.provider_payout_pi ?? Number(booking.price_pi || 0) * 0.9);
  if (!Number.isFinite(amountPi) || amountPi <= 0) return { status: "failed", error: "Provider payout amount is invalid." };

  const existingResponse = await supabaseRequest(
    `payouts?booking_id=eq.${encodeURIComponent(bookingId)}&select=id,status,pi_payment_id,pi_txid,failure_reason&order=created_at.desc&limit=1`,
  );
  if (!existingResponse) return { status: "failed", error: "Payout database connection is not configured on the API server." };
  if (!existingResponse.ok) {
    const text = await existingResponse.text().catch(() => "");
    return { status: "failed", error: text || `Supabase payout lookup failed (${existingResponse.status}).` };
  }
  const existingRows = await existingResponse.json();
  const existing = Array.isArray(existingRows) ? existingRows[0] : null;

  if (existing?.status === "completed") {
    const now = new Date().toISOString();
    const releaseResponse = await supabaseRequest(
      `bookings?id=eq.${encodeURIComponent(bookingId)}&escrow_status=eq.completion_confirmed`,
      { method: "PATCH", body: JSON.stringify({ status: "Completed", escrow_status: "released", released_at: now, updated_at: now }) },
    );
    if (!releaseResponse?.ok) return { status: "failed", paymentId: existing.pi_payment_id || undefined, txid: existing.pi_txid || undefined, error: "Existing payout is complete but booking release reconciliation failed." };
    return { status: "recovered", paymentId: existing.pi_payment_id || undefined, txid: existing.pi_txid || undefined };
  }

  if (existing && ["pending", "submitted"].includes(existing.status)) {
    return {
      status: "failed",
      paymentId: existing.pi_payment_id || undefined,
      txid: existing.pi_txid || undefined,
      error: existing.failure_reason || "An unresolved payout already exists for this booking.",
    };
  }

  const payoutInsert = await supabaseRequest("payouts", {
    method: "POST",
    body: JSON.stringify({ booking_id: bookingId, provider_id: provider.id, amount_pi: amountPi, status: "pending" }),
  });
  if (!payoutInsert?.ok) {
    const text = await payoutInsert?.text().catch(() => "");
    return { status: "failed", error: text || "Failed to create payout record." };
  }
  const payoutRows = await payoutInsert.json();
  const payoutId = Array.isArray(payoutRows) ? payoutRows[0]?.id : undefined;
  if (!payoutId) return { status: "failed", error: "Payout record was not created." };

  const markFailed = async (reason: string, paymentId?: string, txid?: string) => {
    await supabaseRequest(`payouts?id=eq.${encodeURIComponent(payoutId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "failed", pi_payment_id: paymentId || null, pi_txid: txid || null, failure_reason: reason }),
    }).catch(() => undefined);
    return { status: "failed" as const, paymentId, txid, error: reason };
  };

  const apiKey = process.env.PI_API_KEY?.trim();
  if (!apiKey) return markFailed("Server configuration error: PI_API_KEY missing.");

  let paymentId: string | undefined;
  let txid: string | undefined;

  try {
    const createRes = await fetch("https://api.minepi.com/v2/payments", {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ payment: { amount: amountPi, memo: `Escrow payout for booking ${bookingId}`, metadata: { bookingId, type: "payout" }, uid: providerPiUid } }),
    });
    const createRaw = await createRes.text().catch(() => "");
    let createData: any = {};
    try { createData = JSON.parse(createRaw); } catch { createData = { message: createRaw }; }
    if (!createRes.ok) return markFailed(createData.error || createData.message || `Pi payment creation failed (${createRes.status}).`);

    paymentId = createData.identifier || createData.id;
    if (!paymentId) return markFailed("Pi Network did not return a payment identifier.");

    const submitRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/submit`, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
    });
    const submitRaw = await submitRes.text().catch(() => "");
    let submitData: any = {};
    try { submitData = JSON.parse(submitRaw); } catch { submitData = { message: submitRaw }; }
    if (!submitRes.ok) return markFailed(submitData.error || submitData.message || `Pi payment submission failed (${submitRes.status}).`, paymentId);

    txid = submitData.txid || submitData.transaction?.txid || undefined;
    if (!txid) return markFailed("Pi Network did not return a transaction ID after submission.", paymentId);

    const submittedAt = new Date().toISOString();
    const submittedRecord = await supabaseRequest(`payouts?id=eq.${encodeURIComponent(payoutId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "submitted", pi_payment_id: paymentId, pi_txid: txid }),
    });
    if (!submittedRecord?.ok) return markFailed("Payout was submitted to Pi but the payout record could not be updated.", paymentId, txid);
    void submittedAt;

    const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ txid }),
    });
    const completeRaw = await completeRes.text().catch(() => "");
    let completeData: any = {};
    try { completeData = JSON.parse(completeRaw); } catch { completeData = { message: completeRaw }; }
    if (!completeRes.ok) return markFailed(completeData.error || completeData.message || `Pi payment completion failed (${completeRes.status}).`, paymentId, txid);

    txid = completeData.txid || completeData.transaction?.txid || txid;
    const completedAt = new Date().toISOString();
    const completeRecord = await supabaseRequest(`payouts?id=eq.${encodeURIComponent(payoutId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", pi_payment_id: paymentId, pi_txid: txid, failure_reason: null, completed_at: completedAt }),
    });
    if (!completeRecord?.ok) return { status: "failed", paymentId, txid, error: "Pi payout completed, but payout record finalization failed." };

    const releaseResponse = await supabaseRequest(`bookings?id=eq.${encodeURIComponent(bookingId)}&escrow_status=eq.completion_confirmed`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "Completed",
        escrow_status: "released",
        released_at: completedAt,
        updated_at: completedAt,
        platform_fee_pi: Number((Number(booking.price_pi || 0) * 0.1).toFixed(7)),
        provider_payout_pi: amountPi,
      }),
    });
    if (!releaseResponse?.ok) return { status: "failed", paymentId, txid, error: "Pi payout completed, but booking release finalization failed." };

    return { status: "completed", paymentId, txid };
  } catch (err: any) {
    return markFailed(err?.message || "Could not process automatic Pi A2U payout.", paymentId, txid);
  }
}
