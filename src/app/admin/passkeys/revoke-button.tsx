'use client';

import { useState } from 'react';
import { ShieldOff } from 'lucide-react';
import { revokePasskey } from '@/app/actions/admin';

export default function RevokeButton({ passkeyId, userName }: { passkeyId: string; userName: string }) {
    const [loading, setLoading] = useState(false);

    async function handleRevoke() {
        if (!confirm(`Passkey von ${userName} wirklich widerrufen?`)) return;
        setLoading(true);
        const res = await revokePasskey(passkeyId);
        if (!res.success) {
            alert(res.error ?? 'Fehler.');
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleRevoke}
            disabled={loading}
            title="Passkey widerrufen"
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-error)',
                opacity: loading ? 0.4 : 0.7,
                padding: '4px',
                display: 'flex',
                flexShrink: 0,
                transition: 'opacity 0.2s',
            }}
        >
            <ShieldOff size={16} />
        </button>
    );
}
