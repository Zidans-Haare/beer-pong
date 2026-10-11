// Zeichnet das Minispiel: gleicher Tisch und gleiche Figuren wie im Wrapped, dazu Anzeigen, Zielkreuz und Wurf.
// Alles hängt am übergebenen View-Objekt und der Zeit, die Oberfläche setzt es bei jedem Bild neu.

import {
    SCENE_WIDTH, SCENE_HEIGHT, CENTER_X, HEADING, BODY, clamp, lerp, ramp, easeOut, easeOutBack,
    tablePoint, drawCup, drawBall, drawMe, drawOpponent, drawBackdrop, drawTable, roundRect, fitFont,
    type FigureLook, type SceneAssets,
} from '@/lib/wrapped-scene';
import { drawWalker } from '@/lib/tournament-scene';
import { islandsOf, canRearrange, freeSlots, slotsOf, other, type Game, type Side } from '@/lib/minigame/engine';
import type { Point } from '@/lib/minigame/aim';
import { drawWallPicture } from '@/lib/drunk-scene';

export interface Stamp { text: string; start: number; color?: string; y?: number }

export interface GameView {
    primary: string;
    game: Game;
    names: Record<Side, string>;
    skins: Record<Side, string>;
    looks: Record<Side, FigureLook>;
    // 0..1: Szene baut sich auf
    enter: number;
    ball: { x: number; y: number; r: number; alpha?: number } | null;
    trail: Point[];
    // Becher, die gerade vom Tisch fliegen: Seite:Becher-ID -> Startzeit
    vanishing: Record<string, number>;
    // Spur des laufenden Wischens (Bildkoordinaten); bei geschlossenen Augen wird alles dunkel
    swipe: Point[] | null;
    blind: boolean;
    // Insel-Ansage aktiv: Inseln des Gegners werden markiert
    islandCall: boolean;
    // Umstellen: gewählter Becher; die freien Plätze des Zehnerdreiecks werden angezeigt
    rearranging: { dragging: number | null } | null;
    stamps: Stamp[];
    status: string;
    throwPhase: number;
    mood: number;
    anger: number;
    flinch: number;
    cheer: number;
    shake: number;
    swat: { start: number; duration: number } | null;
    // Stufe des Rechners (nur gegen den Computer), unter seinem Namen
    level: string | null;
    // Wann der Ball über die Mittellinie gerollt ist: sie blitzt kurz auf
    midFlash: number | null;
    // Hand, die einen Aufpraller wegschlägt: Ziel (Ball), Seite, aus der sie kommt, Hautton und Ärmelfarbe
    hand: { start: number; duration: number; x: number; y: number; from: 1 | -1; scale: number; skin: string; sleeve: string } | null;
    // Schluss: Sieger und nackte Meile
    ending: { start: number; winner: Side; nakedMile: Side | null; winLabel: string; mileLabel: string } | null;
}

const key = (side: Side, id: number) => `${side}:${id}`;

function cupSprite(ctx: CanvasRenderingContext2D, view: GameView, side: Side, time: number) {
    const cups = view.game.cups[side];
    const size = view.game.size;
    const holdsBall = new Set(side === other(view.game.turn) ? view.game.roundHits.map(h => h.cupId) : []);
    const intro = side === 'me' ? 0.15 : 0.4;
    const ordered = [...cups].sort((a, b) => (side === 'me' ? b.v - a.v : b.v - a.v));
    const islands = new Set(side === 'opp' ? islandsOf(cups, size).map(c => c.id) : []);
    ordered.forEach((cup, i) => {
        const p = tablePoint(cup.u, cup.v);
        const pop = easeOutBack(clamp((view.enter - intro - i * 0.012) / 0.35));
        const gone = view.vanishing[key(side, cup.id)];
        if (gone !== undefined) {
            const k = ramp(time, gone, 650);
            if (k >= 1) return;
            drawCup(ctx, p.x, p.y - 260 * p.scale * size * easeOut(k), p.scale * size, { alpha: 1 - k, rotate: (cup.u >= 0 ? 1 : -1) * k * 1.6, pop });
            return;
        }
        drawCup(ctx, p.x, p.y, p.scale * size, { pop });
        if (holdsBall.has(cup.id)) drawBall(ctx, p.x, p.y - 112 * p.scale * size, 15 * p.scale * size + 4);
        if (islands.has(cup.id) && view.islandCall) {
            ctx.save();
            ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 6; ctx.setLineDash([14, 10]);
            ctx.lineDashOffset = -time / 40;
            ctx.beginPath(); ctx.ellipse(p.x, p.y - 56 * p.scale * size, 74 * p.scale * size, 92 * p.scale * size, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    });
}

// Anzeige einer Seite oben: Name, Becher als kleine Symbole, Hinweis bei Unterhose
function drawPlayerCard(ctx: CanvasRenderingContext2D, view: GameView, side: Side) {
    const left = side === 'me';
    const x = left ? 40 : SCENE_WIDTH - 40;
    const cups = view.game.cups[side].length;
    ctx.save();
    ctx.textAlign = left ? 'left' : 'right';
    ctx.fillStyle = view.game.turn === side && !view.game.winner ? '#ffe08a' : '#ffffff';
    fitFont(ctx, view.names[side], BODY, 40, 24, 400);
    ctx.fillText(view.names[side], x, 170);
    // zehn Plätze, belegte sind rot
    const size = 26, gap = 7;
    for (let i = 0; i < 10; i++) {
        const cx = left ? x + i * (size + gap) : x - i * (size + gap) - size;
        ctx.fillStyle = i < cups ? '#e0463b' : 'rgba(255,255,255,0.16)';
        ctx.beginPath();
        ctx.moveTo(cx, 196); ctx.lineTo(cx + size, 196); ctx.lineTo(cx + size * 0.78, 196 + size * 1.15); ctx.lineTo(cx + size * 0.22, 196 + size * 1.15); ctx.closePath(); ctx.fill();
    }
    if (side === 'opp' && view.level) {
        ctx.font = `600 24px ${BODY}`;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(view.level, x, 268);
    }
    if (view.game.stripped === side) {
        // kleine Unterhose als Zeichen: rot mit weißen Punkten
        const sx = left ? x : x - 50;
        ctx.fillStyle = '#d83a3a';
        roundRect(ctx, sx, 284, 50, 34, 12); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (const [dx, dy] of [[12, 14], [26, 24], [38, 12]]) { ctx.beginPath(); ctx.arc(sx + dx, 284 + dy, 3.5, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
}

function drawStatus(ctx: CanvasRenderingContext2D, text: string) {
    if (!text) return;
    ctx.save();
    ctx.textAlign = 'center';
    const size = fitFont(ctx, text, BODY, 44, 26, SCENE_WIDTH - 140);
    const w = ctx.measureText(text).width + 56;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, CENTER_X - w / 2, 330, w, size * 1.7, size * 0.85); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, CENTER_X, 330 + size * 1.2);
    ctx.restore();
}

// Spur des Wischens: wird heller, je schneller gezogen wird
function drawSwipe(ctx: CanvasRenderingContext2D, swipe: Point[] | null) {
    if (!swipe || swipe.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < swipe.length; i++) {
        const k = i / swipe.length;
        ctx.strokeStyle = `rgba(255,255,255,${0.15 + 0.6 * k})`;
        ctx.lineWidth = 6 + 18 * k;
        ctx.beginPath(); ctx.moveTo(swipe[i - 1].x, swipe[i - 1].y); ctx.lineTo(swipe[i].x, swipe[i].y); ctx.stroke();
    }
    ctx.restore();
}

// Hand beim Wegschlagen: holt von der Seite aus, klatscht auf den Ball und verschwindet wieder
function drawHand(ctx: CanvasRenderingContext2D, hand: NonNullable<GameView['hand']>, time: number) {
    const k = ramp(time, hand.start, hand.duration);
    if (k <= 0 || k >= 1) return;
    const swing = easeOut(clamp(k / 0.6));
    const away = ramp(k, 0.75, 0.25);
    const s = hand.scale;
    const x = lerp(hand.x + hand.from * 300 * s, hand.x - hand.from * 40 * s, swing) + away * -hand.from * 60 * s;
    const y = lerp(hand.y + 120 * s, hand.y - 10 * s, swing) - away * 40 * s;
    const angle = lerp(hand.from * 1.1, -hand.from * 0.55, swing);

    // Schwung: ein paar helle Bögen hinter der Hand
    if (k < 0.6) {
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 1; i <= 4; i++) {
            const q = Math.max(0, swing - i * 0.07);
            const tx = lerp(hand.x + hand.from * 300 * s, hand.x - hand.from * 40 * s, q), ty = lerp(hand.y + 120 * s, hand.y - 10 * s, q);
            ctx.strokeStyle = `rgba(255,255,255,${0.35 - i * 0.07})`;
            ctx.lineWidth = (26 - i * 4) * s;
            ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
        }
        ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 1 - away;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(s, s);
    const outline = 'rgba(0,0,0,0.28)';
    // Ärmel
    ctx.fillStyle = hand.sleeve;
    roundRect(ctx, -40, 44, 80, 130, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    roundRect(ctx, -40, 44, 80, 16, 8); ctx.fill();
    // Daumen
    ctx.save();
    ctx.translate(-42, 20); ctx.rotate(-0.7);
    ctx.fillStyle = hand.skin; ctx.strokeStyle = outline; ctx.lineWidth = 3;
    roundRect(ctx, -12, -50, 26, 60, 13); ctx.fill(); ctx.stroke();
    ctx.restore();
    // Handfläche
    ctx.fillStyle = hand.skin; ctx.strokeStyle = outline; ctx.lineWidth = 3;
    roundRect(ctx, -42, -28, 84, 84, 30); ctx.fill(); ctx.stroke();
    // vier Finger, leicht gespreizt
    [[-33, 54, -0.12], [-11, 66, -0.04], [11, 64, 0.04], [32, 52, 0.12]].forEach(([fx, len, tilt]) => {
        ctx.save();
        ctx.translate(fx, -24); ctx.rotate(tilt);
        roundRect(ctx, -10, -len, 20, len + 12, 10); ctx.fill(); ctx.stroke();
        ctx.restore();
    });
    // Linien der Handfläche
    ctx.strokeStyle = outline; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-20, 18); ctx.quadraticCurveTo(0, 30, 24, 14); ctx.stroke();
    ctx.restore();

    // Klatsch: Sternenkranz am Ball, kurz nach dem Aufprall
    const hit = ramp(k, 0.55, 0.3);
    if (hit > 0 && hit < 1) {
        ctx.save();
        ctx.translate(hand.x, hand.y);
        ctx.globalAlpha = 1 - hit;
        ctx.fillStyle = '#fff3b0';
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2, r1 = (22 + easeOut(hit) * 70) * s, r2 = r1 * 0.55;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a - 0.12) * r2, Math.sin(a - 0.12) * r2); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a + 0.12) * r2, Math.sin(a + 0.12) * r2);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }
}

function drawStamps(ctx: CanvasRenderingContext2D, stamps: Stamp[], time: number) {
    // nur der jüngste Stempel, damit sich nichts überlagert
    const active = [...stamps].filter(s => time >= s.start && time < s.start + 1500).pop();
    if (!active) return;
    const k = ramp(time, active.start, 320);
    const out = ramp(time, active.start + 1200, 300);
    ctx.save();
    ctx.globalAlpha = clamp(k * 2) * (1 - out);
    ctx.translate(CENTER_X, active.y ?? 640);
    ctx.rotate(-0.07);
    const scale = lerp(3, 1, easeOut(k)) * (1 + 0.03 * Math.sin(time / 60) * (1 - k));
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    const size = fitFont(ctx, active.text, HEADING, 210, 70, SCENE_WIDTH - 160);
    ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineJoin = 'round';
    ctx.strokeText(active.text, 0, size * 0.35);
    ctx.fillStyle = active.color ?? '#ffe08a';
    ctx.fillText(active.text, 0, size * 0.35);
    ctx.restore();
}

// Schlusskarte: Sieger-Jubel; bei der nackten Meile läuft der Verlierer durchs Bild
function drawEnding(ctx: CanvasRenderingContext2D, view: GameView, time: number) {
    const e = view.ending;
    if (!e) return;
    const local = time - e.start;
    ctx.fillStyle = `rgba(0,0,0,${0.72 * easeOut(ramp(local, 0, 500))})`;
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    const text = e.winLabel;
    ctx.save();
    ctx.textAlign = 'center';
    const pop = easeOutBack(ramp(local, 250, 500));
    ctx.translate(CENTER_X, 520);
    ctx.scale(pop, pop);
    ctx.rotate(-0.05);
    const size = fitFont(ctx, text, HEADING, 200, 70, SCENE_WIDTH - 140);
    ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineJoin = 'round';
    ctx.strokeText(text, 0, size * 0.35);
    ctx.fillStyle = '#ffe08a'; ctx.fillText(text, 0, size * 0.35);
    ctx.restore();

    if (e.nakedMile) {
        // Läufer von links nach rechts, eine Zensurbalken-Zeile darunter
        const runner = e.nakedMile;
        const run = ((local - 700) / 5200);
        const x = lerp(-200, SCENE_WIDTH + 200, run - Math.floor(run));
        if (local > 700) {
            drawWalker(ctx, x, 1330, 1.15, { ...view.looks[runner], undies: true, skin: view.skins[runner] }, { walk: 1, cheer: 0, medal: 0, place: 3, crown: 0, time: local });
        }
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 54px ${BODY}`;
        const mile = easeOut(ramp(local, 800, 500));
        ctx.globalAlpha = mile;
        ctx.fillText(e.mileLabel, CENTER_X, 800);
        ctx.restore();
    } else {
        // Sieger jubelt, Verlierer schaut traurig
        drawWalker(ctx, CENTER_X, 1420, 1.5, { ...view.looks[e.winner], skin: view.skins[e.winner] }, { walk: 0, cheer: easeOut(ramp(local, 600, 500)), medal: 0, place: 1, crown: ramp(local, 900, 500), time: local });
    }
}

export function drawGameFrame(ctx: CanvasRenderingContext2D, view: GameView, timeMs: number, _assets: SceneAssets = {}) {
    const time = timeMs;
    const beat = 0.5 + 0.5 * Math.cos((time / 536) * Math.PI * 2);
    drawBackdrop(ctx, view.primary, time, beat);

    // Wenn Moonzy mitspielt, hängt wie immer das Foto von Josie an der Wand
    if ([view.names.me, view.names.opp].some(n => n.trim().toLowerCase() === 'moonzy')) {
        ctx.save();
        ctx.globalAlpha = easeOut(ramp(view.enter, 0.1, 0.4));
        drawWallPicture(ctx, 'Josie', time, 172, 600, 0.6);
        ctx.restore();
    }

    ctx.save();
    // Wackeln bei Treffern
    if (view.shake > 0) ctx.translate(Math.sin(time / 18) * 14 * view.shake, Math.cos(time / 23) * 9 * view.shake);

    // Gegner hinter dem Tisch
    const oppUndies = view.game.stripped === 'opp';
    drawOpponent(ctx, ramp(view.enter, 0.2, 0.4), view.mood, view.names.opp, time, view.flinch, view.skins.opp, view.anger, { ...view.looks.opp, undies: oppUndies });

    // Tisch
    const tableIn = easeOut(ramp(view.enter, 0, 0.35));
    ctx.save();
    ctx.globalAlpha = tableIn;
    ctx.translate(0, (1 - tableIn) * 120);
    drawTable(ctx, view.primary);
    ctx.restore();

    if (view.midFlash !== null) {
        const k = ramp(time, view.midFlash, 750);
        if (k < 1) {
            const l = tablePoint(-1, 0.5), r = tablePoint(1, 0.5);
            ctx.save();
            ctx.strokeStyle = `rgba(255,236,150,${0.95 * (1 - k)})`; ctx.lineWidth = 8 + 10 * (1 - k);
            ctx.shadowColor = '#ffe08a'; ctx.shadowBlur = 24 * (1 - k);
            ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y); ctx.stroke();
            ctx.restore();
        }
    }

    cupSprite(ctx, view, 'opp', time);

    // Spur und Ball
    if (view.ball) {
        view.trail.forEach((p, i) => {
            const k = (i + 1) / (view.trail.length + 1);
            ctx.fillStyle = `rgba(255,255,255,${0.26 * k})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, view.ball!.r * k, 0, Math.PI * 2); ctx.fill();
        });
        drawBall(ctx, view.ball.x, view.ball.y, view.ball.r, view.ball.alpha ?? 1);
    }

    cupSprite(ctx, view, 'me', time);

    // Umstellen: die freien Plätze des Zehnerdreiecks als gestrichelte Becher, die Becher des Gegners sind greifbar
    if (view.rearranging && canRearrange(view.game, 'me')) {
        const size = view.game.size;
        const free = new Set(freeSlots(view.game, 'opp'));
        for (const slot of slotsOf('opp', size)) {
            if (!free.has(slot.id)) continue;
            const p = tablePoint(slot.u, slot.v);
            ctx.save();
            ctx.strokeStyle = 'rgba(255,224,138,0.9)'; ctx.fillStyle = 'rgba(255,224,138,0.14)';
            ctx.lineWidth = 5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = time / 60;
            ctx.beginPath(); ctx.ellipse(p.x, p.y - 56 * p.scale * size, 22 * p.scale * size, 34 * p.scale * size, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.restore();
        }
        for (const cup of view.game.cups.opp) {
            const p = tablePoint(cup.u, cup.v);
            const picked = view.rearranging.dragging === cup.id;
            ctx.save();
            ctx.strokeStyle = picked ? '#ffffff' : '#ffe08a';
            ctx.lineWidth = picked ? 8 : 5; ctx.setLineDash(picked ? [] : [12, 9]); ctx.lineDashOffset = -time / 50;
            ctx.beginPath(); ctx.ellipse(p.x, p.y - 56 * p.scale * size, 24 * p.scale * size, 36 * p.scale * size, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    }

    // ich, von hinten; in Unterhose ohne Hemd
    drawMe(ctx, ramp(view.enter, 0.1, 0.4), view.throwPhase, view.cheer, time, view.primary, { ...view.looks.me, skin: view.skins.me, undies: view.game.stripped === 'me' });
    ctx.restore();

    // Trickshot mit geschlossenen Augen: man sieht nichts
    if (view.blind) { ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(0, 380, SCENE_WIDTH, SCENE_HEIGHT - 380); }
    drawSwipe(ctx, view.swipe);

    // Anzeigen oben
    const topShade = ctx.createLinearGradient(0, 0, 0, 520);
    topShade.addColorStop(0, 'rgba(0,0,0,0.6)'); topShade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topShade;
    ctx.fillRect(0, 0, SCENE_WIDTH, 520);
    drawPlayerCard(ctx, view, 'me');
    drawPlayerCard(ctx, view, 'opp');
    drawStatus(ctx, view.status);
    drawStamps(ctx, view.stamps, time);

    if (view.hand) drawHand(ctx, view.hand, time);

    if (view.swat) {
        const k = ramp(time, view.swat.start, view.swat.duration);
        if (k < 1) {
            ctx.save();
            ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 12;
            ctx.beginPath(); ctx.arc(CENTER_X, 1160, 150, -Math.PI / 2, -Math.PI / 2 + (1 - k) * Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    }
    drawEnding(ctx, view, time);
}
