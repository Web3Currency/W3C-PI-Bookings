import { Router, type IRouter } from "express";

const router: IRouter = Router();

function getPiApiKey() {
  return (process.env.PI_API_KEY || "").trim();
}

function getPiError(data: any, fallback: string) {
  if (data?.error === "missing_scope" || data?.code === "missing_scope") {
    return "Pi A2U payout is not authorized for this app. The PI_API_KEY must have the required payment/payout scope in the Pi Developer Portal.";
  }
  return data?.error || data?.message || fallback;
}

async function parsePiResponse(response: Response) {
  const raw = await response.text().catch(() => "");
  try { return raw ? JSON.parse(raw) : {}; } catch { return { message: raw }; }
}

async function createA2UPayment(apiKey: string, payment: { amount: number; memo: string; metadata: Record<string, unknown>; uid: string }) {
  return fetch("https://api.minepi.com/v2/payments", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    // Pi's A2U API expects the payment fields at the top level.
    body: JSON.stringify(payment),
  });
}

async function submitPayment(apiKey: string, paymentId: string) {
  return fetch(`https://api.minepi.com/v2/payments/${encodeURIComponent(paymentId)}/submit`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
}

async function completePayment(apiKey: string, paymentId: string, txid: string) {
  return fetch(`https://api.minepi.com/v2/payments/${encodeURIComponent(paymentId)}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ txid }),
  });
}

async function executeA2UPayout({
  apiKey,
  bookingId,
  amountPi,
  recipientUid,
  memo,
  type,
  log,
}: {
  apiKey: string;
  bookingId: string;
  amountPi: number;
  recipientUid: string;
  memo: string;
  type: "payout" | "refund";
  log: any;
}) {
  const paymentData = {
    amount: Number(amountPi),
    memo,
    metadata: { bookingId, type },
    uid: recipientUid.trim().replace(/^@+/, ""),
  };

  log.info({ bookingId, recipientUid: paymentData.uid, amountPi, type }, "Initiating Pi A2U payment");

  const createRes = await createA2UPayment(apiKey, paymentData);
  const createData = await parsePiResponse(createRes);
  if (!createRes.ok) {
    log.error({ status: createRes.status, createData, type }, "Failed to create Pi A2U payment");
    throw Object.assign(new Error(getPiError(createData, `Failed to create A2U ${type} payment with Pi Network.`)), { statusCode: createRes.status });
  }

  const paymentId = createData.identifier || createData.id;
  if (!paymentId) throw Object.assign(new Error("Pi Network did not return a payment identifier."), { statusCode: 502 });

  const submitRes = await submitPayment(apiKey, paymentId);
  const submitData = await parsePiResponse(submitRes);
  if (!submitRes.ok) {
    log.error({ status: submitRes.status, submitData, paymentId, type }, "Failed to submit Pi A2U payment");
    throw Object.assign(new Error(getPiError(submitData, `Failed to submit A2U ${type} payment with Pi Network.`)), { statusCode: submitRes.status });
  }

  const txid = submitData.txid || submitData.transaction?.txid || paymentId;

  const completeRes = await completePayment(apiKey, paymentId, txid);
  const completeData = await parsePiResponse(completeRes);
  if (!completeRes.ok) {
    log.error({ status: completeRes.status, completeData, paymentId, txid, type }, "Failed to complete Pi A2U payment");
    throw Object.assign(new Error(getPiError(completeData, `Failed to complete A2U ${type} payment with Pi Network.`)), { statusCode: completeRes.status });
  }

  return { paymentId, txid };
}

router.post("/pi/payouts/release", async (req, res) => {
  const { bookingId, amountPi, providerPiUid } = req.body as {
    bookingId?: string;
    amountPi?: number;
    providerPiUid?: string;
  };

  if (!bookingId || typeof bookingId !== "string" || bookingId.trim() === "") return void res.status(400).json({ error: "bookingId is required." });
  if (amountPi === undefined || typeof amountPi !== "number" || amountPi <= 0) return void res.status(400).json({ error: "amountPi must be a positive number." });
  if (!providerPiUid || typeof providerPiUid !== "string" || providerPiUid.trim() === "") return void res.status(400).json({ error: "providerPiUid is required." });

  const apiKey = getPiApiKey();
  if (!apiKey) {
    req.log.error("PI_API_KEY environment variable is not set on the server.");
    return void res.status(500).json({ error: "Server configuration error: PI_API_KEY missing." });
  }

  try {
    const result = await executeA2UPayout({
      apiKey,
      bookingId,
      amountPi,
      recipientUid: providerPiUid,
      memo: `Escrow payout for booking ${bookingId}`,
      type: "payout",
      log: req.log,
    });
    req.log.info({ bookingId, ...result }, "A2U payout released successfully");
    return void res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "A2U payout execution failed");
    return void res.status(err?.statusCode || 500).json({ error: err?.message || "Failed to process Pi A2U payout." });
  }
});

router.post("/pi/payouts/refund", async (req, res) => {
  const { bookingId, amountPi, clientPiUid } = req.body as {
    bookingId?: string;
    amountPi?: number;
    clientPiUid?: string;
  };

  if (!bookingId || typeof bookingId !== "string" || bookingId.trim() === "") return void res.status(400).json({ error: "bookingId is required." });
  if (amountPi === undefined || typeof amountPi !== "number" || amountPi <= 0) return void res.status(400).json({ error: "amountPi must be a positive number." });
  if (!clientPiUid || typeof clientPiUid !== "string" || clientPiUid.trim() === "") return void res.status(400).json({ error: "clientPiUid is required." });

  const apiKey = getPiApiKey();
  if (!apiKey) {
    req.log.error("PI_API_KEY environment variable is not set on the server.");
    return void res.status(500).json({ error: "Server configuration error: PI_API_KEY missing." });
  }

  try {
    const result = await executeA2UPayout({
      apiKey,
      bookingId,
      amountPi,
      recipientUid: clientPiUid,
      memo: `Refund for booking ${bookingId}`,
      type: "refund",
      log: req.log,
    });
    req.log.info({ bookingId, ...result }, "A2U refund processed successfully");
    return void res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "A2U refund execution failed");
    return void res.status(err?.statusCode || 500).json({ error: err?.message || "Failed to process Pi A2U refund." });
  }
});

export default router;
