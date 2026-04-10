'use client';

import { useEffect, useState } from 'react';

export default function TvControls() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [time, setTime] = useState('');

    useEffect(() => {
        const update = () => setTime(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.6rem, 3vw, 2.6rem)',
                fontWeight: 700,
                color: 'var(--color-text)',
                letterSpacing: '0.05em',
                minWidth: '130px',
                textAlign: 'right',
            }}>
                {time}
            </div>
            <button
                onClick={toggleFullscreen}
                style={{
                    background: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)',
                    color: 'var(--color-text-dim)',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}
                title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
            >
                {isFullscreen ? '✕ Beenden' : '⛶ Vollbild'}
            </button>
        </div>
    );
}
