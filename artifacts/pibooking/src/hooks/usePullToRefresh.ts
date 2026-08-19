import { useState, useEffect, useRef, useCallback } from 'react';

export interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  pullThreshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
}

export interface UsePullToRefreshReturn {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  pullProgress: number; // 0 to 1 (or > 1 when past threshold)
  isThresholdReached: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function usePullToRefresh({
  onRefresh,
  pullThreshold = 65,
  maxPullDistance = 95,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [pullDistance, setPullDistance] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number>(0);
  const startXRef = useRef<number>(0);
  const canPullRef = useRef<boolean>(false);
  const isPullingRef = useRef<boolean>(false);
  const isRefreshingRef = useRef<boolean>(false);
  const isHorizontalGestureRef = useRef<boolean>(false);
  const isGestureDeterminedRef = useRef<boolean>(false);

  // Keep ref up to date to avoid stale closure
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  // Check if scrollable parent or window is at the top
  const isScrolledToTop = useCallback(() => {
    if (typeof window === 'undefined') return false;

    // Check window scroll
    const windowScrollTop =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    if (windowScrollTop > 3) return false;

    // Also check main container scroll if any
    const mainEl = document.querySelector('main');
    if (mainEl && mainEl.scrollTop > 3) return false;

    return true;
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshingRef.current) return;

      // Only single touch
      if (e.touches.length !== 1) return;

      // Check if target is inside an element that is scrolled down
      let targetEl = e.target as HTMLElement | null;
      let hasScrolledAncestor = false;
      while (targetEl && targetEl !== document.body && targetEl !== document.documentElement) {
        if (targetEl.scrollTop > 3) {
          hasScrolledAncestor = true;
          break;
        }
        targetEl = targetEl.parentElement;
      }

      if (hasScrolledAncestor || !isScrolledToTop()) {
        canPullRef.current = false;
        return;
      }

      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      canPullRef.current = true;
      isPullingRef.current = false;
      isHorizontalGestureRef.current = false;
      isGestureDeterminedRef.current = false;
    },
    [disabled, isScrolledToTop]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!canPullRef.current || disabled || isRefreshingRef.current) return;
      if (e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const rawDeltaY = currentY - startYRef.current;
      const rawDeltaX = currentX - startXRef.current;

      // Determine gesture direction early
      if (!isGestureDeterminedRef.current) {
        const absX = Math.abs(rawDeltaX);
        const absY = Math.abs(rawDeltaY);

        if (absX > 6 || absY > 6) {
          isGestureDeterminedRef.current = true;
          if (absX > absY) {
            // Horizontal swipe (carousel, slider, drawer) -> disable PTR for this gesture
            isHorizontalGestureRef.current = true;
            canPullRef.current = false;
            return;
          }
        }
      }

      if (isHorizontalGestureRef.current) return;

      // If scrolling upwards (moving down the page), PTR shouldn't activate
      if (rawDeltaY <= 0) {
        if (isPullingRef.current) {
          isPullingRef.current = false;
          setIsPulling(false);
          setPullDistance(0);
        }
        return;
      }

      // Ensure we are still at the top before engaging resistance
      if (!isScrolledToTop()) {
        canPullRef.current = false;
        if (isPullingRef.current) {
          isPullingRef.current = false;
          setIsPulling(false);
          setPullDistance(0);
        }
        return;
      }

      // Smooth logarithmic/power damping curve for natural pull resistance
      // deltaY 0 -> 0, deltaY 150 -> ~75px, deltaY 300 -> ~95px
      const dampedDistance = Math.min(
        maxPullDistance,
        Math.pow(rawDeltaY, 0.78) * 1.6
      );

      if (dampedDistance > 4) {
        isPullingRef.current = true;
        setIsPulling(true);
        setPullDistance(dampedDistance);

        // Prevent native browser overscroll action if cancelable
        if (e.cancelable && dampedDistance > 10) {
          e.preventDefault();
        }
      }
    },
    [disabled, isScrolledToTop, maxPullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!canPullRef.current && !isPullingRef.current) return;

    const currentDistance = isPullingRef.current ? pullDistance : 0;
    const reachedThreshold = currentDistance >= pullThreshold;

    canPullRef.current = false;
    isPullingRef.current = false;
    setIsPulling(false);

    if (reachedThreshold && !isRefreshingRef.current && !disabled) {
      setIsRefreshing(true);
      isRefreshingRef.current = true;
      setPullDistance(pullThreshold); // Hold at threshold while refreshing

      try {
        await onRefreshRef.current();
      } catch (err) {
        console.error('Pull to refresh failed:', err);
      } finally {
        // Smooth release after refresh
        setIsRefreshing(false);
        isRefreshingRef.current = false;
        setPullDistance(0);
      }
    } else {
      // Smooth snap back
      setPullDistance(0);
    }
  }, [disabled, pullDistance, pullThreshold]);

  const handleTouchCancel = useCallback(() => {
    canPullRef.current = false;
    isPullingRef.current = false;
    setIsPulling(false);
    if (!isRefreshingRef.current) {
      setPullDistance(0);
    }
  }, []);

  useEffect(() => {
    if (disabled) return;

    const options: AddEventListenerOptions = { passive: false };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, options);
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  const pullProgress = Math.min(1.2, pullDistance / pullThreshold);
  const isThresholdReached = pullDistance >= pullThreshold;

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress,
    isThresholdReached,
    containerRef,
  };
}
