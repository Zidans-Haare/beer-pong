import { SkeletonTournamentCard, SkeletonList } from '@/components/Skeleton';

export default function TournamentsLoading() {
  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-8)',
        }}
      >
        <div>
          <h1 className="title-display" style={{ fontSize: '2rem' }}>
            Turniere
          </h1>
          <p className="subtitle" style={{ fontSize: '0.9rem' }}>
            Alle Events auf einen Blick
          </p>
        </div>
      </div>

      {/* Skeleton Cards */}
      <div style={{ marginBottom: 'var(--spacing-12)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 'var(--spacing-6)',
          }}
        >
          <SkeletonTournamentCard />
          <SkeletonTournamentCard />
          <SkeletonTournamentCard />
        </div>
      </div>
    </div>
  );
}
