'use client';

import { useEffect, useState } from 'react';

export default function TvClock() {
    const [time, setTime] = useState('');

    useEffect(() => {
        const update = () => {
            setTime(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--color-text)',
            letterSpacing: '0.05em',
            minWidth: '120px',
            textAlign: 'right',
        }}>
            {time}
        </div>
    );
}
