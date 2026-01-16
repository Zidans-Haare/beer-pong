import Link from 'next/link';

export default function PlayerProfilePrompt() {
    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
            <p style={{ marginBottom: 'var(--spacing-2)' }}>Du hast noch kein Spielerprofil.</p>
            <Link href="/players/new" className="btn btn-primary" style={{ fontSize: '0.9rem' }}>
                Profil erstellen
            </Link>
        </div>
    );
}
