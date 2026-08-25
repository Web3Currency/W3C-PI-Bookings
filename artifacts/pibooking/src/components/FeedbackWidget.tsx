import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { piAuthService } from '../services/piAuthService';

type FeedbackType = 'bug' | 'suggestion' | 'general';

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug / Problem' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'general', label: 'General Feedback' },
];

export const FeedbackWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [bounce, setBounce] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReducedMotion = useRef(false);

  // Detect reduced-motion preference once
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Periodic attention bounce every 10s
  useEffect(() => {
    if (prefersReducedMotion.current) return;

    const triggerBounce = () => {
      if (open) return; // don't bounce while modal is open
      setBounce(true);
      // Animation duration ~1s; clear flag after it finishes
      setTimeout(() => setBounce(false), 1100);
    };

    // First bounce after 10s, then every 10s
    intervalRef.current = setInterval(triggerBounce, 10_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open]);

  const resetForm = useCallback(() => {
    setType('bug');
    setMessage('');
    setContact('');
    setStatus('idle');
    setErrorMsg('');
  }, []);

  const handleClose = () => {
    setOpen(false);
    // brief delay so success state is visible if just submitted
    setTimeout(resetForm, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || status === 'sending') return;

    setStatus('sending');
    setErrorMsg('');

    const piUser = piAuthService.getStoredUser();

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          contact: contact.trim() || undefined,
          page: window.location.pathname + window.location.search,
          piUsername: piUser?.username || undefined,
          piUid: piUser?.uid || undefined,
          userAgent: navigator.userAgent.slice(0, 200),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Submission failed. Please try again.');
        return;
      }

      setStatus('success');
      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  };

  return (
    <>
      {/* Floating button — text only, no icon */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        id="btn-feedback-widget"
        aria-label="Open feedback form"
        className={`
          fixed bottom-20 right-4 z-[60]
          px-3.5 py-2 rounded-full
          bg-zinc-900 text-white text-xs font-bold tracking-wide
          shadow-lg shadow-black/25
          hover:bg-zinc-800 active:scale-[0.97]
          transition-colors
          border border-zinc-700/60
          ${bounce ? 'feedback-attention-bounce' : ''}
        `}
        style={{
          // ensure it sits above most sticky bars but below modals
        }}
      >
        Feedback
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={handleClose}
          />

          {/* Panel */}
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/80">
              <h2 id="feedback-title" className="text-sm font-black text-zinc-900">
                Tester Feedback
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-500 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {status === 'success' ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-zinc-900">Thanks! Feedback sent.</p>
                  <p className="text-xs text-zinc-500">The team will review it shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Type */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      Type
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setType(opt.value)}
                          className={`
                            px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer
                            ${
                              type === opt.value
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                            }
                          `}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="feedback-message"
                      className="text-[11px] font-bold uppercase tracking-wider text-zinc-500"
                    >
                      Message <span className="text-amber-600">*</span>
                    </label>
                    <textarea
                      id="feedback-message"
                      rows={4}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe what happened, what you expected, or any suggestion…"
                      className="w-full p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition resize-none"
                      maxLength={2000}
                      disabled={status === 'sending'}
                    />
                  </div>

                  {/* Optional contact */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="feedback-contact"
                      className="text-[11px] font-bold uppercase tracking-wider text-zinc-500"
                    >
                      Contact (optional)
                    </label>
                    <input
                      id="feedback-contact"
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Telegram / email if you want a reply"
                      className="w-full p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition"
                      maxLength={120}
                      disabled={status === 'sending'}
                    />
                  </div>

                  {status === 'error' && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!message.trim() || status === 'sending'}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    {status === 'sending' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending…</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Feedback</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keyframes for the attention bounce — pure CSS, no library */}
      <style>{`
        @keyframes feedback-attention-bounce {
          0%, 100% { transform: translateY(0); }
          12% { transform: translateY(-7px); }
          24% { transform: translateY(0); }
          36% { transform: translateY(-5px); }
          48% { transform: translateY(0); }
          60% { transform: translateY(-3px); }
          72% { transform: translateY(0); }
          84% { transform: translateY(-1.5px); }
          96% { transform: translateY(0); }
        }
        .feedback-attention-bounce {
          animation: feedback-attention-bounce 1.05s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .feedback-attention-bounce {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
};
