import React, { useEffect, useState } from 'react';
import { Service, BusinessProfile, Booking, PiUser } from '../types';
import { piPaymentService } from '../services/piPaymentService';
import { settingsService } from '../services/settingsService';
import { Wallet, Lock, Loader2, CheckCircle2, AlertCircle, ChevronRight, ShieldCheck, MessageCircle, Clock3, RotateCcw } from 'lucide-react';
import { BookingProgressBar } from './BookingProgressBar';
import { BackButton } from './BackButton';

interface PiPaymentModalProps {
  service: Service;
  business: BusinessProfile;
  clientDetails: { clientName: string; clientPiUsername: string; clientPhone: string; clientEmail?: string; notes: string; attachments?: { id: string; name: string; size: string; type: string; dataUrl?: string }[] };
  piUser: PiUser | null;
  onBack: () => void;
  onPaymentComplete: (booking: Booking) => void;
}

export const PiPaymentModal: React.FC<PiPaymentModalProps> = ({ service, business, clientDetails, piUser, onBack, onPaymentComplete }) => {
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'confirming' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [simulatedTxHash, setSimulatedTxHash] = useState<string | null>(null);
  const [gasFeePi, setGasFeePi] = useState(0.01);

  useEffect(() => { let active = true; settingsService.getSettings().then((settings) => { if (active) setGasFeePi(settings.pi_gas_fee_pi); }); return () => { active = false; }; }, []);

  const serviceRate = Number(service.pricePi) || 0;
  const totalPayable = serviceRate + gasFeePi;

  const handlePayNow = async () => {
    setPaymentStatus('processing'); setErrorMessage(null);
    try {
      const memo = `Booking: ${service.name} with ${business.name}`;
      const paymentResult = await piPaymentService.executePayment({ amountPi: serviceRate, memo, metadata: { type: 'booking', serviceId: service.id, serviceName: service.name, businessId: business.id, providerId: service.providerId || (business as any).providerId || business.id, providerName: service.providerName || business.name, clientName: clientDetails.clientName, clientPiUsername: clientDetails.clientPiUsername, clientPiUid: piUser?.uid || undefined, clientPhone: clientDetails.clientPhone, clientEmail: clientDetails.clientEmail, notes: clientDetails.notes, basePrice: service.basePrice || service.priceNGN || 0, priceNGN: service.basePrice || service.priceNGN || 0, durationMinutes: service.durationMinutes || 60, amountPi: serviceRate, gasFeePi } });
      setSimulatedTxHash(paymentResult.txHash); setPaymentStatus('success');
      const acceptanceDeadline = (paymentResult as any).acceptanceDeadline || new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const createdAt = new Date().toISOString();
      const newBooking: Booking = { id: paymentResult.bookingId || ('bk_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000)), serviceId: service.id, serviceName: service.name, providerId: service.providerId, providerName: service.providerName, providerPiUsername: service.provider?.piUsername, providerWalletAddress: service.provider?.piWalletAddress, durationMinutes: service.durationMinutes, basePrice: service.basePrice || service.priceNGN, currency: service.currency || 'NGN', priceNGN: service.basePrice || service.priceNGN, pricePi: serviceRate, platform_fee_pi: Number((serviceRate * 0.10).toFixed(7)), provider_payout_pi: Number((serviceRate * 0.90).toFixed(7)), clientName: clientDetails.clientName, clientPiUsername: clientDetails.clientPiUsername, clientPiUid: piUser?.uid, clientPhone: clientDetails.clientPhone, clientEmail: clientDetails.clientEmail, notes: clientDetails.notes, attachments: clientDetails.attachments, status: 'Pending', paymentStatus: 'Paid', escrow_status: 'paid_escrowed', paid_at: createdAt, acceptance_deadline: acceptanceDeadline, createdAt, piTxHash: paymentResult.txHash, piPaymentId: paymentResult.identifier };
      setTimeout(() => onPaymentComplete(newBooking), 600);
    } catch (err: unknown) { setPaymentStatus('error'); setErrorMessage(err instanceof Error ? err.message : 'Pi Wallet payment failed. Please try again.'); }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-28 animate-in fade-in duration-200">
      <div className="flex items-center justify-between"><BackButton onClick={onBack} id="btn-back-from-pi-payment" label="Back" /><span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80">Step 3: Payment</span></div>
      <BookingProgressBar currentStep={3} />
      <div className="p-4 rounded-3xl bg-amber-500/10 shadow-md">
        <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-amber-600" /><h3 className="text-sm font-black text-zinc-900">Your payment is protected</h3></div>
        <p className="text-xs text-zinc-600 leading-relaxed mt-2">Your payment is held safely while the provider works on your booking. You stay protected until the service is completed and you confirm it.</p>
        <div className="space-y-3 mt-4">
          <div className="flex items-start gap-3"><Clock3 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" /><div><p className="text-xs font-bold text-zinc-900">The provider must accept your booking</p><p className="text-[11px] text-zinc-600 leading-relaxed mt-0.5">If the provider does not accept within the acceptance window, the booking is cancelled and your payment is refunded.</p></div></div>
          <div className="flex items-start gap-3"><MessageCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" /><div><p className="text-xs font-bold text-zinc-900">Your conversation opens after payment</p><p className="text-[11px] text-zinc-600 leading-relaxed mt-0.5">Once your payment is confirmed, you can communicate with the provider about the booking.</p></div></div>
          <div className="flex items-start gap-3"><RotateCcw className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" /><div><p className="text-xs font-bold text-zinc-900">You are protected if the service cannot be provided</p><p className="text-[11px] text-zinc-600 leading-relaxed mt-0.5">If the provider cannot fulfil the booking, the booking can be cancelled and your payment handled through the refund process.</p></div></div>
        </div>
      </div>
      <div className="p-5 rounded-3xl bg-white shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4"><div><span className="text-xs text-zinc-500 block font-bold">Total Payment</span><div className="text-3xl font-black text-amber-600 font-mono tracking-tight flex items-center gap-1"><span>{totalPayable.toFixed(2)}</span><span className="text-lg text-amber-600">π</span></div></div><div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-2xs"><Wallet className="w-6 h-6" /></div></div>
        {paymentStatus === 'error' && errorMessage && <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-800 text-xs flex items-center gap-2 font-medium shadow-2xs"><AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /><span>{errorMessage}</span></div>}
        {paymentStatus === 'success' && <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-2xl shadow-2xs"><CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" /><h4 className="font-extrabold text-zinc-900 text-base">Payment Validated</h4><p className="text-xs text-zinc-600">Opening My Bookings…</p>{simulatedTxHash && <p className="text-xs text-zinc-800 font-mono break-all bg-white p-2.5 rounded-xl shadow-2xs">TxHash: {simulatedTxHash}</p>}</div>}
      </div>
      {paymentStatus !== 'success' && <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-white/95 backdrop-blur-md border-t border-zinc-200/80 z-50 shadow-lg"><div className="max-w-md mx-auto flex items-center justify-between gap-3"><div className="text-xs"><span className="block text-zinc-400 font-bold text-[10px]">TOTAL PRICE</span><span className="text-lg font-black text-amber-600">{totalPayable.toFixed(2)} π</span></div><button onClick={handlePayNow} disabled={paymentStatus === 'processing' || paymentStatus === 'confirming'} id="btn-confirm-and-pay-pi" className="flex-1 py-3.5 px-5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px] shadow-md shadow-amber-600/20 disabled:opacity-50 cursor-pointer">{paymentStatus === 'processing' || paymentStatus === 'confirming' ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing payment...</span></> : <><Lock className="w-4 h-4 stroke-[2.5]" /><span>Confirm & Pay {totalPayable.toFixed(2)} π</span><ChevronRight className="w-4 h-4 stroke-[3]" /></>}</button></div></div>}
    </div>
  );
};