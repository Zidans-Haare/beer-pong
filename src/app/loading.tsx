import { SkeletonCard } from '@/components/Skeleton';

// Sofortiger Ladezustand für alle Seiten ohne eigenen. Dadurch reagiert die Navigation
// beim Tippen sofort, auch wenn die Serverantwort noch unterwegs ist.
export default function Loading() {
    return (
        <div className="container page-content" style={{ paddingBottom: '100px' }} aria-busy="true">
            <div className="page-loading-title" />
            <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
        </div>
    );
}
