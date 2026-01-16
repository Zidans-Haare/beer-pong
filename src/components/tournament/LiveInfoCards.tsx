import { format } from 'date-fns';
import { Clock, Target } from 'lucide-react';

interface Forecast {
    estimatedEndTime: Date;
    remainingMatches: number;
}

interface WaitTime {
    startTime: Date;
    table: number;
    waitMin: number;
}

interface Props {
    forecast: Forecast | null;
    waitTime: WaitTime | null;
}

export default function LiveInfoCards({ forecast, waitTime }: Props) {
    if (!forecast && !waitTime) return null;

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 'var(--spacing-3)'
        }}>
            {forecast && forecast.remainingMatches > 0 && (
                <div style={{
                    padding: 'var(--spacing-4)',
                    background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.1) 0%, rgba(78, 205, 196, 0.02) 100%)',
                    border: '1px solid rgba(78, 205, 196, 0.3)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-2)' }}>
                        <Clock size={14} color="var(--color-secondary)" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Ende
                        </span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {format(forecast.estimatedEndTime, 'HH:mm')}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                        {forecast.remainingMatches} {forecast.remainingMatches === 1 ? 'Spiel' : 'Spiele'} übrig
                    </div>
                </div>
            )}

            {waitTime && (
                <div style={{
                    padding: 'var(--spacing-4)',
                    background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 107, 107, 0.02) 100%)',
                    border: '1px solid rgba(255, 107, 107, 0.3)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-2)' }}>
                        <Target size={14} color="var(--color-primary)" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Dein Spiel
                        </span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        ~{format(waitTime.startTime, 'HH:mm')}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                        Tisch {waitTime.table} • {waitTime.waitMin} Min.
                    </div>
                </div>
            )}
        </div>
    );
}
