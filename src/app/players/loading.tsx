import { SkeletonPlayerCard } from '@/components/Skeleton';

export default function PlayersLoading() {
  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <div style={{ marginBottom: 'var(--spacing-8)' }}>
        <h1 className="title-display" style={{ fontSize: '2rem' }}>
          Spieler
        </h1>
        <p className="subtitle" style={{ fontSize: '0.9rem' }}>
          Alle registrierten Spieler
        </p>
      </div>

      {/* Skeleton Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--spacing-4)',
        }}
      >
        <SkeletonPlayerCard />
        <SkeletonPlayerCard />
        <SkeletonPlayerCard />
        <SkeletonPlayerCard />
        <SkeletonPlayerCard />
        <SkeletonPlayerCard />
      </div>
    </div>
  );
}
