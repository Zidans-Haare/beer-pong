import CreatePlayerForm from './form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NewPlayerPage() {
    return (
        <div className="container">
            <Link href="/players" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-6)', color: 'var(--color-text-dim)', textDecoration: 'none' }}>
                <ArrowLeft size={20} /> Zurück
            </Link>

            <h1 className="title-gradient" style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-8)', textAlign: 'center' }}>Neuen Spieler Anlegen</h1>

            <CreatePlayerForm />
        </div>
    );
}
