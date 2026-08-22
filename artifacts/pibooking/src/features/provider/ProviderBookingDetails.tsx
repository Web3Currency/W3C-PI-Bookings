import React from 'react';
import { Booking } from '../../types';
import { Calendar, Clock, Copy, Mail, Send, FileText, Hash, Paperclip, X, MessageSquare } from 'lucide-react';
import { toast } from '../../hooks/use-toast';

interface ProviderBookingDetailsProps { booking: Booking; onClose: () => void; onOpenChat?: (bookingId: string) => void; }

export const ProviderBookingDetails: React.FC<ProviderBookingDetailsProps> = ({ booking, onClose, onOpenChat }) => {
  const copy = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); toast({ title: `${label} copied`, description: 'The value is ready to paste.' }); }
    catch { toast({ title: 'Copy failed', description: `Could not copy the ${label.toLowerCase()}.`, variant: 'destructive' }); }
  };
  const transactionHash = booking.piTxHash || '';
  const canChat = booking.status === 'Confirmed' || booking.status === 'In Progress';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white/95 backdrop-blur border-b border-zinc-100">
          <div><span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Booking Details</span><h3 className="text-base font-black text-zinc-900">{booking.serviceName}</h3></div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div><span className="block text-[10px] font-bold uppercase text-zinc-400">Client Name</span><span className="font-bold text-zinc-900">{booking.clientName || '—'}</span></div>
            <div><span className="block text-[10px] font-bold uppercase text-zinc-400">Pi Username</span><span className="font-bold text-zinc-900">{booking.clientPiUsername || '—'}</span></div>
            <div className="flex items-start gap-2"><Send className="w-3.5 h-3.5 mt-0.5 text-amber-600" /><div><span className="block text-[10px] font-bold uppercase text-zinc-400">Client Contact</span><span className="font-mono font-bold text-zinc-900 break-all">{booking.clientPhone || 'Not provided'}</span></div></div>
            <div className="flex items-start gap-2"><Mail className="w-3.5 h-3.5 mt-0.5 text-amber-600" /><div><span className="block text-[10px] font-bold uppercase text-zinc-400">Email</span><span className="font-medium text-zinc-900 break-all">{booking.clientEmail || 'Not provided'}</span></div></div>
            <div className="flex items-start gap-2"><Calendar className="w-3.5 h-3.5 mt-0.5 text-amber-600" /><div><span className="block text-[10px] font-bold uppercase text-zinc-400">Appointment Date</span><span className="font-bold text-zinc-900">{booking.date || '—'}</span></div></div>
            <div className="flex items-start gap-2"><Clock className="w-3.5 h-3.5 mt-0.5 text-amber-600" /><div><span className="block text-[10px] font-bold uppercase text-zinc-400">Time Slot</span><span className="font-bold text-zinc-900">{booking.timeSlot || '—'}</span></div></div>
          </div>
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-200"><div><span className="block text-[10px] font-bold uppercase text-zinc-400">Escrow Amount</span><span className="font-black text-amber-700">{booking.pricePi} π</span></div><div className="text-right"><span className="block text-[10px] font-bold uppercase text-zinc-400">Status</span><span className="font-bold text-zinc-900">{booking.status}</span></div></div>
          {canChat && onOpenChat && <button type="button" onClick={() => onOpenChat(booking.id)} className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black flex items-center justify-center gap-2 transition"><MessageSquare className="w-4 h-4" /><span>Chat with Client</span></button>}
          {booking.notes && <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200"><div className="flex items-center gap-1.5 mb-1"><FileText className="w-3.5 h-3.5 text-amber-600" /><span className="text-[10px] font-extrabold uppercase text-zinc-500">Requirement Notes</span></div><p className="text-xs leading-5 text-zinc-800 whitespace-pre-wrap">{booking.notes}</p></div>}
          {transactionHash && <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200"><div className="flex items-center gap-1.5 mb-1"><Hash className="w-3.5 h-3.5 text-amber-600" /><span className="text-[10px] font-extrabold uppercase text-zinc-500">Pi Transaction Hash</span></div><div className="flex items-center gap-2"><span className="font-mono text-[11px] text-zinc-800 break-all flex-1">{transactionHash}</span><button type="button" onClick={() => copy(transactionHash, 'Transaction hash')} className="shrink-0 p-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100" title="Copy transaction hash"><Copy className="w-3.5 h-3.5" /></button></div></div>}
          {booking.attachments && booking.attachments.length > 0 && <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200"><div className="flex items-center gap-1.5 mb-2"><Paperclip className="w-3.5 h-3.5 text-amber-600" /><span className="text-[10px] font-extrabold uppercase text-zinc-500">Client Attachments</span></div><div className="space-y-1.5">{booking.attachments.map((attachment) => <div key={attachment.id} className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-zinc-800">{attachment.name}</span><span className="text-[10px] text-zinc-400 shrink-0">{attachment.size}</span></div>)}</div></div>}
          {booking.rejection_reason && <div className="p-3 rounded-2xl bg-red-50 border border-red-200"><span className="block text-[10px] font-extrabold uppercase text-red-700">Cancellation Reason</span><p className="text-xs text-red-900 mt-1 whitespace-pre-wrap">{booking.rejection_reason}</p></div>}
        </div>
      </div>
    </div>
  );
};