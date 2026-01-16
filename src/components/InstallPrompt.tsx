'use client';

import { useState, useEffect } from 'react';
import { Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
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
        <div style={{
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-4)',
            marginBottom: 'var(--spacing-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-3)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--spacing-3)'
            }}>
                <span style={{
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    color: 'var(--text-primary)'
                }}>
                    Du nutzt die App noch nicht?
                </span>
                <button
                    onClick={handleInstallClick}
                    className="btn-primary"
                    style={{
                        padding: 'var(--spacing-2) var(--spacing-4)',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Jetzt installieren
                </button>
            </div>

            {showIOSInstructions && (
                <div style={{
                    marginTop: 'var(--spacing-2)',
                    paddingTop: 'var(--spacing-3)',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    animation: 'fadeIn 0.3s ease-in-out'
                }}>
                    <p style={{ marginBottom: 'var(--spacing-2)' }}>
                        So installierst du die App auf iOS:
                    </p>
                    <ol style={{
                        paddingLeft: 'var(--spacing-4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--spacing-1)'
                    }}>
                        <li>
                            Tippe unten auf den <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Teilen <Share size={14} /></strong> Button.
                        </li>
                        <li>Wähle <strong>"Zum Home-Bildschirm"</strong>.</li>
                        <li>Tippe oben rechts auf <strong>"Hinzufügen"</strong>.</li>
                    </ol>
                </div>
            )}
        </div>
    );
}
