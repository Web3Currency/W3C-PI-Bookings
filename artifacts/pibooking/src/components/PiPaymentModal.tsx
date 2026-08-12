import React, { useState } from 'react';
import { Service, BusinessProfile, Booking, PiUser } from '../types';
import { piPaymentService } from '../services/piPaymentService';
import { ArrowLeft, Wallet, ShieldCheck, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { BookingProgressBar } from './BookingProgressBar';

interface PiPaymentModalProps {
  service: Service;
  business: BusinessProfile;
  date: string;
  timeSlot: string;
  clientDetails: {
    clientName: string;
    clientPiUsername: string;
    clientPhone: string;
    notes: string;
    attachments?: { id: string; name: string; size: string; type: string; dataUrl?: string }[];
  };
  piUser: PiUser | null;
  onBack: () => void;
  onPaymentComplete: (booking: Booking) => void;
}

export const PiPaymentModal: React.FC<PiPaymentModalProps> = ({
  service,
  business,
  date,
  timeSlot,
  clientDetails,
  onBack,
  onPaymentComplete,
}) => {
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'processing' | 'confirming' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [simulatedTxHash, setSimulatedTxHash] = useState<string | null>(null);

  const handlePayNow = async () => {
    setPaymentStatus('processing');
    setErrorMessage(null);

    try {
      const memo = `Booking: ${service.name} with ${business.name} (${date} @ ${timeSlot})`;

      const paymentResult = await piPaymentService.executePayment({
        amountPi: service.pricePi,
        memo,
        metadata: {
          serviceId: service.id,
          businessId: business.id,
          date,
          timeSlot,
        },
      });

      setSimulatedTxHash(paymentResult.txHash);
      setPaymentStatus('success');

      const newBooking: Booking = {
        id: 'bk_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000),
        serviceId: service.id,
        serviceName: service.name,
        providerId: service.providerId,
        providerName: service.providerName,
        providerPiUsername: service.provider?.piUsername,
        providerWalletAddress: service.provider?.piWalletAddress,
        durationMinutes: service.durationMinutes,
        basePrice: service.basePrice || service.priceNGN,
        currency: service.currency || 'NGN',
        priceNGN: service.basePrice || service.priceNGN,
        pricePi: service.pricePi,
        platform_fee_pi: Number((service.pricePi * 0.10).toFixed(7)),
        provider_payout_pi: Number((service.pricePi * 0.90).toFixed(7)),
        date,
        timeSlot,
        clientName: clientDetails.clientName,
        clientPiUsername: clientDetails.clientPiUsername,
        clientPhone: clientDetails.clientPhone,
        notes: clientDetails.notes,
        attachments: clientDetails.attachments,
        status: 'Confirmed',
        paymentStatus: 'Paid',
        createdAt: new Date().toISOString(),
        piTxHash: paymentResult.txHash,
      };

      setTimeout(() => {
        onPaymentComplete(newBooking);
      }, 1000);
    } catch (err: unknown) {
      setPaymentStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Pi Wallet payment failed. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={paymentStatus === 'processing' || paymentStatus === 'confirming'}
          id="btn-back-from-pi-payment"
          className="p-2 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition disabled:opacity-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-extrabold text-amber-700 tracking-wider uppercase bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80">
          Pi Network Secure Checkout
        </span>
        <div className="w-8" />
      </div>

      <BookingProgressBar currentStep={4} />

      <div className="p-5 rounded-3xl bg-white shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <span className="text-xs text-zinc-500 block font-bold">Total Payment Amount</span>
            <div className="text-3xl font-black text-amber-600 font-mono tracking-tight flex items-center gap-1">
              <span>{service.pricePi}</span>
              <span className="text-lg text-amber-600">π</span>
            </div>
            <span className="text-xs text-zinc-500">≈ ₦{(service.basePrice || service.priceNGN).toLocaleString()} NGN</span>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-2xs">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {paymentStatus === 'error' && errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-800 text-xs flex items-center gap-2 font-medium shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {paymentStatus === 'success' ? (
          <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-2xl shadow-2xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto animate-bounce" />
            <h4 className="font-extrabold text-zinc-900 text-base">Payment Validated!</h4>
            <p className="text-xs text-zinc-800 font-mono break-all bg-white p-2.5 rounded-xl shadow-2xs">
              TxHash: {simulatedTxHash}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-zinc-50 space-y-2 text-xs shadow-2xs">
              <div className="flex items-center justify-between text-zinc-600">
                <span>Merchant Receiver:</span>
                <span className="font-extrabold text-zinc-900">{business.name}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>Pi Wallet Address:</span>
                <span className="font-mono text-[11px] text-amber-700 font-bold">{business.piWalletAddress}</span>
              </div>
            </div>

            <button
              onClick={handlePayNow}
              disabled={paymentStatus === 'processing' || paymentStatus === 'confirming'}
              id="btn-confirm-and-pay-pi"
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-amber-600/20 disabled:opacity-50 cursor-pointer min-h-[48px]"
            >
              {paymentStatus === 'processing' || paymentStatus === 'confirming' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing Pi Blockchain...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Confirm & Pay {service.pricePi} π</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 pt-2 border-t border-zinc-100">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>Encrypted via Pi Network Sandbox v2.0 Bridge</span>
        </div>
      </div>
    </div>
  );
};
