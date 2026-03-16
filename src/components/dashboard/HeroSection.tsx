'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Beer } from 'lucide-react';

interface Props {
    userName?: string | null;
    wins?: number;
    losses?: number;
    winRate?: number;
}

export default function HeroSection({ userName, wins, losses, winRate }: Props) {
    const initials = userName
        ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ padding: 'var(--spacing-6) 0 var(--spacing-4)' }}
        >
            {userName ? (
                <>
                    {/* Avatar + Name Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)' }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontSize: '1.2rem', fontWeight: 700, color: '#fff',
                            boxShadow: 'var(--shadow-glow-primary)',
                        }}>
                            {initials}
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)', marginBottom: '2px', fontWeight: 500 }}>
                                Willkommen zurück
                            </p>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>
                                {userName}!
                            </h1>
                        </div>
                    </div>

                    {/* Stats Row */}
                    {(wins !== undefined || losses !== undefined || winRate !== undefined) && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: 'var(--spacing-3)',
                        }}>
                            <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Siege</p>
                                <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>{wins ?? 0}</p>
                            </div>
                            <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Niederlagen</p>
                                <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>{losses ?? 0}</p>
                            </div>
                            <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Winrate</p>
                                <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>
                                    {winRate !== undefined ? `${(winRate * 100).toFixed(0)}%` : '–'}
                                </p>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* Logged-out state */
                <div className="glass-panel" style={{ padding: 'var(--spacing-8) var(--spacing-6)', textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: 'var(--spacing-4)' }}>
                        <Beer size={36} color="var(--color-primary)" />
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text)' }}>
                            Bier Pong <span style={{ color: 'var(--color-primary)' }}>Pro</span>
                        </h1>
                    </div>
                    <p style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-6)', fontSize: '0.95rem' }}>
                        Verwalte Turniere, tracke Stats, tritt Lobbys bei.
                    </p>
                    <Link href="/login" className="btn btn-primary" style={{ padding: '0.9rem 2.5rem', fontSize: '1rem' }}>
                        Loslegen
                    </Link>
                </div>
            )}
        </motion.div>
    );
}
