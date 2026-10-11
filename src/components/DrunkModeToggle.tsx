'use client';

import { useEffect, useRef } from 'react';
import { useDrunkMode } from '@/context/DrunkModeContext';
import { useTranslations } from 'next-intl';

export default function DrunkModeToggle() {
    const t = useTranslations('drunk');
    const { isDrunk, toggle } = useDrunkMode();
    // Ton und Szene vorab laden, damit der Ton beim Antippen sofort freigeschaltet werden kann
    const audio = useRef<typeof import('@/lib/drunk-audio') | null>(null);
    useEffect(() => {
        let alive = true;
        import('@/lib/drunk-audio').then(m => { if (alive) audio.current = m; }).catch(() => undefined);
        import('@/components/DrunkIntro').catch(() => undefined);
        return () => { alive = false; };
    }, []);

    const onToggle = () => {
        // Browser erlauben Ton nur direkt nach einer Nutzeraktion
        try {
            if (isDrunk) audio.current?.sharedDrunkAudio()?.resume().then(() => audio.current?.sharedDrunkAudio()?.playSober());
            else audio.current?.primeDrunkAudio();
        } catch { /* ohne Ton weiter */ }
        toggle();
    };

    return (
        <button
            onClick={onToggle}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '14px 18px',
                background: isDrunk ? 'rgba(234, 88, 12, 0.08)' : 'var(--color-surface)',
                border: isDrunk ? '1px solid rgba(234, 88, 12, 0.4)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                textAlign: 'left',
            }}
        >
            {/* Toggle Switch */}
            <div style={{
                position: 'relative',
                width: '48px',
                height: '28px',
                flexShrink: 0,
            }}>
                <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: "6px",
                    background: isDrunk ? '#ea580c' : 'var(--color-border-strong, rgba(0,0,0,0.2))',
                    transition: 'background 0.2s',
                }} />
                <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: isDrunk ? '23px' : '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: "none",
                    transition: 'left 0.2s',
                }} />
            </div>

            {/* Label */}
            <span style={{
                fontSize: '1rem',
                fontWeight: isDrunk ? 700 : 500,
                color: isDrunk ? '#ea580c' : 'var(--color-text-dim)',
            }}>
                {isDrunk ? t('on') : t('off')}
            </span>
        </button>
    );
}
