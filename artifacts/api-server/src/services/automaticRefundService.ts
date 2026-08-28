/**
 * Server-side App-to-User (A2U) client refund.
 * Mirrors automaticPayoutService: authoritative booking data only, idempotent, no client-trusted amounts/UIDs.
 *
 * Flow:
 * 1) Load booking; only refund when escrow is held (paid_escrowed) or a prior attempt is recoverable.
 * 2) Claim the booking with a conditional update (paid_escrowed -> refund_processing) to prevent double refunds.
 * 3) Create/submit/complete A2U payment via pi-backend (app wallet -> client uid).
 * 4) Only then mark escrow_status = refunded and store refund identifiers.
 */

import Pi from "pi-backend";

export type RefundResult = {
  status: "completed" | "failed" | "recovered" | "skipped";
  paymentId?: string;
  txid?: string;
  error?: string;
  bookingId?: string;
};

function config() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function sb(path: string, init: RequestInit = {}) {
  const c = config();
  if (!c) return null;
  const h = new Headers(init.headers);
  h.set("apikey", c.key);
  h.set("Content-Type", "application/json");
  h.set("Prefer", h.get("Prefer") || "return=representation");
  if (c.key.startsWith("eyJ")) h.set("Authorization", `Bearer ${c.key}`);
  return fetch(`${c.url}/rest/v1/${path}`, { ...init, headers: h });
}

function refundableEscrow(status: string | undefined | null) {
  return status === "paid_escrowed" || status === "refund_processing" || status === "refund_failed";
}

/**
 * Execute a real Pi A2U refund for a booking's held escrow.
 * Safe to call multiple times: already-refunded bookings return recovered; concurrent claims are serialized via conditional PATCH.
 */
export async function executeAutomaticClientRefund(
  bookingId: string,
  opts?: { reason?: string; cancelBooking?: boolean },
): Promise<RefundResult> {
  const reason = opts?.reason?.trim() || "Escrow refund";
  const cancelBooking = opts?.cancelBooking !== false;

  if (!config()) {
    return { status: "failed", bookingId, error: "Supabase server credentials are missing." };
  }

  // Keep select list minimal and aligned with the reject route (which already succeeds).
  // A wider select previously caused PostgREST 400 when a column was unavailable.
  const bres = await sb(
    `bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,status,escrow_status,price_pi,client_pi_uid&limit=1`,
  );
  if (!bres?.ok) {
    const detail = bres ? await bres.text().catch(() => "") : "";
    return {
      status: "failed",
      bookingId,
      error: `Booking lookup failed${bres ? ` (${bres.status})` : ""}${detail ? `: ${detail.slice(0, 300)}` : ""}.`,
    };
  }
  const bookingRows = await bres.json() as any[];
  const booking = Array.isArray(bookingRows) ? bookingRows[0] : null;
  if (!booking) return { status: "failed", bookingId, error: "Booking not found." };

  // Already successfully refunded — idempotent success.
  if (booking.escrow_status === "refunded") {
    return {
      status: "recovered",
      bookingId,
      txid: booking.payout_tx_hash || undefined,
    };
  }

  // Never refund completed/released escrow (funds already paid out to provider).
  if (booking.escrow_status === "released" || booking.status === "Completed") {
    return { status: "skipped", bookingId, error: "Booking escrow was already released to the provider; refund is not allowed." };
  }

  if (!refundableEscrow(booking.escrow_status)) {
    return {
      status: "failed",
      bookingId,
      error: `Booking escrow_status=${booking.escrow_status || "null"} is not eligible for refund.`,
    };
  }

  const clientUid = String(booking.client_pi_uid || "").trim().replace(/^@/, "");
  if (!clientUid) {
    return { status: "failed", bookingId, error: "Booking is missing client_pi_uid; cannot route A2U refund." };
  }

  const amount = Number(booking.price_pi);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "failed", bookingId, error: "Booking price_pi is invalid; cannot refund." };
  }

  const now = new Date().toISOString();

  // Claim the refund slot atomically when still held in escrow.
  // If already refund_processing from a crashed attempt, continue (retry).
  if (booking.escrow_status === "paid_escrowed") {
    const claim = await sb(
      `bookings?id=eq.${encodeURIComponent(bookingId)}&escrow_status=eq.paid_escrowed`,
      {
        method: "PATCH",
        body: JSON.stringify({
          escrow_status: "refund_processing",
          ...(cancelBooking
            ? {
                status: "Cancelled",
                cancelled_at: now,
                rejection_reason: reason,
              }
            : {}),
          acceptance_deadline: null,
          updated_at: now,
        }),
      },
    );
    if (!claim?.ok) {
      const detail = claim ? await claim.text().catch(() => "") : "";
      return { status: "failed", bookingId, error: `Failed to claim booking for refund (${claim?.status})${detail ? `: ${detail.slice(0, 300)}` : ""}.` };
    }
    const claimed = (await claim.json() as any[]) || [];
    if (!claimed.length) {
      // Race: another worker claimed it — re-read.
      const reread = await sb(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=escrow_status&limit=1`);
      const row = reread?.ok ? (await reread.json() as any[])[0] : null;
      if (row?.escrow_status === "refunded") {
        return { status: "recovered", bookingId };
      }
      if (row?.escrow_status !== "refund_processing") {
        return { status: "failed", bookingId, error: "Could not claim booking for refund (concurrent update)." };
      }
    }
  } else if (booking.escrow_status === "refund_failed" || booking.escrow_status === "refund_processing") {
    // Allow retry: mark processing again and cancel if needed.
    await sb(`bookings?id=eq.${encodeURIComponent(bookingId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        escrow_status: "refund_processing",
        ...(cancelBooking
          ? {
              status: "Cancelled",
              cancelled_at: booking.status === "Cancelled" ? undefined : now,
              rejection_reason: reason,
            }
          : {}),
        acceptance_deadline: null,
        updated_at: now,
      }),
    }).catch(() => undefined);
  }

  const apiKey = process.env.PI_API_KEY?.trim();
  const seed = (process.env.PI_WALLET_PRIVATE_SEED || process.env.PI_PRIVATE_SEED || "").trim();
  if (!apiKey) {
    await markRefundFailed(bookingId, "PI_API_KEY is missing.");
    return { status: "failed", bookingId, error: "PI_API_KEY is missing." };
  }
  if (!seed) {
    await markRefundFailed(bookingId, "Pi app wallet private seed is missing.");
    return { status: "failed", bookingId, error: "Pi app wallet private seed (PI_WALLET_PRIVATE_SEED) is missing." };
  }

  let paymentId = "";
  let txid = "";

  try {
    Pi.init({ apiKey, walletPrivateSeed: seed });
    const payment: any = await Pi.createPayment({
      amount,
      memo: `Refund for booking ${bookingId}`.slice(0, 25),
      metadata: { bookingId, type: "client_refund", reason },
      uid: clientUid,
    });
    paymentId = String(payment?.identifier || payment?.id || "");
    if (!paymentId) {
      await markRefundFailed(bookingId, "Pi did not return a refund payment identifier.", paymentId, txid);
      return { status: "failed", bookingId, error: "Pi did not return a refund payment identifier." };
    }

    const submitted = await Pi.submitPayment(paymentId);
    txid = typeof submitted === "string" ? submitted : String((submitted as any)?.txid || (submitted as any)?.transaction?.txid || "");
    if (!txid) {
      await markRefundFailed(bookingId, "Pi did not return a refund transaction ID.", paymentId, txid);
      return { status: "failed", bookingId, paymentId, error: "Pi did not return a refund transaction ID." };
    }

    await Pi.completePayment(paymentId, txid);

    const finalize = await sb(`bookings?id=eq.${encodeURIComponent(bookingId)}&escrow_status=eq.refund_processing`, {
      method: "PATCH",
      body: JSON.stringify({
        escrow_status: "refunded",
        payment_status: "Refunded",
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Reuse payout_tx_hash to store the refund chain tx until dedicated refund columns exist.
        payout_tx_hash: txid,
        acceptance_deadline: null,
        ...(cancelBooking
          ? {
              status: "Cancelled",
              rejection_reason: reason,
            }
          : {}),
      }),
    });

    if (!finalize?.ok) {
      const detail = finalize ? await finalize.text().catch(() => "") : "";
      return {
        status: "failed",
        bookingId,
        paymentId,
        txid,
        error: `Pi A2U refund succeeded on-chain, but booking could not be marked refunded (${finalize?.status})${detail ? `: ${detail.slice(0, 300)}` : ""}. Manual reconciliation required.`,
      };
    }
    const finalized = (await finalize.json() as any[]) || [];
    if (!finalized.length) {
      // Another process may have finalized — treat as recovered if now refunded.
      const check = await sb(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=escrow_status&limit=1`);
      const row = check?.ok ? (await check.json() as any[])[0] : null;
      if (row?.escrow_status === "refunded") {
        return { status: "recovered", bookingId, paymentId, txid };
      }
      return {
        status: "failed",
        bookingId,
        paymentId,
        txid,
        error: "Pi A2U refund succeeded, but concurrent state update prevented marking refunded.",
      };
    }

    return { status: "completed", bookingId, paymentId, txid };
  } catch (e: any) {
    const msg = e?.message || "Automatic Pi A2U refund failed.";
    await markRefundFailed(bookingId, msg, paymentId, txid);
    return { status: "failed", bookingId, paymentId: paymentId || undefined, txid: txid || undefined, error: msg };
  }
}

async function markRefundFailed(bookingId: string, error: string, paymentId?: string, txid?: string) {
  const now = new Date().toISOString();
  // Keep booking cancelled if already cancelled; do NOT mark escrow as refunded.
  await sb(`bookings?id=eq.${encodeURIComponent(bookingId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      escrow_status: "refund_failed",
      updated_at: now,
      // Preserve forensic detail without inventing a refund.
      rejection_reason: `Refund failed: ${error}`.slice(0, 500),
      ...(txid ? { payout_tx_hash: txid } : {}),
    }),
  }).catch(() => undefined);
}
