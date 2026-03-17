'use client';

import { useDrunkMode } from '@/context/DrunkModeContext';

export default function DrunkModeToggle() {
    const { isDrunk, toggle } = useDrunkMode();

    return (
        <button
            onClick={toggle}
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
                    borderRadius: '14px',
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
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s',
                }} />
            </div>

            {/* Label */}
            <span style={{
                fontSize: '1rem',
                fontWeight: isDrunk ? 700 : 500,
                color: isDrunk ? '#ea580c' : 'var(--color-text-dim)',
            }}>
                {isDrunk ? 'Ich bin betrunken' : 'Ich bin nüchtern'}
            </span>
        </button>
    );
}
