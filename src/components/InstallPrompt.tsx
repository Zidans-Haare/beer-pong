'use client';

import { useState, useEffect } from 'react';
import { Share, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
    const t = useTranslations('install');
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const isStandaloneMode =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
        setIsStandalone(isStandaloneMode);

        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIOS(/iphone|ipad|ipod/.test(userAgent));

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowModal(true);
        } else if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setDeferredPrompt(null);
        }
    };

    if (isStandalone || (!deferredPrompt && !isIOS)) return null;

    return (
        <>
            {/* Banner */}
            <div className="glass-panel" style={{
                padding: 'var(--spacing-4) var(--spacing-6)',
                marginBottom: 'var(--spacing-6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--spacing-4)',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)',
                border: '1px solid rgba(99,102,241,0.2)',
            }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t('prompt')}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>{t('subtitle')}</div>
                </div>
                <button
                    onClick={handleInstallClick}
                    className="btn btn-primary"
                    style={{
                        padding: '0.6rem 1.4rem',
                        borderRadius: '9999px',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                    }}
                >
                    {t('install')}
                </button>
            </div>

            {/* iOS Modal */}
            <AnimatePresence>
                {showModal && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(4px)',
                                zIndex: 9998,
                            }}
                        />

                        {/* Modal */}
                        <motion.div
                            key="modal"
                            initial={{ opacity: 0, y: 60, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                            style={{
                                position: 'fixed',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                zIndex: 9999,
                                background: 'var(--color-surface)',
                                borderRadius: '24px 24px 0 0',
                                padding: '28px 24px 40px',
                                boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
                            }}
                        >
                            {/* Close */}
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'var(--color-surface-hover)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--color-text-dim)',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={18} />
                            </button>

                            {/* Handle */}
                            <div style={{
                                width: '40px',
                                height: '4px',
                                borderRadius: '2px',
                                background: 'var(--color-border)',
                                margin: '0 auto 24px',
                            }} />

                            <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '8px', textAlign: 'center' }}>
                                {t('ios')}
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', textAlign: 'center', marginBottom: '28px' }}>
                                {t('subtitle')}
                            </p>

                            {/* Steps */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Step 1 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 700, fontSize: '1rem',
                                    }}>1</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>{t('step1Prefix')}</div>
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            background: 'rgba(99,102,241,0.12)', borderRadius: '8px',
                                            padding: '4px 10px', color: 'var(--color-primary)', fontWeight: 600,
                                        }}>
                                            <Share size={15} /> {t('share')}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ width: '1px', height: '12px', background: 'var(--color-border)', marginLeft: '20px' }} />

                                {/* Step 2 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 700, fontSize: '1rem',
                                    }}>2</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>{t('step2Prefix')}</div>
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            background: 'rgba(99,102,241,0.12)', borderRadius: '8px',
                                            padding: '4px 10px', color: 'var(--color-primary)', fontWeight: 600,
                                        }}>
                                            &quot;{t('addToHome')}&quot;
                                        </div>
                                    </div>
                                </div>

                                <div style={{ width: '1px', height: '12px', background: 'var(--color-border)', marginLeft: '20px' }} />

                                {/* Step 3 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 700, fontSize: '1rem',
                                    }}>3</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>{t('step3Prefix')}</div>
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            background: 'rgba(99,102,241,0.12)', borderRadius: '8px',
                                            padding: '4px 10px', color: 'var(--color-primary)', fontWeight: 600,
                                        }}>
                                            &quot;{t('add')}&quot; <ChevronRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
