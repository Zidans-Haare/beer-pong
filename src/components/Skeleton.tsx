'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({
  className,
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  return (
    <motion.div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--card-bg) 0%, rgba(255,255,255,0.1) 50%, var(--card-bg) 100%)',
        backgroundSize: '200% 100%',
        ...style,
      }}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

// Pre-built skeleton variants
export function SkeletonText({
  lines = 1,
  lastLineWidth = '60%',
}: {
  lines?: number;
  lastLineWidth?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 48 }: { size?: number }) {
  return <Skeleton width={size} height={size} borderRadius="50%" />;
}

export function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SkeletonAvatar />
        <div style={{ flex: 1 }}>
          <Skeleton height={18} width="70%" style={{ marginBottom: 8 }} />
          <Skeleton height={14} width="40%" />
        </div>
      </div>
      <Skeleton height={1} width="100%" />
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonMatchCard() {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Player 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <SkeletonAvatar size={40} />
          <Skeleton height={16} width={80} />
        </div>

        {/* Score */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 16px',
          }}
        >
          <Skeleton height={28} width={28} borderRadius={6} />
          <Skeleton height={20} width={10} />
          <Skeleton height={28} width={28} borderRadius={6} />
        </div>

        {/* Player 2 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          <Skeleton height={16} width={80} />
          <SkeletonAvatar size={40} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTournamentCard() {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Skeleton height={22} width="60%" style={{ marginBottom: 8 }} />
          <Skeleton height={14} width="40%" />
        </div>
        <Skeleton height={28} width={80} borderRadius={14} />
      </div>
      <Skeleton height={1} width="100%" />
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Skeleton height={16} width={16} borderRadius={4} />
          <Skeleton height={14} width={60} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Skeleton height={16} width={16} borderRadius={4} />
          <Skeleton height={14} width={80} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonPlayerCard() {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <SkeletonAvatar size={56} />
      <div style={{ flex: 1 }}>
        <Skeleton height={18} width="50%" style={{ marginBottom: 8 }} />
        <Skeleton height={14} width="30%" />
      </div>
      <div style={{ textAlign: 'right' }}>
        <Skeleton height={24} width={40} style={{ marginBottom: 4 }} />
        <Skeleton height={12} width={50} />
      </div>
    </div>
  );
}

export function SkeletonList({
  count = 3,
  component: Component = SkeletonCard,
  gap = 12,
}: {
  count?: number;
  component?: React.ComponentType;
  gap?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </div>
  );
}
