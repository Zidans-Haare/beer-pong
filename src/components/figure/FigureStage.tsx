'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { drawWalker } from '@/lib/tournament-scene';
import { lookFor, nameKey, type FigureSpec } from '@/lib/figure';

// Die Figur eines Spielers auf seinem Profil: Sie wippt, wiegt sich und reißt die Arme hoch. Wer Bewegung reduziert hat, sieht sie ruhig stehen.
export default function FigureStage({ name, figure }: { name: string; figure: FigureSpec | null }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const reduced = useReducedMotion() ?? false;

    useEffect(() => {
        const ctx = canvas.current?.getContext('2d');
        if (!ctx) return;
        const look = lookFor(name, 0, figure ? { [nameKey(name)]: figure } : null);
        let frame = 0;
        const draw = (now: number) => {
            // ohne Hintergrund: die Figur steht direkt auf der Seite
            ctx.clearRect(0, 0, 360, 420);
            // Tanz: Schwanken um die Füße, dazu Arme hoch und Hüpfen
            const sway = reduced ? 0 : Math.sin(now / 420) * 0.07;
            ctx.save();
            ctx.translate(180, 395);
            ctx.rotate(sway);
            ctx.translate(-180, -395);
            drawWalker(ctx, 180, 395, 0.78, look, { walk: 0, cheer: reduced ? 0 : 0.6 + 0.4 * Math.sin(now / 520), medal: 0, place: 3, crown: 0, time: now });
            ctx.restore();
            if (!reduced) frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(frame);
    }, [name, figure, reduced]);

    return <canvas ref={canvas} className="profile-figure-canvas" width={360} height={420} role="img" aria-label={name} />;
}
