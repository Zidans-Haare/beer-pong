'use client';

import { ReactNode, useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { Edit3, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { haptic } from '@/lib/haptics';

interface SwipeableMatchCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void; // Edit/Enter result
  onSwipeRight?: () => void; // View details
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 80;
const MAX_SWIPE = 120;

export default function SwipeableMatchCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Eintragen',
  rightLabel = 'Details',
  disabled = false,
}: SwipeableMatchCardProps) {
  const [isRevealed, setIsRevealed] = useState<'left' | 'right' | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);

  // Left action (swipe right reveals left action)
  const leftOpacity = useTransform(x, [0, SWIPE_THRESHOLD / 2, SWIPE_THRESHOLD], [0, 0.5, 1]);
  const leftScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.8, 1]);

  // Right action (swipe left reveals right action)
  const rightOpacity = useTransform(x, [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD / 2, 0], [1, 0.5, 0]);
  const rightScale = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0.8]);

  const handleDragEnd = (_: never, info: PanInfo) => {
    if (disabled) return;

    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Swipe right (reveal left action)
    if ((offset > SWIPE_THRESHOLD || velocity > 500) && onSwipeRight) {
      haptic.medium();
      setIsRevealed('left');
      animate(x, MAX_SWIPE, { type: 'spring', stiffness: 300, damping: 30 });
    }
    // Swipe left (reveal right action)
    else if ((offset < -SWIPE_THRESHOLD || velocity < -500) && onSwipeLeft) {
      haptic.medium();
      setIsRevealed('right');
      animate(x, -MAX_SWIPE, { type: 'spring', stiffness: 300, damping: 30 });
    }
    // Snap back
    else {
      setIsRevealed(null);
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  };

  const handleActionClick = (action: 'left' | 'right') => {
    haptic.light();

    // Reset position
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    setIsRevealed(null);

    // Trigger action
    if (action === 'left' && onSwipeRight) {
      onSwipeRight();
    } else if (action === 'right' && onSwipeLeft) {
      onSwipeLeft();
    }
  };

  const handleCardClick = () => {
    if (isRevealed) {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      setIsRevealed(null);
    }
  };

  return (
    <div
      ref={constraintsRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
      }}
    >
      {/* Left action (View details) - revealed on swipe right */}
      {onSwipeRight && (
        <motion.button
          onClick={() => handleActionClick('left')}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: MAX_SWIPE,
            background: 'linear-gradient(90deg, var(--color-primary) 0%, rgba(99, 102, 241, 0.8) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            opacity: leftOpacity,
            scale: leftScale,
          }}
        >
          <Eye size={24} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{rightLabel}</span>
        </motion.button>
      )}

      {/* Right action (Enter result) - revealed on swipe left */}
      {onSwipeLeft && (
        <motion.button
          onClick={() => handleActionClick('right')}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: MAX_SWIPE,
            background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.8) 0%, var(--color-success) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            opacity: rightOpacity,
            scale: rightScale,
          }}
        >
          <Edit3 size={24} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{leftLabel}</span>
        </motion.button>
      )}

      {/* Swipe hints */}
      <motion.div
        style={{
          position: 'absolute',
          left: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--color-text-dim)',
          opacity: useTransform(x, [-20, 0], [0, 0.5]),
          pointerEvents: 'none',
        }}
      >
        <ChevronRight size={20} />
      </motion.div>
      <motion.div
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--color-text-dim)',
          opacity: useTransform(x, [0, 20], [0.5, 0]),
          pointerEvents: 'none',
        }}
      >
        <ChevronLeft size={20} />
      </motion.div>

      {/* Card content */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: -MAX_SWIPE, right: MAX_SWIPE }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        style={{
          x,
          background: 'var(--card-bg)',
          borderRadius: 16,
          cursor: disabled ? 'default' : 'grab',
          touchAction: 'pan-y',
        }}
        whileTap={disabled ? undefined : { cursor: 'grabbing' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
