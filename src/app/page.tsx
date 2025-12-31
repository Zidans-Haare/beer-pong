import Link from 'next/link';

export default function Home() {
  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 className="title-gradient" style={{ fontSize: '3rem', marginBottom: 'var(--spacing-2)' }}>Bier Pong Pro</h1>
        <p style={{ color: 'var(--color-text-dim)', fontSize: '1.2rem' }}>Der ultimative Turnier-Manager</p>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 'var(--spacing-6)'
      }}>
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ marginBottom: 'var(--spacing-2)', color: 'var(--color-primary)' }}>Turniere</h2>
          <p style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-text-dim)', flex: 1 }}>
            Erstelle neue Turniere, manage den Spielplan und verfolge Live-Matches.
          </p>
          <Link href="/tournaments" className="btn btn-secondary" style={{ textAlign: 'center' }}>Zu den Turnieren</Link>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ marginBottom: 'var(--spacing-2)', color: 'var(--color-secondary)' }}>Spieler</h2>
          <p style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-text-dim)', flex: 1 }}>
            Verwalte Spieler, tracke Statistiken und sieh dir die ewige Tabelle an.
          </p>
          <Link href="/players" className="btn btn-secondary" style={{ textAlign: 'center' }}>Spielerliste</Link>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ marginBottom: 'var(--spacing-2)', color: 'var(--color-success)' }}>Statistiken</h2>
          <p style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-text-dim)', flex: 1 }}>
            Wer ist der Beer Pong King? Checke die Langzeit-Stats.
          </p>
          <Link href="/stats" className="btn btn-secondary" style={{ textAlign: 'center' }}>Leaderboard</Link>
        </div>
      </div>
    </div>
  );
}
