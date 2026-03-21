import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--spacing-16)' }}>
            <h1 className="title-gradient" style={{ fontSize: '6rem', marginBottom: 'var(--spacing-4)' }}>404</h1>
            <p style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-8)' }}>
                Diese Seite existiert nicht.
            </p>
            <Link href="/" className="btn btn-primary">Zur Startseite</Link>
        </div>
    );
}
