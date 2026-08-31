import React, { useEffect, useState } from 'react';
import { Booking, DeliveryAttachment } from '../../types';
import { Clock, Copy, FileText, Hash, Paperclip, X, MessageSquare, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { formatBookingCreated } from '../../lib/utils';
import { isPendingAcceptance, getRemainingMs, formatCountdown, isAcceptanceExpired } from '../../lib/acceptanceCountdown';
import { getProjectRemainingMs, formatProjectCountdown } from '../../lib/projectTimer';
import { bookingService } from '../../services/bookingService';

interface ProviderBookingDetailsProps { booking: Booking; onClose: () => void; onOpenChat?: (bookingId: string) => void; onBookingUpdated?: (bookings: Booking[]) => void; }

export const ProviderBookingDetails: React.FC<ProviderBookingDetailsProps> = ({ booking, onClose, onOpenChat, onBookingUpdated }) => {
  const copy = async (value: string, label: string) => { try { await navigator.clipboard.writeText(value); toast({ title: `${label} copied`, description: 'The value is ready to paste.' }); } catch { toast({ title: 'Copy failed', description: `Could not copy the ${label.toLowerCase()}.`, variant: 'destructive' }); } };
  const transactionHash = booking.piTxHash || '';
  const [tick, setTick] = useState(0);
  const [deliveryNotes, setDeliveryNotes] = useState(booking.delivery_notes || '');
  const [deliveryFiles, setDeliveryFiles] = useState<DeliveryAttachment[]>(booking.delivery_attachments || []);
  const [submittingDelivery, setSubmittingDelivery] = useState(false);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, []);
  void tick;
  const canChat = booking.status === 'Confirmed' || booking.status === 'Pending' || booking.status === 'In Progress';
  const pendingAccept = isPendingAcceptance(booking);
  const expired = isAcceptanceExpired(booking.acceptance_deadline);
  const remainLabel = formatCountdown(getRemainingMs(booking.acceptance_deadline));
  const projectRemaining = getProjectRemainingMs(booking.project_deadline);
  const projectExpired = booking.status === 'In Progress' && Boolean(booking.project_deadline) && projectRemaining <= 0;
  const projectTimerLabel = formatProjectCountdown(projectRemaining);
  const canDeliver = booking.status === 'In Progress' && booking.escrow_status === 'paid_escrowed';
  const submitDelivery = async () => {
    if (!deliveryNotes.trim() && deliveryFiles.length === 0) { toast({ title: 'Delivery details required', description: 'Add delivery notes or a deliverable before submitting.', variant: 'destructive' }); return; }
    setSubmittingDelivery(true);
    try { const updated = await bookingService.submitDeliveryAsync(booking.id, deliveryNotes, deliveryFiles); onBookingUpdated?.(updated); toast({ title: 'Service marked as delivered', description: 'The client has been notified in the booking chat.' }); } catch (error: any) { toast({ title: 'Delivery failed', description: error?.message || 'Could not submit delivery.', variant: 'destructive' }); } finally { setSubmittingDelivery(false); }
  };
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const additions: DeliveryAttachment[] = Array.from(files).slice(0, 10).map((file) => ({ id: `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 7)}`, name: file.name, type: file.type, size: file.size }));
    setDeliveryFiles((items) => [...items, ...additions].slice(0, 20));
  };
  return (
    <div className="fixed inset-0 z-50 bg-zinc-100 overflow-y-auto animate-in fade-in duration-150">
      <div className="min-h-full w-full pb-36">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-zinc-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
            <button type="button" onClick={onClose} className="inline-flex items-center gap-2 text-xs font-black text-zinc-700 hover:text-zinc-950 transition" aria-label="Close booking details"><X className="w-4 h-4" /> Close</button>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Booking receipt</span>
            <span className="w-14" aria-hidden="true" />
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
          <article className="bg-white shadow-sm border border-zinc-200 rounded-sm overflow-hidden">
            <div className="px-5 sm:px-8 pt-7 pb-5 text-center border-b border-dashed border-zinc-300">
              <div className="w-11 h-11 mx-auto rounded-full bg-zinc-950 text-white flex items-center justify-center mb-3"><FileText className="w-5 h-5" /></div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">W3C Pi Bookings</p>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 mt-1">Booking Details</h1>
              <p className="text-xs text-zinc-500 mt-1">{booking.serviceName}</p>
            </div>

            <div className="px-5 sm:px-8 py-5 border-b border-zinc-200">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Client</p><p className="text-base sm:text-lg font-black text-zinc-950 mt-1 truncate">{booking.clientName || 'Client'}</p>{booking.clientPiUsername && <p className="text-xs text-zinc-500 mt-0.5">@{booking.clientPiUsername}</p>}</div>
                <div className="text-right shrink-0"><p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Status</p><span className="inline-flex mt-1 px-2.5 py-1 rounded-full bg-zinc-950 text-white text-[10px] font-black uppercase tracking-wide">{booking.status}</span></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4 mt-5 pt-5 border-t border-zinc-100">
                <div><span className="block text-[9px] font-black uppercase tracking-wider text-zinc-400">Created</span><span className="block text-xs font-bold text-zinc-900 mt-1">{formatBookingCreated(booking.createdAt)}</span></div>
                <div><span className="block text-[9px] font-black uppercase tracking-wider text-zinc-400">Escrow</span><span className="block text-xs font-black text-zinc-950 mt-1">{booking.pricePi} π</span></div>
                <div><span className="block text-[9px] font-black uppercase tracking-wider text-zinc-400">Payment</span><span className="block text-xs font-bold text-zinc-900 mt-1">{booking.paymentStatus || '—'}</span></div>
              </div>
            </div>

            <section className="px-5 sm:px-8 py-6 border-b border-zinc-200">
              <div className="flex items-center justify-between gap-3 mb-3"><h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">Project brief</h2><span className="text-[9px] font-bold text-zinc-300">01</span></div>
              {booking.notes ? <p className="text-sm leading-6 text-zinc-800 whitespace-pre-wrap">{booking.notes}</p> : <p className="text-sm text-zinc-400">No additional project brief was provided.</p>}
            </section>

            {booking.attachments && booking.attachments.length > 0 && <section className="px-5 sm:px-8 py-6 border-b border-zinc-200"><div className="flex items-center justify-between gap-3 mb-3"><h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">Client attachments</h2><span className="text-[9px] font-bold text-zinc-300">02</span></div><div className="divide-y divide-zinc-100">{booking.attachments.map((attachment) => <div key={attachment.id} className="py-2.5 flex items-center justify-between gap-3 text-sm"><span className="truncate text-zinc-800 font-medium">{attachment.name}</span><span className="text-[10px] text-zinc-400 shrink-0">{attachment.size}</span></div>)}</div></section>}

            {pendingAccept && <section className="px-5 sm:px-8 py-6 border-b border-zinc-200"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Clock className="w-4 h-4 text-zinc-500" /><h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">Acceptance window</h2></div><span className="text-[9px] font-bold text-zinc-300">03</span></div><p className={`text-xl font-black tabular-nums mt-2 ${expired ? 'text-rose-700' : 'text-zinc-950'}`}>{expired ? 'Acceptance window expired' : `${remainLabel} remaining`}</p>{booking.acceptance_deadline && <p className="text-[11px] text-zinc-500 mt-1">Deadline: {new Date(booking.acceptance_deadline).toLocaleString()}</p>}</section>}

            {booking.status === 'In Progress' && booking.project_deadline && <section className="px-5 sm:px-8 py-6 border-b border-zinc-200"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Clock className="w-4 h-4 text-zinc-500" /><h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">Project timeline</h2></div><span className="text-[9px] font-bold text-zinc-300">04</span></div><p className={`text-3xl font-black tabular-nums mt-2 ${projectExpired ? 'text-rose-700' : 'text-zinc-950'}`}>{projectExpired ? '00:00' : projectTimerLabel}</p><p className="text-[11px] text-zinc-500 mt-1">Deadline: {new Date(booking.project_deadline).toLocaleString()}</p></section>}

            {booking.status === 'Delivered' && <section className="px-5 sm:px-8 py-6 border-b border-zinc-200"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">Latest delivery</h2></div><span className="text-[9px] font-bold text-zinc-300">05</span></div><p className="text-sm text-zinc-600 mt-2">Delivered {booking.delivered_at ? new Date(booking.delivered_at).toLocaleString() : ''}. Escrow remains held pending client review.</p>{booking.delivery_notes && <div className="mt-3 pt-3 border-t border-dashed border-zinc-200"><p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1">Provider delivery notes</p><p className="text-sm leading-6 text-zinc-800 whitespace-pre-wrap">{booking.delivery_notes}</p></div>}</section>}

            {transactionHash && <section className="px-5 sm:px-8 py-6 border-b border-zinc-200"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Hash className="w-4 h-4 text-zinc-500" /><h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">Pi transaction</h2></div><span className="text-[9px] font-bold text-zinc-300">06</span></div><div className="mt-3 flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2"><span className="font-mono text-[10px] text-zinc-700 break-all flex-1">{transactionHash}</span><button type="button" onClick={() => copy(transactionHash, 'Transaction hash')} className="shrink-0 p-1.5 rounded-md bg-white border border-zinc-200 hover:bg-zinc-100" title="Copy transaction hash"><Copy className="w-3.5 h-3.5" /></button></div></section>}

            {booking.rejection_reason && <section className="px-5 sm:px-8 py-6 border-b border-zinc-200"><h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-700">Cancellation reason</h2><p className="text-sm text-rose-900 mt-2 whitespace-pre-wrap">{booking.rejection_reason}</p></section>}

            <footer className="px-5 sm:px-8 py-5 text-center border-t border-dashed border-zinc-300"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">W3C Pi Bookings · Booking record</p><p className="text-[10px] text-zinc-400 mt-1">Keep this record for your booking history and dispute/appeal reference.</p></footer>
          </article>
        </main>

        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/97 backdrop-blur border-t border-zinc-200 safe-area-pb">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
            {canDeliver ? <div className="space-y-3"><div className="flex items-center gap-2"><Upload className="w-4 h-4 text-emerald-600" /><span className="text-sm font-black text-zinc-900">Your next action: Submit delivery</span></div><textarea value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} rows={3} placeholder="Describe what you delivered to the client…" className="w-full p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-500" /><div className="flex gap-2"><label className="flex flex-1 items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-black cursor-pointer"><Paperclip className="w-4 h-4" /><span>Add deliverable</span><input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} /></label><button type="button" disabled={submittingDelivery} onClick={submitDelivery} className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50">{submittingDelivery ? 'Submitting…' : <><CheckCircle2 className="w-4 h-4" />Mark as Delivered</>}</button></div>{deliveryFiles.length > 0 && <p className="text-[11px] text-zinc-500">{deliveryFiles.length} deliverable reference{deliveryFiles.length === 1 ? '' : 's'} attached.</p>}</div> : projectExpired ? <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-rose-700 uppercase tracking-wider">Action</p><p className="text-sm font-bold text-zinc-900 mt-0.5">Project timeline expired</p></div><button type="button" disabled className="px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-400 text-xs font-black cursor-not-allowed">Appeal</button></div> : <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Next action</p><p className="text-sm font-bold text-zinc-900 mt-0.5">{booking.status === 'Delivered' ? 'Waiting for client review' : booking.status === 'Completed' ? 'Booking completed' : 'No action required'}</p></div>{canChat && onOpenChat && <button type="button" onClick={() => onOpenChat(booking.id)} className="shrink-0 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black flex items-center justify-center gap-2 transition"><MessageSquare className="w-4 h-4" />Chat with Client</button>}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
