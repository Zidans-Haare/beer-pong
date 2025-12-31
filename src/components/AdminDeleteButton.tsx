'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDeleteButton({
    id,
    type,
    deleteAction
}: {
    id: string,
    type: 'Player' | 'Tournament',
    deleteAction: (id: string, code: string) => Promise<{ success: boolean, error?: string }>
}) {
    const router = useRouter();
    const [isPrompting, setIsPrompting] = useState(false);
    const [code, setCode] = useState('');

    async function handleDelete() {
        if (!confirm(`Sicher, dass du diesen ${type} löschen willst? Alles wird unwiderruflich gelöscht!`)) return;

        const res = await deleteAction(id, code);
        if (res.success) {
            router.push(type === 'Player' ? '/players' : '/tournaments');
            router.refresh();
        } else {
            alert('Fehler: ' + res.error);
        }
    }

    if (isPrompting) {
        return (
            <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
                <input
                    type="password"
                    placeholder="Admin Code"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    style={{
                        padding: 'var(--spacing-2)',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--color-border)',
                        color: 'white',
                        borderRadius: 'var(--radius-sm)',
                        width: '120px'
                    }}
                />
                <button
                    onClick={handleDelete}
                    className="btn"
                    style={{ background: 'var(--color-error)', color: 'white', padding: 'var(--spacing-2) var(--spacing-4)' }}
                >
                    Bestätigen
                </button>
                <button
                    onClick={() => setIsPrompting(false)}
                    className="btn"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', padding: 'var(--spacing-2)' }}
                >
                    X
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setIsPrompting(true)}
            style={{
                background: 'transparent',
                color: 'var(--color-error)',
                border: '1px solid var(--color-error)',
                padding: 'var(--spacing-2) var(--spacing-4)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                opacity: 0.7
            }}
        >
            🗑️ {type} Löschen
        </button>
    );
}
