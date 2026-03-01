'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteGuestPlayer, deleteExpiredGuests } from '@/app/actions/admin';

export function GuestDeleteButton({ guestId }: { guestId: string }) {
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleDelete() {
        if (!confirm('Gast-Spieler wirklich löschen?')) return;
        setIsDeleting(true);
        const result = await deleteGuestPlayer(guestId);
        if (!result.success) {
            alert(result.error ?? 'Fehler beim Löschen.');
            setIsDeleting(false);
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            title="Gast löschen"
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-error)',
                opacity: isDeleting ? 0.4 : 0.7,
                padding: '4px',
                display: 'flex',
                flexShrink: 0,
                transition: 'opacity 0.2s',
            }}
        >
            <Trash2 size={16} />
        </button>
    );
}

export function CleanupButton({ expiredCount }: { expiredCount: number }) {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<string | null>(null);

    function handleCleanup() {
        if (!confirm(`${expiredCount} abgelaufene Gäste löschen?`)) return;
        startTransition(async () => {
            const res = await deleteExpiredGuests();
            if (res.success) {
                setResult(`${res.count} Gäste gelöscht.`);
                setTimeout(() => setResult(null), 4000);
            } else {
                alert(res.error ?? 'Fehler.');
            }
        });
    }

    if (expiredCount === 0) return null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
            {result && <span style={{ fontSize: '0.85rem', color: 'var(--color-success)' }}>{result}</span>}
            <button
                onClick={handleCleanup}
                disabled={isPending}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', opacity: isPending ? 0.5 : 1 }}
            >
                <Trash2 size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                {expiredCount} Abgelaufene löschen
            </button>
        </div>
    );
}
