'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { drawWalker } from '@/lib/tournament-scene';
import { lookFor, nameKey, type FigureSpec } from '@/lib/figure';

// Die eigene Figur oben rechts auf der Startseite: Sie steht bis zum halben Bauch hinter der grauen Linie und winkt.
export default function HeroFigure({ name, figure }: { name: string; figure: FigureSpec }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const reduced = useReducedMotion() ?? false;

    useEffect(() => {
        const ctx = canvas.current?.getContext('2d');
        if (!ctx) return;
        const look = lookFor(name, 0, { [nameKey(name)]: figure });
        const scale = 0.78;
        // Der Bauch bleibt für jede Größe an der unteren Kante; der Rest ragt nach oben ins Bild
        const baseline = 230 + 188 * scale * (look.heightScale ?? 1);
        let frame = 0;
        const draw = (now: number) => {
            ctx.clearRect(0, 0, 300, 230);
            drawWalker(ctx, 150, baseline, scale, look, { walk: 0, cheer: 0, wave: 1, medal: 0, place: 3, crown: 0, time: reduced ? 0 : now });
            if (!reduced) frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(frame);
    }, [name, figure, reduced]);

    return <canvas ref={canvas} className="home-figure" width={300} height={230} aria-hidden="true" />;
}
