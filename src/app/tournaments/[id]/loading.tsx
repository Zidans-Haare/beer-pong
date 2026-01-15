import { Skeleton, SkeletonMatchCard, SkeletonText } from '@/components/Skeleton';

export default function TournamentLoading() {
  return (
    <div className="container">
      {/* Back button */}
      <Skeleton height={40} width={180} style={{ marginBottom: 'var(--spacing-6)' }} />

      {/* Header */}
      <header style={{ marginBottom: 'var(--spacing-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '8px' }}>
          <Skeleton height={36} width="60%" style={{ marginBottom: 'var(--spacing-2)' }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-6)', marginTop: 'var(--spacing-4)' }}>
          <Skeleton height={20} width={150} />
          <Skeleton height={20} width={120} />
          <Skeleton height={20} width={100} />
        </div>
      </header>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--spacing-8)' }}>
        {/* Participants */}
        <div>
          <Skeleton height={28} width={180} style={{ marginBottom: 'var(--spacing-4)' }} />
          <div
            className="glass-panel"
            style={{ padding: 'var(--spacing-4)' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 'var(--spacing-2)',
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={60} />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside>
          <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
            <Skeleton height={24} width="60%" style={{ marginBottom: 'var(--spacing-4)' }} />
            <SkeletonText lines={2} />
            <Skeleton height={48} width="100%" style={{ marginTop: 'var(--spacing-4)' }} />
          </div>
        </aside>
      </div>

      {/* Matches section */}
      <div style={{ marginTop: 'var(--spacing-12)' }}>
        <Skeleton height={32} width={200} style={{ marginBottom: 'var(--spacing-6)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <SkeletonMatchCard />
          <SkeletonMatchCard />
          <SkeletonMatchCard />
        </div>
      </div>
    </div>
  );
}
