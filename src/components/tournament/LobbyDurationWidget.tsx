'use client';

import { calculateTournamentDuration, formatDuration, getEstimatedEndTime } from '@/lib/estimation';
import { Clock, Hourglass } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
    type: string;
    playerCount: number;
    matchDurationMin?: number;
    tableCount?: number;
    hasReturnLeg?: boolean;
    startTime?: Date;
}

export default function LobbyDurationWidget({ type, playerCount, matchDurationMin = 12, tableCount = 1, hasReturnLeg = false, startTime }: Props) {
    const duration = useMemo(() => calculateTournamentDuration(type, playerCount, tableCount, matchDurationMin, hasReturnLeg), [type, playerCount, tableCount, matchDurationMin, hasReturnLeg]);
    const endTime = useMemo(() => getEstimatedEndTime(duration, startTime), [duration, startTime]);

    const isFutureStart = startTime && startTime.getTime() > Date.now();

    if (playerCount < 2) return null;

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--spacing-3)',
            marginBottom: 'var(--spacing-6)'
        }}>
            <div className="glass-panel" style={{
                padding: 'var(--spacing-4)',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.02) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex', flexDirection: 'column', gap: '4px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
                    <Hourglass size={16} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prognostizierte Dauer</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {formatDuration(duration)}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                    bei {playerCount} Teilnehmern
                </div>
            </div>

            <div className="glass-panel" style={{
                padding: 'var(--spacing-4)',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex', flexDirection: 'column', gap: '4px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-secondary)' }}>
                    <Clock size={16} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Voraussichtliches Ende</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {endTime} Uhr
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                    {isFutureStart ? 'wenn es pünktlich losgeht' : 'wenn es jetzt losgeht'}
                </div>
            </div>
        </div>
    );
}
