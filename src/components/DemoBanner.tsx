import Link from 'next/link';

export default function DemoBanner() {
    return (
        <div style={{
            background: 'linear-gradient(90deg, var(--color-primary), #f59e0b)',
            color: '#000',
            textAlign: 'center',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 600,
            zIndex: 1000,
            position: 'sticky',
            top: 0,
        }}>
            Demo — Daten werden täglich zurückgesetzt.{' '}
            <Link
                href="https://github.com/Zidans-Haare/beer-pong"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#000', textDecoration: 'underline' }}
            >
                Selbst hosten →
            </Link>
        </div>
    );
}
