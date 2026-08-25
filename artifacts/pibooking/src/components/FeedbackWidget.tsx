import React, { useMemo, useState } from 'react';
import { MessageSquarePlus, X, Loader2, CheckCircle2 } from 'lucide-react';
import { piAuthService } from '../services/piAuthService';

type FeedbackType = 'bug' | 'suggestion' | 'general';
type SubmitState = 'idle' | 'sending' | 'success' | 'error';

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug / Problem' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'general', label: 'General Feedback' },
];

function currentPageContext(): string {
  try {
    const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    return path || '/';
  } catch {
    return 'unknown';
  }
}

export const FeedbackWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState('');

  const storedUser = useMemo(() => piAuthService.getStoredUser(), [open]);

  const resetForm = () => {
    setType('bug');
    setMessage('');
    setContact('');
    setState('idle');
    setError('');
  };

  const close = () => {
    setOpen(false);
    if (state === 'success') resetForm();
  };

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed || state === 'sending') return;
    setState('sending');
    setError('');
    try {
      const body: Record<string, string> = {
        type,
        message: trimmed,
        page: currentPageContext(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      };
      if (storedUser?.accessToken) body.accessToken = storedUser.accessToken;
      if (!storedUser && contact.trim()) body.contact = contact.trim();

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setState('error');
        setError(payload.error || 'Submission failed. Please try again.');
        return;
      }
      setState('success');
    } catch {
      setState('error');
      setError('Network error. Please try again.');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          if (state === 'success') resetForm();
        }}
        className="fixed bottom-20 right-4 z-[60] sm:bottom-6 inline-flex items-center gap-1.5 rounded-full bg-orange-600 text-white px-3.5 py-2.5 text-xs font-black shadow-lg shadow-orange-600/25 hover:bg-orange-700 active:scale-[0.98] transition"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="w-4 h-4" />
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close feedback"
            onClick={close}
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-zinc-100 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <div>
                <div className="text-sm font-black text-zinc-900">Tester feedback</div>
                <div className="text-[11px] text-zinc-500 font-medium">Reports go to the developer on Telegram</div>
              </div>
              <button
                type="button"
                onClick={close}
                className="w-8 h-8 rounded-xl hover:bg-zinc-50 flex items-center justify-center text-zinc-500"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {state === 'success' ? (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <div className="text-sm font-black text-zinc-900">Feedback submitted</div>
                  <p className="text-xs text-zinc-500 px-4">
                    Thanks — your report was sent. You can close this window or send another.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                    }}
                    className="mt-2 text-xs font-bold text-orange-600"
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1.5">Type</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TYPE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setType(option.value)}
                          className={`rounded-xl px-2 py-2 text-[11px] font-bold border transition ${
                            type === option.value
                              ? 'bg-orange-50 border-orange-300 text-orange-800'
                              : 'bg-zinc-50 border-transparent text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1.5">Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      maxLength={4000}
                      placeholder="Describe what happened, what you expected, and any steps to reproduce…"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-orange-300 focus:outline-none px-3 py-2.5 text-sm text-zinc-800 resize-none"
                    />
                  </div>

                  {storedUser ? (
                    <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2 text-[11px] text-zinc-600">
                      Signed in as <span className="font-bold text-zinc-800">@{String(storedUser.username).replace(/^@+/, '')}</span>
                      <span className="text-zinc-400"> · included automatically</span>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-1.5">
                        Contact <span className="font-medium text-zinc-400">(optional)</span>
                      </label>
                      <input
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="Pi username or way to reach you"
                        className="w-full h-10 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-orange-300 focus:outline-none px-3 text-sm"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600 font-medium">
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={submit}
                    disabled={!message.trim() || state === 'sending'}
                    className="w-full h-11 rounded-xl bg-orange-600 text-white text-sm font-black disabled:opacity-40 inline-flex items-center justify-center gap-2 hover:bg-orange-700 transition"
                  >
                    {state === 'sending' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      'Send Feedback'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
