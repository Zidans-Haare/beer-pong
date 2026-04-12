'use client';

import { useState, useRef, useEffect } from 'react';

export default function TvDefaultGrid({
    left,
    right,
}: {
    left: React.ReactNode;
    right: React.ReactNode;
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
        // Desktop / tablet: regular CSS grid
        return (
            <div className="tv-default-grid">
                <div className="tv-default-left">{left}</div>
                <div className="tv-default-right">{right}</div>
            </div>
        );
    }

    // Mobile landscape: JS-controlled swipe — immune to router.refresh() scroll resets
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
                // Only register horizontal swipes (not accidental vertical)
                if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                    setPanel(p => dx < 0 ? Math.min(1, p + 1) : Math.max(0, p - 1));
                }
            }}
        >
            {/* Sliding track: two panels side by side */}
            <div style={{
                display: 'flex',
                width: '200%',
                height: '100%',
                transform: `translateX(${panel === 0 ? '0' : '-50%'})`,
                transition: 'transform 0.25s ease',
                willChange: 'transform',
            }}>
                {/* No extra padding: the left/right children already carry their own padding styles */}
                <div style={{ width: '50%', height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
                    {left}
                </div>
                <div style={{ width: '50%', height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
                    {right}
                </div>
            </div>

            {/* Swipe arrow hint — fades out after first swipe */}
            {panel === 0 && (
                <div style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--color-primary)', fontSize: '1.2rem', opacity: 0.7,
                    pointerEvents: 'none', fontWeight: 700,
                }}>›</div>
            )}
            {panel === 1 && (
                <div style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--color-primary)', fontSize: '1.2rem', opacity: 0.7,
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
                        background: panel === i ? 'var(--color-primary)' : 'rgba(128,128,128,0.4)',
                        transition: 'background 0.2s',
                    }} />
                ))}
            </div>
        </div>
    );
}
