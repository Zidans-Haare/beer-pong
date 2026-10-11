// Turnierfilm: das Finale am Tisch und die Siegerehrung auf dem Podium als durchgehende Szene.
// Gleicher Aufbau wie beim Wrapped: drawTournamentFrame malt für einen Zeitpunkt das ganze Bild,
// Bild und Ton lesen dieselbe Zeitachse (filmTimeline).

import {
    SCENE_WIDTH, SCENE_HEIGHT, CENTER_X, HEADING, BODY, BEAT_MS, MY_CUPS, OPP_CUPS, LIGHT_SKIN,
    clamp, lerp, ramp, easeOut, easeInOut, easeOutBack, rand, shade,
    tablePoint, drawCup, drawBall, drawMe, drawOpponent, drawHairFront, drawAccessoryFront, drawTorsoAccessories, fillShirt, needsEyeWhite, drawBackdrop, drawTable, drawOutro,
    roundRect, fitFont, wrapText,
    type FigureLook, type SceneAssets,
} from '@/lib/wrapped-scene';

export type FilmKey = 'intro' | 'final' | 'win' | 'podium' | 'facts' | 'outro';

// Eine Seite am Tisch oder eine Stufe auf dem Podium: ein Spieler oder ein Team
export interface FilmSide { label: string; names: string[]; looks: FigureLook[] }
export interface FilmStep extends FilmSide { place: 1 | 2 | 3 }

export interface FilmModel {
    // Turniername
    title: string;
    // Saisonfarbe als #rrggbb
    primary: string;
    // Zeile über dem Titel, z. B. "Finale"
    eyebrow: string;
    // Datum, Spieler, Spiele
    subtitle: string;
    // Marke oben links
    brand: string;
    // Endspiel; fehlt, wenn es keins gab. Ohne Ergebnis (0:0) wird nur der Sieg gezeigt.
    final: { winner: FilmSide; loser: FilmSide; winnerScore: number; loserScore: number; stamp: string; line: string } | null;
    podiumTitle: string;
    podium: FilmStep[];
    facts: { eyebrow: string; value: string; title: string; lines: string[] };
    outro: { title: string; line: string };
    // Texte je Abschnitt für Screenreader
    descriptions: Partial<Record<FilmKey, string>>;
}

export interface FilmThrow { start: number; flight: number; by: 'winner' | 'loser'; target: number; last: boolean }
export interface FilmLanding { at: number; place: 1 | 2 | 3; walk: number; hop: number }

export interface FilmTimeline {
    keys: FilmKey[];
    starts: number[];
    durations: number[];
    total: number;
    intro: number; final: number; win: number; podium: number; facts: number; outro: number;
    nearCupPops: number[];
    farCupPops: number[];
    nearEnter: number;
    farEnter: number;
    throws: FilmThrow[];
    // Zeitpunkt des entscheidenden Treffers bzw. des Sieg-Stempels
    stamp: number;
    fireworks: number[];
    stepRise: { at: number; place: 1 | 2 | 3 }[];
    landings: FilmLanding[];
    crown: number;
    confetti: number;
}

// Reihenfolge der Treffer: Spitze zuerst, die Reihe an der Kante zuletzt
const HIT_ORDER = [9, 7, 8, 5, 4, 6, 1, 2, 0, 3];
const SLOW_FLIGHT = 1700;
const WALK_MS = 1150, HOP_MS = 560;

const hasRally = (model: FilmModel) => !!model.final && model.final.winnerScore > 0;

export function filmTimeline(model: FilmModel): FilmTimeline {
    const keys: FilmKey[] = ['intro'];
    const durations: number[] = [model.final ? 4400 : 3200];
    const throws: FilmThrow[] = [];
    let finalMs = 0;

    if (model.final && hasRally(model)) {
        const w = Math.min(10, model.final.winnerScore), l = Math.min(10, model.final.loserScore);
        // Treffer des Verlierers gleichmäßig zwischen die des Siegers streuen; der letzte gehört dem Sieger
        const order: ('winner' | 'loser')[] = [];
        let given = 0;
        for (let i = 0; i < w; i++) {
            const due = w > 1 ? Math.round((i * l) / (w - 1)) : l;
            while (given < due) { order.push('loser'); given++; }
            order.push('winner');
        }
        const quick = order.length - 1;
        // die schnellen Würfe füllen zusammen gut fünf Sekunden
        const interval = quick > 0 ? clamp(5400 / quick, 250, 720) : 0;
        const flight = Math.min(520, interval * 0.82);
        let wi = 0, li = 0;
        order.forEach((by, i) => {
            const last = i === order.length - 1;
            throws.push({
                start: last ? 500 + quick * interval + 450 : 500 + i * interval,
                flight: last ? SLOW_FLIGHT : flight,
                by, target: HIT_ORDER[by === 'winner' ? wi++ : li++], last,
            });
        });
        finalMs = throws[throws.length - 1].start + SLOW_FLIGHT;
        keys.push('final'); durations.push(finalMs);
    }
    if (model.final) { keys.push('win'); durations.push(5200); }
    if (model.podium.length > 0) { keys.push('podium'); durations.push(8800); }
    keys.push('facts'); durations.push(5200);
    keys.push('outro'); durations.push(3300);

    const starts: number[] = [];
    let t = 0;
    for (const d of durations) { starts.push(t); t += d; }
    const at = (key: FilmKey) => { const i = keys.indexOf(key); return i >= 0 ? starts[i] : Infinity; };
    const final = at('final'), win = at('win'), podium = at('podium'), facts = at('facts'), outro = at('outro');
    for (const th of throws) th.start += final;

    const fireworks: number[] = [];
    if (Number.isFinite(win)) for (let f = win + 900; f < win + 4600; f += 800) fireworks.push(f);

    // Podium: Stufen fahren hoch (3, 2, 1), dann laufen die Figuren in derselben Reihenfolge ein
    const places = ([3, 2, 1] as const).filter(place => model.podium.some(s => s.place === place));
    const stepRise = places.map((place, i) => ({ at: podium + 350 + i * 260, place }));
    const landings: FilmLanding[] = places.map((place, i) => {
        const walk = podium + 1500 + i * 1450;
        return { place, walk, hop: walk + WALK_MS, at: walk + WALK_MS + HOP_MS };
    });
    const lastLanding = landings.length ? landings[landings.length - 1].at : podium;
    if (Number.isFinite(podium)) for (let f = lastLanding + 250; f < podium + 8600; f += 780) fireworks.push(f);

    return {
        keys, starts, durations, total: t,
        intro: 0, final, win, podium, facts, outro,
        nearCupPops: MY_CUPS.map((_, i) => 800 + i * 70),
        farCupPops: OPP_CUPS.map((_, i) => 1250 + i * 70),
        nearEnter: 1900, farEnter: 2500,
        throws,
        stamp: Number.isFinite(win) ? win + (hasRally(model) ? 320 : 900) : Infinity,
        fireworks, stepRise, landings,
        crown: lastLanding + 350,
        confetti: lastLanding,
    };
}

export const filmDuration = (model: FilmModel) => filmTimeline(model).total;

// ---- Tischszene ----

const NEAR_OFFSETS = [[0], [-150, 150]];
const FAR_OFFSETS = [[0], [-112, 112]];

// Kamera: ruhige Fahrt, Zoom auf den letzten Wurf, Wackeln bei Treffern
function camera(time: number, tl: FilmTimeline) {
    let scale = 1 + 0.03 * easeInOut(ramp(time, 600, 3800));
    let ox = 0, oy = 0;
    for (const th of tl.throws) {
        const hitAt = th.start + th.flight;
        const hit = ramp(time, hitAt, th.last ? 520 : 240);
        const power = th.last ? 26 : 7;
        if (hit > 0 && hit < 1) { ox += Math.sin(hit * 46) * power * (1 - hit); oy += Math.cos(hit * 38) * power * 0.6 * (1 - hit); }
        if (th.last) {
            const zoom = easeInOut(ramp(time, th.start - 300, th.flight)) * (1 - easeOut(ramp(time, hitAt + 300, 900)));
            scale += 0.17 * zoom;
            oy += 120 * zoom;
        }
    }
    scale -= 0.04 * easeInOut(ramp(time, tl.stamp + 500, 1400));
    return { scale, ox, oy };
}

export function drawNameTag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, alpha: number, accent = false, maxWidth = 420, size = 36) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.textAlign = 'center';
    fitFont(ctx, text, BODY, size, 20, maxWidth);
    const w = ctx.measureText(text).width + size * 1.3, h = size * 1.5;
    ctx.fillStyle = accent ? 'rgba(255,224,138,0.95)' : 'rgba(0,0,0,0.5)';
    roundRect(ctx, x - w / 2, y - h * 0.7, w, h, h / 2); ctx.fill();
    ctx.fillStyle = accent ? '#1c1608' : '#ffffff';
    ctx.fillText(text, x, y);
    ctx.restore();
}

function drawTableScene(ctx: CanvasRenderingContext2D, model: FilmModel, tl: FilmTimeline, time: number) {
    const final = model.final;
    const cam = camera(time, tl);
    ctx.save();
    ctx.translate(CENTER_X, 1150);
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-CENTER_X + cam.ox, -1150 + cam.oy);

    const hitsBy = (by: 'winner' | 'loser') => tl.throws.filter(th => th.by === by && time >= th.start + th.flight).length;
    const won = time >= tl.stamp;

    // ---- Verlierer hinter dem Tisch ----
    if (final) {
        const enter = ramp(time, tl.farEnter, 700);
        const mood = won ? -easeInOut(ramp(time, tl.stamp, 800)) : -Math.min(0.5, hitsBy('winner') * 0.05);
        const lastHit = [...tl.throws].reverse().find(th => th.by === 'winner' && time >= th.start + th.flight);
        const flinch = lastHit ? ramp(time, lastHit.start + lastHit.flight, 380) : 0;
        const offsets = FAR_OFFSETS[Math.min(2, final.loser.looks.length) - 1] ?? [0];
        offsets.forEach((dx, i) => {
            ctx.save();
            ctx.translate(dx, 0);
            if (offsets.length > 1) { ctx.translate(CENTER_X, 900); ctx.scale(0.84, 0.84); ctx.translate(-CENTER_X, -900); }
            drawOpponent(ctx, enter, mood, null, time + i * 240, flinch < 1 ? flinch : 0, final.loser.looks[i]?.skin, 0, final.loser.looks[i]);
            ctx.restore();
        });
        drawNameTag(ctx, final.loser.label, CENTER_X, 712 + (1 - easeOutBack(enter)) * 150, clamp(enter * 1.4));
    }

    // ---- Tisch ----
    const tableIn = easeOut(ramp(time, 150, 1000));
    ctx.save();
    ctx.globalAlpha = tableIn;
    ctx.translate(0, (1 - tableIn) * 120);
    drawTable(ctx, model.primary);
    ctx.restore();

    // ---- Becher: getroffene fliegen weg ----
    const cups = (spots: typeof MY_CUPS, pops: number[], by: 'winner' | 'loser') => {
        [...spots.keys()].sort((a, b) => spots[b].v - spots[a].v).forEach(i => {
            const spot = spots[i];
            const p = tablePoint(spot.u, spot.v);
            const hit = tl.throws.find(th => th.by === by && th.target === i);
            if (hit && time >= hit.start + hit.flight) {
                const k = ramp(time, hit.start + hit.flight, hit.last ? 900 : 480);
                drawCup(ctx, p.x + (spot.u >= 0 ? 70 : -70) * k, p.y - 260 * p.scale * easeOut(k), p.scale, { alpha: 1 - k, rotate: (spot.u >= 0 ? 1 : -1) * k * 1.6 });
                return;
            }
            drawCup(ctx, p.x, p.y, p.scale, { pop: easeOutBack(ramp(time, pops[i], 380)) });
        });
    };
    cups(OPP_CUPS, tl.farCupPops, 'winner');

    // ---- Bälle ----
    for (const th of tl.throws) {
        const k = ramp(time, th.start, th.flight);
        if (k <= 0 || k >= 1) continue;
        const spots = th.by === 'winner' ? OPP_CUPS : MY_CUPS;
        const end = tablePoint(spots[th.target].u, spots[th.target].v);
        const from = th.by === 'winner' ? { x: CENTER_X + 150, y: 1650, r: 30 } : { x: CENTER_X + 30, y: 900, r: 13 };
        const endR = th.by === 'winner' ? 15 : 27;
        const arc = th.last ? 520 : th.by === 'winner' ? 400 : 250;
        const pos = (q: number) => ({ x: lerp(from.x, end.x, q), y: lerp(from.y, end.y - 118 * end.scale, q) - Math.sin(q * Math.PI) * arc, r: lerp(from.r, endR, q) });
        // der entscheidende Ball brennt
        const trail = th.last ? 12 : 6;
        for (let i = trail; i >= 1; i--) {
            const q = k - i * (th.last ? 0.02 : 0.035);
            if (q <= 0) continue;
            const t = pos(q), fade = 1 - i / (trail + 1);
            ctx.fillStyle = th.last ? `rgba(255,${Math.round(90 + 130 * fade)},40,${0.55 * fade})` : `rgba(255,255,255,${0.26 * fade})`;
            ctx.beginPath(); ctx.arc(t.x, t.y, t.r * (th.last ? 0.7 + fade * 0.9 : fade), 0, Math.PI * 2); ctx.fill();
        }
        const b = pos(k);
        drawBall(ctx, b.x, b.y, b.r);
    }

    // ---- Spritzer am Treffer ----
    for (const th of tl.throws) {
        const k = ramp(time, th.start + th.flight, th.last ? 900 : 420);
        if (k <= 0 || k >= 1) continue;
        const spots = th.by === 'winner' ? OPP_CUPS : MY_CUPS;
        const p = tablePoint(spots[th.target].u, spots[th.target].v);
        const top = p.y - 118 * p.scale;
        const size = (th.last ? 1.7 : 1) * p.scale / 0.6;
        ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.8})`;
        ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(p.x, top, (16 + easeOut(k) * 80) * size, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgba(232,169,35,${1 - k})`;
        for (let d = 0; d < 10; d++) {
            const angle = -Math.PI * (0.1 + 0.8 * (d / 9));
            const dist = easeOut(k) * (60 + rand(d, th.target) * 70) * size;
            ctx.beginPath(); ctx.arc(p.x + Math.cos(angle) * dist, top + Math.sin(angle) * dist + k * k * 60, 7 * (1 - k * 0.5) * size, 0, Math.PI * 2); ctx.fill();
        }
    }

    cups(MY_CUPS, tl.nearCupPops, 'loser');

    // ---- Sieger vorn, von hinten gesehen ----
    if (final) {
        const enter = ramp(time, tl.nearEnter, 800);
        const active = tl.throws.find(th => th.by === 'winner' && time >= th.start - (th.last ? 700 : 220) && time < th.start + 260);
        const throwPhase = active ? ramp(time, active.start - (active.last ? 700 : 220), (active.last ? 700 : 220) + 260) : 0;
        const cheer = won ? easeOut(ramp(time, tl.stamp, 500)) : 0;
        const offsets = NEAR_OFFSETS[Math.min(2, final.winner.looks.length) - 1] ?? [0];
        offsets.forEach((dx, i) => {
            ctx.save();
            // höher als im Wrapped, damit man Kopf und Schultern sieht
            ctx.translate(dx, -150);
            if (offsets.length > 1) { ctx.translate(CENTER_X, 1900); ctx.scale(0.8, 0.8); ctx.translate(-CENTER_X, -1900); }
            drawMe(ctx, enter, i === 0 ? throwPhase : 0, cheer, time + i * 130, model.primary, final.winner.looks[i]);
            ctx.restore();
        });
    }
    ctx.restore();
}

// ---- Anzeigetafel oben ----
function drawScoreboard(ctx: CanvasRenderingContext2D, model: FilmModel, tl: FilmTimeline, time: number, alpha: number) {
    const final = model.final;
    if (!final || alpha <= 0) return;
    const rally = hasRally(model);
    const count = (by: 'winner' | 'loser') => tl.throws.filter(th => th.by === by && time >= th.start + th.flight).length;
    // nach dem Sieg steht das echte Ergebnis da, auch wenn mehr als zehn Becher fielen
    const won = time >= tl.stamp;
    const w = won ? final.winnerScore : count('winner'), l = won ? final.loserScore : count('loser');
    const lastHit = [...tl.throws].reverse().find(th => time >= th.start + th.flight);
    const bump = lastHit ? 1 - ramp(time, lastHit.start + lastHit.flight, 260) : 0;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textBaseline = 'alphabetic';
    // Namen links (Sieger, vorn) und rechts (Gegner, hinten)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe08a';
    fitFont(ctx, final.winner.label, BODY, 48, 26, 400);
    ctx.fillText(final.winner.label, 80, 240);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    fitFont(ctx, final.loser.label, BODY, 48, 26, 400);
    ctx.fillText(final.loser.label, SCENE_WIDTH - 80, 240);

    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
    ctx.translate(CENTER_X, 470);
    ctx.scale(1 + bump * 0.12, 1 + bump * 0.12);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 250px ${HEADING}`;
    ctx.fillText(rally ? `${w} : ${l}` : 'VS', 0, 0);
    ctx.restore();
}

// ---- Podium ----

const STEP = {
    1: { x: CENTER_X, w: 330, h: 560, from: -1 },
    2: { x: 215, w: 300, h: 400, from: -1 },
    3: { x: 865, w: 300, h: 290, from: 1 },
} as const;
const FLOOR_Y = 1590;
const MEDAL = { 1: ['#ffd95a', '#c8920a'], 2: ['#e6e9ee', '#8e96a3'], 3: ['#e0a06a', '#96592a'] } as const;

export interface WalkerOpts { walk: number; cheer: number; medal: number; place: 1 | 2 | 3; crown: number; time: number; wave?: number }

// Ganze Figur von vorn; (0,0) sind die Füße
export function drawWalker(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, look: FigureLook, o: WalkerOpts) {
    const stride = Math.sin(o.time / 95) * o.walk;
    const bounce = Math.abs(Math.sin(o.time / 95)) * 10 * o.walk + Math.abs(Math.sin(o.time / 170)) * 34 * o.cheer * (o.place === 1 ? 1.5 : 1);
    ctx.save();
    ctx.translate(x, y);
    // Größe der Figur aus dem Profil; Breite von Rumpf und Armen weiter unten
    ctx.scale(s * (look.heightScale ?? 1), s * (look.heightScale ?? 1));
    // Schatten bleibt am Boden
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(0, 4, 78 - bounce * 0.4, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, -bounce);
    ctx.lineCap = 'round';
    // Beine und Schuhe
    const bare = look.undies ? look.skin ?? LIGHT_SKIN : null;
    ctx.strokeStyle = bare ?? '#232733'; ctx.lineWidth = 36;
    ctx.beginPath(); ctx.moveTo(-26, -118); ctx.lineTo(-26 + stride * 30, -16 - Math.max(0, stride) * 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(26, -118); ctx.lineTo(26 - stride * 30, -16 - Math.max(0, -stride) * 16); ctx.stroke();
    ctx.fillStyle = '#f4f4f4';
    roundRect(ctx, -48 + stride * 30, -22 - Math.max(0, stride) * 16, 46, 24, 11); ctx.fill();
    roundRect(ctx, 2 - stride * 30, -22 - Math.max(0, -stride) * 16, 46, 24, 11); ctx.fill();
    // heller Schuh auf heller Seite: feiner Rand, damit man ihn sieht
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 3;
    roundRect(ctx, -48 + stride * 30, -22 - Math.max(0, stride) * 16, 46, 24, 11); ctx.stroke();
    roundRect(ctx, 2 - stride * 30, -22 - Math.max(0, -stride) * 16, 46, 24, 11); ctx.stroke();
    // Arme und Rumpf in der Breite aus dem Profil
    ctx.save();
    ctx.scale(look.widthScale ?? 1, 1);
    // Arme: schwingen beim Laufen, gehen beim Jubeln hoch
    const wave = Math.sin(o.time / 150) * 18 * o.cheer;
    ctx.strokeStyle = bare ?? look.shirt; ctx.lineWidth = 32;
    ctx.beginPath(); ctx.moveTo(-62, -246); ctx.lineTo(lerp(-86 - stride * 22, -122 + wave, o.cheer), lerp(-150, -372, o.cheer)); ctx.stroke();
    // Winken: Der rechte Arm geht hoch und schwingt hin und her, der linke hängt
    const waving = o.wave ?? 0;
    const rightX = lerp(lerp(86 - stride * 22, 122 - wave, o.cheer), 124 + Math.sin(o.time / 130) * 38, waving);
    const rightY = lerp(lerp(-150, -372, o.cheer), -334 + Math.abs(Math.sin(o.time / 130)) * 10, waving);
    ctx.beginPath(); ctx.moveTo(62, -246); ctx.lineTo(rightX, rightY); ctx.stroke();
    if (waving > 0) { ctx.fillStyle = look.skin ?? LIGHT_SKIN; ctx.beginPath(); ctx.arc(rightX, rightY, 20, 0, Math.PI * 2); ctx.fill(); }
    // Rumpf
    fillShirt(ctx, look, bare ?? look.shirt, () => roundRect(ctx, -70, -276, 140, 176, 50), { x: -70, y: -276, w: 140, h: 176 });
    if (bare) {
        // Unterhose: rot mit weißen Punkten
        ctx.fillStyle = '#d83a3a';
        roundRect(ctx, -74, -176, 148, 84, 30); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (const [dx, dy] of [[-40, -146], [0, -128], [38, -150], [-14, -108], [44, -112]]) { ctx.beginPath(); ctx.arc(dx, dy, 7, 0, Math.PI * 2); ctx.fill(); }
    }
    drawTorsoAccessories(ctx, look, 'walker');
    ctx.restore();
    // Medaille am Band
    if (o.medal > 0.03) {
        ctx.strokeStyle = '#d83a3a'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(-34, -270); ctx.lineTo(0, -196); ctx.lineTo(34, -270); ctx.stroke();
        ctx.save();
        ctx.translate(0, -182);
        ctx.scale(o.medal, o.medal);
        ctx.fillStyle = MEDAL[o.place][1];
        ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = MEDAL[o.place][0];
        ctx.beginPath(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = MEDAL[o.place][1];
        ctx.font = `700 30px ${HEADING}`;
        ctx.textAlign = 'center';
        ctx.fillText(String(o.place), 0, 11);
        ctx.restore();
    }
    // Kopf
    ctx.translate(0, -338);
    drawHairFront(ctx, 60, look, true);
    const skin = look.skin ?? LIGHT_SKIN;
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill();
    drawHairFront(ctx, 60, look, false);
    // auf dunkler Haut bekommen die Augen ein Weiß, sonst gehen sie unter
    if (needsEyeWhite(skin)) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(-21, -4, 13, 10, 0, 0, Math.PI * 2); ctx.ellipse(21, -4, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#2a1f14';
    ctx.beginPath(); ctx.arc(-21, -4, 7, 0, Math.PI * 2); ctx.arc(21, -4, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a1f14'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-22, 20); ctx.quadraticCurveTo(0, 20 + 16 + o.cheer * 14, 22, 20); ctx.stroke();
    drawAccessoryFront(ctx, 60, look);
    // Krone für den Sieger: fällt von oben auf den Kopf
    if (o.crown > 0) {
        ctx.save();
        ctx.translate(0, -66 - (1 - easeOutBack(o.crown)) * 260);
        ctx.globalAlpha *= clamp(o.crown * 3);
        ctx.fillStyle = '#ffd95a';
        ctx.beginPath();
        ctx.moveTo(-46, 0); ctx.lineTo(-52, -52); ctx.lineTo(-26, -26); ctx.lineTo(0, -66); ctx.lineTo(26, -26); ctx.lineTo(52, -52); ctx.lineTo(46, 0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d83a3a';
        ctx.beginPath(); ctx.arc(0, -16, 8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

function drawPodiumScene(ctx: CanvasRenderingContext2D, model: FilmModel, tl: FilmTimeline, time: number, beat: number) {
    const local = time - tl.podium;
    // zwei Scheinwerfer von oben
    for (const side of [-1, 1]) {
        const sway = Math.sin(time / 1400 + side) * 90;
        const beam = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
        beam.addColorStop(0, `rgba(255,255,255,${0.16 + 0.05 * beat})`); beam.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(CENTER_X + side * 420, -40); ctx.lineTo(CENTER_X + side * 360, -40);
        ctx.lineTo(CENTER_X - side * 60 + sway, FLOOR_Y); ctx.lineTo(CENTER_X + side * 330 + sway, FLOOR_Y);
        ctx.closePath(); ctx.fill();
    }
    // Boden
    const floor = ctx.createLinearGradient(0, FLOOR_Y - 40, 0, SCENE_HEIGHT);
    floor.addColorStop(0, shade(model.primary, 0.5)); floor.addColorStop(1, '#050806');
    ctx.fillStyle = floor;
    ctx.fillRect(0, FLOOR_Y - 40, SCENE_WIDTH, SCENE_HEIGHT - FLOOR_Y + 40);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(0, FLOOR_Y - 40, SCENE_WIDTH, 4);

    // Stufen fahren aus dem Boden
    const stepTop = (place: 1 | 2 | 3) => {
        const rise = tl.stepRise.find(r => r.place === place);
        return FLOOR_Y - STEP[place].h * (rise ? easeOutBack(ramp(time, rise.at, 620)) : 0);
    };
    for (const step of model.podium) {
        const box = STEP[step.place];
        const top = stepTop(step.place);
        if (top >= FLOOR_Y - 2) continue;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, SCENE_WIDTH, FLOOR_Y); ctx.clip();
        const face = ctx.createLinearGradient(0, top, 0, top + box.h);
        face.addColorStop(0, shade(model.primary, step.place === 1 ? 1.5 : 1.2)); face.addColorStop(1, shade(model.primary, 0.7));
        ctx.fillStyle = face;
        roundRect(ctx, box.x - box.w / 2, top, box.w, box.h + 40, 18); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        roundRect(ctx, box.x - box.w / 2 - 10, top - 10, box.w + 20, 26, 10); ctx.fill();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = `700 ${step.place === 1 ? 150 : 120}px ${HEADING}`;
        ctx.fillText(String(step.place), box.x, top + (step.place === 1 ? 160 : 132));
        ctx.restore();
    }

    // Figuren: einlaufen, hochspringen, jubeln
    const order = [...model.podium].sort((a, b) => b.place - a.place);
    for (const step of order) {
        const landing = tl.landings.find(l => l.place === step.place);
        if (!landing || time < landing.walk) continue;
        const box = STEP[step.place];
        const walk = ramp(time, landing.walk, WALK_MS), hop = ramp(time, landing.hop, HOP_MS);
        const landed = time >= landing.at;
        const count = Math.min(2, step.looks.length);
        const s = count > 1 ? 0.9 : 1.2;
        for (let i = 0; i < count; i++) {
            const spot = box.x + (count > 1 ? (i ? 76 : -76) : 0);
            // läuft von der Seite vor die Stufe und springt dann hinauf
            const edge = box.from < 0 ? -140 - i * 150 : SCENE_WIDTH + 140 + i * 150;
            const x = lerp(edge, spot, easeInOut(walk));
            const y = hop > 0 ? lerp(FLOOR_Y, stepTop(step.place), easeInOut(hop)) - Math.sin(hop * Math.PI) * 230 : FLOOR_Y;
            const cheer = landed ? easeOut(ramp(time, landing.at + 150, 500)) : 0;
            drawWalker(ctx, x, y, s, step.looks[i], {
                walk: landed ? 0 : 1 - hop, cheer, place: step.place,
                medal: easeOutBack(ramp(time, landing.at + 200, 420)),
                crown: step.place === 1 && i === 0 ? ramp(time, tl.crown, 520) : 0,
                time: time + i * 120 + step.place * 70,
            });
        }
        // Namen unter der Stufe, sobald die Figuren oben stehen; Teams an den Seiten zweizeilig
        const tags = step.place !== 1 && step.names.length === 2 ? step.names : [step.label];
        tags.forEach((text, i) => drawNameTag(ctx, text, box.x, FLOOR_Y + 70 + (step.place === 1 ? 150 : i * 76), easeOut(ramp(time, landing.at + i * 120, 400)), step.place === 1, step.place === 1 ? 560 : 250, step.place === 1 ? 56 : 46));
    }

    // Überschrift
    const a = easeOut(ramp(local, 250, 520));
    if (a > 0) {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffe08a';
        ctx.font = `700 40px ${BODY}`;
        ctx.fillText(model.podiumTitle.toUpperCase(), CENTER_X, 250 + (1 - a) * 24);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
        const size = fitFont(ctx, model.title.toUpperCase(), HEADING, 150, 64, SCENE_WIDTH - 140);
        ctx.fillText(model.title.toUpperCase(), CENTER_X, 290 + size * 0.8 + (1 - a) * 30);
        ctx.restore();
    }
}

function drawFireworks(ctx: CanvasRenderingContext2D, tl: FilmTimeline, time: number) {
    for (const start of tl.fireworks) {
        const k = ramp(time, start, 1100);
        if (k <= 0 || k >= 1) continue;
        const n = Math.round(start);
        const cx = 160 + rand(n, 1) * 760, cy = 560 + rand(n, 2) * 420;
        const hue = Math.round(rand(n, 3) * 360);
        for (let i = 0; i < 26; i++) {
            const angle = (i / 26) * Math.PI * 2;
            const dist = easeOut(k) * (150 + rand(i, n) * 110);
            ctx.fillStyle = `hsl(${hue + i * 4} 95% 66% / ${1 - k})`;
            ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist + k * k * 90, 9 * (1 - k * 0.6), 0, Math.PI * 2); ctx.fill();
        }
    }
}

function drawConfetti(ctx: CanvasRenderingContext2D, since: number, time: number, alpha: number) {
    if (time < since || alpha <= 0) return;
    const age = (time - since) / 1000;
    for (let i = 0; i < 80; i++) {
        const y = ((age * (260 + rand(i, 1) * 320) + rand(i, 2) * 2200) % 2200) - 140;
        ctx.save();
        ctx.globalAlpha = alpha * ramp(time, since, 400);
        ctx.translate(rand(i, 3) * SCENE_WIDTH + Math.sin(age * 2 + i) * 40, y);
        ctx.rotate(age * (2 + rand(i, 4) * 4) + i);
        ctx.fillStyle = `hsl(${Math.round(rand(i, 5) * 360)} 90% 62%)`;
        ctx.fillRect(-9, -15, 18, 30);
        ctx.restore();
    }
}

export function drawTournamentFrame(ctx: CanvasRenderingContext2D, model: FilmModel, timeMs: number, assets: SceneAssets = {}) {
    const tl = filmTimeline(model);
    const time = clamp(timeMs, 0, tl.total);
    let index = tl.starts.length - 1;
    for (let i = 0; i < tl.starts.length; i++) if (time >= tl.starts[i]) index = i;
    const key = tl.keys[index];
    const local = time - tl.starts[index];
    const beat = 0.5 + 0.5 * Math.cos((time / BEAT_MS) * Math.PI * 2);
    const accent = '#ffe08a';
    const hasPodium = Number.isFinite(tl.podium);
    // Ende der Tischszene: Übergang zum Podium, sonst zur Zusammenfassung
    const tableEnd = hasPodium ? tl.podium : tl.facts;

    drawBackdrop(ctx, model.primary, time, beat);

    if (time < tableEnd + 450) {
        ctx.save();
        ctx.globalAlpha = 1 - ramp(time, tableEnd, 450);
        drawTableScene(ctx, model, tl, time);
        ctx.restore();
    }
    if (hasPodium && time >= tl.podium) {
        ctx.save();
        ctx.globalAlpha = ramp(time, tl.podium, 450);
        drawPodiumScene(ctx, model, tl, time, beat);
        ctx.restore();
    }

    drawFireworks(ctx, tl, time);
    if (time < tableEnd) drawConfetti(ctx, tl.stamp, time, 1 - ramp(time, tableEnd - 500, 500));
    drawConfetti(ctx, tl.confetti, time, 1 - ramp(time, tl.facts + 600, 900) * 0.6);

    // obere Abdunklung, damit der Text lesbar bleibt
    const topShade = ctx.createLinearGradient(0, 0, 0, 820);
    topShade.addColorStop(0, 'rgba(0,0,0,0.55)'); topShade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topShade;
    ctx.fillRect(0, 0, SCENE_WIDTH, 820);

    // kurzer Lichtblitz beim Wechsel des Abschnitts, stärker beim entscheidenden Treffer
    if (index > 0 && local < 260) {
        ctx.fillStyle = `rgba(255,255,255,${(key === 'win' ? 0.5 : 0.16) * (1 - local / 260)})`;
        ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    }

    // ---- Text über der Tischszene ----
    if (time < tableEnd) {
        // Titel des Turniers, weicht dann der Anzeigetafel
        const titleOut = model.final ? ramp(time, 3300, 400) : ramp(time, tableEnd - 400, 400);
        const titleIn = easeOut(ramp(time, 300, 600));
        if (titleIn > 0 && titleOut < 1) {
            ctx.save();
            ctx.globalAlpha = titleIn * (1 - titleOut);
            ctx.textAlign = 'center';
            ctx.fillStyle = accent;
            ctx.font = `700 42px ${BODY}`;
            ctx.fillText(model.eyebrow.toUpperCase(), CENTER_X, 250 + (1 - titleIn) * 24);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
            const size = fitFont(ctx, model.title.toUpperCase(), HEADING, 170, 70, SCENE_WIDTH - 140);
            ctx.fillText(model.title.toUpperCase(), CENTER_X, 290 + size * 0.8 + (1 - titleIn) * 40);
            ctx.shadowColor = 'transparent';
            const sub = easeOut(ramp(time, 700, 600));
            ctx.globalAlpha = sub * (1 - titleOut);
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            fitFont(ctx, model.subtitle, BODY, 40, 26, SCENE_WIDTH - 140);
            ctx.fillText(model.subtitle, CENTER_X, 290 + size * 0.8 + 76);
            ctx.restore();
        }
        if (model.final) {
            drawScoreboard(ctx, model, tl, time, easeOut(ramp(time, 3700, 500)) * (1 - ramp(time, tableEnd - 400, 400)));

            // Sieg-Stempel quer über die Mitte
            const k = ramp(time, tl.stamp, 380);
            const out = ramp(time, tl.stamp + 1700, 350);
            if (k > 0 && out < 1) {
                ctx.save();
                ctx.globalAlpha = clamp(k * 2) * (1 - out);
                ctx.translate(CENTER_X, 1290);
                ctx.rotate(-0.08);
                const scale = lerp(3.2, 1, easeOut(k)) * (1 + 0.04 * Math.sin(time / 60) * (1 - k));
                ctx.scale(scale, scale);
                ctx.textAlign = 'center';
                const size = fitFont(ctx, model.final.stamp, HEADING, 230, 56, SCENE_WIDTH - 160);
                ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineJoin = 'round';
                ctx.strokeText(model.final.stamp, 0, size * 0.35);
                ctx.fillStyle = accent;
                ctx.fillText(model.final.stamp, 0, size * 0.35);
                ctx.restore();
            }
            // danach die Zeile zum Endspiel
            const line = easeOut(ramp(time, tl.stamp + 2000, 500)) * (1 - ramp(time, tableEnd - 400, 400));
            if (line > 0) {
                ctx.save();
                ctx.globalAlpha = line;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffffff';
                fitFont(ctx, model.final.line, BODY, 50, 30, SCENE_WIDTH - 160);
                ctx.fillText(model.final.line, CENTER_X, 592 + (1 - line) * 24);
                ctx.restore();
            }
        }
    }

    // ---- Zusammenfassung ----
    if (key === 'facts' || key === 'outro') {
        const fl = time - tl.facts;
        ctx.fillStyle = `rgba(0,0,0,${0.82 * easeOut(ramp(fl, 0, 450))})`;
        ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
        const appear = (delay: number) => easeOut(ramp(fl, 200 + delay, 380));
        const width = SCENE_WIDTH - 180;
        const facts = model.facts;
        ctx.save();
        ctx.textBaseline = 'alphabetic';
        ctx.globalAlpha = appear(0);
        ctx.fillStyle = accent;
        ctx.font = `700 40px ${BODY}`;
        ctx.fillText(facts.eyebrow.toUpperCase(), 90, 520);
        ctx.globalAlpha = appear(90);
        ctx.fillStyle = '#ffffff';
        const size = fitFont(ctx, facts.value, HEADING, 210, 80, width);
        ctx.fillText(facts.value, 90, 560 + size * 0.74);
        let y = 560 + size * 0.74 + 90;
        ctx.globalAlpha = appear(180);
        ctx.font = `700 54px ${BODY}`;
        for (const part of wrapText(ctx, facts.title, width).slice(0, 2)) { ctx.fillText(part, 90, y); y += 70; }
        y += 34;
        ctx.font = `500 44px ${BODY}`;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        facts.lines.slice(0, 5).forEach((text, i) => {
            ctx.globalAlpha = appear(280 + i * 90);
            for (const part of wrapText(ctx, text, width).slice(0, 2)) { ctx.fillText(part, 90, y); y += 62; }
            y += 10;
        });
        ctx.restore();
    }
    if (key === 'outro') drawOutro(ctx, model.primary, local, beat, model.outro, assets);

    // Marke oben links, auch im exportierten Video
    ctx.save();
    ctx.globalAlpha = 0.9 * (key === 'outro' ? 1 - ramp(local, 0, 300) : 1);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 34px ${HEADING}`;
    ctx.textAlign = 'left';
    ctx.fillText(model.brand.toUpperCase(), 60, 118);
    ctx.restore();
}
