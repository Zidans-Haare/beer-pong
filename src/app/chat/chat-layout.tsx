'use client';

import { useEffect, useRef } from 'react';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    // Hide the bottom nav while the chat page is open
    useEffect(() => {
        document.body.classList.add('chat-open');
        return () => document.body.classList.remove('chat-open');
    }, []);

    useEffect(() => {
        // Android Chrome 108+ / Firefox 132+: handled by interactive-widget=resizes-content in viewport meta.
        // iOS Safari does not support that meta, so we use the Visual Viewport API as fallback.
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (!isIOS || !window.visualViewport) return;

        const vv = window.visualViewport!;
        const update = () => {
            if (!ref.current) return;
            const top = ref.current.getBoundingClientRect().top;
            const available = vv.height - top;
            ref.current.style.height = `${Math.max(200, available)}px`;
        };

        vv.addEventListener('resize', update);
        return () => vv.removeEventListener('resize', update);
    }, []);

    return (
        <div
            ref={ref}
            style={{
                maxWidth: '700px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100dvh - 198px)',
                minHeight: '300px',
            }}
        >
            {children}
        </div>
    );
}
