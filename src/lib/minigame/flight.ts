// Flugbahn des Balls über dem Tisch: Der Ball fliegt eine Parabel im Raum (Tischkoordinaten u/v plus Höhe h)
// und wird erst dann in die Perspektive gerechnet. So steigt er auf, wird in der Ferne kleiner und fällt am Ende
// von oben in den Becher, statt auf dem Bildschirm schräg hineinzurutschen.

import { tablePoint, lerp, clamp } from '@/lib/wrapped-scene';
import type { Point } from '@/lib/minigame/aim';

// u quer, v längs (0 bei mir, 1 beim Gegner), h Höhe über dem Tisch in Bildpunkten bei Maßstab 1
export interface Spot3 { u: number; v: number; h: number }

const NEAR_Y = 1650, FAR_Y = 960, NEAR_HALF = 440, FAR_HALF = 232;
// Höhe der Becheröffnung (wie cupMouth in aim.ts)
export const MOUTH_H = 116;
// Halbe Breite der Bieröffnung und des Rands, bei Maßstab 1
const BEER_HALF = 40, RIM_HALF = 48;
// halbe Tiefe eines Bechers in v (die Reihen stehen 0,066 auseinander)
const BEER_DEPTH = 0.028, RIM_DEPTH = 0.034;
const BALL_R = 24;

// Meine Hand vorn rechts, die Hand des Gegners hinten über seiner Tischkante
export const MY_HAND: Spot3 = { u: 0.34, v: 0, h: 0 };
export const OPP_HAND: Spot3 = { u: 0.13, v: 1, h: 148 };

// wie tablePoint, aber auch hinter dem Tisch (v > 1) und ohne Fehler bei kleinen negativen Werten
function ground(u: number, v: number) {
    const f = Math.pow(Math.max(0, v), 0.85);
    return { x: 540 + u * lerp(NEAR_HALF, FAR_HALF, f), y: lerp(NEAR_Y, FAR_Y, f), scale: Math.max(0.2, lerp(1, 0.54, f)) };
}

export function project(s: Spot3) {
    const g = ground(s.u, s.v);
    return { x: g.x, y: g.y - s.h * g.scale, r: BALL_R * g.scale + 3, ground: { x: g.x, y: g.y } };
}

// Punkt der Parabel: waagerecht gleichmäßig, senkrecht mit Scheitel `apex` über der Verbindungslinie
export function arcAt(from: Spot3, to: Spot3, apex: number, k: number) {
    return project({ u: lerp(from.u, to.u, k), v: lerp(from.v, to.v, k), h: lerp(from.h, to.h, k) + 4 * apex * k * (1 - k) });
}

// Bildschirmpunkt auf dem Tisch -> Tischkoordinaten, auch hinter dem Tisch
export function groundSpot(point: Point): Spot3 {
    const f = Math.max(0, (NEAR_Y - point.y) / (NEAR_Y - FAR_Y));
    return { u: (point.x - 540) / lerp(NEAR_HALF, FAR_HALF, f), v: Math.pow(f, 1 / 0.85), h: 0 };
}

const halfWidthU = (v: number, px: number, size: number) => {
    const f = Math.pow(clamp(v), 0.85);
    return (px * size * lerp(1, 0.54, f)) / lerp(NEAR_HALF, FAR_HALF, f);
};

// Richtung von der Mitte der Öffnung zum Landepunkt, als Anteil der Trefferzone (Länge höchstens 1)
export function offsetIn(point: Point, mouth: { x: number; y: number; scale: number }, rx = 44, ry = 24) {
    const dx = (point.x - mouth.x) / (rx * mouth.scale), dy = (point.y - mouth.y) / (ry * mouth.scale);
    const len = Math.hypot(dx, dy);
    return len > 1 ? { x: dx / len, y: dy / len } : { x: dx, y: dy };
}

// Ziel in der Bieröffnung: der Ball fällt dort hinein; `offset` verschiebt ihn höchstens halb zum Rand
export function mouthSpot(cup: { u: number; v: number }, size: number, offset: Point = { x: 0, y: 0 }): Spot3 {
    return { u: cup.u + offset.x * 0.5 * halfWidthU(cup.v, BEER_HALF, size), v: cup.v - offset.y * 0.5 * BEER_DEPTH * size, h: MOUTH_H * size };
}

// Stelle am Becherrand in Richtung des Landepunkts: Dort trifft der Ball den Rand und springt ab
export function rimSpot(cup: { u: number; v: number }, size: number, dir: Point): Spot3 {
    const len = Math.hypot(dir.x, dir.y) || 1;
    return { u: cup.u + (dir.x / len) * halfWidthU(cup.v, RIM_HALF, size), v: cup.v - (dir.y / len) * RIM_DEPTH * size, h: MOUTH_H * size };
}

// Scheitelhöhe eines Wurfs: weite Würfe fliegen höher
export const apexFor = (from: Spot3, to: Spot3) => 260 + Math.abs(to.v - from.v) * 380;
