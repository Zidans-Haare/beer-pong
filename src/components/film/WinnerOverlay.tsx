'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { FilmStep } from '@/lib/tournament-scene';
import { loadSceneFonts } from '@/lib/wrapped-scene';
import { drawWinnerFrame, WINNER_WIDTH, WINNER_HEIGHT, WINNER_TOTAL_MS } from '@/lib/winner-scene';
import { haptic } from '@/lib/haptics';

// Siegerehrung am unteren Rand: Die Top 3 laufen ein und hüpfen. Läuft bei jedem Öffnen eines beendeten Turniers,
// Tippen schließt sie. Die Daten kommen erst, wenn das Overlay wirklich gezeigt wird.
export default function WinnerOverlay({ tournamentId, active }: { tournamentId: string; active: boolean }) {
    const t = useTranslations('film');
    const reducedMotion = useReducedMotion() ?? false;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [podium, setPodium] = useState<FilmStep[] | null>(null);
    const [open, setOpen] = useState(false);

    // Nur laden, wenn das Turnier beendet ist
    useEffect(() => {
        if (!active || reducedMotion) return;
        let alive = true;
        // Keine Wartezeit: Die Abfrage startet sofort, damit die Top 3 gleich nach dem Öffnen im Bild sind
        performance.mark(`winner-overlay-start-${tournamentId}`);
        (async () => {
            try {
                const [res] = await Promise.all([fetch(`/api/tournaments/${tournamentId}/podium`, { cache: 'no-store' }), loadSceneFonts()]);
                if (!res.ok) return;
                const data = await res.json() as { podium: FilmStep[] };
                if (!alive || data.podium.length === 0) return;
                setPodium(data.podium);
                setOpen(true);
                haptic.success();
            } catch { /* Overlay ist nur Zugabe */ }
        })();
        return () => { alive = false; };
    }, [active, tournamentId, reducedMotion]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!open || !podium || !ctx) return;
        let frame = 0;
        let start = 0;
        const tick = (now: number) => {
            if (!start) {
                start = now;
                // Messpunkt: so lange dauert es vom Öffnen der Seite bis zum ersten Bild der Top 3
                try { performance.mark(`winner-overlay-first-frame-${tournamentId}`); performance.measure(`winner-overlay-${tournamentId}`, `winner-overlay-start-${tournamentId}`, `winner-overlay-first-frame-${tournamentId}`); } catch { /* ohne Messung */ }
            }
            const time = now - start;
            drawWinnerFrame(ctx, { podium }, time);
            if (time >= WINNER_TOTAL_MS) { setOpen(false); return; }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [open, podium, tournamentId]);

    if (!open || !podium) return null;
    const names = podium.map(s => `${s.place}. ${s.label}`).join(', ');
    return (
        <button type="button" className="winner-overlay" onClick={() => setOpen(false)} aria-label={`${t('podiumTitle')}: ${names}`}>
            <canvas ref={canvasRef} width={WINNER_WIDTH} height={WINNER_HEIGHT} aria-hidden="true" />
        </button>
    );
}
