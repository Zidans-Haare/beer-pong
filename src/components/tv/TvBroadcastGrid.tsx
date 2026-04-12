'use client';

import { useState, useRef, useEffect } from 'react';

export default function TvBroadcastGrid({
    stream,
    sidebar,
}: {
    stream: React.ReactNode;
    sidebar: React.ReactNode;
}) {
    const [isMobile, setIsMobile] = useState(false);
    const [panel, setPanel] = useState(0);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);

    useEffect(() => {
        function check() {
            setIsMobile(window.innerHeight < 520 && window.innerWidth > window.innerHeight);
        }
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    if (!isMobile) {
        // Desktop / tablet: regular grid
        return (
            <div className="tv-broadcast-grid">
                {stream}
                {sidebar}
            </div>
        );
    }

    // Mobile landscape: swipeable panels
    return (
        <div
            style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
            onTouchStart={e => {
                touchStartX.current = e.touches[0].clientX;
                touchStartY.current = e.touches[0].clientY;
            }}
            onTouchEnd={e => {
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                const dy = e.changedTouches[0].clientY - touchStartY.current;
                if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                    setPanel(p => dx < 0 ? Math.min(1, p + 1) : Math.max(0, p - 1));
                }
            }}
        >
            <div style={{
                display: 'flex',
                width: '200%',
                height: '100%',
                transform: `translateX(${panel === 0 ? '0' : '-50%'})`,
                transition: 'transform 0.25s ease',
                willChange: 'transform',
            }}>
                {/* Panel 0: Stream — no scroll, fills height */}
                <div style={{ width: '50%', height: '100%', overflow: 'hidden' }}>
                    {stream}
                </div>
                {/* Panel 1: Sidebar — scrollable */}
                <div style={{ width: '50%', height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', padding: '10px 14px', boxSizing: 'border-box' }}>
                    {sidebar}
                </div>
            </div>

            {/* Arrow hints */}
            {panel === 0 && (
                <div style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    color: '#fff', fontSize: '1.4rem', opacity: 0.6,
                    pointerEvents: 'none', fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}>›</div>
            )}
            {panel === 1 && (
                <div style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--color-primary)', fontSize: '1.4rem', opacity: 0.7,
                    pointerEvents: 'none', fontWeight: 700,
                }}>‹</div>
            )}

            {/* Dot indicators */}
            <div style={{
                position: 'absolute', bottom: 6, left: 0, right: 0,
                display: 'flex', justifyContent: 'center', gap: 6,
                pointerEvents: 'none',
            }}>
                {[0, 1].map(i => (
                    <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: panel === i ? '#fff' : 'rgba(255,255,255,0.3)',
                        transition: 'background 0.2s',
                    }} />
                ))}
            </div>
        </div>
    );
}
