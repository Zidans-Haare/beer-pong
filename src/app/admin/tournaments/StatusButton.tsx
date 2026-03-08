'use client';

import { useState } from 'react';
import { setTournamentStatus, adminDeleteTournament } from '@/app/actions/admin';

const STATUS_LABELS: Record<string, string> = {
    PLANNED: 'Geplant',
    ACTIVE: 'Aktiv',
    COMPLETED: 'Abgeschlossen',
};

const STATUS_COLORS: Record<string, string> = {
    PLANNED: 'rgba(59,130,246,0.15)',
    ACTIVE: 'rgba(34,197,94,0.15)',
    COMPLETED: 'rgba(100,116,139,0.15)',
};

const STATUS_TEXT: Record<string, string> = {
    PLANNED: '#60a5fa',
    ACTIVE: '#4ade80',
    COMPLETED: '#94a3b8',
};

const ALL_STATUSES = ['PLANNED', 'ACTIVE', 'COMPLETED'] as const;

export function StatusBadge({ status }: { status: string }) {
    return (
        <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '99px',
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: STATUS_COLORS[status] ?? 'rgba(100,116,139,0.15)',
            color: STATUS_TEXT[status] ?? '#94a3b8',
        }}>
            {STATUS_LABELS[status] ?? status}
        </span>
    );
}

export function DeleteButton({ tournamentId, tournamentName }: { tournamentId: string; tournamentName: string }) {
    const [loading, setLoading] = useState(false);

    async function handleDelete() {
        if (!confirm(`Turnier "${tournamentName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
        setLoading(true);
        const result = await adminDeleteTournament(tournamentId);
        if (!result.success) {
            alert(result.error ?? 'Fehler beim Löschen');
        }
        setLoading(false);
    }

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            title="Turnier löschen"
            style={{
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid rgba(239,68,68,0.4)',
                background: 'rgba(239,68,68,0.08)',
                color: '#f87171',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.15s',
            }}
        >
            {loading ? '...' : 'Löschen'}
        </button>
    );
}

export function StatusButton({ tournamentId, currentStatus }: { tournamentId: string; currentStatus: string }) {
    const [loading, setLoading] = useState(false);

    async function handleChange(status: typeof ALL_STATUSES[number]) {
        if (status === currentStatus) return;
        setLoading(true);
        await setTournamentStatus(tournamentId, status);
        setLoading(false);
    }

    return (
        <div style={{ display: 'flex', gap: '4px' }}>
            {ALL_STATUSES.map(s => (
                <button
                    key={s}
                    onClick={() => handleChange(s)}
                    disabled={loading || s === currentStatus}
                    title={STATUS_LABELS[s]}
                    style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: s === currentStatus ? 'default' : 'pointer',
                        border: `1px solid ${s === currentStatus ? STATUS_TEXT[s] : 'var(--color-border)'}`,
                        background: s === currentStatus ? STATUS_COLORS[s] : 'transparent',
                        color: s === currentStatus ? STATUS_TEXT[s] : 'var(--color-text-dim)',
                        opacity: loading ? 0.5 : 1,
                        transition: 'all 0.15s',
                    }}
                >
                    {STATUS_LABELS[s]}
                </button>
            ))}
        </div>
    );
}
