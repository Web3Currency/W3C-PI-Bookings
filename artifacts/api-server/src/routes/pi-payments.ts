import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * POST /api/pi/payments/approve
 *
 * Server-side payment approval with Pi Network backend API.
 * Body: { paymentId: string }
 * Headers: Authorization: Key <PI_API_KEY>
 */
router.post("/pi/payments/approve", async (req, res) => {
  const { paymentId } = req.body as { paymentId?: string };

  if (!paymentId || typeof paymentId !== "string" || paymentId.trim() === "") {
    res.status(400).json({ error: "paymentId is required." });
    return;
  }

  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    req.log.error("PI_API_KEY environment variable is not set on the server.");
    res.status(500).json({ error: "Server configuration error: PI_API_KEY missing." });
    return;
  }

  const cleanPaymentId = paymentId.trim();

  let piResponse: Response;
  try {
    piResponse = await fetch(`https://api.minepi.com/v2/payments/${cleanPaymentId}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err: any) {
    req.log.error({ err, paymentId: cleanPaymentId }, "Network error calling Pi API approve payment");
    res.status(500).json({ error: "Could not reach Pi Network API." });
    return;
  }

  let responseData: any;
  const rawText = await piResponse.text().catch(() => "");
  try {
    responseData = JSON.parse(rawText);
  } catch {
    responseData = { message: rawText };
  }

  if (!piResponse.ok) {
    req.log.warn(
      { status: piResponse.status, paymentId: cleanPaymentId, responseData },
      "Pi API rejected payment approval"
    );
    res.status(piResponse.status).json(responseData);
    return;
  }

  req.log.info({ paymentId: cleanPaymentId }, "Pi payment approved successfully");
  res.status(piResponse.status).json(responseData);
});

/**
 * POST /api/pi/payments/complete
 *
 * Server-side payment completion with Pi Network backend API.
 * Body: { paymentId: string, txid: string }
 * Headers: Authorization: Key <PI_API_KEY>
 */
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

  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    req.log.error("PI_API_KEY environment variable is not set on the server.");
    res.status(500).json({ error: "Server configuration error: PI_API_KEY missing." });
    return;
  }

  const cleanPaymentId = paymentId.trim();
  const cleanTxid = txid.trim();

  let piResponse: Response;
  try {
    piResponse = await fetch(`https://api.minepi.com/v2/payments/${cleanPaymentId}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid: cleanTxid }),
    });
  } catch (err: any) {
    req.log.error({ err, paymentId: cleanPaymentId, txid: cleanTxid }, "Network error calling Pi API complete payment");
    res.status(500).json({ error: "Could not reach Pi Network API." });
    return;
  }

  let responseData: any;
  const rawText = await piResponse.text().catch(() => "");
  try {
    responseData = JSON.parse(rawText);
  } catch {
    responseData = { message: rawText };
  }

  if (!piResponse.ok) {
    req.log.warn(
      { status: piResponse.status, paymentId: cleanPaymentId, txid: cleanTxid, responseData },
      "Pi API rejected payment completion"
    );
    res.status(piResponse.status).json(responseData);
    return;
  }

  req.log.info({ paymentId: cleanPaymentId, txid: cleanTxid }, "Pi payment completed successfully");
  res.status(piResponse.status).json(responseData);
});

export default router;
