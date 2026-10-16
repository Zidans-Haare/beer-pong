// Siegerehrung: Die Top 3 laufen vorn ein und hüpfen, gehen dann nach hinten und springen auf ihr Podest.
// Danach bleiben sie dort stehen. Gleiches Prinzip wie die anderen Szenen: drawWinnerFrame hängt nur von der Zeit ab.

import { CENTER_X, clamp, lerp, ramp, easeOut, easeInOut, easeOutBack, rand, roundRect, HEADING } from '@/lib/wrapped-scene';
import { drawWalker, drawNameTag, type FilmStep, type WalkerOpts } from '@/lib/tournament-scene';

export const WINNER_WIDTH = 1080;
export const WINNER_HEIGHT = 690;
// danach steht das Bild still
export const WINNER_TOTAL_MS = 11000;

// Boden vorn, auf dem die Top 3 einlaufen
const FRONT_FLOOR = 650;
// Die Top 3 sollen sofort da sein: Sie laufen ohne Verzögerung los und sind nach einer halben Sekunde im Bild
const WALK_AT = 0, WALK_MS = 500, STAGGER = 110;
// Nach dem Jubeln vorn gehen sie nach hinten zum Podest und springen hinauf
const BACK_AT = 2600, BACK_MS = 1000, JUMP_MS = 520, JUMP_STAGGER = 180;
// gegen Ende hören sie langsam auf zu hüpfen
const CALM_AT = WINNER_TOTAL_MS - 1600;

// Podest hinten: Sieger in der Mitte und am höchsten, 2 links, 3 rechts
const PODIUM_BASE = 570, BLOCK_W = 290;
export const PODIUM = {
    1: { x: CENTER_X, top: 350, scale: 0.66 },
    2: { x: CENTER_X - BLOCK_W, top: 430, scale: 0.6 },
    3: { x: CENTER_X + BLOCK_W, top: 480, scale: 0.6 },
} as const;

// Platz vorn: Sieger in der Mitte und größer, 2 links, 3 rechts
const FRONT = {
    1: { x: CENTER_X, scale: 0.95, from: 0 },
    2: { x: 200, scale: 0.85, from: -1 },
    3: { x: 880, scale: 0.85, from: 1 },
} as const;

const BLOCK_COLOR = { 1: ['#f2c94c', '#c99a1c'], 2: ['#d5dae0', '#a3abb5'], 3: ['#dc9a5c', '#a86a32'] } as const;

export interface WinnerModel { podium: FilmStep[] }

export interface WinnerTimeline { arrivals: { place: 1 | 2 | 3; at: number }[]; jumps: { place: 1 | 2 | 3; at: number }[]; crown: number }

export function winnerTimeline(model: WinnerModel): WinnerTimeline {
    // zuerst 3, dann 2, zuletzt der Sieger
    const places = ([3, 2, 1] as const).filter(place => model.podium.some(s => s.place === place));
    const arrivals = places.map((place, i) => ({ place, at: WALK_AT + i * STAGGER + WALK_MS }));
    // auch aufs Podest springt der Sieger zuletzt; "at" ist die Landung
    const jumps = places.map((place, i) => ({ place, at: BACK_AT + BACK_MS + i * JUMP_STAGGER + JUMP_MS }));
    const last = jumps.length ? jumps[jumps.length - 1].at : BACK_AT;
    return { arrivals, jumps, crown: last + 200 };
}

// Stelle, Größe und Bewegung einer Figur zu einem Zeitpunkt
export function walkerPose(place: 1 | 2 | 3, offset: number, count: number, i: number, time: number, tl: WinnerTimeline) {
    const front = FRONT[place], block = PODIUM[place];
    const team = count > 1 ? 0.82 : 1;
    const arrival = tl.arrivals.find(a => a.place === place)!.at;
    const landing = tl.jumps.find(j => j.place === place)!.at;
    const jumpAt = landing - JUMP_MS, backAt = jumpAt - BACK_MS;
    const frontX = front.x + offset * front.scale;
    const blockX = block.x + offset * block.scale;
    // Fuß des Podests, von dort wird gesprungen
    const footY = PODIUM_BASE + 30;

    if (time < backAt) {
        // vorn: Sieger fällt von oben herein, die anderen laufen von der Seite
        const walk = ramp(time, arrival - WALK_MS, WALK_MS);
        const edge = front.from === 0 ? frontX : front.from < 0 ? -150 - i * 140 : WINNER_WIDTH + 150 + i * 140;
        const landed = time >= arrival;
        return {
            x: lerp(edge, frontX, easeOut(walk)),
            y: FRONT_FLOOR - (front.from === 0 ? (1 - easeOutBack(walk)) * 700 : 0),
            s: front.scale * team,
            walk: front.from === 0 || landed ? 0 : 1,
            cheer: landed ? easeOut(ramp(time, arrival, 400)) * (1 - ramp(time, backAt - 300, 300)) : 0,
            onPodium: false,
        };
    }
    if (time < jumpAt) {
        // nach hinten zum Podest laufen, dabei kleiner werden
        const k = easeInOut(ramp(time, backAt, BACK_MS));
        return { x: lerp(frontX, blockX, k), y: lerp(FRONT_FLOOR, footY, k), s: lerp(front.scale, block.scale, k) * team, walk: 1, cheer: 0, onPodium: false };
    }
    if (time < landing) {
        // Sprung im Bogen auf den Block
        const k = ramp(time, jumpAt, JUMP_MS);
        return { x: blockX, y: lerp(footY, block.top, k) - Math.sin(k * Math.PI) * 130, s: block.scale * team, walk: 0, cheer: 0.3, onPodium: false };
    }
    // oben: jubeln, gegen Ende ruhiger
    const cheer = easeOut(ramp(time, landing, 400)) * (1 - 0.75 * ramp(time, CALM_AT, 1400));
    return { x: blockX, y: block.top, s: block.scale * team, walk: 0, cheer: time >= WINNER_TOTAL_MS ? 0 : cheer, onPodium: true };
}

function drawBlock(ctx: CanvasRenderingContext2D, place: 1 | 2 | 3, alpha: number) {
    const b = PODIUM[place];
    const [light, dark] = BLOCK_COLOR[place];
    const left = b.x - BLOCK_W / 2 + 6, w = BLOCK_W - 12, h = PODIUM_BASE - b.top;
    ctx.save();
    ctx.globalAlpha *= alpha;
    // Oberseite, damit der Block räumlich wirkt
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(left, b.top); ctx.lineTo(left + w, b.top); ctx.lineTo(left + w - 22, b.top - 26); ctx.lineTo(left + 22, b.top - 26);
    ctx.closePath(); ctx.fill();
    // Vorderseite mit Verlauf
    const grad = ctx.createLinearGradient(0, b.top, 0, PODIUM_BASE);
    grad.addColorStop(0, light); grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    roundRect(ctx, left, b.top, w, h, 6); ctx.fill();
    // Platzierung groß auf der Vorderseite
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.textAlign = 'center';
    const size = place === 1 ? 120 : 96;
    ctx.font = `700 ${size}px ${HEADING}`;
    ctx.fillText(String(place), b.x, b.top + Math.min(h - 16, size * 0.95));
    ctx.restore();
}

// Zeichnet auf transparentem Grund
export function drawWinnerFrame(ctx: CanvasRenderingContext2D, model: WinnerModel, timeMs: number) {
    const time = clamp(timeMs, 0, WINNER_TOTAL_MS);
    const tl = winnerTimeline(model);
    ctx.clearRect(0, 0, WINNER_WIDTH, WINNER_HEIGHT);
    ctx.save();
    // ohne dritten Platz rückt das Podest in die Mitte
    if (!model.podium.some(s => s.place === 3)) ctx.translate(model.podium.some(s => s.place === 2) ? BLOCK_W / 2 : 0, 0);

    // Podest steht von Anfang an hinten
    const steps = [...model.podium].sort((a, b) => b.place - a.place);
    for (const step of steps) drawBlock(ctx, step.place, easeOut(ramp(time, 0, 400)));

    // Namen unter den Blöcken, sobald jemand oben steht
    for (const step of steps) {
        const jump = tl.jumps.find(j => j.place === step.place);
        if (!jump) continue;
        drawNameTag(ctx, step.label, PODIUM[step.place].x, PODIUM_BASE + 64, easeOut(ramp(time, jump.at, 400)), step.place === 1, BLOCK_W - 20, step.place === 1 ? 40 : 34);
    }

    // Figuren: wer weiter hinten steht, zuerst; der Sieger zuletzt, damit er bei Teams vorn steht
    const figures = steps.flatMap(step => {
        const count = Math.min(2, step.looks.length);
        return step.looks.slice(0, count).map((look, i) => ({ step, look, i, pose: walkerPose(step.place, count > 1 ? (i ? 96 : -96) : 0, count, i, time, tl) }));
    }).sort((a, b) => a.pose.y - b.pose.y || b.step.place - a.step.place);
    for (const { step, look, i, pose } of figures) {
        const arrival = tl.arrivals.find(a => a.place === step.place)!.at;
        const opts: WalkerOpts = {
            walk: pose.walk, cheer: pose.cheer, place: step.place,
            medal: easeOutBack(ramp(time, arrival + 150, 420)),
            crown: step.place === 1 && i === 0 ? ramp(time, tl.crown, 520) : 0,
            time: time + i * 120 + step.place * 70,
        };
        drawWalker(ctx, pose.x, pose.y, pose.s, look, opts);
    }

    // Sternchen steigen über dem Sieger auf, bis das Bild stillsteht
    if (time > tl.crown && time < WINNER_TOTAL_MS) {
        const fade = 1 - ramp(time, WINNER_TOTAL_MS - 800, 800);
        for (let i = 0; i < 12; i++) {
            const k = (((time - tl.crown) / 1000 + rand(i, 1) * 2.4) % 2.4) / 2.4;
            ctx.save();
            ctx.globalAlpha *= (1 - k) * 0.95 * fade;
            ctx.translate(CENTER_X + (rand(i, 2) - 0.5) * 420, 100 - k * 90);
            ctx.rotate(rand(i, 3) * 6 + time / 400);
            ctx.fillStyle = i % 2 ? '#ffd23f' : '#f2a33a';
            const r = 8 + rand(i, 4) * 10;
            ctx.beginPath();
            for (let p = 0; p < 8; p++) { const rr = p % 2 ? r * 0.4 : r; const a = (p / 8) * Math.PI * 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    }
    ctx.restore();
}
