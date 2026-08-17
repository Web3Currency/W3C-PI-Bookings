import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import PiNetwork from "pi-backend";

const router: IRouter = Router();

/**
 * Provider rejection refund bridge.
 *
 * The provider UI historically sent clientPiUsername as clientPiUid. Pi A2U
 * requires the app-specific UID, not the human-readable username. The booking
 * record already contains client_pi_uid, so the server resolves the recipient
 * from the booking and never trusts the username supplied by the browser.
 */
router.post("/api/pi/payouts/refund", async (req, res) => {
  const { bookingId, amountPi } = req.body as {
    bookingId?: string;
    amountPi?: number;
  };

  if (!bookingId || typeof bookingId !== "string" || bookingId.trim() === "") {
    return void res.status(400).json({ error: "bookingId is required." });
  }
  if (typeof amountPi !== "number" || !Number.isFinite(amountPi) || amountPi <= 0) {
    return void res.status(400).json({ error: "amountPi must be a positive number." });
  }

  const apiKey = process.env.PI_API_KEY?.trim();
  const walletPrivateSeed = process.env.PI_WALLET_PRIVATE_SEED?.trim();
  if (!apiKey) return void res.status(500).json({ error: "Server configuration error: PI_API_KEY missing." });
  if (!walletPrivateSeed) return void res.status(500).json({ error: "Server configuration error: PI_WALLET_PRIVATE_SEED missing." });
  if (!pool) return void res.status(500).json({ error: "Booking database connection is not configured on the API server." });

  try {
    const lookup = await pool.query(
      `SELECT id, client_pi_uid, customer_pi_username, status, escrow_status, price_pi
       FROM public.bookings
       WHERE id = $1
       LIMIT 1`,
      [bookingId.trim()],
    );

    if (lookup.rowCount === 0) {
      return void res.status(404).json({ error: "Booking not found." });
    }

    const booking = lookup.rows[0] as {
      id: string;
      client_pi_uid?: string | null;
      customer_pi_username?: string | null;
      status?: string | null;
      escrow_status?: string | null;
      price_pi?: number | string | null;
    };

    if (!booking.client_pi_uid) {
      return void res.status(409).json({
        error: "Client Pi UID is missing from this booking. The refund cannot safely identify the recipient.",
      });
    }

    if (booking.status !== "Confirmed" || booking.escrow_status !== "paid_escrowed") {
      return void res.status(409).json({
        error: "Booking is not in a refundable escrow state.",
      });
    }

    const bookingAmount = Number(booking.price_pi || 0);
    if (bookingAmount > 0 && Math.abs(bookingAmount - amountPi) > 0.0000001) {
      return void res.status(409).json({
        error: "Refund amount does not match the booking amount.",
      });
    }

    const pi = new PiNetwork(apiKey, walletPrivateSeed);
    const incomplete = await pi.getIncompleteServerPayments();
    const existing = Array.isArray(incomplete)
      ? incomplete.find((payment: any) =>
          payment?.metadata?.bookingId === booking.id &&
          payment?.metadata?.type === "refund",
        )
      : null;

    if (existing) {
      const existingTxid = existing.transaction?.txid;
      return void res.status(409).json({
        error: existingTxid
          ? `An incomplete refund for this booking already has a blockchain transaction (${existingTxid}). Resolve it before retrying.`
          : `An incomplete refund already exists for this booking (payment ${existing.identifier}). Resolve it before retrying.`,
      });
    }

    req.log.info(
      { bookingId: booking.id, amountPi, clientPiUid: booking.client_pi_uid },
      "Initiating provider rejection A2U refund",
    );

    const paymentId = await pi.createPayment({
      amount: Number(amountPi),
      memo: `Refund for booking ${booking.id}`,
      metadata: { bookingId: booking.id, type: "refund" },
      uid: booking.client_pi_uid,
    });

    if (!paymentId) throw new Error("Pi A2U refund did not return a payment ID.");

    const txid = await pi.submitPayment(paymentId);
    if (!txid) throw new Error("Pi A2U refund did not return a transaction ID.");

    await pi.completePayment(paymentId, txid);

    req.log.info({ bookingId: booking.id, paymentId, txid }, "Provider rejection A2U refund completed");
    return void res.status(200).json({ success: true, txid, paymentId });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "Provider rejection A2U refund failed");
    return void res.status(500).json({ error: err?.message || "Failed to process Pi A2U refund." });
  }
});

export default router;
