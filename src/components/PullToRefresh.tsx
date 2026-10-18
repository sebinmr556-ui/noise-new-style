import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, ArrowDown, RefreshCw, Sparkles, Check } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  isRefreshing: boolean;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 55;
const MAX_PULL = 85;

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  isRefreshing,
  children,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const startYRef = useRef(0);
  const isTrackingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollY <= 2) {
      isTrackingRef.current = true;
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTrackingRef.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const dy = currentY - startYRef.current;

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollY > 2) {
      isTrackingRef.current = false;
      setPullDistance(0);
      setIsPulling(false);
      return;
    }

    if (dy > 0) {
      // Elastic resistance curve
      const resistance = 0.42;
      const calculated = Math.min(dy * resistance, MAX_PULL);
      setPullDistance(calculated);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isTrackingRef.current) return;
    isTrackingRef.current = false;
    setIsPulling(false);

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([20]);
        } catch {}
      }
      onRefresh();
    } else {
      setPullDistance(0);
    }
  };

  // Handle desktop mouse drag for preview testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isRefreshing) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollY <= 2) {
      isTrackingRef.current = true;
      startYRef.current = e.clientY;
      setIsPulling(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isTrackingRef.current || isRefreshing) return;
    const currentY = e.clientY;
    const dy = currentY - startYRef.current;

    if (dy > 0) {
      const calculated = Math.min(dy * 0.4, MAX_PULL);
      setPullDistance(calculated);
    }
  };

  const handleMouseUp = () => {
    if (!isTrackingRef.current) return;
    isTrackingRef.current = false;
    setIsPulling(false);

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      onRefresh();
    } else {
      setPullDistance(0);
    }
  };

  // Watch isRefreshing transitions for success animation
  useEffect(() => {
    if (isRefreshing) {
      setPullDistance(PULL_THRESHOLD);
    } else if (pullDistance > 0) {
      setJustRefreshed(true);
      const timer = setTimeout(() => {
        setJustRefreshed(false);
        setPullDistance(0);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isRefreshing]);

  const rotation = Math.min(pullDistance * 4.5, 360);
  const isReadyToRelease = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative select-none"
    >
      {/* Animated Pull Indicator Banner */}
      <div
        className={`w-full overflow-hidden flex items-center justify-center transition-all ${
          isPulling ? 'duration-75' : 'duration-300 ease-out'
        }`}
        style={{
          height: isRefreshing ? '52px' : `${pullDistance}px`,
          opacity: pullDistance > 8 || isRefreshing ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 shadow-xl backdrop-blur-md">
          {justRefreshed ? (
            <>
              <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
              <span className="text-[11px] font-bold text-emerald-400">Feed refreshed!</span>
            </>
          ) : isRefreshing ? (
            <>
              <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
              <span className="text-[11px] font-bold text-zinc-300">Reloading latest posts...</span>
            </>
          ) : (
            <>
              <div
                style={{ transform: `rotate(${rotation}deg)` }}
                className="transition-transform duration-75 text-rose-500"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-semibold text-zinc-300">
                {isReadyToRelease ? 'Release to refresh' : 'Pull down to refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Content Feed with slight downward translation during active pull */}
      <div
        style={{
          transform: isPulling && pullDistance > 0 ? `translateY(${pullDistance * 0.15}px)` : 'none',
          transition: isPulling ? 'none' : 'transform 250ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};
