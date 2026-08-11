import { PiPaymentResult } from '../types';
import { piAuthService } from './piAuthService';

export const piPaymentService = {
  async executePayment(params: {
    amountPi: number;
    memo: string;
    metadata: Record<string, any>;
  }): Promise<PiPaymentResult> {
    if (typeof window === 'undefined' || !window.Pi) {
      throw new Error('Pi SDK not detected. Payments require the Pi Browser.');
    }

    const ready = await piAuthService.ensureSDKReady();
    if (!ready) {
      throw new Error('Pi SDK failed to initialize. Please reopen the app in Pi Browser.');
    }

    return new Promise<PiPaymentResult>((resolve, reject) => {
      try {
        window.Pi!.createPayment(
          {
            amount: params.amountPi,
            memo: params.memo,
            metadata: params.metadata,
          },
          {
            onReadyForServerApproval: async (paymentId: string) => {
              try {
                const res = await fetch('/api/pi/payments/approve', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paymentId }),
                });
                if (!res.ok) {
                  const errorData = await res.json().catch(() => ({}));
                  const msg = errorData.error || errorData.message || `Server approval failed with status ${res.status}`;
                  reject(new Error(`Payment approval failed: ${msg}`));
                  return;
                }
              } catch (err: any) {
                reject(new Error(`Network error during payment approval: ${err?.message || String(err)}`));
              }
            },
            onReadyForServerCompletion: async (paymentId: string, txid: string) => {
              try {
                const res = await fetch('/api/pi/payments/complete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paymentId, txid }),
                });
                if (!res.ok) {
                  const errorData = await res.json().catch(() => ({}));
                  const msg = errorData.error || errorData.message || `Server completion failed with status ${res.status}`;
                  reject(new Error(`Payment completion failed: ${msg}`));
                  return;
                }
                resolve({
                  identifier: paymentId,
                  txHash: txid,
                  amount: params.amountPi,
                  memo: params.memo,
                });
              } catch (err: any) {
                reject(new Error(`Network error during payment completion: ${err?.message || String(err)}`));
              }
            },
            onCancel: (paymentId: string) => {
              reject(new Error(`Payment ${paymentId} cancelled by user.`));
            },
            onError: (error: Error) => {
              reject(error);
            },
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  }
};
