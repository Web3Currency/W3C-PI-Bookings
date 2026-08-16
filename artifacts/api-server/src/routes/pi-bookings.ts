import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

/**
 * POST /api/pi/bookings/:bookingId/accept
 *
 * Validates the caller's Pi access token with Pi Network, resolves the
 * corresponding provider, and atomically accepts that provider's booking.
 * This keeps provider booking mutations off the public Supabase client/RLS path.
 */
router.post("/pi/bookings/:bookingId/accept", async (req, res) => {
  const bookingId = req.params.bookingId;
  const { accessToken } = req.body as { accessToken?: string };

  if (!bookingId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
    res.status(400).json({ error: "A valid bookingId is required." });
    return;
  }

  if (!accessToken || typeof accessToken !== "string" || accessToken.trim() === "") {
    res.status(401).json({ error: "Pi access token is required." });
    return;
  }

  if (!pool) {
    req.log.error("DATABASE_URL is not configured on the API server.");
    res.status(500).json({ error: "Server database is not configured." });
    return;
  }

  try {
    const piResponse = await fetch("https://api.minepi.com/v2/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
      },
    });

    if (!piResponse.ok) {
      res.status(401).json({ error: "Invalid or expired Pi access token." });
      return;
    }

    const piUser = (await piResponse.json()) as { uid?: string; username?: string };
    if (!piUser.uid) {
      res.status(401).json({ error: "Pi identity could not be verified." });
      return;
    }

    const result = await pool.query(
      `
      UPDATE public.bookings AS b
      SET
        status = 'In Progress',
        updated_at = NOW()
      FROM public.providers AS p
      WHERE b.id = $1
        AND b.provider_id = p.id
        AND p.pi_uid = $2
        AND b.status = 'Confirmed'
        AND b.escrow_status = 'paid_escrowed'
      RETURNING
        b.id,
        b.status,
        b.escrow_status,
        b.provider_id,
        b.updated_at
      `,
      [bookingId, piUser.uid],
    );

    if (result.rowCount === 0) {
      const check = await pool.query(
        `
        SELECT
          b.status,
          b.escrow_status,
          b.provider_id,
          p.pi_uid
        FROM public.bookings AS b
        LEFT JOIN public.providers AS p ON p.id = b.provider_id
        WHERE b.id = $1
        `,
        [bookingId],
      );

      if (check.rowCount === 0) {
        res.status(404).json({ error: "Booking not found." });
        return;
      }

      const booking = check.rows[0];
      if (booking.pi_uid !== piUser.uid) {
        res.status(403).json({ error: "You are not authorized to accept this booking." });
        return;
      }

      if (booking.status !== "Confirmed" || booking.escrow_status !== "paid_escrowed") {
        res.status(409).json({ error: "This booking is not available for acceptance." });
        return;
      }

      res.status(409).json({ error: "Booking could not be accepted." });
      return;
    }

    res.json({ success: true, booking: result.rows[0] });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "Provider booking acceptance failed");
    res.status(500).json({ error: "Failed to accept booking." });
  }
});

export default router;
