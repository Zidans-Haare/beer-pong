// Bier Pong Wrapped als durchgehende Szene am Tisch.
// drawWrappedFrame malt für einen Zeitpunkt das komplette Bild (1080×1920). Weil das Bild nur von der
// Zeit abhängt, lassen sich Wiedergabe, Springen und Videoaufnahme mit demselben Code machen.

export const SCENE_WIDTH = 1080;
export const SCENE_HEIGHT = 1920;

export type SceneKey = 'table' | 'setup' | 'throw' | 'rally' | 'win' | 'final';

export interface SceneSegment {
    key: SceneKey;
    eyebrow: string;
    // große Zeile; mit countTo zählt die Zahl hoch
    value: string;
    countTo?: number;
    suffix?: string;
    title: string;
    lines: string[];
}

export interface SceneModel {
    title: string;
    playerName: string;
    opponentName: string | null;
    // Saisonfarbe als #rrggbb
    primary: string;
    segments: SceneSegment[];
}

export const SEGMENT_MS: Record<SceneKey, number> = { table: 6000, setup: 6800, throw: 6200, rally: 6500, win: 7000, final: 7500 };

export function segmentStarts(model: SceneModel): number[] {
    const starts: number[] = [];
    let t = 0;
    for (const s of model.segments) { starts.push(t); t += SEGMENT_MS[s.key]; }
    return starts;
}
export const totalDuration = (model: SceneModel) => model.segments.reduce((sum, s) => sum + SEGMENT_MS[s.key], 0);

// ---- Hilfen ----
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// 0..1 zwischen start und start+dur
const ramp = (t: number, start: number, dur: number) => clamp((t - start) / dur);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => { if (t <= 0) return 0; if (t >= 1) return 1; const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
// feste Pseudo-Zufallszahl 0..1 je Index
const rand = (i: number, salt = 0) => { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); };

function hexToRgb(hex: string): [number, number, number] {
    const h = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : '006b50';
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const shade = (hex: string, factor: number) => `rgb(${hexToRgb(hex).map(v => Math.round(Math.min(255, v * factor))).join(',')})`;

// ---- Tisch-Perspektive ----
const NEAR_Y = 1650, FAR_Y = 960, NEAR_HALF = 440, FAR_HALF = 232, CENTER_X = 540;
// u: -1..1 quer, v: 0 (bei mir) .. 1 (beim Gegner)
function tablePoint(u: number, v: number) {
    const f = Math.pow(v, 0.85);
    return { x: CENTER_X + u * lerp(NEAR_HALF, FAR_HALF, f), y: lerp(NEAR_Y, FAR_Y, f), scale: lerp(1, 0.54, f) };
}

interface CupSpot { u: number; v: number; row: number }
// Dreieck aus 10 Bechern; Reihe 0 steht an der Tischkante, Reihe 3 ist die Spitze zur Mitte
function formation(side: 'me' | 'opponent'): CupSpot[] {
    const spots: CupSpot[] = [];
    [4, 3, 2, 1].forEach((count, row) => {
        for (let i = 0; i < count; i++) {
            const u = (i - (count - 1) / 2) * 0.235;
            spots.push({ u, v: side === 'me' ? 0.055 + row * 0.066 : 0.945 - row * 0.066, row });
        }
    });
    return spots;
}
const MY_CUPS = formation('me');
const OPP_CUPS = formation('opponent');
// Reihenfolge der Treffer: Spitze, zweite Reihe, dann Mitte der dritten
const HIT_ORDER = [9, 7, 8, 5];

function drawCup(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, opts: { alpha?: number; rotate?: number; pop?: number } = {}) {
    const pop = opts.pop ?? 1;
    // zu kleine Becher gar nicht zeichnen; die Größe läuft über scale(), damit keine Maße negativ werden
    if (pop < 0.03 || (opts.alpha ?? 1) <= 0) return;
    const w = 96 * s, wb = 64 * s, h = 118 * s;
    ctx.save();
    ctx.globalAlpha *= opts.alpha ?? 1;
    ctx.translate(x, y);
    if (opts.rotate) ctx.rotate(opts.rotate);
    ctx.scale(pop, pop);
    // Schatten auf dem Tisch
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(6 * s, 2, wb * 0.62, wb * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    // Körper
    const body = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    body.addColorStop(0, '#f0524a'); body.addColorStop(0.55, '#d6362b'); body.addColorStop(1, '#9d2018');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h); ctx.lineTo(w / 2, -h); ctx.lineTo(wb / 2, 0);
    ctx.quadraticCurveTo(0, wb * 0.18, -wb / 2, 0); ctx.closePath(); ctx.fill();
    // Rand und Bier
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(0, -h, w / 2, w * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8a923';
    ctx.beginPath(); ctx.ellipse(0, -h + 2 * s, w / 2 - 8 * s, w * 0.2 - 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-w * 0.12, -h + 1 * s, w * 0.16, w * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, family: string, max: number, min: number, width: number) {
    let size = max;
    ctx.font = `700 ${size}px ${family}`;
    while (ctx.measureText(text).width > width && size > min) { size -= 6; ctx.font = `700 ${size}px ${family}`; }
    return size;
}

const HEADING = '"Barlow Condensed", sans-serif';
const BODY = '"Manrope", sans-serif';

// Statistik-Block oben; `local` = Zeit seit Abschnittsbeginn in ms
function drawStat(ctx: CanvasRenderingContext2D, seg: SceneSegment, local: number, startAt: number, accent: string) {
    const width = SCENE_WIDTH - 180;
    const appear = (delay: number) => easeOut(ramp(local, startAt + delay, 520));
    const left = 90;

    let a = appear(0);
    if (a <= 0) return;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = a;
    ctx.fillStyle = accent;
    ctx.font = `700 38px ${BODY}`;
    ctx.fillText(seg.eyebrow.toUpperCase(), left, 236 + (1 - a) * 24);

    a = appear(140);
    const count = seg.countTo !== undefined ? Math.round(seg.countTo * easeOut(ramp(local, startAt + 140, 1300))) : null;
    const text = count !== null ? `${count.toLocaleString('de-DE')}${seg.suffix ?? ''}` : seg.value;
    // Breite an der Endzahl ausrichten, damit die Zahl beim Hochzählen nicht springt
    const final = seg.countTo !== undefined ? `${seg.countTo.toLocaleString('de-DE')}${seg.suffix ?? ''}` : seg.value;
    const size = fitFont(ctx, final, HEADING, seg.countTo !== undefined ? 240 : 180, 80, width);
    const pop = 0.6 + 0.4 * easeOutBack(ramp(local, startAt + 140, 620));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.translate(left, 270 + size * 0.74);
    ctx.scale(pop, pop);
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
    ctx.fillText(text, 0, 0);
    ctx.restore();

    let y = 270 + size * 0.74 + 72;
    a = appear(320);
    ctx.globalAlpha = a;
    ctx.font = `700 54px ${BODY}`;
    for (const line of wrapText(ctx, seg.title, width).slice(0, 2)) { ctx.fillText(line, left, y + (1 - a) * 24); y += 68; }

    ctx.font = `500 40px ${BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    y += 6;
    seg.lines.slice(0, 2).forEach((line, i) => {
        a = appear(480 + i * 140);
        ctx.globalAlpha = a;
        for (const part of wrapText(ctx, line, width).slice(0, 2)) { ctx.fillText(part, left, y + (1 - a) * 24); y += 54; }
    });
    ctx.restore();
}

function drawOpponent(ctx: CanvasRenderingContext2D, enter: number, mood: number, name: string | null, time: number) {
    if (enter <= 0) return;
    const sad = clamp(-mood);
    const bob = Math.sin(time / 520) * 4 * (1 - sad);
    const y = 836 + (1 - easeOutBack(enter)) * 150 + sad * 26 + bob;
    ctx.save();
    ctx.globalAlpha = clamp(enter * 1.6);
    ctx.translate(CENTER_X, y);
    ctx.rotate(sad * 0.07);
    // Körper (unterer Teil verschwindet hinter dem Tisch)
    ctx.fillStyle = '#f2b24a';
    roundRect(ctx, -92, 46, 184, 220, 60); ctx.fill();
    // hängende Arme, wenn traurig
    ctx.strokeStyle = '#f2b24a'; ctx.lineWidth = 34; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-84, 96); ctx.lineTo(-112 - sad * 8, 96 + 70 + sad * 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(84, 96); ctx.lineTo(112 + sad * 8, 96 + 70 + sad * 30); ctx.stroke();
    // Kopf
    ctx.fillStyle = '#fbe3c0';
    ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fill();
    // Augen
    ctx.fillStyle = '#2a1f14';
    const eyeY = -8 + sad * 6;
    ctx.beginPath(); ctx.arc(-22, eyeY, 7, 0, Math.PI * 2); ctx.arc(22, eyeY, 7, 0, Math.PI * 2); ctx.fill();
    // Augenbrauen kippen bei schlechter Laune
    ctx.strokeStyle = '#2a1f14'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-34, eyeY - 20 + sad * 8); ctx.lineTo(-12, eyeY - 20 - sad * 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(34, eyeY - 20 + sad * 8); ctx.lineTo(12, eyeY - 20 - sad * 8); ctx.stroke();
    // Mund: Lächeln bis Schmollmund
    ctx.beginPath();
    ctx.moveTo(-22, 24); ctx.quadraticCurveTo(0, 24 + lerp(18, -20, sad), 22, 24); ctx.stroke();
    // Träne
    if (sad > 0.6) {
        const drop = (time / 900) % 1;
        ctx.fillStyle = `rgba(120,190,255,${(1 - drop) * 0.95})`;
        ctx.beginPath(); ctx.ellipse(-28, eyeY + 14 + drop * 54, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    if (name) {
        ctx.save();
        ctx.globalAlpha = clamp(enter * 1.4);
        ctx.font = `700 34px ${BODY}`;
        const w = ctx.measureText(name).width + 44;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        roundRect(ctx, CENTER_X - w / 2, y - 132, w, 52, 26); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(name, CENTER_X, y - 96);
        ctx.restore();
    }
}

// Ich, von hinten gesehen; throwPhase 0..1 = Ausholen bis Loslassen
function drawMe(ctx: CanvasRenderingContext2D, enter: number, throwPhase: number, cheer: number, time: number, primary: string) {
    if (enter <= 0) return;
    const jump = cheer > 0 ? Math.abs(Math.sin(time / 190)) * 46 * cheer : 0;
    const y = 1800 + (1 - easeOut(enter)) * 420 - jump;
    ctx.save();
    ctx.translate(CENTER_X, y);
    const shirt = shade(primary, 1.5);
    // Rumpf
    ctx.fillStyle = shirt;
    roundRect(ctx, -190, 84, 380, 420, 120); ctx.fill();
    ctx.strokeStyle = shirt; ctx.lineWidth = 62; ctx.lineCap = 'round';
    // linker Arm
    const wave = Math.sin(time / 160) * 26 * cheer;
    ctx.beginPath(); ctx.moveTo(-170, 150);
    ctx.lineTo(lerp(-214, -250 + wave, cheer), lerp(310, -90, cheer)); ctx.stroke();
    // Wurfarm: Ruhe → Ausholen → nach vorn
    const wind = Math.sin(clamp(throwPhase) * Math.PI);
    const forward = easeOut(clamp((throwPhase - 0.45) / 0.55));
    const handX = lerp(lerp(214, 250, wind), 130, forward * (throwPhase > 0 && throwPhase < 1 ? 1 : 0));
    const handY = lerp(lerp(310, 40, wind), -150, forward * (throwPhase > 0 && throwPhase < 1 ? 1 : 0));
    ctx.beginPath(); ctx.moveTo(170, 150);
    ctx.lineTo(lerp(handX, 250 - wave, cheer), lerp(handY, -90, cheer)); ctx.stroke();
    // Kopf
    ctx.fillStyle = '#fbe3c0';
    ctx.beginPath(); ctx.arc(0, 0, 104, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3b2a1a';
    ctx.beginPath(); ctx.arc(0, -14, 104, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
    ctx.restore();
}

interface Throw { start: number; target: number }
const THROW_MS = 820;

export function drawWrappedFrame(ctx: CanvasRenderingContext2D, model: SceneModel, timeMs: number) {
    const starts = segmentStarts(model);
    const total = totalDuration(model);
    const time = clamp(timeMs, 0, total);
    let index = starts.length - 1;
    for (let i = 0; i < starts.length; i++) if (time >= starts[i]) index = i;
    const seg = model.segments[index];
    const local = time - starts[index];
    const at = (key: SceneKey) => { const i = model.segments.findIndex(s => s.key === key); return i >= 0 ? starts[i] : Infinity; };
    const S_SETUP = at('setup'), S_THROW = at('throw'), S_RALLY = at('rally'), S_WIN = at('win'), S_FINAL = at('final');

    const throws: Throw[] = [
        { start: S_THROW + 1300, target: HIT_ORDER[0] },
        { start: S_RALLY + 900, target: HIT_ORDER[1] },
        { start: S_RALLY + 2300, target: HIT_ORDER[2] },
        { start: S_RALLY + 3700, target: HIT_ORDER[3] },
    ];
    const hits = throws.filter(t => time >= t.start + THROW_MS).length;

    // ---- Hintergrund ----
    const bg = ctx.createLinearGradient(0, 0, 0, SCENE_HEIGHT);
    bg.addColorStop(0, shade(model.primary, 0.42)); bg.addColorStop(0.5, shade(model.primary, 0.24)); bg.addColorStop(1, '#070b09');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    // Lichtkegel über dem Tisch
    const glow = ctx.createRadialGradient(CENTER_X, 1220, 60, CENTER_X, 1220, 900);
    glow.addColorStop(0, 'rgba(255,255,255,0.16)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);

    const tableIn = easeOut(ramp(time, 150, 1100));
    const oppEnter = ramp(time, S_SETUP + 2500, 700);
    const mood = time >= S_WIN + 700 ? -easeInOut(ramp(time, S_WIN + 700, 900)) : -Math.min(0.45, hits * 0.12);
    drawOpponent(ctx, oppEnter, mood, model.opponentName, time);

    // ---- Tisch ----
    ctx.save();
    ctx.globalAlpha = tableIn;
    ctx.translate(0, (1 - tableIn) * 120);
    const nl = tablePoint(-1, 0), nr = tablePoint(1, 0), fl = tablePoint(-1, 1), fr = tablePoint(1, 1);
    // Tischkante
    ctx.fillStyle = shade(model.primary, 0.5);
    ctx.beginPath(); ctx.moveTo(nl.x, nl.y); ctx.lineTo(nr.x, nr.y); ctx.lineTo(nr.x - 8, nr.y + 46); ctx.lineTo(nl.x + 8, nl.y + 46); ctx.closePath(); ctx.fill();
    const surface = ctx.createLinearGradient(0, fl.y, 0, nl.y);
    surface.addColorStop(0, shade(model.primary, 0.85)); surface.addColorStop(1, shade(model.primary, 1.25));
    ctx.fillStyle = surface;
    ctx.beginPath(); ctx.moveTo(nl.x, nl.y); ctx.lineTo(nr.x, nr.y); ctx.lineTo(fr.x, fr.y); ctx.lineTo(fl.x, fl.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
    ctx.stroke();
    const ml = tablePoint(-1, 0.5), mr = tablePoint(1, 0.5);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.moveTo(ml.x, ml.y); ctx.lineTo(mr.x, mr.y); ctx.stroke();
    ctx.restore();

    // ---- Becher des Gegners (hinten zuerst) ----
    const toppleStart = S_WIN + 500;
    OPP_CUPS.forEach((spot, i) => {
        const p = tablePoint(spot.u, spot.v);
        const pop = easeOutBack(ramp(time, S_SETUP + 3300 + i * 80, 380));
        const hitIndex = HIT_ORDER.indexOf(i);
        const hit = hitIndex >= 0 ? throws[hitIndex] : null;
        if (hit && time >= hit.start + THROW_MS) {
            // getroffener Becher fliegt weg
            const k = ramp(time, hit.start + THROW_MS, 620);
            drawCup(ctx, p.x + (spot.u >= 0 ? 60 : -60) * k, p.y - 240 * p.scale * easeOut(k), p.scale, { alpha: 1 - k, rotate: (spot.u >= 0 ? 1 : -1) * k * 1.4 });
            return;
        }
        // am Ende kippen alle übrigen um
        const fall = easeInOut(ramp(time, toppleStart + rand(i) * 520, 620));
        const dir = spot.u === 0 ? (i % 2 ? 1 : -1) : Math.sign(spot.u);
        drawCup(ctx, p.x + dir * fall * 70 * p.scale, p.y + fall * 10, p.scale, { pop, rotate: dir * fall * 1.5, alpha: 1 - ramp(time, toppleStart + 900 + rand(i) * 520, 700) * 0.75 });
    });

    // ---- Ball in der Luft ----
    for (const th of throws) {
        const k = ramp(time, th.start, THROW_MS);
        if (k <= 0 || k >= 1) continue;
        const target = OPP_CUPS[th.target];
        const end = tablePoint(target.u, target.v);
        const sx = CENTER_X + 150, sy = 1650;
        const x = lerp(sx, end.x, k);
        const y = lerp(sy, end.y - 118 * end.scale, k) - Math.sin(k * Math.PI) * 430;
        const r = lerp(30, 15, k);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(x, lerp(sy, end.y, k), r * 1.1, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        const ball = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
        ball.addColorStop(0, '#ffffff'); ball.addColorStop(1, '#ffd9a0');
        ctx.fillStyle = ball;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // Spritzer und "+1" beim Treffer
    throws.forEach((th, n) => {
        const k = ramp(time, th.start + THROW_MS, 700);
        if (k <= 0 || k >= 1) return;
        const target = OPP_CUPS[th.target];
        const p = tablePoint(target.u, target.v);
        const top = p.y - 118 * p.scale;
        ctx.fillStyle = `rgba(232,169,35,${1 - k})`;
        for (let d = 0; d < 9; d++) {
            const angle = -Math.PI * (0.15 + 0.7 * (d / 8));
            const dist = easeOut(k) * (70 + rand(d, n) * 60);
            ctx.beginPath(); ctx.arc(p.x + Math.cos(angle) * dist, top + Math.sin(angle) * dist + k * k * 60, 7 * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 70px ${HEADING}`;
        ctx.textAlign = 'center';
        ctx.fillText('+1', p.x, top - 50 - easeOut(k) * 90);
        ctx.restore();
    });

    // ---- meine Becher (hinten zuerst = Spitze zuerst) ----
    [...MY_CUPS.keys()].sort((a, b) => MY_CUPS[b].v - MY_CUPS[a].v).forEach(i => {
        const spot = MY_CUPS[i];
        const p = tablePoint(spot.u, spot.v);
        // Aufbau von der Kante zur Spitze
        const pop = easeOutBack(ramp(time, S_SETUP + 900 + i * 110, 420));
        drawCup(ctx, p.x, p.y, p.scale, { pop });
    });

    // ---- ich ----
    const meEnter = ramp(time, S_SETUP + 150, 800);
    const active = throws.find(t => time >= t.start - 420 && time < t.start + 380);
    const throwPhase = active ? ramp(time, active.start - 420, 800) : 0;
    const cheer = easeOut(ramp(time, S_WIN + 1100, 500)) * (1 - ramp(time, S_FINAL, 600));
    drawMe(ctx, meEnter, throwPhase, cheer, time, model.primary);

    // ---- Konfetti zum Sieg ----
    if (time >= S_WIN + 1100) {
        const fade = 1 - ramp(time, S_FINAL + 600, 900) * 0.6;
        for (let i = 0; i < 80; i++) {
            const age = (time - (S_WIN + 1100)) / 1000;
            const y = ((age * (260 + rand(i, 1) * 320) + rand(i, 2) * 2200) % 2200) - 140;
            const x = rand(i, 3) * SCENE_WIDTH + Math.sin(age * 2 + i) * 40;
            ctx.save();
            ctx.globalAlpha = fade;
            ctx.translate(x, y);
            ctx.rotate(age * (2 + rand(i, 4) * 4) + i);
            ctx.fillStyle = `hsl(${Math.round(rand(i, 5) * 360)} 90% 62%)`;
            ctx.fillRect(-9, -15, 18, 30);
            ctx.restore();
        }
    }

    // obere Abdunklung, damit der Text lesbar bleibt
    const topShade = ctx.createLinearGradient(0, 0, 0, 820);
    topShade.addColorStop(0, 'rgba(0,0,0,0.55)'); topShade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topShade;
    ctx.fillRect(0, 0, SCENE_WIDTH, 820);

    // ---- Text ----
    const accent = '#ffe08a';
    if (seg.key === 'table') {
        // erst der Titel, dann die erste Statistik
        const titleAlpha = easeOut(ramp(local, 250, 600)) * (1 - ramp(local, 2100, 450));
        if (titleAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = titleAlpha;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            fitFont(ctx, model.title.toUpperCase(), HEADING, 170, 80, SCENE_WIDTH - 160);
            ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
            ctx.fillText(model.title.toUpperCase(), CENTER_X, 400 + (1 - easeOut(ramp(local, 250, 600))) * 40);
            ctx.fillStyle = accent;
            fitFont(ctx, model.playerName, HEADING, 110, 60, SCENE_WIDTH - 200);
            ctx.fillText(model.playerName, CENTER_X, 530);
            ctx.restore();
        }
        drawStat(ctx, seg, local, 2500, accent);
    } else if (seg.key === 'setup') {
        // Statistik zum Gegner, sobald er da ist
        drawStat(ctx, seg, local, 3000, accent);
    } else if (seg.key === 'throw') {
        drawStat(ctx, seg, local, 1300 + THROW_MS, accent);
    } else if (seg.key === 'rally') {
        drawStat(ctx, seg, local, 500, accent);
    } else if (seg.key === 'win') {
        drawStat(ctx, seg, local, 1300, accent);
    } else {
        // Abschluss: Szene abdunkeln, Zusammenfassung mittig
        const dim = easeOut(ramp(local, 0, 700));
        ctx.fillStyle = `rgba(0,0,0,${0.82 * dim})`;
        ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
        const appear = (delay: number) => easeOut(ramp(local, 500 + delay, 520));
        const width = SCENE_WIDTH - 180;
        ctx.save();
        ctx.textBaseline = 'alphabetic';
        ctx.globalAlpha = appear(0);
        ctx.fillStyle = accent;
        ctx.font = `700 40px ${BODY}`;
        ctx.fillText(seg.eyebrow.toUpperCase(), 90, 560);
        ctx.globalAlpha = appear(150);
        ctx.fillStyle = '#ffffff';
        const size = fitFont(ctx, seg.value, HEADING, 210, 80, width);
        ctx.fillText(seg.value, 90, 600 + size * 0.74);
        let y = 600 + size * 0.74 + 90;
        ctx.globalAlpha = appear(320);
        ctx.font = `700 54px ${BODY}`;
        for (const line of wrapText(ctx, seg.title, width).slice(0, 3)) { ctx.fillText(line, 90, y); y += 70; }
        y += 34;
        ctx.font = `500 44px ${BODY}`;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        seg.lines.slice(0, 5).forEach((line, i) => {
            ctx.globalAlpha = appear(480 + i * 150);
            for (const part of wrapText(ctx, line, width).slice(0, 2)) { ctx.fillText(part, 90, y); y += 62; }
            y += 10;
        });
        ctx.restore();
    }

    // Fußzeile mit Marke, auch im exportierten Video
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 34px ${HEADING}`;
    ctx.fillText('BIER PONG WRAPPED', 60, 118);
    ctx.restore();
}

// Schriften laden, bevor gezeichnet wird, sonst nimmt der Browser eine Ersatzschrift
export async function loadSceneFonts() {
    await Promise.all([
        document.fonts.load('700 200px "Barlow Condensed"'),
        document.fonts.load('700 40px "Manrope"'),
        document.fonts.load('500 40px "Manrope"'),
    ]).catch(() => undefined);
}
