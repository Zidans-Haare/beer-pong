'use client';

import { motion } from 'framer-motion';
import { Beer, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface Props {
    userName?: string | null;
}

export default function HeroSection({ userName }: Props) {
    const t = useTranslations('home');
    return (
        <div className="glass-panel" style={{
            position: 'relative',
            padding: 'var(--spacing-8) var(--spacing-6)',
            textAlign: 'center',
            marginTop: 'var(--spacing-6)',
            marginBottom: 'var(--spacing-6)',
            overflow: 'hidden',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(145deg, rgba(190,35,213,0.07) 0%, rgba(147,51,234,0.05) 50%, rgba(8,145,178,0.07) 100%)',
            border: '1px solid rgba(190,35,213,0.10)',
        }}>
            {/* Background Effects - Primary Glow */}
            <div style={{
                position: 'absolute',
                top: '-50%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                height: '200%',
                background: 'radial-gradient(ellipse at center, rgba(190,35,213,0.18) 0%, rgba(0,0,0,0) 60%)',
                pointerEvents: 'none',
            }} />
            {/* Background Effects - Cyan Glow */}
            <div style={{
                position: 'absolute',
                bottom: '-30%',
                right: '-10%',
                width: '40%',
                height: '80%',
                background: 'radial-gradient(ellipse at center, rgba(8,145,178,0.12) 0%, transparent 65%)',
                pointerEvents: 'none',
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
                            fontSize: '0.75rem',
                            color: 'var(--color-text-subtle)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            fontWeight: 700,
                            fontFamily: 'var(--font-heading)',
                        }}>
                            {t('welcomeBack')}
                        </span>
                        <h1 style={{
                            fontSize: 'clamp(2.2rem, 5vw, 2.8rem)',
                            fontWeight: 800,
                            lineHeight: 1.2,
                            background: 'var(--gradient-primary)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontFamily: 'var(--font-heading)',
                            filter: 'drop-shadow(0 2px 12px rgba(190, 35, 213, 0.22))'
                        }}>
                            {userName}
                        </h1>
                    </div>
                ) : (
                    <h1 style={{
                        fontSize: 'clamp(2.8rem, 7vw, 4rem)',
                        fontWeight: 800,
                        lineHeight: 1.1,
                        background: 'var(--gradient-party)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontFamily: 'var(--font-heading)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--spacing-3)',
                        filter: 'drop-shadow(0 2px 16px rgba(190, 35, 213, 0.25))',
                    }}>
                        BIER PONG <Beer className="text-primary" size={40} style={{ stroke: 'url(#gradient-beer)' }} />
                    </h1>
                )}

                {!userName && (
                    <div style={{ marginTop: 'var(--spacing-6)' }}>
                        <Link href="/login" className="btn btn-primary" style={{ padding: '0.9rem 2.5rem', fontSize: '1rem' }}>
                            {t('getStarted')}
                        </Link>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
