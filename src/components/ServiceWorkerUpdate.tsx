'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function ServiceWorkerUpdate() {
    const t = useTranslations('pwaUpdate');
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (!reg) {
                    // Try to register if not found? Usually done in pages
                    return;
                }

                setRegistration(reg);

                // Check for updates periodically or on load
                const checkUpdate = () => {
                    if (reg.waiting) {
                        setUpdateAvailable(true);
                        return;
                    }
                    reg.update(); // Trigger check
                };

                // Listen for new worker waiting
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setUpdateAvailable(true);
                            }
                        });
                    }
                });

                // Initial check
                checkUpdate();
            });
        }
    }, []);

    const updateApp = () => {
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            // The controllerchange listener will handle the reload
        } else {
            // Fallback: just reload if something is weird
            window.location.reload();
        }
    };

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            const handleControllerChange = () => {
                window.location.reload();
            };
            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
            return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        }
    }, []);

    if (!updateAvailable) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                style={{
                    position: 'fixed',
                    bottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom) + 12px)',
                    left: 'var(--spacing-4)',
                    right: 'var(--spacing-4)',
                    zIndex: 1000,
                    display: 'flex',
                    justifyContent: 'center'
                }}
            >
                <div className="glass-panel" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-4)',
                    padding: '12px 16px',
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border-strong)',
                    boxShadow: "none",
                    maxWidth: '500px',
                    width: '100%'
                }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '2px' }}>{t('title')}</h4>
                        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>{t('description')}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setUpdateAvailable(false)}
                            className="icon-button"
                            aria-label={t('dismiss')}
                        >
                            <X size={18} />
                        </button>
                        <button
                            onClick={updateApp}
                            className="icon-button"
                            aria-label={t('reload')}
                            data-tooltip={t('reload')}
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
