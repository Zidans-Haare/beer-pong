'use client';

import { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { haptic } from '@/lib/haptics';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  threshold?: number;
  maxPull?: number;
}

export default function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  maxPull = 120,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, threshold / 2, threshold], [0, 0.5, 1]);
  const rotate = useTransform(y, [0, threshold], [0, 180]);
  const scale = useTransform(y, [0, threshold], [0.5, 1]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      // Only start pull-to-refresh if at top of scroll
      if (container.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        isDragging.current = true;
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current || disabled || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Apply resistance for more natural feel
        const resistance = 0.5;
        const pullDistance = Math.min(diff * resistance, maxPull);
        y.set(pullDistance);

        // Trigger haptic at threshold
        const prevY = y.getPrevious();
        if (pullDistance >= threshold && prevY !== undefined && prevY < threshold) {
          haptic.medium();
        }
      }
    },
    [disabled, isRefreshing, maxPull, threshold, y]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const currentY = y.get();

    if (currentY >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      haptic.success();

      // Keep indicator visible during refresh
      animate(y, threshold, { duration: 0.2 });

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
        haptic.error();
      } finally {
        setIsRefreshing(false);
        animate(y, 0, { duration: 0.3, ease: 'easeOut' });
      }
    } else {
      // Snap back
      animate(y, 0, { duration: 0.3, ease: 'easeOut' });
    }
  }, [y, threshold, isRefreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        overflow: 'auto',
        height: '100%',
        touchAction: 'pan-y',
      }}
    >
      {/* Pull indicator */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: threshold,
          y: useTransform(y, (v) => v - threshold),
          opacity,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <motion.div
          style={{
            scale,
            rotate: isRefreshing ? undefined : rotate,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--color-primary)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
          animate={isRefreshing ? { rotate: 360 } : undefined}
          transition={
            isRefreshing
              ? { duration: 1, repeat: Infinity, ease: 'linear' }
              : undefined
          }
        >
          <RefreshCw size={20} color="white" />
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}
