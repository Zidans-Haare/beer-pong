'use client';

import { useEffect } from 'react';

// Scrolls to the matches in `?match=id1,id2` and makes them flash red for a moment
export default function MatchHighlighter({ matchParam }: { matchParam: string }) {
    useEffect(() => {
        const elements = matchParam.split(',')
            .map(id => document.getElementById(`match-${id}`))
            .filter((el): el is HTMLElement => el !== null);
        if (elements.length === 0) return;

        // Wait a frame so the layout is settled before scrolling
        const frame = requestAnimationFrame(() => {
            elements[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            elements.forEach(el => el.classList.add('match-flash'));
        });
        const timer = setTimeout(() => elements.forEach(el => el.classList.remove('match-flash')), 4000);
        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(timer);
            elements.forEach(el => el.classList.remove('match-flash'));
        };
    }, [matchParam]);

    return null;
}
