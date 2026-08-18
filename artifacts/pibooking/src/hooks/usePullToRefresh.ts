import { useEffect, useRef, useState } from 'react';

interface Options {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 72 }: Options) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const refreshing = useRef(false);
  const [distance, setDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const getScrollTop = () => Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop);
    const isInteractive = (target: EventTarget | null) => target instanceof Element && !!target.closest('input, textarea, select, button, a, [contenteditable="true"], [data-no-pull-to-refresh]');

    const onTouchStart = (event: TouchEvent) => {
      if (refreshing.current || getScrollTop() > 0 || isInteractive(event.target)) return;
      startY.current = event.touches[0]?.clientY || 0;
      pulling.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pulling.current || refreshing.current) return;
      const currentY = event.touches[0]?.clientY || 0;
      const delta = currentY - startY.current;
      if (delta <= 0) { setDistance(0); return; }
      const eased = Math.min(110, delta * 0.45);
      setDistance(eased);
      if (eased > 2) event.preventDefault();
    };

    const finish = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (distance < threshold * 0.45) { setDistance(0); return; }
      refreshing.current = true;
      setIsRefreshing(true);
      setDistance(threshold * 0.45);
      try { await onRefresh(); } finally {
        setDistance(0);
        setIsRefreshing(false);
        refreshing.current = false;
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', finish, { passive: true });
    window.addEventListener('touchcancel', finish, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', finish);
      window.removeEventListener('touchcancel', finish);
    };
  }, [distance, onRefresh, threshold]);

  return { distance, isRefreshing };
}
