'use client';

import { useState, useEffect } from 'react';
import { Share } from 'lucide-react';
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
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // Check if app is already running in standalone mode
        const isStandaloneMode =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        setIsStandalone(isStandaloneMode);

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIOSDevice);

        // Listen for beforeinstallprompt event (Android/Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
        } else if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        }
    };

    if (isStandalone) {
        return null;
    }

    // Only show if we can actually install (Android/Chrome captured event) or if it's iOS
    if (!deferredPrompt && !isIOS) {
        return null;
    }

    return (
        <div className="glass-panel" style={{
            padding: 'var(--spacing-6)',
            marginBottom: 'var(--spacing-6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center', // Center horizontally
            textAlign: 'center',
            gap: 'var(--spacing-4)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px solid var(--color-border)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Decoration */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                height: '100%',
                background: 'var(--gradient-primary)'
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                <span style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--color-text)'
                }}>
                    {t('prompt')}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                    {t('subtitle')}
                </span>
            </div>

            <button
                onClick={handleInstallClick}
                className="btn btn-primary"
                style={{
                    padding: '0.8rem 2.5rem',
                    borderRadius: '9999px', // Fully rounded (pill)
                    fontSize: '1rem',
                    boxShadow: '0 4px 15px rgba(var(--primary-rgb), 0.3)',
                    width: 'fit-content'
                }}
            >
                {t('install')}
            </button>

            {showIOSInstructions && (
                <div style={{
                    marginTop: 'var(--spacing-2)',
                    paddingTop: 'var(--spacing-4)',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '0.9rem',
                    width: '100%',
                    textAlign: 'left',
                    animation: 'fadeIn 0.3s ease-in-out'
                }}>
                    <p style={{ marginBottom: 'var(--spacing-3)', fontWeight: 600, textAlign: 'center' }}>
                        {t('ios')}
                    </p>
                    <div style={{
                        background: 'rgba(0,0,0,0.2)',
                        padding: '16px',
                        borderRadius: '12px'
                    }}>
                        <ol style={{
                            paddingLeft: 'var(--spacing-4)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            margin: 0
                        }}>
                            <li>
                                {t('step1Prefix')} <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)' }}>{t('share')} <Share size={16} /></strong>
                            </li>
                            <li>{t('step2Prefix')} <strong>&quot;{t('addToHome')}&quot;</strong></li>
                            <li>{t('step3Prefix')} <strong>&quot;{t('add')}&quot;</strong></li>
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
}
