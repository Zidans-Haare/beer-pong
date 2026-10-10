'use client';

import { useState, useEffect } from 'react';
import { Beer, Github } from 'lucide-react';
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
                            backdropFilter: "none",
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
                                boxShadow: "none",
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
                                background: "var(--color-primary-light)",
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
                                        borderRadius: "6px",
                                        background: 'var(--gradient-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: "none",
                                    }}
                                >
                                    <Beer size={32} color="#fff" strokeWidth={1.8} />
                                </motion.div>
                                <div>
                                    <div style={{
                                        fontSize: '1.4rem',
                                        fontWeight: 800,
                                        fontFamily: 'var(--font-heading)',
                                        background: "none",
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: "currentColor",
                                        backgroundClip: 'text',
                                        letterSpacing: "0",
                                    }}>
                                        Bier Pong
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '2px', letterSpacing: "0", textTransform: 'uppercase', fontWeight: 600 }}>
                                        Made by Nick
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div style={{ padding: '20px 24px 24px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{
                                    padding: '14px 16px',
                                    background: "var(--color-primary-light)",
                                    border: "1px solid rgba(var(--color-primary-rgb), 0.15)",
                                    borderRadius: 'var(--radius-md)',
                                }}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: "0", fontWeight: 700, marginBottom: '4px' }}>
                                        Open Source
                                    </div>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>
                                        Bier Pong App
                                    </div>
                                </div>

                                <a
                                    href={process.env.NEXT_PUBLIC_GITHUB_REPO || "#"}
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
                                        boxShadow: "none",
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
                                        letterSpacing: "0",
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
