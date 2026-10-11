// Bier Pong Wrapped als durchgehende Szene am Tisch.
// drawWrappedFrame malt für einen Zeitpunkt das komplette Bild (1080×1920). Weil das Bild nur von der
// Zeit abhängt, lassen sich Wiedergabe, Springen und Videoaufnahme mit demselben Code machen.

export const SCENE_WIDTH = 1080;
export const SCENE_HEIGHT = 1920;

export type SceneKey = 'table' | 'setup' | 'throw' | 'rally' | 'win' | 'final' | 'outro';

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
    // Stempel beim Sieg, z. B. "SIEG!"
    winLabel: string;
    // Abspann: App-Name und Absender
    outro: { title: string; line: string };
    segments: SceneSegment[];
}

export const SEGMENT_MS: Record<SceneKey, number> = { table: 6000, setup: 6800, throw: 6200, rally: 6500, win: 7000, final: 5200, outro: 3300 };

// Bilder, die der Zeichner zusätzlich braucht (im Test leer)
export interface SceneAssets { logo?: CanvasImageSource | null }

export function segmentStarts(model: SceneModel): number[] {
    const starts: number[] = [];
    let t = 0;
    for (const s of model.segments) { starts.push(t); t += SEGMENT_MS[s.key]; }
    return starts;
}
export const totalDuration = (model: SceneModel) => model.segments.reduce((sum, s) => sum + SEGMENT_MS[s.key], 0);

// ---- Hilfen ----
export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// 0..1 zwischen start und start+dur
export const ramp = (t: number, start: number, dur: number) => clamp((t - start) / dur);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t: number) => { if (t <= 0) return 0; if (t >= 1) return 1; const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
// feste Pseudo-Zufallszahl 0..1 je Index
export const rand = (i: number, salt = 0) => { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); };

function hexToRgb(hex: string): [number, number, number] {
    const h = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : '006b50';
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export const shade = (hex: string, factor: number) => `rgb(${hexToRgb(hex).map(v => Math.round(Math.min(255, v * factor))).join(',')})`;

// ---- Tisch-Perspektive ----
const NEAR_Y = 1650, FAR_Y = 960, NEAR_HALF = 440, FAR_HALF = 232;
export const CENTER_X = 540;
// u: -1..1 quer, v: 0 (bei mir) .. 1 (beim Gegner)
export function tablePoint(u: number, v: number) {
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
export const MY_CUPS = formation('me');
export const OPP_CUPS = formation('opponent');
// Reihenfolge der Treffer: Spitze, zweite Reihe, dann Mitte der dritten
const HIT_ORDER = [9, 7, 8, 5];

export function drawCup(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, opts: { alpha?: number; rotate?: number; pop?: number } = {}) {
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

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
}

export function fitFont(ctx: CanvasRenderingContext2D, text: string, family: string, max: number, min: number, width: number) {
    let size = max;
    ctx.font = `700 ${size}px ${family}`;
    while (ctx.measureText(text).width > width && size > min) { size -= 6; ctx.font = `700 ${size}px ${family}`; }
    return size;
}

export const HEADING = '"Barlow Condensed", sans-serif';
export const BODY = '"Manrope", sans-serif';

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

// Aussehen einer Figur; ohne Angabe gelten die Farben aus dem Wrapped
export interface FigureLook { shirt: string; hair: string; style: 0 | 1 | 2; skin?: string }

export const LIGHT_SKIN = '#fbe3c0';
export const DARK_SKIN = '#7a4b2a';
// Hautton nach Name. Moonzy ist dunkelhäutig und wird in jeder Szene so gezeichnet.
export function skinFor(name: string | null | undefined): string {
    return name?.trim().toLowerCase() === 'moonzy' ? DARK_SKIN : LIGHT_SKIN;
}

// Frisur von vorn, um einen Kopf mit Radius r im Ursprung: 0 kurz, 1 lang, 2 Dutt
export function drawHairFront(ctx: CanvasRenderingContext2D, r: number, look: FigureLook, behind: boolean) {
    ctx.fillStyle = look.hair;
    if (behind) {
        // lange Haare fallen hinter dem Kopf auf die Schultern, der Dutt sitzt oben
        if (look.style === 1) { roundRect(ctx, -r * 1.12, -r * 0.5, r * 2.24, r * 1.95, r * 0.5); ctx.fill(); }
        if (look.style === 2) { ctx.beginPath(); ctx.arc(0, -r * 1.12, r * 0.42, 0, Math.PI * 2); ctx.fill(); }
        return;
    }
    ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 1.02, Math.PI * 1.08, Math.PI * 1.92); ctx.closePath(); ctx.fill();
}

// skin: Hautton der Figur
export function drawOpponent(ctx: CanvasRenderingContext2D, enter: number, mood: number, name: string | null, time: number, flinch = 0, skin = '#fbe3c0', anger = 0, look?: FigureLook) {
    if (enter <= 0) return;
    const sad = clamp(-mood);
    const bob = Math.sin(time / 520) * 4 * (1 - sad);
    // flinch 0..1: zuckt bei einem Treffer kurz hoch
    const y = 836 + (1 - easeOutBack(enter)) * 150 + sad * 26 + bob - Math.sin(flinch * Math.PI) * 34;
    ctx.save();
    ctx.globalAlpha = clamp(enter * 1.6);
    // Wut: er bebt vor Ärger
    ctx.translate(CENTER_X + Math.sin(time / 38) * 7 * anger, y + Math.sin(time / 53) * 4 * anger);
    ctx.rotate(sad * 0.07);
    // Körper (unterer Teil verschwindet hinter dem Tisch)
    const shirt = look?.shirt ?? '#f2b24a';
    ctx.fillStyle = shirt;
    roundRect(ctx, -92, 46, 184, 220, 60); ctx.fill();
    // hängende Arme, wenn traurig
    ctx.strokeStyle = shirt; ctx.lineWidth = 34; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-84, 96); ctx.lineTo(-112 - sad * 8, 96 + 70 + sad * 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(84, 96); ctx.lineTo(112 + sad * 8, 96 + 70 + sad * 30); ctx.stroke();
    // Kopf
    if (look) drawHairFront(ctx, 62, look, true);
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fill();
    if (look) drawHairFront(ctx, 62, look, false);
    // vor Wut läuft das Gesicht rot an
    if (anger > 0) { ctx.fillStyle = `rgba(214,40,30,${0.5 * anger})`; ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fill(); }
    // Augen
    ctx.fillStyle = '#2a1f14';
    const eyeY = -8 + sad * 6;
    // beim Schreck werden die Augen groß
    const eye = (7 + Math.sin(flinch * Math.PI) * 5) * (1 - anger * 0.2);
    // auf dunkler Haut bekommen die Augen ein Weiß, sonst gehen sie unter
    if (skin !== '#fbe3c0') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(-22, eyeY, eye + 6, eye + 3, 0, 0, Math.PI * 2); ctx.ellipse(22, eyeY, eye + 6, eye + 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a1f14';
    }
    ctx.beginPath(); ctx.arc(-22, eyeY, eye, 0, Math.PI * 2); ctx.arc(22, eyeY, eye, 0, Math.PI * 2); ctx.fill();
    // Augenbrauen kippen bei schlechter Laune
    ctx.strokeStyle = '#2a1f14'; ctx.lineWidth = 6;
    // bei Wut stehen die Brauen steil nach innen unten
    const outer = eyeY - 20 - anger * 10, inner = eyeY - 20 + anger * 16;
    ctx.beginPath(); ctx.moveTo(-36, outer + sad * 8); ctx.lineTo(-12 + anger * 4, inner - sad * 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(36, outer + sad * 8); ctx.lineTo(12 - anger * 4, inner - sad * 8); ctx.stroke();
    // Mund: Lächeln bis Schmollmund, bei Wut ein fest zusammengepresster Strich mit Knick
    ctx.beginPath();
    ctx.moveTo(-22 + anger * 6, 24 + anger * 2); ctx.quadraticCurveTo(0, 24 + anger * 2 + lerp(lerp(18, -20, sad), -16, anger), 22 - anger * 6, 24 + anger * 2); ctx.stroke();
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
export function drawMe(ctx: CanvasRenderingContext2D, enter: number, throwPhase: number, cheer: number, time: number, primary: string, look?: FigureLook) {
    if (enter <= 0) return;
    const jump = cheer > 0 ? Math.abs(Math.sin(time / 190)) * 46 * cheer : 0;
    const y = 1800 + (1 - easeOut(enter)) * 420 - jump;
    ctx.save();
    // leichtes Wippen im Stand
    ctx.translate(CENTER_X + Math.sin(time / 700) * 6 * (1 - cheer), y);
    const shirt = look?.shirt ?? shade(primary, 1.5);
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
    ctx.fillStyle = look?.skin ?? LIGHT_SKIN;
    ctx.beginPath(); ctx.arc(0, 0, 104, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = look?.hair ?? '#3b2a1a';
    if (look?.style === 1) {
        // lange Haare bedecken von hinten den ganzen Kopf bis auf die Schultern
        ctx.beginPath(); ctx.arc(0, 0, 106, 0, Math.PI * 2); ctx.fill();
        roundRect(ctx, -106, 0, 212, 150, 50); ctx.fill();
    } else {
        ctx.beginPath(); ctx.arc(0, -14, 104, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
        if (look?.style === 2) { ctx.beginPath(); ctx.arc(0, -112, 44, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
}

export interface Throw { start: number; target: number }
export const THROW_MS = 820;
// Takt der Musik; die Szene pulsiert im selben Tempo
export const BEAT_MS = 60000 / 112;

// Alle Zeitpunkte der Handlung in ms. Bild und Ton lesen dieselbe Zeitachse.
export interface SceneTimeline {
    starts: number[];
    total: number;
    setup: number; throwAt: number; rally: number; win: number; final: number; outro: number;
    meEnter: number;
    myCupPops: number[];
    oppEnter: number;
    oppCupPops: number[];
    throws: Throw[];
    // der Gegner wirft einmal und trifft nicht
    oppThrow: number;
    topple: number;
    stamp: number;
    fireworks: number[];
}

export function sceneTimeline(model: SceneModel): SceneTimeline {
    const starts = segmentStarts(model);
    const total = totalDuration(model);
    const at = (key: SceneKey) => { const i = model.segments.findIndex(s => s.key === key); return i >= 0 ? starts[i] : Infinity; };
    const setup = at('setup'), throwAt = at('throw'), rally = at('rally'), win = at('win'), final = at('final'), outro = at('outro');
    const fireworks: number[] = [];
    for (let t = win + 1500; t < final + 400; t += 850) fireworks.push(t);
    return {
        starts, total, setup, throwAt, rally, win, final, outro,
        meEnter: setup + 150,
        myCupPops: MY_CUPS.map((_, i) => setup + 900 + i * 110),
        oppEnter: setup + 2500,
        oppCupPops: OPP_CUPS.map((_, i) => setup + 3300 + i * 80),
        throws: [
            { start: throwAt + 1300, target: HIT_ORDER[0] },
            { start: rally + 700, target: HIT_ORDER[1] },
            { start: rally + 3000, target: HIT_ORDER[2] },
            { start: rally + 4300, target: HIT_ORDER[3] },
        ],
        oppThrow: rally + 1700,
        topple: win + 500,
        stamp: win + 1100,
        fireworks,
    };
}

// Kamera: langsame Fahrt, Zoom auf den Wurf, Wackeln beim Treffer
function camera(time: number, tl: SceneTimeline) {
    let scale = 1 + 0.035 * easeInOut(ramp(time, tl.setup, 5000));
    let ox = 0, oy = 0;
    for (const th of tl.throws) {
        // zum Ziel hin zoomen und danach zurück
        const k = ramp(time, th.start - 200, THROW_MS + 200);
        const back = ramp(time, th.start + THROW_MS, 600);
        const zoom = Math.sin(clamp(k) * Math.PI / 2) * (1 - easeOut(back));
        scale += 0.09 * zoom;
        oy += 70 * zoom;
        const hit = ramp(time, th.start + THROW_MS, 380);
        if (hit > 0 && hit < 1) { ox += Math.sin(hit * 46) * 16 * (1 - hit); oy += Math.cos(hit * 38) * 10 * (1 - hit); }
    }
    const fall = ramp(time, tl.topple, 1100);
    if (fall > 0 && fall < 1) { ox += Math.sin(fall * 60) * 22 * (1 - fall); oy += Math.cos(fall * 52) * 14 * (1 - fall); }
    // nach dem Sieg ein Stück zurückfahren
    scale -= 0.05 * easeInOut(ramp(time, tl.win + 900, 1400)) * (1 - ramp(time, tl.final, 800));
    return { scale, ox, oy };
}

export function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha = 1) {
    if (r <= 0 || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    const ball = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    ball.addColorStop(0, '#ffffff'); ball.addColorStop(1, '#ffd9a0');
    ctx.fillStyle = ball;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// Hintergrund: Verlauf in der Saisonfarbe, Lichtkegel im Takt, aufsteigende Schaumblasen
export function drawBackdrop(ctx: CanvasRenderingContext2D, primary: string, time: number, beat: number) {
    const bg = ctx.createLinearGradient(0, 0, 0, SCENE_HEIGHT);
    bg.addColorStop(0, shade(primary, 0.42)); bg.addColorStop(0.5, shade(primary, 0.24)); bg.addColorStop(1, '#070b09');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    // Lichtkegel über dem Tisch, pulsiert im Takt
    const glow = ctx.createRadialGradient(CENTER_X, 1220, 60, CENTER_X, 1220, 900);
    glow.addColorStop(0, `rgba(255,255,255,${0.13 + 0.07 * beat})`); glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    // aufsteigende Schaumblasen
    for (let i = 0; i < 22; i++) {
        const speed = 60 + rand(i, 7) * 90;
        const y = SCENE_HEIGHT + 60 - ((time / 1000) * speed + rand(i, 8) * 2100) % 2100;
        const r = 8 + rand(i, 9) * 20;
        ctx.fillStyle = `rgba(255,255,255,${0.05 + rand(i, 10) * 0.07})`;
        ctx.beginPath(); ctx.arc(rand(i, 11) * SCENE_WIDTH + Math.sin(time / 900 + i) * 18, y, r, 0, Math.PI * 2); ctx.fill();
    }
}

// Tischplatte mit Kante, Rand und Mittellinie
export function drawTable(ctx: CanvasRenderingContext2D, primary: string) {
    const nl = tablePoint(-1, 0), nr = tablePoint(1, 0), fl = tablePoint(-1, 1), fr = tablePoint(1, 1);
    ctx.fillStyle = shade(primary, 0.5);
    ctx.beginPath(); ctx.moveTo(nl.x, nl.y); ctx.lineTo(nr.x, nr.y); ctx.lineTo(nr.x - 8, nr.y + 46); ctx.lineTo(nl.x + 8, nl.y + 46); ctx.closePath(); ctx.fill();
    const surface = ctx.createLinearGradient(0, fl.y, 0, nl.y);
    surface.addColorStop(0, shade(primary, 0.85)); surface.addColorStop(1, shade(primary, 1.25));
    ctx.fillStyle = surface;
    ctx.beginPath(); ctx.moveTo(nl.x, nl.y); ctx.lineTo(nr.x, nr.y); ctx.lineTo(fr.x, fr.y); ctx.lineTo(fl.x, fl.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
    ctx.stroke();
    const ml = tablePoint(-1, 0.5), mr = tablePoint(1, 0.5);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.moveTo(ml.x, ml.y); ctx.lineTo(mr.x, mr.y); ctx.stroke();
}

// Abspann: Logo, App-Name und Absender; `local` = Zeit seit Beginn des Abspanns
export function drawOutro(ctx: CanvasRenderingContext2D, primary: string, local: number, beat: number, outro: { title: string; line: string }, assets: SceneAssets = {}) {
    // Abspann: Logo, App-Name und Absender
    const cover = easeOut(ramp(local, 0, 420));
    const end = ctx.createLinearGradient(0, 0, 0, SCENE_HEIGHT);
    end.addColorStop(0, shade(primary, 0.5)); end.addColorStop(1, '#070b09');
    ctx.save();
    ctx.globalAlpha = cover;
    ctx.fillStyle = end;
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    ctx.restore();

    const pop = easeOutBack(ramp(local, 250, 520));
    const logoSize = 340;
    if (pop > 0.03) {
        ctx.save();
        ctx.translate(CENTER_X, 760);
        ctx.scale(pop, pop);
        // heller Schein hinter dem Logo, pulsiert im Takt
        const halo = ctx.createRadialGradient(0, 0, 40, 0, 0, 420);
        halo.addColorStop(0, `rgba(255,255,255,${0.22 + 0.1 * beat})`); halo.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(0, 0, 420, 0, Math.PI * 2); ctx.fill();
        if (assets.logo) {
            ctx.save();
            roundRect(ctx, -logoSize / 2, -logoSize / 2, logoSize, logoSize, 76);
            ctx.clip();
            ctx.drawImage(assets.logo, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
            ctx.restore();
        } else {
            // ohne Bild ein einzelner Becher als Zeichen
            drawCup(ctx, 0, 110, 2.4);
        }
        ctx.restore();
    }
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const titleIn = easeOut(ramp(local, 650, 450));
    ctx.globalAlpha = titleIn;
    ctx.fillStyle = '#ffffff';
    fitFont(ctx, outro.title.toUpperCase(), HEADING, 170, 80, SCENE_WIDTH - 160);
    ctx.fillText(outro.title.toUpperCase(), CENTER_X, 1150 + (1 - titleIn) * 30);
    const lineIn = easeOut(ramp(local, 950, 450));
    ctx.globalAlpha = lineIn;
    ctx.fillStyle = '#ffe08a';
    ctx.font = `700 58px ${BODY}`;
    ctx.fillText(outro.line, CENTER_X, 1250 + (1 - lineIn) * 30);
    ctx.restore();
}

export function drawWrappedFrame(ctx: CanvasRenderingContext2D, model: SceneModel, timeMs: number, assets: SceneAssets = {}) {
    const tl = sceneTimeline(model);
    const time = clamp(timeMs, 0, tl.total);
    let index = tl.starts.length - 1;
    for (let i = 0; i < tl.starts.length; i++) if (time >= tl.starts[i]) index = i;
    const seg = model.segments[index];
    const local = time - tl.starts[index];
    const hits = tl.throws.filter(t => time >= t.start + THROW_MS).length;
    // 0..1 im Takt der Musik
    const beat = 0.5 + 0.5 * Math.cos((time / BEAT_MS) * Math.PI * 2);

    drawBackdrop(ctx, model.primary, time, beat);

    // ---- Szene mit Kamera ----
    const cam = camera(time, tl);
    ctx.save();
    ctx.translate(CENTER_X, 1150);
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-CENTER_X + cam.ox, -1150 + cam.oy);

    const tableIn = easeOut(ramp(time, 150, 1100));
    const oppEnter = ramp(time, tl.oppEnter, 700);
    const mood = time >= tl.win + 700 ? -easeInOut(ramp(time, tl.win + 700, 900)) : -Math.min(0.45, hits * 0.12);
    const lastHit = [...tl.throws].reverse().find(t => time >= t.start + THROW_MS);
    const flinch = lastHit ? ramp(time, lastHit.start + THROW_MS, 420) : 0;
    drawOpponent(ctx, oppEnter, mood, model.opponentName, time, flinch < 1 ? flinch : 0, skinFor(model.opponentName));

    // ---- Tisch ----
    ctx.save();
    ctx.globalAlpha = tableIn;
    ctx.translate(0, (1 - tableIn) * 120);
    drawTable(ctx, model.primary);
    ctx.restore();

    // ---- Becher des Gegners (hinten zuerst) ----
    OPP_CUPS.forEach((spot, i) => {
        const p = tablePoint(spot.u, spot.v);
        const pop = easeOutBack(ramp(time, tl.oppCupPops[i], 380));
        const hitIndex = HIT_ORDER.indexOf(i);
        const hit = hitIndex >= 0 ? tl.throws[hitIndex] : null;
        if (hit && time >= hit.start + THROW_MS) {
            // getroffener Becher fliegt weg
            const k = ramp(time, hit.start + THROW_MS, 620);
            drawCup(ctx, p.x + (spot.u >= 0 ? 60 : -60) * k, p.y - 240 * p.scale * easeOut(k), p.scale, { alpha: 1 - k, rotate: (spot.u >= 0 ? 1 : -1) * k * 1.4 });
            return;
        }
        // am Ende kippen alle übrigen um
        const fall = easeInOut(ramp(time, tl.topple + rand(i) * 520, 620));
        const dir = spot.u === 0 ? (i % 2 ? 1 : -1) : Math.sign(spot.u);
        drawCup(ctx, p.x + dir * fall * 70 * p.scale, p.y + fall * 10, p.scale, { pop, rotate: dir * fall * 1.5, alpha: 1 - ramp(time, tl.topple + 900 + rand(i) * 520, 700) * 0.75 });
    });

    // ---- Fehlwurf des Gegners: Ball springt vom Tisch ins Aus ----
    {
        const k = ramp(time, tl.oppThrow, 1500);
        if (k > 0 && k < 1) {
            const from = { x: CENTER_X + 30, y: 880 };
            const land = tablePoint(0.72, 0.36);
            const first = clamp(k / 0.55), second = clamp((k - 0.55) / 0.45);
            let x: number, y: number, r: number;
            if (k < 0.55) {
                x = lerp(from.x, land.x, first);
                y = lerp(from.y, land.y, first) - Math.sin(first * Math.PI) * 260;
                r = lerp(12, 24, first);
            } else {
                // Abpraller nach rechts aus dem Bild
                x = lerp(land.x, SCENE_WIDTH + 120, second);
                y = land.y - Math.sin(second * Math.PI) * 190 + second * 260;
                r = lerp(24, 30, second);
            }
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.beginPath(); ctx.ellipse(x, k < 0.55 ? lerp(from.y + 60, land.y, first) : land.y + second * 260, r, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
            drawBall(ctx, x, y, r);
        }
    }

    // ---- mein Ball mit Schweif ----
    tl.throws.forEach((th, n) => {
        const k = ramp(time, th.start, THROW_MS);
        if (k <= 0 || k >= 1) return;
        const target = OPP_CUPS[th.target];
        const end = tablePoint(target.u, target.v);
        const sx = CENTER_X + 150, sy = 1650;
        const pos = (q: number) => ({
            x: lerp(sx, end.x, q),
            y: lerp(sy, end.y - 118 * end.scale, q) - Math.sin(q * Math.PI) * 430,
            r: lerp(30, 15, q),
        });
        // ab dem zweiten Treffer in Folge brennt der Ball
        const fire = n >= 2;
        for (let i = 9; i >= 1; i--) {
            const q = k - i * 0.028;
            if (q <= 0) continue;
            const t = pos(q);
            const fade = 1 - i / 10;
            ctx.fillStyle = fire ? `rgba(255,${Math.round(90 + 130 * fade)},40,${0.5 * fade})` : `rgba(255,255,255,${0.28 * fade})`;
            ctx.beginPath(); ctx.arc(t.x, t.y, t.r * (fire ? 0.7 + fade * 0.9 : fade), 0, Math.PI * 2); ctx.fill();
        }
        const b = pos(k);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(b.x, lerp(sy, end.y, k), b.r * 1.1, b.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        drawBall(ctx, b.x, b.y, b.r);
    });
    // Spritzer, Ring und "+1" beim Treffer
    tl.throws.forEach((th, n) => {
        const k = ramp(time, th.start + THROW_MS, 700);
        if (k <= 0 || k >= 1) return;
        const target = OPP_CUPS[th.target];
        const p = tablePoint(target.u, target.v);
        const top = p.y - 118 * p.scale;
        ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.8})`;
        ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(p.x, top, 20 + easeOut(k) * 110, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgba(232,169,35,${1 - k})`;
        for (let d = 0; d < 12; d++) {
            const angle = -Math.PI * (0.1 + 0.8 * (d / 11));
            const dist = easeOut(k) * (80 + rand(d, n) * 80);
            ctx.beginPath(); ctx.arc(p.x + Math.cos(angle) * dist, top + Math.sin(angle) * dist + k * k * 70, 8 * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${Math.round(70 + easeOutBack(clamp(k * 3)) * 26)}px ${HEADING}`;
        ctx.textAlign = 'center';
        ctx.fillText('+1', p.x, top - 50 - easeOut(k) * 90);
        ctx.restore();
    });

    // ---- meine Becher (hinten zuerst = Spitze zuerst) ----
    [...MY_CUPS.keys()].sort((a, b) => MY_CUPS[b].v - MY_CUPS[a].v).forEach(i => {
        const spot = MY_CUPS[i];
        const p = tablePoint(spot.u, spot.v);
        // Aufbau von der Kante zur Spitze
        drawCup(ctx, p.x, p.y, p.scale, { pop: easeOutBack(ramp(time, tl.myCupPops[i], 420)) });
    });

    // ---- ich ----
    const meEnter = ramp(time, tl.meEnter, 800);
    const active = tl.throws.find(t => time >= t.start - 420 && time < t.start + 380);
    const throwPhase = active ? ramp(time, active.start - 420, 800) : 0;
    const cheer = easeOut(ramp(time, tl.stamp, 500)) * (1 - ramp(time, tl.final, 600));
    // eigene Figur: Farben wie bisher, nur der Hautton richtet sich nach dem Spieler
    const mySkin = skinFor(model.playerName);
    drawMe(ctx, meEnter, throwPhase, cheer, time, model.primary, mySkin === LIGHT_SKIN ? undefined : { shirt: shade(model.primary, 1.5), hair: '#1f1a17', style: 0, skin: mySkin });

    ctx.restore(); // Kamera

    // ---- Feuerwerk und Konfetti zum Sieg ----
    for (const start of tl.fireworks) {
        const k = ramp(time, start, 1100);
        if (k <= 0 || k >= 1) continue;
        const n = Math.round(start);
        const cx = 160 + rand(n, 1) * 760, cy = 300 + rand(n, 2) * 520;
        const hue = Math.round(rand(n, 3) * 360);
        for (let i = 0; i < 26; i++) {
            const angle = (i / 26) * Math.PI * 2;
            const dist = easeOut(k) * (150 + rand(i, n) * 110);
            ctx.fillStyle = `hsl(${hue + i * 4} 95% 66% / ${1 - k})`;
            ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist + k * k * 90, 9 * (1 - k * 0.6), 0, Math.PI * 2); ctx.fill();
        }
    }
    if (time >= tl.stamp) {
        const fade = 1 - ramp(time, tl.final + 600, 900) * 0.6;
        for (let i = 0; i < 80; i++) {
            const age = (time - tl.stamp) / 1000;
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

    // kurzer Lichtblitz beim Wechsel des Abschnitts
    if (index > 0 && local < 220) {
        ctx.fillStyle = `rgba(255,255,255,${0.16 * (1 - local / 220)})`;
        ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    }

    // ---- Sieg-Stempel ----
    {
        const k = ramp(time, tl.stamp, 380);
        const out = ramp(time, tl.stamp + 1150, 320);
        if (k > 0 && out < 1) {
            ctx.save();
            ctx.globalAlpha = clamp(k * 2) * (1 - out);
            ctx.translate(CENTER_X, 470);
            ctx.rotate(-0.09);
            const scale = lerp(3.2, 1, easeOut(k)) * (1 + 0.04 * Math.sin(time / 60) * (1 - k));
            ctx.scale(scale, scale);
            ctx.textAlign = 'center';
            const size = fitFont(ctx, model.winLabel, HEADING, 300, 120, SCENE_WIDTH - 200);
            ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineJoin = 'round';
            ctx.strokeText(model.winLabel, 0, size * 0.35);
            ctx.fillStyle = '#ffe08a';
            ctx.fillText(model.winLabel, 0, size * 0.35);
            ctx.restore();
        }
    }

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
        // erst der Stempel, dann die Zahl
        drawStat(ctx, seg, local, 2500, accent);
    } else if (seg.key === 'final') {
        // Abschluss: Szene abdunkeln, Zusammenfassung zügig einblenden
        const dim = easeOut(ramp(local, 0, 450));
        ctx.fillStyle = `rgba(0,0,0,${0.82 * dim})`;
        ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
        const appear = (delay: number) => easeOut(ramp(local, 200 + delay, 380));
        const width = SCENE_WIDTH - 180;
        ctx.save();
        ctx.textBaseline = 'alphabetic';
        ctx.globalAlpha = appear(0);
        ctx.fillStyle = accent;
        ctx.font = `700 40px ${BODY}`;
        ctx.fillText(seg.eyebrow.toUpperCase(), 90, 560);
        ctx.globalAlpha = appear(90);
        ctx.fillStyle = '#ffffff';
        const size = fitFont(ctx, seg.value, HEADING, 210, 80, width);
        ctx.fillText(seg.value, 90, 600 + size * 0.74);
        let y = 600 + size * 0.74 + 90;
        ctx.globalAlpha = appear(180);
        ctx.font = `700 54px ${BODY}`;
        for (const line of wrapText(ctx, seg.title, width).slice(0, 3)) { ctx.fillText(line, 90, y); y += 70; }
        y += 34;
        ctx.font = `500 44px ${BODY}`;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        seg.lines.slice(0, 5).forEach((line, i) => {
            ctx.globalAlpha = appear(280 + i * 90);
            for (const part of wrapText(ctx, line, width).slice(0, 2)) { ctx.fillText(part, 90, y); y += 62; }
            y += 10;
        });
        ctx.restore();
    } else {
        drawOutro(ctx, model.primary, local, beat, model.outro, assets);
    }

    // Marke oben links, auch im exportierten Video
    ctx.save();
    ctx.globalAlpha = 0.9 * (seg.key === 'outro' ? 1 - ramp(local, 0, 300) : 1);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 34px ${HEADING}`;
    ctx.fillText('BIER PONG WRAPPED', 60, 118);
    ctx.restore();
}

// App-Logo für den Abspann; ohne Bild läuft die Szene trotzdem
export async function loadSceneLogo(src = '/icon.png'): Promise<HTMLImageElement | null> {
    try {
        const image = new Image();
        image.src = src;
        await image.decode();
        return image;
    } catch {
        return null;
    }
}

// Schriften laden, bevor gezeichnet wird, sonst nimmt der Browser eine Ersatzschrift
export async function loadSceneFonts() {
    await Promise.all([
        document.fonts.load('700 200px "Barlow Condensed"'),
        document.fonts.load('700 40px "Manrope"'),
        document.fonts.load('500 40px "Manrope"'),
    ]).catch(() => undefined);
}
