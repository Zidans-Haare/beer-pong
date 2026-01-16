'use client';

import { motion } from 'framer-motion';
import { Beer, Trophy } from 'lucide-react';
import Link from 'next/link';

interface Props {
    userName?: string | null;
}

export default function HeroSection({ userName }: Props) {
    return (
        <div className="glass-panel" style={{
            position: 'relative',
            padding: 'var(--spacing-6) var(--spacing-4)',
            textAlign: 'center',
            marginBottom: 'var(--spacing-6)',
            overflow: 'hidden',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, rgba(232, 121, 249, 0.05) 0%, rgba(34, 211, 238, 0.05) 100%)', // Very subtle neon tint
            border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
            {/* Background Effects */}
            <div style={{
                position: 'absolute',
                top: '-50%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                height: '200%',
                background: 'radial-gradient(circle, rgba(232, 121, 249, 0.15) 0%, rgba(0,0,0,0) 60%)',
                pointerEvents: 'none',
                opacity: 0.6
            }} />

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ position: 'relative', zIndex: 1 }}
            >
                {userName ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{
                            fontSize: '0.9rem',
                            color: 'var(--color-text-dim)',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            fontWeight: 600
                        }}>
                            Willkommen zurück
                        </span>
                        <h1 style={{
                            fontSize: 'clamp(2rem, 5vw, 2.5rem)',
                            fontWeight: 800,
                            lineHeight: 1.2,
                            background: 'var(--gradient-primary)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontFamily: 'var(--font-heading)',
                            filter: 'drop-shadow(0 2px 10px rgba(217, 70, 239, 0.2))'
                        }}>
                            {userName}
                        </h1>
                    </div>
                ) : (
                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
                        fontWeight: 800,
                        lineHeight: 1.1,
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontFamily: 'var(--font-heading)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--spacing-3)'
                    }}>
                        BIER PONG <Beer className="text-primary" size={40} style={{ stroke: 'url(#gradient-beer)' }} />
                    </h1>
                )}

                {!userName && (
                    <div style={{ marginTop: 'var(--spacing-6)' }}>
                        <Link href="/login" className="btn btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
                            Loslegen
                        </Link>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
