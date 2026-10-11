// Zielen und Treffen im Bild: Becher, Zielpunkt und Treffergebiete in Bildschirmkoordinaten (1080×1920).

import { tablePoint, tableUV, lerp, clamp } from '@/lib/wrapped-scene';
import type { Cup, Game, Side } from '@/lib/minigame/engine';
import { other, freeSlots, slotsOf } from '@/lib/minigame/engine';

export interface Point { x: number; y: number }

const CUP_HEIGHT = 118;

// Mitte der Becheröffnung auf dem Bildschirm
// `size` ist der Maßstab der Becher (1, 1,25, 1,5); `scale` bleibt die Perspektive des Tisches
export function cupMouth(cup: { u: number; v: number }, size = 1) {
    const p = tablePoint(cup.u, cup.v);
    return { x: p.x, y: p.y - CUP_HEIGHT * p.scale * size + 2 * p.scale * size, scale: p.scale * size, baseY: p.y };
}

// Halbachsen der Treffer- und der Randzone (Rand = knapp vorbei, der Ball springt vom Becher ab)
// scale ist die Perspektive mal Bechergröße (wie bei cupMouth)
export const hitRadii = (scale: number) => ({ rx: 44 * scale, ry: 30 * scale });
const RIM_FACTOR = 1.6;

export type Judgement =
    | { kind: 'hit'; cupId: number; bounce: boolean }
    | { kind: 'rim'; cupId: number }
    | { kind: 'miss' };

// Wie weit der Punkt von der Mitte der Zone liegt: <1 innen, <RIM_FACTOR am Rand
function ellipseDistance(point: Point, mouth: { x: number; y: number; scale: number }): number {
    const { rx, ry } = hitRadii(mouth.scale);
    return Math.hypot((point.x - mouth.x) / rx, (point.y - mouth.y) / ry);
}

// Direkter Wurf in die Becheröffnung
export function judgeDirect(cups: Cup[], point: Point, size = 1): Judgement {
    let best: { cup: Cup; d: number } | null = null;
    for (const cup of cups) {
        const d = ellipseDistance(point, cupMouth(cup, size));
        if (d < RIM_FACTOR && (!best || d < best.d)) best = { cup, d };
    }
    if (!best) return { kind: 'miss' };
    return best.d < 1 ? { kind: 'hit', cupId: best.cup.id, bounce: false } : { kind: 'rim', cupId: best.cup.id };
}

// Aufpraller: Der Ball springt vor dem Becher auf dem Tisch auf. Gültig ist der Streifen vor dem Becher,
// solange kein anderer Becher dazwischen steht.
export function judgeBounce(cups: Cup[], point: Point, size = 1): Judgement {
    let best: { cup: Cup; d: number } | null = null;
    for (const cup of cups) {
        const p = tablePoint(cup.u, cup.v);
        const dx = Math.abs(point.x - p.x) / (40 * p.scale * size);
        // vor dem Becher = weiter unten im Bild; ideal etwa eine halbe Becherhöhe davor
        const ahead = (point.y - p.y) / (CUP_HEIGHT * p.scale * size);
        if (dx > 1 || ahead < 0.12 || ahead > 0.85) continue;
        const blocked = cups.some(other => other.id !== cup.id && lineBlocked(p, point, other, size));
        if (blocked) continue;
        const d = dx + Math.abs(ahead - 0.45);
        if (!best || d < best.d) best = { cup, d };
    }
    return best ? { kind: 'hit', cupId: best.cup.id, bounce: true } : { kind: 'miss' };
}

// Steht ein anderer Becher so zwischen Aufprallpunkt und Ziel, dass der Ball ihn träfe?
function lineBlocked(target: Point, landing: Point, blocker: Cup, size: number): boolean {
    const b = tablePoint(blocker.u, blocker.v);
    const between = b.y > target.y && b.y < landing.y + 20 * b.scale;
    return between && Math.abs(b.x - lerp(target.x, landing.x, clamp((b.y - target.y) / Math.max(1, landing.y - target.y)))) < 46 * b.scale * size;
}

// ---- Wurf per Wischen ----
// Man zieht auf dem Bildschirm nach vorn und lässt los: Wie schnell, bestimmt die Weite, die Richtung des
// Wischens bestimmt, wohin der Ball fliegt. Es gibt kein Zielkreuz.

export interface Sample { x: number; y: number; t: number }

export type Flick = { ok: true; landing: Point; speed: number } | { ok: false; reason: 'short' | 'direction' };

// Für den Wurf zählt nur das letzte Stück des Wischens (Millisekunden)
export const FLICK_WINDOW_MS = 110;
const MIN_LENGTH = 28;
// Mindestens so steil nach vorn (Anteil der Länge nach oben), sonst ist es kein Wurf
const MIN_FORWARD = 0.4;
export const REACH_BASE = 140;
export const REACH_PER_SPEED = 120;
const SIDE_FACTOR = 0.5;
const CENTER = 540;
const HAND_Y = 1650;

// Wie weit ein Ball bei einer Geschwindigkeit (Bildpunkte pro Millisekunde) fliegt
export const reachFor = (speed: number) => clamp(REACH_BASE + REACH_PER_SPEED * speed, 100, 1000);

export function flickLanding(samples: Sample[]): Flick {
    if (samples.length < 2) return { ok: false, reason: 'short' };
    const last = samples[samples.length - 1];
    let first = samples[samples.length - 2];
    for (let i = samples.length - 2; i >= 0; i--) {
        if (last.t - samples[i].t > FLICK_WINDOW_MS) break;
        first = samples[i];
    }
    const dx = last.x - first.x, dy = last.y - first.y;
    const length = Math.hypot(dx, dy);
    if (length < MIN_LENGTH) return { ok: false, reason: 'short' };
    if (-dy / length < MIN_FORWARD) return { ok: false, reason: 'direction' };
    const speed = length / Math.max(16, last.t - first.t);
    const reach = reachFor(speed);
    // seitliche Abweichung je Weite nach vorn; ein gerades Wischen trifft die Mitte des Tisches
    const slope = dx / -dy;
    return { ok: true, speed, landing: { x: CENTER + slope * reach * SIDE_FACTOR, y: HAND_Y - reach } };
}

// Handzittern: unsichtbares Wackeln des Landepunkts, bei weiten Würfen kleiner im Bild
export function tremor(amplitude: number, y: number, factor: number, rng: () => number): Point {
    const scale = lerp(1, 0.54, clamp((1650 - y) / 690));
    const sigma = amplitude * 0.35 * scale * factor;
    // Summe aus drei Zufallszahlen: näherungsweise glockenförmig
    const gauss = () => (rng() + rng() + rng() - 1.5) / 0.5;
    return { x: gauss() * sigma, y: gauss() * sigma * 0.7 };
}

// Bildschirmpunkt -> Tischkoordinaten innerhalb der Zone der Seite
export function toTable(point: Point) { return tableUV(point.x, point.y); }

// Mitte eines Bechers (Körper) auf dem Bildschirm, zum Anfassen
function bodyCenter(cup: { u: number; v: number }, size: number) {
    const p = tablePoint(cup.u, cup.v);
    return { x: p.x, y: p.y - 55 * p.scale * size, reach: Math.max(40, 62 * p.scale * size * 1.1) };
}

// Becher einer Seite unter einem Bildschirmpunkt (zum Anfassen beim Umstellen); großzügig, auch weit hinten
export function cupAt(game: Game, side: Side, point: Point): Cup | null {
    let best: { cup: Cup; d: number } | null = null;
    for (const cup of game.cups[side]) {
        const c = bodyCenter(cup, game.size);
        const d = Math.hypot(point.x - c.x, point.y - c.y);
        if (d < c.reach && (!best || d < best.d)) best = { cup, d };
    }
    return best?.cup ?? null;
}

// Platz einer Seite unter einem Bildschirmpunkt, wenn er frei ist (Nummer des Platzes). Der nächste Platz zählt, auch
// wenn er belegt ist: Wer auf einen Becher tippt, trifft nicht den freien Platz daneben.
export function slotAt(game: Game, side: Side, point: Point): number | null {
    let best: { slot: number; d: number; reach: number } | null = null;
    for (const slot of slotsOf(side, game.size)) {
        const c = bodyCenter(slot, game.size);
        const d = Math.hypot(point.x - c.x, point.y - c.y);
        if (d < c.reach && (!best || d < best.d)) best = { slot: slot.id, d, reach: c.reach };
    }
    return best && freeSlots(game, side).includes(best.slot) ? best.slot : null;
}

export const defenderOf = (thrower: Side) => other(thrower);
