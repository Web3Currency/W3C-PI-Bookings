import { PiPaymentResult } from '../types';
import { piAuthService } from './piAuthService';

export const piPaymentService = {
  async executePayment(params: { amountPi: number; memo: string; metadata: Record<string, any>; }): Promise<PiPaymentResult & { acceptanceDeadline?: string }> {
    if (typeof window === 'undefined' || !window.Pi) throw new Error('Pi SDK not detected. Payments require the Pi Browser.');
    const ready = await piAuthService.ensureSDKReady();
    if (!ready) throw new Error('Pi SDK failed to initialize. Please reopen the app in Pi Browser.');

    // A Pi session can remain authenticated while its original scope grant is stale.
    // Refresh the payment-capable authentication before opening checkout so users do
    // not have to manually sign out and back in before every payment.
    try { await piAuthService.ensurePaymentScope(); } catch (error: any) {
      throw new Error(error?.message || 'Pi payment authorization could not be refreshed. Please sign in again.');
    }

    return new Promise((resolve, reject) => {
      try {
        window.Pi!.createPayment({ amount: params.amountPi, memo: params.memo, metadata: params.metadata }, {
          onReadyForServerApproval: async (paymentId: string) => {
            try {
              const res = await fetch('/api/pi/payments/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId }) });
              if (!res.ok) { const errorData = await res.json().catch(() => ({})); reject(new Error(`Payment approval failed: ${errorData.error || errorData.message || `Server approval failed with status ${res.status}`}`)); }
            } catch (err: any) { reject(new Error(`Network error during payment approval: ${err?.message || String(err)}`)); }
          },
          onReadyForServerCompletion: async (paymentId: string, txid: string) => {
            try {
              const res = await fetch('/api/pi/payments/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId, txid }) });
              if (!res.ok) { const errorData = await res.json().catch(() => ({})); reject(new Error(`Payment completion failed: ${errorData.error || errorData.message || `Server completion failed with status ${res.status}`}`)); return; }
              let completeData = await res.json().catch(() => ({} as any));
              if (completeData?.bookingReconciled === false || !completeData?.bookingId) {
                try {
                  const r = await fetch('/api/pi/payments/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId }) });
                  const recon = await r.json().catch(() => ({} as any));
                  if (r.ok && recon?.bookingId) completeData = { ...completeData, ...recon, bookingReconciled: true, bookingId: recon.bookingId, acceptanceDeadline: recon.acceptanceDeadline || completeData.acceptanceDeadline };
                  else if (completeData?.bookingReconciled === false) { reject(new Error(completeData.bookingError || recon?.error || 'Payment succeeded on Pi but booking could not be created. Contact support with your payment id.')); return; }
                } catch { if (completeData?.bookingReconciled === false) { reject(new Error(completeData.bookingError || 'Payment succeeded on Pi but booking could not be created. Contact support with your payment id.')); return; } }
              }
              resolve({ identifier: paymentId, txHash: txid, amount: params.amountPi, memo: params.memo, bookingId: completeData?.bookingId || undefined, acceptanceDeadline: completeData?.acceptanceDeadline || undefined });
            } catch (err: any) { reject(new Error(`Network error during payment completion: ${err?.message || String(err)}`)); }
          },
          onCancel: (paymentId: string) => reject(new Error(`Payment ${paymentId} cancelled by user.`)),
          onError: (error: Error) => reject(error),
        });
      } catch (err) { reject(err); }
    });
  }
};
