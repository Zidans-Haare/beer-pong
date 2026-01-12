'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

export default function InviteButton() {
    const [copied, setCopied] = useState(false);

    const handleInvite = async () => {
        if (typeof window !== 'undefined') {
            try {
                await navigator.clipboard.writeText(window.location.origin);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy link:', err);
                alert('Konnte Link nicht kopieren. Bitte manuell teilen: ' + window.location.origin);
            }
        }
    };

    return (
        <button
            onClick={handleInvite}
            className="btn btn-secondary"
            style={{
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                background: copied ? 'var(--color-success)' : undefined
            }}
        >
            {copied ? <Check size={20} /> : <Share2 size={20} />}
            <span>{copied ? 'Link kopiert!' : 'Spieler einladen'}</span>
        </button>
    );
}
