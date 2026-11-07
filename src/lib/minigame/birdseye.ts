// Umstellen aus der Vogelperspektive: Beim Umstellen zoomt das Bild auf die Becher der Gegenseite, die dann von oben
// groß als Zehnerdreieck zu sehen sind. Dort wird angetippt oder geschoben; die kleinen Becher in der Perspektive
// waren zu schwer zu treffen.

import { CENTER_X, clamp, lerp, easeInOut, tablePoint } from '@/lib/wrapped-scene';
import { slotsOf, freeSlots, slotIndexOf, type Game } from '@/lib/minigame/engine';
import type { Point } from '@/lib/minigame/aim';

export const BIRD_ZOOM_MS = 380;
// Abstand der Plätze und Größe der Becher von oben
const STEP = 214, RADIUS = 88, TOP = 640;
// Antippen gilt etwas über den Becher hinaus
const REACH = 104;

// Mitte eines Platzes von oben: hinterste Reihe (vier Becher) oben, die Spitze zeigt nach unten zu mir
export function birdPoint(slot: number): Point {
    const rows = [[0, 1, 2, 3], [4, 5, 6], [7, 8], [9]];
    const row = rows.findIndex(r => r.includes(slot));
    const col = rows[row].indexOf(slot);
    return { x: CENTER_X + (col - (rows[row].length - 1) / 2) * STEP, y: TOP + row * STEP * 0.87 };
}

// Platz, auf dem ein Becher steht (oder der nächste, falls er dazwischen steht)
function slotOfCup(game: Game, cup: { u: number; v: number }) {
    const exact = slotIndexOf(game, 'opp', cup);
    if (exact !== null) return exact;
    return slotsOf('opp', game.size).reduce((best, s) => (Math.hypot(s.u - cup.u, s.v - cup.v) < Math.hypot(best.u - cup.u, best.v - cup.v) ? s : best)).id;
}

export function birdCupAt(game: Game, point: Point): number | null {
    let best: { id: number; d: number } | null = null;
    for (const cup of game.cups.opp) {
        const p = birdPoint(slotOfCup(game, cup));
        const d = Math.hypot(point.x - p.x, point.y - p.y);
        if (d < REACH && (!best || d < best.d)) best = { id: cup.id, d };
    }
    return best?.id ?? null;
}

// freier Platz unter dem Finger
export function birdSlotAt(game: Game, point: Point): number | null {
    let best: { slot: number; d: number } | null = null;
    for (const slot of slotsOf('opp', game.size)) {
        const p = birdPoint(slot.id);
        const d = Math.hypot(point.x - p.x, point.y - p.y);
        if (d < REACH && (!best || d < best.d)) best = { slot: slot.id, d };
    }
    return best && freeSlots(game, 'opp').includes(best.slot) ? best.slot : null;
}

export interface BirdView { dragging: number | null; start: number; closing: number | null; dragPoint: Point | null }

// Wie weit herangezoomt ist (0 bis 1)
export function birdZoom(view: BirdView, time: number) {
    const opening = easeInOut(clamp((time - view.start) / BIRD_ZOOM_MS));
    return view.closing === null ? opening : opening * (1 - easeInOut(clamp((time - view.closing) / BIRD_ZOOM_MS)));
}

function cupFromAbove(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, lifted: boolean) {
    // Schatten, beim Anheben weiter weg
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(x + (lifted ? 14 : 6), y + (lifted ? 18 : 8), r, 0, Math.PI * 2); ctx.fill();
    // roter Becher, weißer Rand, Bier innen
    ctx.fillStyle = '#d83a3a';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath(); ctx.arc(x, y, r * 0.86, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8a93a';
    ctx.beginPath(); ctx.arc(x, y, r * 0.74, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.3, r * 0.16, -0.5, 0, Math.PI * 2); ctx.fill();
}

export function drawBirdsEye(ctx: CanvasRenderingContext2D, game: Game, view: BirdView, time: number) {
    const k = birdZoom(view, time);
    if (k <= 0) return;
    const size = game.size;
    ctx.save();
    // Tisch von oben legt sich über das Bild
    ctx.fillStyle = `rgba(7,11,9,${0.82 * k})`;
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.globalAlpha = k;
    ctx.fillStyle = '#1f5b43';
    const left = CENTER_X - 2 * STEP, right = CENTER_X + 2 * STEP, top = TOP - STEP * 0.8, bottom = TOP + STEP * 3.2;
    ctx.beginPath(); ctx.roundRect(left, top, right - left, bottom - top, 28); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(left + 20, bottom - 6); ctx.lineTo(right - 20, bottom - 6); ctx.stroke();
    ctx.globalAlpha = 1;

    // freie Plätze gestrichelt
    const free = new Set(freeSlots(game, 'opp'));
    for (const slot of slotsOf('opp', size)) {
        if (!free.has(slot.id)) continue;
        const p = birdPoint(slot.id);
        ctx.save();
        ctx.globalAlpha = k;
        ctx.strokeStyle = 'rgba(255,224,138,0.95)'; ctx.fillStyle = 'rgba(255,224,138,0.12)';
        ctx.lineWidth = 6; ctx.setLineDash([16, 12]); ctx.lineDashOffset = time / 50;
        ctx.beginPath(); ctx.arc(p.x, p.y, RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // Becher: fliegen beim Heranzoomen von ihrem Platz in der Perspektive nach oben ins große Dreieck
    for (const cup of game.cups.opp) {
        if (cup.id === view.dragging && view.dragPoint) continue;
        const target = birdPoint(slotOfCup(game, cup));
        const from = tablePoint(cup.u, cup.v);
        const x = lerp(from.x, target.x, k), y = lerp(from.y - 55 * from.scale * size, target.y, k);
        const r = lerp(30 * from.scale * size, RADIUS, k);
        const picked = view.dragging === cup.id;
        cupFromAbove(ctx, x, y, r, picked);
        if (picked) {
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.arc(x, y, r + 10, 0, Math.PI * 2); ctx.stroke();
        }
    }
    // gezogener Becher folgt dem Finger
    if (view.dragging !== null && view.dragPoint) {
        cupFromAbove(ctx, view.dragPoint.x, view.dragPoint.y, RADIUS * 1.08, true);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(view.dragPoint.x, view.dragPoint.y, RADIUS * 1.08 + 10, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
}
