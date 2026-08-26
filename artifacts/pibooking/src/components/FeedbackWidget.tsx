import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, CheckCircle2, AlertCircle, Loader2, Minus } from 'lucide-react';
import { piAuthService } from '../services/piAuthService';

type FeedbackType = 'bug' | 'suggestion' | 'general';

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug / Problem' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'general', label: 'General Feedback' },
];

const STORAGE_PILL = 'w3c_feedback_pill_pos';
const STORAGE_PANEL = 'w3c_feedback_panel_pos';

type Pos = { x: number; y: number };

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

function loadPos(key: string, fallback: Pos): Pos {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Pos;
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') return parsed;
  } catch {
    /* ignore */
  }
  return fallback;
}

function savePos(key: string, pos: Pos) {
  try {
    localStorage.setItem(key, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

function defaultPillPos(): Pos {
  if (typeof window === 'undefined') return { x: 16, y: 120 };
  return {
    x: Math.max(16, window.innerWidth - 110),
    y: Math.max(80, window.innerHeight - 100),
  };
}

function defaultPanelPos(): Pos {
  if (typeof window === 'undefined') return { x: 16, y: 80 };
  const w = Math.min(384, window.innerWidth - 24);
  return {
    x: Math.max(12, (window.innerWidth - w) / 2),
    y: Math.max(24, window.innerHeight * 0.12),
  };
}

export const FeedbackWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [bounce, setBounce] = useState(false);

  const [pillPos, setPillPos] = useState<Pos>(() => loadPos(STORAGE_PILL, defaultPillPos()));
  const [panelPos, setPanelPos] = useState<Pos>(() => loadPos(STORAGE_PANEL, defaultPanelPos()));

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReducedMotion = useRef(false);

  // Drag state (shared pattern for pill + panel)
  const dragRef = useRef<{
    target: 'pill' | 'panel' | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  }>({ target: null, startX: 0, startY: 0, origX: 0, origY: 0, moved: false });

  const pillRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  // Periodic attention bounce every 10s (only when closed)
  useEffect(() => {
    if (prefersReducedMotion.current) return;

    const triggerBounce = () => {
      if (open) return;
      setBounce(true);
      setTimeout(() => setBounce(false), 1100);
    };

    intervalRef.current = setInterval(triggerBounce, 10_000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open]);

  // Keep positions on-screen after resize
  useEffect(() => {
    const onResize = () => {
      setPillPos((p) => {
        const next = {
          x: clamp(p.x, 8, window.innerWidth - 80),
          y: clamp(p.y, 8, window.innerHeight - 48),
        };
        savePos(STORAGE_PILL, next);
        return next;
      });
      setPanelPos((p) => {
        const next = {
          x: clamp(p.x, 8, window.innerWidth - 200),
          y: clamp(p.y, 8, window.innerHeight - 120),
        };
        savePos(STORAGE_PANEL, next);
        return next;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const getPoint = (e: MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('changedTouches' in e && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    const me = e as MouseEvent;
    return { x: me.clientX, y: me.clientY };
  };

  const onPointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    const d = dragRef.current;
    if (!d.target) return;
    if ('touches' in e) e.preventDefault(); // prevent scroll while dragging

    const pt = getPoint(e);
    const dx = pt.x - d.startX;
    const dy = pt.y - d.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;

    if (d.target === 'pill') {
      const next = {
        x: clamp(d.origX + dx, 8, window.innerWidth - 80),
        y: clamp(d.origY + dy, 8, window.innerHeight - 48),
      };
      setPillPos(next);
    } else if (d.target === 'panel') {
      const panelW = panelRef.current?.offsetWidth ?? 360;
      const panelH = panelRef.current?.offsetHeight ?? 420;
      const next = {
        x: clamp(d.origX + dx, 8, window.innerWidth - Math.min(panelW, window.innerWidth - 16)),
        y: clamp(d.origY + dy, 8, window.innerHeight - Math.min(panelH, window.innerHeight - 16)),
      };
      setPanelPos(next);
    }
  }, []);

  const onPointerUp = useCallback(() => {
    const d = dragRef.current;
    if (d.target === 'pill') {
      setPillPos((p) => {
        savePos(STORAGE_PILL, p);
        return p;
      });
    } else if (d.target === 'panel') {
      setPanelPos((p) => {
        savePos(STORAGE_PANEL, p);
        return p;
      });
    }
    dragRef.current.target = null;
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', onPointerUp);
    window.removeEventListener('touchcancel', onPointerUp);
  }, [onPointerMove]);

  const startDrag = (
    target: 'pill' | 'panel',
    e: React.MouseEvent | React.TouchEvent,
    current: Pos
  ) => {
    // Don't start drag from interactive form controls
    const el = e.target as HTMLElement;
    if (el.closest('textarea, input, button, select, a, [role="button"]') && target === 'panel') {
      // Allow drag only from handle / header chrome, not form fields
      if (!el.closest('[data-drag-handle]')) return;
    }

    const pt = getPoint(e.nativeEvent);
    dragRef.current = {
      target,
      startX: pt.x,
      startY: pt.y,
      origX: current.x,
      origY: current.y,
      moved: false,
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);
  };

  const resetForm = useCallback(() => {
    setType('bug');
    setMessage('');
    setContact('');
    setStatus('idle');
    setErrorMsg('');
  }, []);

  /** Minimize: hide form, keep typed content */
  const handleMinimize = () => {
    setOpen(false);
  };

  /** Full close (X or backdrop): minimize + optionally clear after success */
  const handleClose = () => {
    setOpen(false);
    if (status === 'success') {
      setTimeout(resetForm, 300);
    }
  };

  const handlePillClick = () => {
    // Ignore click if user was dragging
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    setOpen(true);
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
      {/* Floating pill — draggable */}
      {!open && (
        <button
          ref={pillRef}
          type="button"
          id="btn-feedback-widget"
          aria-label="Open feedback form"
          onClick={handlePillClick}
          onMouseDown={(e) => startDrag('pill', e, pillPos)}
          onTouchStart={(e) => startDrag('pill', e, pillPos)}
          className={`
            fixed z-[60] touch-none select-none
            px-3.5 py-2 rounded-full
            bg-zinc-900 text-white text-xs font-bold tracking-wide
            shadow-lg shadow-black/25
            hover:bg-zinc-800 active:scale-[0.97]
            transition-colors
            border border-zinc-700/60
            cursor-grab active:cursor-grabbing
            ${bounce ? 'feedback-attention-bounce' : ''}
          `}
          style={{
            left: pillPos.x,
            top: pillPos.y,
            right: 'auto',
            bottom: 'auto',
          }}
        >
          Feedback
        </button>
      )}

      {/* Modal — movable panel + semi-transparent backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[70]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={handleClose}
          />

          {/* Draggable panel */}
          <div
            ref={panelRef}
            className="absolute w-[min(100%-24px,24rem)] max-h-[min(90dvh,560px)] bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col"
            style={{
              left: panelPos.x,
              top: panelPos.y,
            }}
          >
            {/* Drag handle — three dots centered */}
            <div
              data-drag-handle
              onMouseDown={(e) => startDrag('panel', e, panelPos)}
              onTouchStart={(e) => startDrag('panel', e, panelPos)}
              className="flex justify-center pt-2 pb-0.5 cursor-grab active:cursor-grabbing touch-none select-none bg-zinc-50/90"
              title="Drag to move"
            >
              <div className="flex items-center gap-1 px-3 py-1 rounded-full hover:bg-zinc-200/80 transition">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              </div>
            </div>

            {/* Header */}
            <div
              data-drag-handle
              onMouseDown={(e) => startDrag('panel', e, panelPos)}
              onTouchStart={(e) => startDrag('panel', e, panelPos)}
              className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 bg-zinc-50/80 cursor-grab active:cursor-grabbing touch-none select-none"
            >
              <h2 id="feedback-title" className="text-sm font-black text-zinc-900">
                Tester Feedback
              </h2>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMinimize();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-500 transition cursor-pointer"
                  aria-label="Minimize"
                  title="Minimize to pill"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-500 transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body — scrollable */}
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {status === 'success' ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-zinc-900">Thanks! Feedback sent.</p>
                  <p className="text-xs text-zinc-500">The team will review it shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
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
