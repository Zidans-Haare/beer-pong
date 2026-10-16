'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { FilmStep } from '@/lib/tournament-scene';
import { loadSceneFonts } from '@/lib/wrapped-scene';
import { drawWinnerFrame, WINNER_WIDTH, WINNER_HEIGHT, WINNER_TOTAL_MS } from '@/lib/winner-scene';
import { haptic } from '@/lib/haptics';

// Siegerehrung oben in der Übersicht eines beendeten Turniers: Die Top 3 laufen ein, hüpfen, gehen nach hinten
// und springen auf ihr Podest. Läuft bei jedem Öffnen, danach bleibt das Podest stehen. Tippen spielt es noch einmal ab.
// Kommt keine Antwort, steht die Platzierung als Text da.
export default function WinnerPodium({ tournamentId, fallback }: { tournamentId: string; fallback: { place: number; name: string }[] }) {
    const t = useTranslations('film');
    const reducedMotion = useReducedMotion() ?? false;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [podium, setPodium] = useState<FilmStep[] | null | 'none'>(null);
    const [run, setRun] = useState(0);

    useEffect(() => {
        let alive = true;
        // Keine Wartezeit: Die Abfrage startet sofort, damit die Top 3 gleich nach dem Öffnen im Bild sind
        performance.mark(`winner-overlay-start-${tournamentId}`);
        (async () => {
            try {
                const [res] = await Promise.all([fetch(`/api/tournaments/${tournamentId}/podium`, { cache: 'no-store' }), loadSceneFonts()]);
                if (!res.ok) throw new Error(String(res.status));
                const data = await res.json() as { podium: FilmStep[] };
                if (!alive) return;
                setPodium(data.podium.length ? data.podium : 'none');
                if (data.podium.length) haptic.success();
            } catch { if (alive) setPodium('none'); }
        })();
        return () => { alive = false; };
    }, [tournamentId]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!podium || podium === 'none' || !ctx) return;
        // ohne Bewegung gleich das fertige Podest
        if (reducedMotion) { drawWinnerFrame(ctx, { podium }, WINNER_TOTAL_MS); return; }
        let frame = 0;
        let start = 0;
        const tick = (now: number) => {
            if (!start) {
                start = now;
                // Messpunkt: so lange dauert es vom Öffnen der Seite bis zum ersten Bild der Top 3
                if (run === 0) try { performance.mark(`winner-overlay-first-frame-${tournamentId}`); performance.measure(`winner-overlay-${tournamentId}`, `winner-overlay-start-${tournamentId}`, `winner-overlay-first-frame-${tournamentId}`); } catch { /* ohne Messung */ }
            }
            const time = now - start;
            drawWinnerFrame(ctx, { podium }, time);
            if (time >= WINNER_TOTAL_MS) return;
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [podium, tournamentId, reducedMotion, run]);

    if (podium === 'none') {
        if (fallback.length === 0) return null;
        return (
            <ol className="winner-podium-text">
                {fallback.map(p => <li key={p.place}><strong>{p.place}.</strong> {p.name}</li>)}
            </ol>
        );
    }
    const names = (podium ?? []).map(s => `${s.place}. ${s.label}`).join(', ');
    return (
        <button type="button" className="winner-podium" data-ready={podium ? 'true' : 'false'} onClick={() => setRun(r => r + 1)} aria-label={`${t('podiumTitle')}: ${names}`}>
            <canvas ref={canvasRef} width={WINNER_WIDTH} height={WINNER_HEIGHT} aria-hidden="true" />
        </button>
    );
}
