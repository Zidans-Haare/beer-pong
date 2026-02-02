import Link from 'next/link';

export default function RulesPage() {
    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <Link href="/" className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-6)' }}>
                &larr; Zurück
            </Link>

            <header style={{ marginBottom: 'var(--spacing-8)' }}>
                <h1 className="title-display" style={{ fontSize: '2.5rem' }}>Offizielles Regelwerk</h1>
                <p className="subtitle"></p>
            </header>

            <div className="glass-panel" style={{ padding: 'var(--spacing-8)' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '200px'
                }}>
                    <h2 className="title-gradient" style={{ fontSize: '1.5rem' }}>
                        Muss Paul noch machen
                    </h2>
                </div>
            </div>
        </div>
    );
}
