import {
    SCENE_WIDTH, SCENE_HEIGHT, CENTER_X, OPP_CUPS, MY_CUPS, HEADING, BODY,
    clamp, lerp, ramp, easeOut, easeOutBack, rand, shade,
    tablePoint, drawCup, drawMe, drawOpponent, drawBall, roundRect, fitFont,
} from '@/lib/wrapped-scene';

// Kurze Szene beim Einschalten des Betrunken-Modus: Die Figur torkelt an den Tisch,
// wirft schief und trifft statt der Becher das Bild an der Wand.

export const DRUNK_TOTAL_MS = 6200;
const THROW_AT = 2350;
const THROW_MS = 950;
const HIT_AT = THROW_AT + THROW_MS;

export interface DrunkSceneModel {
    primary: string;
    // Name auf dem Schild unter dem Bild
    pictureName: string;
    // Gegner auf der anderen Tischseite
    opponentName: string;
    missLabel: string;
    sorryLabel: string;
    hiccupLabel: string;
}

const PICTURE = { x: 285, y: 650, w: 290, h: 390 };
// dunkler Hautton für den Gegner
const OPPONENT_SKIN = '#7a4b2a';

// Fotoabzug an der Wand, dem echten Foto nachempfunden: nach vorn gebeugt, Kopf geneigt, lange blonde
// Haare mit verwehten Strähnen, ärmelloses dunkles Oberteil, weiß getünchte Holzbretter.
// Nach dem Treffer hängt das Foto schief und schaut genervt.
function drawPicture(ctx: CanvasRenderingContext2D, time: number, name: string) {
    const hit = ramp(time, HIT_AT, 900);
    // pendelt aus und bleibt schief hängen
    const tilt = hit > 0 ? 0.3 * easeOutBack(clamp(hit * 1.6)) + Math.sin(hit * 22) * 0.16 * (1 - hit) : 0;
    const annoyed = clamp(hit * 3);
    const { w, h } = PICTURE;
    ctx.save();
    // an einer Nadel oben in der Mitte aufgehängt: darum dreht sich das Foto
    ctx.translate(PICTURE.x, PICTURE.y - h / 2 - 6);
    ctx.rotate(tilt);
    ctx.translate(0, 6 + h / 2);

    // Abzug mit hellem, abgegriffenem Rand
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    roundRect(ctx, -w / 2 + 10, -h / 2 + 14, w, h, 12); ctx.fill();
    ctx.fillStyle = '#ece4d6';
    roundRect(ctx, -w / 2, -h / 2, w, h, 12); ctx.fill();

    const m = 10; // Randbreite
    ctx.save();
    roundRect(ctx, -w / 2 + m, -h / 2 + m, w - m * 2, h - m * 2, 6);
    ctx.clip();

    // Holzbretter, ungleichmäßig weiß getüncht
    ctx.fillStyle = '#84695c';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    const boards = [-w / 2, -92, -34, 26, 84, w / 2];
    for (let i = 0; i < boards.length - 1; i++) {
        const x0 = boards[i], bw = boards[i + 1] - boards[i];
        const wash = ctx.createLinearGradient(x0, 0, x0 + bw, 0);
        wash.addColorStop(0, `rgba(240,228,220,${0.10 + rand(i, 21) * 0.14})`);
        wash.addColorStop(0.5, `rgba(250,240,232,${0.30 + rand(i, 22) * 0.22})`);
        wash.addColorStop(1, `rgba(240,228,220,${0.08 + rand(i, 23) * 0.12})`);
        ctx.fillStyle = wash;
        ctx.fillRect(x0, -h / 2, bw, h);
        ctx.fillStyle = 'rgba(48,30,24,0.6)';
        ctx.fillRect(x0 + bw - 2, -h / 2, 3, h);
    }

    const blond = '#ead3a2', blondMid = '#d6b77c', blondDark = '#b08e5c';
    const skin = '#f0c9a2', skinShade = '#dba983';

    // Haare hinter Kopf und Schultern, lang bis unten aus dem Bild
    ctx.fillStyle = blondMid;
    ctx.beginPath();
    ctx.moveTo(-96, -96); ctx.quadraticCurveTo(-20, -168, 66, -112);
    ctx.quadraticCurveTo(100, -40, 80, 40); ctx.quadraticCurveTo(40, 90, -20, h / 2);
    ctx.lineTo(-118, h / 2); ctx.quadraticCurveTo(-126, 40, -96, -96); ctx.closePath(); ctx.fill();

    // Körper: nach vorn gebeugt, ärmelloses dunkles Oberteil, rechte Schulter und Arm frei
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.moveTo(40, 96); ctx.quadraticCurveTo(128, 100, 140, 190); ctx.lineTo(140, h / 2); ctx.lineTo(70, h / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1b1a1f';
    ctx.beginPath(); ctx.moveTo(-60, 84); ctx.quadraticCurveTo(20, 60, 78, 92); ctx.quadraticCurveTo(112, 150, 96, h / 2); ctx.lineTo(-110, h / 2); ctx.quadraticCurveTo(-112, 130, -60, 84); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2c2a31';
    ctx.beginPath(); ctx.moveTo(-36, 130); ctx.quadraticCurveTo(10, 170, 60, 132); ctx.lineTo(70, h / 2); ctx.lineTo(-60, h / 2); ctx.closePath(); ctx.fill();

    // Kopf, deutlich zur Seite geneigt
    ctx.save();
    ctx.translate(-14, -58);
    ctx.rotate(-0.24);
    ctx.fillStyle = skinShade;
    roundRect(ctx, -24, 56, 52, 70, 18); ctx.fill(); // Hals
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(0, 0, 66, 80, 0, 0, Math.PI * 2); ctx.fill();
    // Mittelscheitel: Haar fällt zu beiden Seiten, Ansatz dunkler
    ctx.fillStyle = blondDark;
    ctx.beginPath(); ctx.moveTo(-70, -6); ctx.quadraticCurveTo(-70, -92, 0, -90); ctx.quadraticCurveTo(70, -92, 70, -6); ctx.quadraticCurveTo(40, -62, 2, -64); ctx.quadraticCurveTo(-40, -62, -70, -6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = blond;
    ctx.beginPath(); ctx.moveTo(2, -84); ctx.quadraticCurveTo(-58, -78, -74, 10); ctx.quadraticCurveTo(-80, 80, -66, 150); ctx.quadraticCurveTo(-44, 60, -50, 0); ctx.quadraticCurveTo(-40, -54, 2, -66); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, -84); ctx.quadraticCurveTo(60, -78, 76, 6); ctx.quadraticCurveTo(84, 70, 70, 140); ctx.quadraticCurveTo(50, 56, 54, 2); ctx.quadraticCurveTo(44, -54, 2, -66); ctx.closePath(); ctx.fill();
    // geflochtene Strähne am Ansatz
    ctx.strokeStyle = blondDark; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-40 + i * 7, -70 + i * 6); ctx.lineTo(-33 + i * 7, -62 + i * 6); ctx.stroke(); }

    // Gesicht: Blick in die Kamera, leicht geöffneter Mund
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(-25, -6, 13, 7 - annoyed * 2, 0, 0, Math.PI * 2); ctx.ellipse(25, -6, 13, 7 - annoyed * 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5b4a2e';
    ctx.beginPath(); ctx.arc(-24, -6, 6, 0, Math.PI * 2); ctx.arc(26, -6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6b4f2c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-39, -8); ctx.quadraticCurveTo(-25, -17, -11, -8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(11, -8); ctx.quadraticCurveTo(25, -17, 39, -8); ctx.stroke();
    // Augenbrauen: entspannt bis genervt
    ctx.strokeStyle = '#a07f4c'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-42, -26 - annoyed * 4); ctx.quadraticCurveTo(-26, -32 + annoyed * 4, -10, -26 + annoyed * 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(42, -26 - annoyed * 4); ctx.quadraticCurveTo(26, -32 + annoyed * 4, 10, -26 + annoyed * 10); ctx.stroke();
    // Nase
    ctx.strokeStyle = skinShade; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(2, 2); ctx.quadraticCurveTo(10, 22, -2, 26); ctx.stroke();
    // Mund
    if (annoyed < 0.5) {
        ctx.fillStyle = '#b4574f';
        ctx.beginPath(); ctx.moveTo(-20, 44); ctx.quadraticCurveTo(0, 38, 20, 44); ctx.quadraticCurveTo(0, 62, -20, 44); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(-12, 45); ctx.quadraticCurveTo(0, 42, 12, 45); ctx.quadraticCurveTo(0, 50, -12, 45); ctx.closePath(); ctx.fill();
    } else {
        ctx.strokeStyle = '#b4574f'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(-18, 50); ctx.quadraticCurveTo(0, 40, 18, 50); ctx.stroke();
    }
    // Ohrstecker
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-62, 22, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // vom Wind verwehte Strähnen: quer über Oberteil und Schulter nach rechts
    ctx.lineCap = 'round';
    const strands: [number, number, number, number, number, number, string, number][] = [
        [-88, 70, -10, 96, 132, 78, blond, 7],
        [-92, 104, 0, 150, 138, 128, blondMid, 6],
        [-84, 140, 10, 196, 132, 176, blond, 5],
        [-70, 30, 40, 40, 130, 30, blondMid, 4],
        [-60, 176, 30, 232, 120, 220, blondDark, 4],
        [40, -110, 96, -90, 128, -50, blond, 4],
    ];
    for (const [x0, y0, cx, cy, x1, y1, color, width] of strands) {
        ctx.strokeStyle = color; ctx.lineWidth = width;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
    }
    // lange Strähnen, die links gerade herunterfallen
    ctx.strokeStyle = blond; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(-86, 40); ctx.quadraticCurveTo(-104, 120, -92, h / 2); ctx.stroke();
    ctx.strokeStyle = blondDark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-70, 60); ctx.quadraticCurveTo(-84, 130, -72, h / 2); ctx.stroke();
    ctx.restore();

    // Sprung quer über das Foto
    if (hit > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${0.92 * clamp(hit * 4)})`; ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + 0.4;
            const length = (50 + rand(i, 3) * 90) * easeOut(clamp(hit * 3));
            ctx.beginPath(); ctx.moveTo(30, -50);
            ctx.lineTo(30 + Math.cos(angle) * length * 0.5 + rand(i, 5) * 12, -50 + Math.sin(angle) * length * 0.5);
            ctx.lineTo(30 + Math.cos(angle) * length, -50 + Math.sin(angle) * length);
            ctx.stroke();
        }
    }

    // Stecknadel und Namensschild
    ctx.fillStyle = '#c33131';
    ctx.beginPath(); ctx.arc(0, -h / 2 + 6, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(-3, -h / 2 + 3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b2118';
    roundRect(ctx, -84, h / 2 + 8, 168, 46, 8); ctx.fill();
    ctx.fillStyle = '#f4d58a';
    ctx.textAlign = 'center';
    fitFont(ctx, name.toUpperCase(), HEADING, 36, 20, 150);
    ctx.fillText(name.toUpperCase(), 0, h / 2 + 42);
    ctx.restore();
}

export function drawDrunkFrame(ctx: CanvasRenderingContext2D, model: DrunkSceneModel, timeMs: number) {
    const time = clamp(timeMs, 0, DRUNK_TOTAL_MS);
    // gegen Ende schwankt das ganze Bild immer stärker
    const woozy = easeOut(ramp(time, 3600, 2400));

    const bg = ctx.createLinearGradient(0, 0, 0, SCENE_HEIGHT);
    bg.addColorStop(0, shade(model.primary, 0.42)); bg.addColorStop(0.5, shade(model.primary, 0.24)); bg.addColorStop(1, '#070b09');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);

    ctx.save();
    ctx.translate(CENTER_X, 1100);
    ctx.rotate(Math.sin(time / 420) * 0.05 * woozy);
    ctx.scale(1 + 0.05 * woozy * Math.sin(time / 300), 1 + 0.04 * woozy * Math.cos(time / 340));
    ctx.translate(-CENTER_X + Math.sin(time / 260) * 26 * woozy, -1100);

    const fadeIn = easeOut(ramp(time, 0, 600));
    ctx.globalAlpha = fadeIn;

    drawPicture(ctx, time, model.pictureName);

    // Gegner hinter dem Tisch: grinst und zuckt kurz, wenn der Ball an ihm vorbeifliegt
    const dodge = ramp(time, THROW_AT + 500, 520);
    drawOpponent(ctx, ramp(time, 300, 700), 0, model.opponentName, time, dodge < 1 ? dodge : 0, OPPONENT_SKIN);

    // Tisch
    const nl = tablePoint(-1, 0), nr = tablePoint(1, 0), fl = tablePoint(-1, 1), fr = tablePoint(1, 1);
    ctx.fillStyle = shade(model.primary, 0.5);
    ctx.beginPath(); ctx.moveTo(nl.x, nl.y); ctx.lineTo(nr.x, nr.y); ctx.lineTo(nr.x - 8, nr.y + 46); ctx.lineTo(nl.x + 8, nl.y + 46); ctx.closePath(); ctx.fill();
    const surface = ctx.createLinearGradient(0, fl.y, 0, nl.y);
    surface.addColorStop(0, shade(model.primary, 0.85)); surface.addColorStop(1, shade(model.primary, 1.25));
    ctx.fillStyle = surface;
    ctx.beginPath(); ctx.moveTo(nl.x, nl.y); ctx.lineTo(nr.x, nr.y); ctx.lineTo(fr.x, fr.y); ctx.lineTo(fl.x, fl.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
    ctx.stroke();

    // die Becher des Gegners bleiben unberührt stehen
    for (const spot of OPP_CUPS) {
        const p = tablePoint(spot.u, spot.v);
        drawCup(ctx, p.x, p.y, p.scale);
    }

    // Ball: fliegt in Schlangenlinien am Tisch vorbei aufs Bild und fällt dann herunter
    const k = ramp(time, THROW_AT, THROW_MS);
    const target = { x: PICTURE.x + 30, y: PICTURE.y - 50 };
    if (k > 0 && k < 1) {
        const x = lerp(CENTER_X + 150, target.x, k) + Math.sin(k * 11) * 46 * (1 - k);
        const y = lerp(1650, target.y, k) - Math.sin(k * Math.PI) * 260;
        for (let i = 6; i >= 1; i--) {
            const q = k - i * 0.03;
            if (q <= 0) continue;
            ctx.fillStyle = `rgba(255,255,255,${0.22 * (1 - i / 7)})`;
            ctx.beginPath();
            ctx.arc(lerp(CENTER_X + 150, target.x, q) + Math.sin(q * 11) * 46 * (1 - q), lerp(1650, target.y, q) - Math.sin(q * Math.PI) * 260, lerp(30, 16, q) * (1 - i / 8), 0, Math.PI * 2);
            ctx.fill();
        }
        drawBall(ctx, x, y, lerp(30, 16, k));
    } else if (k >= 1) {
        const fall = ramp(time, HIT_AT, 900);
        if (fall < 1) drawBall(ctx, target.x + fall * 90, target.y + fall * fall * 520, 16, 1 - fall * 0.6);
    }

    // meine Becher auf der eigenen Seite (hinten zuerst)
    [...MY_CUPS].sort((a, b) => b.v - a.v).forEach(spot => {
        const p = tablePoint(spot.u, spot.v);
        drawCup(ctx, p.x, p.y, p.scale);
    });

    // Figur: torkelt herein, holt wackelig aus
    const enter = ramp(time, 200, 1000);
    const stagger = 1 - ramp(time, HIT_AT + 600, 1200) * 0.4;
    const throwPhase = time >= THROW_AT - 480 && time < THROW_AT + 380 ? ramp(time, THROW_AT - 480, 860) : 0;
    ctx.save();
    // höher als im Wrapped, damit man das Torkeln sieht
    ctx.translate(Math.sin(time / 270) * 70 * stagger, -170);
    ctx.translate(CENTER_X, 1800);
    ctx.rotate(Math.sin(time / 330) * 0.13 * stagger);
    ctx.translate(-CENTER_X, -1800);
    drawMe(ctx, enter, throwPhase, 0, time, model.primary);
    ctx.restore();

    // "Hicks!" neben dem Kopf
    for (const start of [1150, 4300]) {
        const h = ramp(time, start, 900);
        if (h <= 0 || h >= 1) continue;
        ctx.save();
        ctx.globalAlpha = fadeIn * (1 - h);
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 64px ${HEADING}`;
        ctx.translate(790 + Math.sin(time / 270) * 40, 1400 - easeOut(h) * 120);
        ctx.rotate(0.2);
        ctx.fillText(model.hiccupLabel, 0, 0);
        ctx.restore();
    }

    // "Klirr"-Sterne am Einschlag
    const burst = ramp(time, HIT_AT, 600);
    if (burst > 0 && burst < 1) {
        ctx.fillStyle = `rgba(255,224,138,${1 - burst})`;
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const dist = easeOut(burst) * (90 + rand(i, 2) * 90);
            ctx.beginPath(); ctx.arc(target.x + Math.cos(angle) * dist, target.y + Math.sin(angle) * dist, 9 * (1 - burst * 0.5), 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.restore();

    // Text: großer Stempel, darunter die Entschuldigung
    const stamp = ramp(time, HIT_AT + 250, 380);
    if (stamp > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(stamp * 2);
        ctx.translate(CENTER_X, 300);
        ctx.rotate(-0.07 + Math.sin(time / 380) * 0.05 * woozy);
        const scale = lerp(3, 1, easeOut(stamp));
        ctx.scale(scale, scale);
        ctx.textAlign = 'center';
        const size = fitFont(ctx, model.missLabel, HEADING, 220, 90, SCENE_WIDTH - 160);
        ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineJoin = 'round';
        ctx.strokeText(model.missLabel, 0, size * 0.35);
        ctx.fillStyle = '#ffe08a';
        ctx.fillText(model.missLabel, 0, size * 0.35);
        ctx.restore();

        const sorry = easeOut(ramp(time, HIT_AT + 750, 450));
        ctx.save();
        ctx.globalAlpha = sorry;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 54px ${BODY}`;
        ctx.fillText(model.sorryLabel, CENTER_X, 1150 + (1 - sorry) * 30);
        ctx.restore();
    }
}
