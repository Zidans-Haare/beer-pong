import { Check } from 'lucide-react';

interface Props {
    isJoined: boolean;
}

export default function InstantTournamentInfo({ isJoined }: Props) {
    return (
        <div className="glass-panel" style={{
            padding: 'var(--spacing-4)',
            textAlign: 'center',
            background: isJoined
                ? 'rgba(39, 174, 96, 0.1)'
                : 'rgba(78, 205, 196, 0.1)',
            border: `1px solid ${isJoined ? 'var(--color-success)' : 'var(--color-secondary)'}`
        }}>
            {isJoined ? (
                <>
                    <p style={{ marginBottom: 'var(--spacing-2)', fontWeight: 600, color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                        <Check size={16} /> Du bist dabei!
                    </p>
                </>
            ) : (
                <>
                    <p style={{ marginBottom: 'var(--spacing-2)', fontWeight: 600 }}>Sofort-Turnier</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                        Scan den QR-Code um direkt beizutreten. Kein RSVP nötig!
                    </p>
                </>
            )}
        </div>
    );
}
