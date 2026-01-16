import React from 'react';
import { Check, Radio, Clock } from 'lucide-react';

export function MatchStatusBadge({ isPlayed, scheduledStart, isLive }: { isPlayed: boolean, scheduledStart?: Date, isLive?: boolean }) {
    if (isPlayed) {
        return <span style={{
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'var(--color-success)',
            color: 'white',
            fontWeight: 'bold',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
        }}><Check size={10} /> BEENDET</span>;
    }

    if (isLive) {
        return <span style={{
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'var(--color-danger)',
            color: 'white',
            fontWeight: 'bold',
            animation: 'pulse 2s infinite',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
        }}><Radio size={10} /> LIVE</span>;
    }

    return <span style={{
        fontSize: '0.7rem',
        padding: '2px 6px',
        borderRadius: '4px',
        background: 'rgba(255,255,255,0.1)',
        color: 'var(--color-text-dim)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px'
    }}><Clock size={10} /> {scheduledStart ? scheduledStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'WARTET'}</span>;
}
