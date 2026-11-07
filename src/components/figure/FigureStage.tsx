'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { drawWalker } from '@/lib/tournament-scene';
import { lookFor, nameKey, type FigureSpec } from '@/lib/figure';
import { drawSceneBackdrop, DEFAULT_THEME, type SceneTheme } from '@/lib/scene-theme';
import { SCENE_WIDTH } from '@/lib/wrapped-scene';

// Ausschnitt der Szene hinter der Figur: ab dieser Höhe, so breit wie die Szene
const CROP_TOP = 330;

// Die Figur eines Spielers auf seinem Profil: Sie wippt, wiegt sich und reißt die Arme hoch, vor dem Hintergrund, den der
// Spieler für seine Szenen gewählt hat. Wer Bewegung reduziert hat, sieht sie ruhig stehen.
export default function FigureStage({ name, figure, theme = DEFAULT_THEME }: { name: string; figure: FigureSpec | null; theme?: SceneTheme }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const reduced = useReducedMotion() ?? false;

    useEffect(() => {
        const ctx = canvas.current?.getContext('2d');
        if (!ctx) return;
        const look = lookFor(name, 0, figure ? { [nameKey(name)]: figure } : null);
        let frame = 0;
        const draw = (now: number) => {
            // gewählter Hintergrund, das Publikum wippt im Takt der Figur leicht mit
            const primary = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#006b50';
            ctx.save();
            ctx.scale(360 / SCENE_WIDTH, 360 / SCENE_WIDTH);
            ctx.translate(0, -CROP_TOP);
            drawSceneBackdrop(ctx, theme, primary, now, 0.5, reduced ? 0 : 0.35 + 0.25 * Math.sin(now / 520));
            ctx.restore();
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
    }, [name, figure, reduced, theme]);

    return <canvas ref={canvas} className="profile-figure-canvas" width={360} height={420} role="img" aria-label={name} />;
}
