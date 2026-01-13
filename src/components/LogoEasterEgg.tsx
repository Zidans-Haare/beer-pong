'use client';

import { useState, useEffect } from 'react';
import { Beer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function LogoEasterEgg() {
    const [clickCount, setClickCount] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [resetTimer, setResetTimer] = useState<NodeJS.Timeout | null>(null);

    const handleClick = (e: React.MouseEvent) => {
        // We allow navigation, but we count the clicks.
        // If the user reaches 5, we show the modal.
        // In Next.js App Router, the Layout persists, so this component should persist if it's in the Layout.

        // Clear existing timer
        if (resetTimer) {
            clearTimeout(resetTimer);
        }

        const newCount = clickCount + 1;
        setClickCount(newCount);

        if (newCount >= 5) {
            e.preventDefault(); // Stop navigation on the 5th click to show modal
            setShowModal(true);
            setClickCount(0);
        } else {
            // Set new timer to reset count after 2 seconds of inactivity
            const timer = setTimeout(() => {
                setClickCount(0);
            }, 2000);
            setResetTimer(timer);
        }
    };

    // Clean up timer
    useEffect(() => {
        return () => {
            if (resetTimer) clearTimeout(resetTimer);
        };
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
                    userSelect: 'none'
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
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-panel p-8 max-w-sm w-full text-center relative overflow-hidden flex flex-col items-center gap-4"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                boxShadow: '0 0 50px -10px rgba(217, 70, 239, 0.3)', // Magenta glow
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderTop: '1px solid rgba(255, 255, 255, 0.25)',
                            }}
                        >
                            {/* Decorative Glows */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-fuchsia-500/20 blur-[50px] rounded-full pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-24 h-24 bg-cyan-500/20 blur-[40px] rounded-full pointer-events-none" />

                            <motion.div
                                initial={{ rotate: -10 }}
                                animate={{ rotate: 10 }}
                                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: 'easeInOut' }}
                                className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/20 mb-2 backdrop-blur-md shadow-lg"
                            >
                                <Beer size={40} className="text-transparent bg-clip-text bg-gradient-to-br from-fuchsia-400 to-cyan-400 drop-shadow-sm" style={{ stroke: 'url(#gradient-beer)' }} />
                                {/* SVG Gradient Def for icon stroke */}
                                <svg width="0" height="0">
                                    <linearGradient id="gradient-beer" x1="100%" y1="100%" x2="0%" y2="0%">
                                        <stop stopColor="#22d3ee" offset="0%" />
                                        <stop stopColor="#e879f9" offset="100%" />
                                    </linearGradient>
                                </svg>
                            </motion.div>

                            <div className="relative z-10 space-y-1">
                                <h2 className="text-3xl font-extrabold text-white font-heading tracking-tight">Credits</h2>
                                <div className="h-1 w-12 bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-full mx-auto opacity-80" />
                            </div>

                            <p className="text-white/70 relative z-10 font-medium">
                                Designed & Built by <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 font-bold">Nick</span>
                            </p>

                            <div className="pt-2 w-full relative z-10">
                                <a
                                    href="https://github.com/Zidans-Haare/beer-pong"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary w-full shadow-[0_0_20px_-5px_rgba(217,70,239,0.5)] hover:shadow-[0_0_30px_-5px_rgba(217,70,239,0.7)] transition-all transform hover:-translate-y-1"
                                >
                                    View Source Code
                                </a>
                            </div>

                            <button
                                onClick={() => setShowModal(false)}
                                className="mt-2 text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors relative z-10"
                            >
                                Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
