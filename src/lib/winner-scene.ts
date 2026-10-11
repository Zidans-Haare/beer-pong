// Sieger-Overlay: Die Top 3 des Turniers laufen am unteren Bildrand ein und hüpfen vor Freude.
// Gleiches Prinzip wie die anderen Szenen: drawWinnerFrame hängt nur von der Zeit ab.

import { CENTER_X, clamp, lerp, ramp, easeOut, easeOutBack, rand } from '@/lib/wrapped-scene';
import { drawWalker, drawNameTag, type FilmStep, type WalkerOpts } from '@/lib/tournament-scene';

export const WINNER_WIDTH = 1080;
export const WINNER_HEIGHT = 700;
export const WINNER_TOTAL_MS = 7200;

const FLOOR = 580;
// Die Top 3 sollen sofort da sein: Sie laufen ohne Verzögerung los und sind nach einer halben Sekunde im Bild
const WALK_AT = 0, WALK_MS = 500, STAGGER = 110;
const FADE_AT = WINNER_TOTAL_MS - 700;

// Platz auf dem Boden: Sieger in der Mitte und größer, 2 links, 3 rechts
const SPOT = {
    1: { x: CENTER_X, scale: 1.0, from: 0 },
    2: { x: 200, scale: 0.9, from: -1 },
    3: { x: 880, scale: 0.9, from: 1 },
} as const;

export interface WinnerModel { podium: FilmStep[] }

export interface WinnerTimeline { arrivals: { place: 1 | 2 | 3; at: number }[]; crown: number }

export function winnerTimeline(model: WinnerModel): WinnerTimeline {
    // zuerst 3, dann 2, zuletzt der Sieger
    const places = ([3, 2, 1] as const).filter(place => model.podium.some(s => s.place === place));
    const arrivals = places.map((place, i) => ({ place, at: WALK_AT + i * STAGGER + WALK_MS }));
    const last = arrivals.length ? arrivals[arrivals.length - 1].at : WALK_AT;
    return { arrivals, crown: last + 200 };
}

// Zeichnet auf transparentem Grund
export function drawWinnerFrame(ctx: CanvasRenderingContext2D, model: WinnerModel, timeMs: number) {
    const time = clamp(timeMs, 0, WINNER_TOTAL_MS);
    const tl = winnerTimeline(model);
    ctx.clearRect(0, 0, WINNER_WIDTH, WINNER_HEIGHT);
    ctx.save();
    ctx.globalAlpha = 1 - ramp(time, FADE_AT, 700);

    // Sieger zuletzt zeichnen, damit er bei Teams vorn steht
    for (const step of [...model.podium].sort((a, b) => b.place - a.place)) {
        const arrival = tl.arrivals.find(a => a.place === step.place);
        if (!arrival) continue;
        const spot = SPOT[step.place];
        const walk = ramp(time, arrival.at - WALK_MS, WALK_MS);
        const landed = time >= arrival.at;
        const count = Math.min(2, step.looks.length);
        const s = spot.scale * (count > 1 ? 0.82 : 1);
        for (let i = 0; i < count; i++) {
            const target = spot.x + (count > 1 ? (i ? 82 : -82) : 0);
            // Sieger fällt von oben herein, die anderen laufen von der Seite
            const edge = spot.from === 0 ? target : spot.from < 0 ? -150 - i * 140 : WINNER_WIDTH + 150 + i * 140;
            const x = lerp(edge, target, easeOut(walk));
            const drop = spot.from === 0 ? (1 - easeOutBack(walk)) * 700 : 0;
            const cheer = landed ? easeOut(ramp(time, arrival.at, 400)) : 0;
            const opts: WalkerOpts = {
                walk: spot.from === 0 || landed ? 0 : 1, cheer, place: step.place,
                medal: easeOutBack(ramp(time, arrival.at + 150, 420)),
                crown: step.place === 1 && i === 0 ? ramp(time, tl.crown, 520) : 0,
                time: time + i * 120 + step.place * 70,
            };
            drawWalker(ctx, x, FLOOR - drop, s, step.looks[i], opts);
        }
        drawNameTag(ctx, step.label, spot.x, FLOOR + 70, easeOut(ramp(time, arrival.at, 400)), step.place === 1, step.place === 1 ? 520 : 300, step.place === 1 ? 44 : 36);
    }

    // Sternchen steigen über dem Sieger auf
    if (time > tl.crown) {
        for (let i = 0; i < 14; i++) {
            const k = (((time - tl.crown) / 1000 + rand(i, 1) * 2.4) % 2.4) / 2.4;
            ctx.save();
            ctx.globalAlpha *= (1 - k) * 0.95;
            ctx.translate(CENTER_X + (rand(i, 2) - 0.5) * 520, 310 - k * 260);
            ctx.rotate(rand(i, 3) * 6 + time / 400);
            ctx.fillStyle = i % 2 ? '#ffe08a' : '#ffffff';
            const r = 8 + rand(i, 4) * 10;
            ctx.beginPath();
            for (let p = 0; p < 8; p++) { const rr = p % 2 ? r * 0.4 : r; const a = (p / 8) * Math.PI * 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    }
    ctx.restore();
}
