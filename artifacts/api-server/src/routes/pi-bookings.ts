import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

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
  // Legacy service_role JWTs also need the Authorization header. New sb_secret keys
  // must not be sent as Bearer tokens.
  if (config.key.startsWith("eyJ")) {
    headers.set("Authorization", `Bearer ${config.key}`);
  }

  return fetch(`${config.url}/rest/v1/${path}`, { ...init, headers });
}

async function getProviderByPiUid(piUid: string) {
  const response = await supabaseRequest(`providers?select=id,pi_uid&pi_uid=eq.${encodeURIComponent(piUid)}&limit=1`);
  if (response) {
    if (!response.ok) throw new Error(`Supabase provider lookup failed (${response.status}).`);
    const rows = (await response.json()) as Array<{ id: string; pi_uid: string }>;
    return rows[0] || null;
  }

  if (!pool) return null;
  const result = await pool.query(
    `SELECT id, pi_uid FROM public.providers WHERE pi_uid = $1 LIMIT 1`,
    [piUid],
  );
  return result.rows[0] || null;
}

async function updateBookingViaSupabase(
  bookingId: string,
  providerId: string,
  updates: Record<string, unknown>,
) {
  const response = await supabaseRequest(
    `bookings?id=eq.${encodeURIComponent(bookingId)}&provider_id=eq.${encodeURIComponent(providerId)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(updates),
    },
  );

  if (!response) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Supabase booking update failed (${response.status}).`);
  }
  return (await response.json()) as any[];
}

async function verifyPiAccessToken(accessToken: string) {
  const piResponse = await fetch("https://api.minepi.com/v2/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken.trim()}` },
  });

  if (!piResponse.ok) return null;
  const piUser = (await piResponse.json()) as { uid?: string; username?: string };
  return piUser.uid ? piUser : null;
}

/**
 * POST /api/pi/bookings/:bookingId/accept
 * Validates the provider's Pi access token and atomically moves an escrowed
 * booking to In Progress using the same Supabase database as the frontend.
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

  try {
    const piUser = await verifyPiAccessToken(accessToken);
    if (!piUser) {
      res.status(401).json({ error: "Invalid or expired Pi access token." });
      return;
    }

    const provider = await getProviderByPiUid(piUser.uid);
    if (!provider) {
      res.status(403).json({ error: "No provider profile is linked to this Pi account." });
      return;
    }

    const supabaseRows = await updateBookingViaSupabase(bookingId, provider.id, {
      status: "In Progress",
      updated_at: new Date().toISOString(),
    });

    if (supabaseRows) {
      if (supabaseRows.length === 0) {
        res.status(409).json({ error: "Booking is not available for acceptance or is not assigned to this provider." });
        return;
      }
      res.json({ success: true, booking: supabaseRows[0] });
      return;
    }

    if (!pool) {
      res.status(500).json({ error: "Booking database connection is not configured on the API server." });
      return;
    }

    const result = await pool.query(
      `
      UPDATE public.bookings AS b
      SET status = 'In Progress', updated_at = NOW()
      WHERE b.id = $1
        AND b.provider_id = $2
        AND b.status IN ('Pending', 'Confirmed')
        AND b.escrow_status = 'paid_escrowed'
      RETURNING b.id, b.status, b.escrow_status, b.provider_id, b.updated_at
      `,
      [bookingId, provider.id],
    );

    if (result.rowCount === 0) {
      res.status(409).json({ error: "Booking is not available for acceptance or is not assigned to this provider." });
      return;
    }

    res.json({ success: true, booking: result.rows[0] });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "Provider booking acceptance failed");
    res.status(500).json({ error: err?.message || "Failed to accept booking." });
  }
});

/**
 * POST /api/pi/bookings/:bookingId/reject
 * Validates the provider's Pi identity and records the rejection/refund state.
 * The Pi refund transaction itself is handled by /api/pi/payouts/refund first.
 */
router.post("/pi/bookings/:bookingId/reject", async (req, res) => {
  const bookingId = req.params.bookingId;
  const { accessToken, rejectionReason, payoutTxHash } = req.body as {
    accessToken?: string;
    rejectionReason?: string;
    payoutTxHash?: string;
  };

  if (!bookingId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
    res.status(400).json({ error: "A valid bookingId is required." });
    return;
  }
  if (!accessToken || typeof accessToken !== "string" || accessToken.trim() === "") {
    res.status(401).json({ error: "Pi access token is required." });
    return;
  }
  if (!rejectionReason || rejectionReason.trim() === "") {
    res.status(400).json({ error: "A rejection reason is required." });
    return;
  }

  try {
    const piUser = await verifyPiAccessToken(accessToken);
    if (!piUser) {
      res.status(401).json({ error: "Invalid or expired Pi access token." });
      return;
    }

    const provider = await getProviderByPiUid(piUser.uid);
    if (!provider) {
      res.status(403).json({ error: "No provider profile is linked to this Pi account." });
      return;
    }

    const updates = {
      status: "Cancelled",
      escrow_status: "refunded",
      rejection_reason: rejectionReason.trim(),
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(payoutTxHash ? { payout_tx_hash: payoutTxHash } : {}),
    };

    const supabaseRows = await updateBookingViaSupabase(bookingId, provider.id, updates);
    if (supabaseRows) {
      if (supabaseRows.length === 0) {
        res.status(409).json({ error: "Booking is not available for rejection or is not assigned to this provider." });
        return;
      }
      res.json({ success: true, booking: supabaseRows[0] });
      return;
    }

    if (!pool) {
      res.status(500).json({ error: "Booking database connection is not configured on the API server." });
      return;
    }

    const result = await pool.query(
      `
      UPDATE public.bookings AS b
      SET status = 'Cancelled',
          escrow_status = 'refunded',
          rejection_reason = $3,
          refunded_at = NOW(),
          updated_at = NOW(),
          payout_tx_hash = COALESCE($4, payout_tx_hash)
      WHERE b.id = $1
        AND b.provider_id = $2
        AND b.status IN ('Pending', 'Confirmed')
        AND b.escrow_status = 'paid_escrowed'
      RETURNING b.id, b.status, b.escrow_status, b.provider_id, b.updated_at
      `,
      [bookingId, provider.id, rejectionReason.trim(), payoutTxHash || null],
    );

    if (result.rowCount === 0) {
      res.status(409).json({ error: "Booking is not available for rejection or is not assigned to this provider." });
      return;
    }

    res.json({ success: true, booking: result.rows[0] });
  } catch (err: any) {
    req.log.error({ err, bookingId }, "Provider booking rejection failed");
    res.status(500).json({ error: err?.message || "Failed to reject booking." });
  }
});

export default router;
