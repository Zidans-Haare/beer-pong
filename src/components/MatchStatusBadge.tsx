
import React from 'react';

export function MatchStatusBadge({ isPlayed, scheduledStart, isLive }: { isPlayed: boolean, scheduledStart?: Date, isLive?: boolean }) {
    if (isPlayed) {
        return <span style={{
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'var(--color-success)',
            color: 'white',
            fontWeight: 'bold'
        }}>✅ BEENDET</span>;
    }

    if (isLive) {
        return <span style={{
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'var(--color-danger)',
            color: 'white',
            fontWeight: 'bold',
            animation: 'pulse 2s infinite'
        }}>🔴 LIVE</span>;
    }

    return <span style={{
        fontSize: '0.7rem',
        padding: '2px 6px',
        borderRadius: '4px',
        background: 'rgba(255,255,255,0.1)',
        color: 'var(--color-text-dim)',
    }}>🕓 {scheduledStart ? scheduledStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'WARTET'}</span>;
}
