import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { Booking } from '../types';

interface ClientReviewModalProps {
  booking: Booking;
  onSubmit: (rating?: number, comment?: string) => Promise<void>;
  onDismiss: () => Promise<void>;
}

export const ClientReviewModal: React.FC<ClientReviewModalProps> = ({ booking, onSubmit, onDismiss }) => {
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError('');
    try { await onSubmit(rating, comment.trim() || undefined); } catch (e: any) { setError(e?.message || 'Could not save your review.'); setSaving(false); }
  };

  const dismiss = async () => {
    if (saving) return;
    setSaving(true); setError('');
    try { await onDismiss(); } catch (e: any) { setError(e?.message || 'Could not dismiss the review prompt.'); setSaving(false); }
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="client-review-title">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
        <div><h2 id="client-review-title" className="text-sm font-black text-zinc-950">How was your service?</h2><p className="text-[11px] text-zinc-500 mt-1">{booking.serviceName}</p></div>
        <button type="button" onClick={dismiss} disabled={saving} className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-50" aria-label="Dismiss review"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-5 space-y-5">
        <div><p className="text-xs font-bold text-zinc-700 mb-2">Rating <span className="font-normal text-zinc-400">(optional)</span></p><div className="flex gap-1">{[1,2,3,4,5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} className="p-1 rounded-lg hover:bg-amber-50" aria-label={`${value} star${value === 1 ? '' : 's'}`}><Star className={`w-7 h-7 ${rating && value <= rating ? 'text-amber-500 fill-amber-500' : 'text-zinc-300'}`} /></button>)}</div></div>
        <div><label htmlFor="client-review-comment" className="text-xs font-bold text-zinc-700">Written review <span className="font-normal text-zinc-400">(optional)</span></label><textarea id="client-review-comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share anything about your experience..." className="mt-2 w-full p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs outline-none focus:border-amber-500 resize-none" /></div>
        {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}
        <div className="flex gap-2"><button type="button" onClick={dismiss} disabled={saving} className="flex-1 py-3 rounded-xl border border-zinc-200 text-xs font-black text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">Not now</button><button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black disabled:opacity-50">{saving ? 'Saving…' : 'Submit'}</button></div>
      </div>
    </form>
  </div>;
};
