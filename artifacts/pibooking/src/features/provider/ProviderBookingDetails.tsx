import React, { useEffect, useState } from 'react';
import { Booking, DeliveryAttachment } from '../../types';
import { Clock, Copy, Mail, Send, FileText, Hash, Paperclip, X, MessageSquare, Upload, CheckCircle2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white/95 backdrop-blur border-b border-zinc-100"><div><span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Booking Details</span><h3 className="text-base font-black text-zinc-900">{booking.serviceName}</h3></div><button type="button" onClick={onClose} className="p-2 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200"><X className="w-4 h-4" /></button></div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div><span className="block text-[10px] font-bold uppercase text-zinc-400">Client Name</span><span className="font-bold text-zinc-900">{booking.clientName || '—'}</span></div>
            <div><span className="block text-[10px] font-bold uppercase text-zinc-400">Pi Username</span><span className="font-bold text-zinc-900">{booking.clientPiUsername || '—'}</span></div>
            <div className="flex items-start gap-2"><Send className="w-3.5 h-3.5 mt-0.5 text-amber-600" /><div><span className="block text-[10px] font-bold uppercase text-zinc-400">Client Contact</span><span className="font-mono font-bold text-zinc-900 break-all">{booking.clientPhone || 'Not provided'}</span></div></div>
            <div className="flex items-start gap-2"><Mail className="w-3.5 h-3.5 mt-0.5 text-amber-600" /><div><span className="block text-[10px] font-bold uppercase text-zinc-400">Email</span><span className="font-medium text-zinc-900 break-all">{booking.clientEmail || 'Not provided'}</span></div></div>
            <div className="flex items-start gap-2 col-span-2"><Clock className="w-3.5 h-3.5 mt-0.5 text-amber-600" /><div><span className="block text-[10px] font-bold uppercase text-zinc-400">Booking created</span><span className="font-bold text-zinc-900">{formatBookingCreated(booking.createdAt)}</span></div></div>
          </div>
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-200"><div><span className="block text-[10px] font-bold uppercase text-zinc-400">Escrow Amount</span><span className="font-black text-amber-700">{booking.pricePi} π</span></div><div className="text-right"><span className="block text-[10px] font-bold uppercase text-zinc-400">Status</span><span className="font-bold text-zinc-900">{booking.status}</span></div></div>
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-200"><div><span className="block text-[10px] font-bold uppercase text-zinc-400">Payment</span><span className="font-bold text-zinc-900">{booking.paymentStatus || '—'}</span></div><div className="text-right"><span className="block text-[10px] font-bold uppercase text-zinc-400">Escrow</span><span className="font-bold text-zinc-900">{String(booking.escrow_status || '—').replace(/_/g, ' ')}</span></div></div>
          {pendingAccept && <div className={`p-3 rounded-2xl border ${expired ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}><span className={`block text-[10px] font-extrabold uppercase ${expired ? 'text-rose-700' : 'text-amber-800'}`}>{expired ? 'Acceptance window expired' : 'Provider acceptance window'}</span><p className={`text-sm font-black tabular-nums mt-1 ${expired ? 'text-rose-900' : 'text-amber-950'}`}>{expired ? 'Auto-cancel & refund will apply' : remainLabel + ' remaining'}</p>{booking.acceptance_deadline && <p className="text-[10px] text-zinc-500 mt-1">Deadline: {new Date(booking.acceptance_deadline).toLocaleString()}</p>}</div>}
          {booking.status === 'In Progress' && booking.project_deadline && <div className={`p-4 rounded-2xl border ${projectExpired ? 'bg-rose-50 border-rose-200' : 'bg-blue-50 border-blue-200'}`}><span className={`block text-[10px] font-extrabold uppercase ${projectExpired ? 'text-rose-700' : 'text-blue-800'}`}>{projectExpired ? 'Project timer expired' : 'Project execution timer'}</span><p className={`text-2xl font-black tabular-nums mt-1 ${projectExpired ? 'text-rose-900' : 'text-blue-950'}`}>{projectExpired ? '00:00' : projectTimerLabel}</p><p className="text-[10px] text-zinc-500 mt-1">Deadline: {new Date(booking.project_deadline).toLocaleString()}</p>{projectExpired && <button type="button" disabled className="mt-3 px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-black cursor-not-allowed">Appeal</button>}</div>}
          {canDeliver && <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3"><div className="flex items-center gap-2 text-emerald-900 text-xs font-black uppercase tracking-wider"><Upload className="w-4 h-4" /><span>Submit Delivery</span></div><textarea value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} rows={4} placeholder="Describe what you delivered to the client…" className="w-full p-3 rounded-xl bg-white border border-emerald-200 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500" /><label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-black cursor-pointer"><Paperclip className="w-4 h-4" /><span>Add deliverable references</span><input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} /></label>{deliveryFiles.length > 0 && <div className="space-y-1">{deliveryFiles.map((file) => <div key={file.id} className="flex items-center gap-2 text-[11px] text-zinc-700"><Paperclip className="w-3 h-3" /><span className="truncate">{file.name}</span></div>)}</div>}<button type="button" disabled={submittingDelivery} onClick={submitDelivery} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50">{submittingDelivery ? 'Submitting…' : <><CheckCircle2 className="w-4 h-4" />Mark as Delivered</>}</button></div>}
          {booking.status === 'Delivered' && <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200"><div className="flex items-center gap-2 text-emerald-900 text-xs font-black uppercase"><CheckCircle2 className="w-4 h-4" /><span>Delivered</span></div><p className="text-xs text-emerald-900 mt-1">Delivered {booking.delivered_at ? new Date(booking.delivered_at).toLocaleString() : ''}. Escrow remains held pending client review.</p>{booking.delivery_notes && <p className="text-xs text-zinc-800 mt-2 whitespace-pre-wrap">{booking.delivery_notes}</p>}</div>}
          {canChat && onOpenChat && <button type="button" onClick={() => onOpenChat(booking.id)} className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black flex items-center justify-center gap-2 transition"><MessageSquare className="w-4 h-4" /><span>Chat with Client</span></button>}
          {booking.notes && <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200"><div className="flex items-center gap-1.5 mb-1"><FileText className="w-3.5 h-3.5 text-amber-600" /><span className="text-[10px] font-extrabold uppercase text-zinc-500">Project Brief</span></div><p className="text-xs leading-5 text-zinc-800 whitespace-pre-wrap">{booking.notes}</p></div>}
          {transactionHash && <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200"><div className="flex items-center gap-1.5 mb-1"><Hash className="w-3.5 h-3.5 text-amber-600" /><span className="text-[10px] font-extrabold uppercase text-zinc-500">Pi Transaction Hash</span></div><div className="flex items-center gap-2"><span className="font-mono text-[11px] text-zinc-800 break-all flex-1">{transactionHash}</span><button type="button" onClick={() => copy(transactionHash, 'Transaction hash')} className="shrink-0 p-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100" title="Copy transaction hash"><Copy className="w-3.5 h-3.5" /></button></div></div>}
          {booking.attachments && booking.attachments.length > 0 && <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200"><div className="flex items-center gap-1.5 mb-2"><Paperclip className="w-3.5 h-3.5 text-amber-600" /><span className="text-[10px] font-extrabold uppercase text-zinc-500">Client Attachments</span></div><div className="space-y-1.5">{booking.attachments.map((attachment) => <div key={attachment.id} className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-zinc-800">{attachment.name}</span><span className="text-[10px] text-zinc-400 shrink-0">{attachment.size}</span></div>)}</div></div>}
          {booking.rejection_reason && <div className="p-3 rounded-2xl bg-red-50 border border-red-200"><span className="block text-[10px] font-extrabold uppercase text-red-700">Cancellation Reason</span><p className="text-xs text-red-900 mt-1 whitespace-pre-wrap">{booking.rejection_reason}</p></div>}
        </div>
      </div>
    </div>
  );
};
