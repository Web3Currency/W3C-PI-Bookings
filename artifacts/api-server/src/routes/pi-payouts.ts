import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * POST /api/pi/payouts/release
 *
 * Executes a Pi Network App-to-User (A2U) payout using pi-backend SDK / Pi Network API v2.
 * Body: { bookingId: string, amountPi: number, providerPiUid: string, providerWalletAddress?: string }
 */
router.post("/pi/payouts/release", async (req, res) => {
  const { bookingId, amountPi, providerPiUid, providerWalletAddress } = req.body as {
    bookingId?: string;
    amountPi?: number;
    providerPiUid?: string;
    providerWalletAddress?: string;
  };

  if (!bookingId || typeof bookingId !== "string" || bookingId.trim() === "") {
    res.status(400).json({ error: "bookingId is required." });
    return;
  }

  if (amountPi === undefined || typeof amountPi !== "number" || amountPi <= 0) {
    res.status(400).json({ error: "amountPi must be a positive number." });
    return;
  }

  if (!providerPiUid || typeof providerPiUid !== "string" || providerPiUid.trim() === "") {
    res.status(400).json({ error: "providerPiUid is required." });
    return;
  }

  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    req.log.error("PI_API_KEY environment variable is not set on the server.");
    res.status(500).json({ error: "Server configuration error: PI_API_KEY missing." });
    return;
  }

  const walletPrivateSeed = process.env.PI_WALLET_PRIVATE_SEED || "";

  try {
    let piBackendSDK: any;
    try {
      const PiBackendModule = await import("pi-backend");
      const PiNetworkClass = (PiBackendModule as any).default || PiBackendModule;
      piBackendSDK = new PiNetworkClass(apiKey.trim(), walletPrivateSeed.trim());
    } catch (importErr) {
      req.log.info("pi-backend package dynamic import failed, falling back to direct Pi REST API calls.");
    }

    let paymentId = "";
    let txid = "";

    if (piBackendSDK && typeof piBackendSDK.createPayment === "function") {
      req.log.info({ bookingId, providerPiUid, amountPi }, "Initiating A2U payout via pi-backend SDK");
      const paymentData = {
        amount: Number(amountPi),
        memo: `Escrow payout for booking ${bookingId}`,
        metadata: { bookingId, type: "payout" },
        uid: providerPiUid.trim(),
      };

      const payment = await piBackendSDK.createPayment(paymentData);
      paymentId = payment.identifier || payment.id || payment.paymentId;

      const submitted = await piBackendSDK.submitPayment(paymentId);
      txid = submitted.transaction?.txid || submitted.txid || paymentId;

      await piBackendSDK.completePayment(paymentId, txid);
    } else {
      req.log.info({ bookingId, providerPiUid, amountPi }, "Initiating A2U payout via Pi REST API v2");
      // 1. Create Payment
      const createRes = await fetch("https://api.minepi.com/v2/payments", {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment: {
            amount: Number(amountPi),
            memo: `Escrow payout for booking ${bookingId}`,
            metadata: { bookingId, type: "payout" },
            uid: providerPiUid.trim(),
          },
        }),
      });

      const createRaw = await createRes.text().catch(() => "");
      let createData: any = {};
      try { createData = JSON.parse(createRaw); } catch { createData = { message: createRaw }; }

      if (!createRes.ok) {
        req.log.error({ status: createRes.status, createData }, "Failed to create Pi A2U payment");
        res.status(createRes.status).json({
          error: createData.error || createData.message || "Failed to create A2U payment with Pi Network."
        });
        return;
      }

      paymentId = createData.identifier || createData.id;

      // 2. Submit Payment
      const submitRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
      });

      const submitRaw = await submitRes.text().catch(() => "");
      let submitData: any = {};
      try { submitData = JSON.parse(submitRaw); } catch { submitData = { message: submitRaw }; }

      if (!submitRes.ok) {
        req.log.error({ status: submitRes.status, submitData }, "Failed to submit Pi A2U payment");
        res.status(submitRes.status).json({
          error: submitData.error || submitData.message || "Failed to submit A2U payment with Pi Network."
        });
        return;
      }

      txid = submitData.txid || submitData.transaction?.txid || paymentId;

      // 3. Complete Payment
      const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      });

      const completeRaw = await completeRes.text().catch(() => "");
      let completeData: any = {};
      try { completeData = JSON.parse(completeRaw); } catch { completeData = { message: completeRaw }; }

      if (!completeRes.ok) {
        req.log.error({ status: completeRes.status, completeData }, "Failed to complete Pi A2U payment");
        res.status(completeRes.status).json({
          error: completeData.error || completeData.message || "Failed to complete A2U payment with Pi Network."
        });
        return;
      }
    }

    req.log.info({ bookingId, paymentId, txid }, "A2U payout released successfully");
    res.status(200).json({ success: true, txid, paymentId });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "A2U payout execution threw an error");
    res.status(500).json({ error: err?.message || "Failed to process Pi A2U payout." });
  }
});

/**
 * POST /api/pi/payouts/refund
 *
 * Executes a Pi Network App-to-User (A2U) refund using pi-backend SDK / Pi Network API v2.
 * Body: { bookingId: string, amountPi: number, clientPiUid: string }
 */
router.post("/pi/payouts/refund", async (req, res) => {
  const { bookingId, amountPi, clientPiUid } = req.body as {
    bookingId?: string;
    amountPi?: number;
    clientPiUid?: string;
  };

  if (!bookingId || typeof bookingId !== "string" || bookingId.trim() === "") {
    res.status(400).json({ error: "bookingId is required." });
    return;
  }

  if (amountPi === undefined || typeof amountPi !== "number" || amountPi <= 0) {
    res.status(400).json({ error: "amountPi must be a positive number." });
    return;
  }

  if (!clientPiUid || typeof clientPiUid !== "string" || clientPiUid.trim() === "") {
    res.status(400).json({ error: "clientPiUid is required." });
    return;
  }

  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    req.log.error("PI_API_KEY environment variable is not set on the server.");
    res.status(500).json({ error: "Server configuration error: PI_API_KEY missing." });
    return;
  }

  const walletPrivateSeed = process.env.PI_WALLET_PRIVATE_SEED || "";
  const cleanUid = clientPiUid.trim().replace(/^@/, "");

  try {
    let piBackendSDK: any;
    try {
      const PiBackendModule = await import("pi-backend");
      const PiNetworkClass = (PiBackendModule as any).default || PiBackendModule;
      piBackendSDK = new PiNetworkClass(apiKey.trim(), walletPrivateSeed.trim());
    } catch (importErr) {
      req.log.info("pi-backend package dynamic import failed, falling back to direct Pi REST API calls.");
    }

    let paymentId = "";
    let txid = "";

    if (piBackendSDK && typeof piBackendSDK.createPayment === "function") {
      req.log.info({ bookingId, cleanUid, amountPi }, "Initiating A2U refund via pi-backend SDK");
      const paymentData = {
        amount: Number(amountPi),
        memo: `Refund for booking ${bookingId}`,
        metadata: { bookingId, type: "refund" },
        uid: cleanUid,
      };

      const payment = await piBackendSDK.createPayment(paymentData);
      paymentId = payment.identifier || payment.id || payment.paymentId;

      const submitted = await piBackendSDK.submitPayment(paymentId);
      txid = submitted.transaction?.txid || submitted.txid || paymentId;

      await piBackendSDK.completePayment(paymentId, txid);
    } else {
      req.log.info({ bookingId, cleanUid, amountPi }, "Initiating A2U refund via Pi REST API v2");
      // 1. Create Payment
      const createRes = await fetch("https://api.minepi.com/v2/payments", {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment: {
            amount: Number(amountPi),
            memo: `Refund for booking ${bookingId}`,
            metadata: { bookingId, type: "refund" },
            uid: cleanUid,
          },
        }),
      });

      const createRaw = await createRes.text().catch(() => "");
      let createData: any = {};
      try { createData = JSON.parse(createRaw); } catch { createData = { message: createRaw }; }

      if (!createRes.ok) {
        req.log.error({ status: createRes.status, createData }, "Failed to create Pi A2U refund payment");
        res.status(createRes.status).json({
          error: createData.error || createData.message || "Failed to create A2U refund payment with Pi Network."
        });
        return;
      }

      paymentId = createData.identifier || createData.id;

      // 2. Submit Payment
      const submitRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
      });

      const submitRaw = await submitRes.text().catch(() => "");
      let submitData: any = {};
      try { submitData = JSON.parse(submitRaw); } catch { submitData = { message: submitRaw }; }

      if (!submitRes.ok) {
        req.log.error({ status: submitRes.status, submitData }, "Failed to submit Pi A2U refund payment");
        res.status(submitRes.status).json({
          error: submitData.error || submitData.message || "Failed to submit A2U refund payment with Pi Network."
        });
        return;
      }

      txid = submitData.txid || submitData.transaction?.txid || paymentId;

      // 3. Complete Payment
      const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      });

      const completeRaw = await completeRes.text().catch(() => "");
      let completeData: any = {};
      try { completeData = JSON.parse(completeRaw); } catch { completeData = { message: completeRaw }; }

      if (!completeRes.ok) {
        req.log.error({ status: completeRes.status, completeData }, "Failed to complete Pi A2U refund payment");
        res.status(completeRes.status).json({
          error: completeData.error || completeData.message || "Failed to complete A2U refund payment with Pi Network."
        });
        return;
      }
    }

    req.log.info({ bookingId, paymentId, txid }, "A2U refund processed successfully");
    res.status(200).json({ success: true, txid, paymentId });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "A2U refund execution threw an error");
    res.status(500).json({ error: err?.message || "Failed to process Pi A2U refund." });
  }
});

export default router;
