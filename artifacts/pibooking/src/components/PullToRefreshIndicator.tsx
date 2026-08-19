import React from 'react';
import { ArrowDown, RotateCw } from 'lucide-react';

export interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  pullProgress: number;
  isThresholdReached: boolean;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  isPulling,
  isRefreshing,
  pullDistance,
  pullProgress,
  isThresholdReached,
}) => {
  // If not pulling and not refreshing, hide indicator completely
  if (!isPulling && !isRefreshing && pullDistance === 0) {
    return null;
  }

  // Smooth opacity and scale mapping
  const opacity = Math.min(1, Math.max(0, (pullDistance - 10) / 35));
  const scale = Math.min(1, 0.75 + pullProgress * 0.25);
  const arrowRotation = Math.min(180, pullProgress * 180);

  return (
    <div
      className="fixed top-14 left-0 right-0 z-40 flex justify-center pointer-events-none select-none transition-transform duration-150 ease-out"
      style={{
        transform: `translateY(${Math.max(0, pullDistance - 25)}px)`,
        opacity: isRefreshing ? 1 : opacity,
      }}
      role="status"
      aria-live="polite"
      aria-label={
        isRefreshing
          ? 'Refreshing application data'
          : isThresholdReached
          ? 'Release to refresh'
          : 'Pull down to refresh'
      }
    >
      <div
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 text-zinc-800 shadow-lg border border-amber-200/90 backdrop-blur-md transition-all"
        style={{
          transform: `scale(${isRefreshing ? 1 : scale})`,
        }}
      >
        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
          {isRefreshing ? (
            <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-600 motion-reduce:animate-none" />
          ) : (
            <ArrowDown
              className="w-3.5 h-3.5 transition-transform duration-100 ease-out"
              style={{
                transform: `rotate(${isThresholdReached ? 180 : arrowRotation}deg)`,
              }}
            />
          )}
        </div>

        <span className="text-[11px] font-bold tracking-tight text-zinc-800 whitespace-nowrap">
          {isRefreshing
            ? 'Refreshing...'
            : isThresholdReached
            ? 'Release to refresh'
            : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
};
