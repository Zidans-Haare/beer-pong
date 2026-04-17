'use client';

import Link from 'next/link';
import { useState } from 'react';

const CMDS = [
    { label: 'npx', cmd: 'npx github:Zidans-Haare/beer-pong' },
    { label: 'curl', cmd: 'curl -sL https://raw.githubusercontent.com/Zidans-Haare/beer-pong/main/setup.sh | bash' },
];

export default function DemoBanner() {
    const [active, setActive] = useState(0);
    const [copied, setCopied] = useState(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(CMDS[active].cmd);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    }

    return (
        <div style={{
            background: 'linear-gradient(90deg, rgba(190,35,213,0.10) 0%, rgba(190,35,213,0.05) 100%)',
            borderBottom: '1px solid rgba(190, 35, 213, 0.2)',
            padding: '8px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px 24px',
        }}>
            {/* Badge */}
            <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
            }}>
                Demo
            </span>

            {/* Command + toggle + copy */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                {/* Tab toggle */}
                {CMDS.map((c, i) => (
                    <button
                        key={c.label}
                        type="button"
                        onClick={() => { setActive(i); setCopied(false); }}
                        style={{
                            padding: '3px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            background: active === i ? 'rgba(190,35,213,0.2)' : 'transparent',
                            border: '1px solid rgba(190,35,213,0.25)',
                            borderRight: i === 0 ? 'none' : undefined,
                            borderRadius: i === 0 ? '6px 0 0 6px' : '0',
                            color: active === i ? 'var(--color-primary)' : 'var(--color-text-dim)',
                            cursor: 'pointer',
                            letterSpacing: '0.03em',
                        }}
                    >
                        {c.label}
                    </button>
                ))}
                {/* Command */}
                <button
                    type="button"
                    onClick={copy}
                    title="Click to copy"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(0,0,0,0.45)',
                        border: '1px solid rgba(190,35,213,0.35)',
                        borderLeft: 'none',
                        borderRadius: '0 6px 6px 0',
                        padding: '3px 10px 3px 12px',
                        cursor: 'pointer',
                        color: 'var(--color-text)',
                        maxWidth: 'min(340px, 50vw)',
                        overflow: 'hidden',
                    }}
                >
                    <code style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.78rem',
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {CMDS[active].cmd}
                    </code>
                    <span style={{
                        fontSize: '0.7rem',
                        color: copied ? '#98c379' : 'var(--color-text-dim)',
                        fontWeight: 500,
                        minWidth: 32,
                        transition: 'color 0.15s',
                        flexShrink: 0,
                    }}>
                        {copied ? '✓' : 'copy'}
                    </span>
                </button>
            </div>

            {/* Wizard link */}
            <Link
                href="/demo/wizard"
                style={{
                    fontSize: '0.78rem',
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                }}
            >
                See how setup works →
            </Link>
        </div>
    );
}
