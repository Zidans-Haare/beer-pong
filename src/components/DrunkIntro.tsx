'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { SCENE_WIDTH, SCENE_HEIGHT, loadSceneFonts } from '@/lib/wrapped-scene';
import { drawDrunkFrame, DRUNK_TOTAL_MS, type DrunkSceneModel } from '@/lib/drunk-scene';

// Szene beim Einschalten des Betrunken-Modus. Tippen überspringt sie.
// frozenAt hält die Szene an einer Stelle an (nur zum Prüfen in der Entwicklung).
export default function DrunkIntro({ onDone, frozenAt }: { onDone: () => void; frozenAt?: number }) {
    const t = useTranslations('drunk');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const done = useRef(onDone);
    done.current = onDone;
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const primary = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#006b50';
        const model: DrunkSceneModel = {
            primary, pictureName: t('pictureName'), opponentName: t('opponentName'), missLabel: t('miss'),
            sorryLabel: t('sorry', { name: t('pictureName') }), hiccupLabel: t('hiccup'),
        };
        let frame = 0;
        let alive = true;
        let start = 0;
        let finish: ReturnType<typeof setTimeout> | null = null;

        loadSceneFonts().then(() => {
            if (!alive) return;
            if (frozenAt !== undefined) { drawDrunkFrame(ctx, model, frozenAt); return; }
            const tick = (now: number) => {
                if (!start) start = now;
                const time = now - start;
                drawDrunkFrame(ctx, model, time);
                // zum Schluss verschwimmt das Bild und geht in die App über
                const blur = Math.max(0, (time - 4700) / 1500) * 14;
                canvas.style.filter = blur > 0 ? `blur(${blur.toFixed(1)}px)` : '';
                if (time >= DRUNK_TOTAL_MS - 500) setLeaving(true);
                if (time >= DRUNK_TOTAL_MS) { finish = setTimeout(() => done.current(), 60); return; }
                frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
        });
        return () => { alive = false; cancelAnimationFrame(frame); if (finish) clearTimeout(finish); };
    }, [t, frozenAt]);

    return createPortal(
        <div className={`drunk-intro${leaving ? ' is-leaving' : ''}`} role="dialog" aria-modal="true" aria-label={t('on')}>
            <canvas ref={canvasRef} className="wrapped-canvas" width={SCENE_WIDTH} height={SCENE_HEIGHT} role="img" aria-label={`${t('miss')} ${t('sorry', { name: t('pictureName') })}`} />
            <button type="button" className="drunk-intro-skip" onClick={() => done.current()}>{t('skip')}</button>
        </div>,
        document.body,
    );
}
