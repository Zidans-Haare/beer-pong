'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ServiceWorkerUpdate() {
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
                    bottom: '80px', // Above bottom nav
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
                    background: 'rgba(59, 130, 246, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    maxWidth: '500px',
                    width: '100%'
                }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>Neues Update verfügbar! 🚀</h4>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>Lade die App neu, um die neuesten Features zu nutzen.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setUpdateAvailable(false)}
                            style={{ padding: '8px', color: 'rgba(255,255,255,0.6)' }}
                        >
                            <X size={18} />
                        </button>
                        <button
                            onClick={updateApp}
                            className="btn"
                            style={{
                                background: 'white',
                                color: 'var(--color-primary)',
                                fontSize: '0.8rem',
                                padding: '8px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 700
                            }}
                        >
                            <RefreshCw size={14} /> Jetzt laden
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
