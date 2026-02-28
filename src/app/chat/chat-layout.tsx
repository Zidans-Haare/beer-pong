'use client';

import { useEffect, useRef } from 'react';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const update = () => {
            if (!ref.current) return;
            // Distance from top of our container to top of layout viewport
            const top = ref.current.getBoundingClientRect().top + window.scrollY;
            // Available height = visual viewport height (shrinks when keyboard opens) minus our offset
            const available = vv.height + vv.offsetTop - top;
            ref.current.style.height = `${Math.max(200, available)}px`;
        };

        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
        update();

        return () => {
            vv.removeEventListener('resize', update);
            vv.removeEventListener('scroll', update);
        };
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
