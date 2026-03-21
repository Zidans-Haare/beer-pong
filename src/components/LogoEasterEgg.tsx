'use client';

import { useState, useEffect } from 'react';
import { Beer, Github, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function LogoEasterEgg() {
    const [clickCount, setClickCount] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [resetTimer, setResetTimer] = useState<NodeJS.Timeout | null>(null);

    const handleClick = (e: React.MouseEvent) => {
        if (resetTimer) clearTimeout(resetTimer);

        const newCount = clickCount + 1;
        setClickCount(newCount);

        if (newCount >= 3) {
            e.preventDefault();
            setShowModal(true);
            setClickCount(0);
        } else {
            const timer = setTimeout(() => setClickCount(0), 2000);
            setResetTimer(timer);
        }
    };

    useEffect(() => {
        return () => { if (resetTimer) clearTimeout(resetTimer); };
    }, [resetTimer]);

    return (
        <>
            <Link
                href="/"
                className="text-gradient"
                onClick={handleClick}
                style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    userSelect: 'none',
                }}
            >
                <Beer size={28} /> Bier Pong
            </Link>

            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowModal(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px',
                            background: 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(10px)',
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 24 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 24 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%',
                                maxWidth: '340px',
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-xl)',
                                boxShadow: '0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                            }}
                        >
                            {/* Header gradient strip */}
                            <div style={{
                                width: '100%',
                                padding: '28px 24px 20px',
                                background: 'linear-gradient(160deg, rgba(190,35,213,0.12) 0%, rgba(8,145,178,0.08) 100%)',
                                borderBottom: '1px solid var(--color-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px',
                            }}>
                                <motion.div
                                    animate={{ rotate: [0, -8, 8, -8, 0] }}
                                    transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2 }}
                                    style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '18px',
                                        background: 'var(--gradient-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 8px 24px rgba(190,35,213,0.35)',
                                    }}
                                >
                                    <Beer size={32} color="#fff" strokeWidth={1.8} />
                                </motion.div>
                                <div>
                                    <div style={{
                                        fontSize: '1.4rem',
                                        fontWeight: 800,
                                        fontFamily: 'var(--font-heading)',
                                        background: 'var(--gradient-primary)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        letterSpacing: '-0.02em',
                                    }}>
                                        Bier Pong
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '2px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                                        Made with <Heart size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> in Österreich
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div style={{ padding: '20px 24px 24px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{
                                    padding: '14px 16px',
                                    background: 'linear-gradient(135deg, rgba(190,35,213,0.06) 0%, rgba(8,145,178,0.04) 100%)',
                                    border: '1px solid rgba(190,35,213,0.15)',
                                    borderRadius: 'var(--radius-md)',
                                }}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '4px' }}>
                                        Designed & Built by
                                    </div>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>
                                        Nick
                                    </div>
                                </div>

                                <a
                                    href={process.env.NEXT_PUBLIC_GITHUB_REPO || "https://github.com/Zidans-Haare/beer-pong"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '11px',
                                        background: 'var(--gradient-primary)',
                                        color: '#fff',
                                        borderRadius: 'var(--radius-md)',
                                        textDecoration: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.875rem',
                                        boxShadow: '0 4px 16px rgba(190,35,213,0.3)',
                                    }}
                                >
                                    <Github size={16} /> Source Code
                                </a>

                                <button
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        color: 'var(--color-text-subtle)',
                                        padding: '4px',
                                    }}
                                >
                                    Schließen
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
