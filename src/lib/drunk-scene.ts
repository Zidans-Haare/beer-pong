import {
    SCENE_WIDTH, SCENE_HEIGHT, CENTER_X, OPP_CUPS, HEADING, BODY,
    clamp, lerp, ramp, easeOut, easeOutBack, rand, shade,
    tablePoint, drawCup, drawMe, drawBall, roundRect, fitFont,
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
    missLabel: string;
    sorryLabel: string;
    hiccupLabel: string;
}

const PICTURE = { x: 300, y: 600, w: 250, h: 310 };

// gerahmtes Porträt mit Namensschild; nach dem Treffer hängt es schief und schaut verärgert
function drawPicture(ctx: CanvasRenderingContext2D, time: number, name: string) {
    const hit = ramp(time, HIT_AT, 900);
    // pendelt aus und bleibt schief hängen
    const tilt = hit > 0 ? 0.3 * easeOutBack(clamp(hit * 1.6)) + Math.sin(hit * 22) * 0.16 * (1 - hit) : 0;
    const annoyed = clamp(hit * 3);
    ctx.save();
    // Aufhängung oben in der Mitte: darum dreht sich das Bild
    ctx.translate(PICTURE.x, PICTURE.y - PICTURE.h / 2 - 40);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(tilt);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-PICTURE.w / 2 + 30, 40); ctx.moveTo(0, 0); ctx.lineTo(PICTURE.w / 2 - 30, 40); ctx.stroke();
    ctx.translate(0, 40 + PICTURE.h / 2);

    // Rahmen
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, -PICTURE.w / 2 + 10, -PICTURE.h / 2 + 14, PICTURE.w, PICTURE.h, 14); ctx.fill();
    ctx.fillStyle = '#c9972b';
    roundRect(ctx, -PICTURE.w / 2, -PICTURE.h / 2, PICTURE.w, PICTURE.h, 14); ctx.fill();
    ctx.fillStyle = '#f4ead7';
    roundRect(ctx, -PICTURE.w / 2 + 20, -PICTURE.h / 2 + 20, PICTURE.w - 40, PICTURE.h - 40, 6); ctx.fill();

    // Porträt: blonde lange Haare vor einer Holzwand, Kopf leicht geneigt, dunkles Oberteil
    ctx.save();
    roundRect(ctx, -PICTURE.w / 2 + 20, -PICTURE.h / 2 + 20, PICTURE.w - 40, PICTURE.h - 40, 6);
    ctx.clip();
    // Holzbretter
    ctx.fillStyle = '#8b6b58';
    ctx.fillRect(-PICTURE.w / 2, -PICTURE.h / 2, PICTURE.w, PICTURE.h);
    ctx.strokeStyle = 'rgba(60,40,30,0.55)'; ctx.lineWidth = 3;
    for (const x of [-62, -8, 48]) { ctx.beginPath(); ctx.moveTo(x, -PICTURE.h / 2); ctx.lineTo(x, PICTURE.h / 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(-6, -PICTURE.h / 2, 30, PICTURE.h);

    ctx.save();
    ctx.rotate(-0.12); // geneigter Kopf
    const blond = '#e6c98d', blondDark = '#c5a064';
    // Haare hinter dem Kopf, lang über die Schultern
    ctx.fillStyle = blond;
    roundRect(ctx, -82, -92, 164, 270, 74); ctx.fill();
    // dunkles Oberteil
    ctx.fillStyle = '#1f1d22';
    roundRect(ctx, -86, 78, 176, 130, 46); ctx.fill();
    // Hals und Gesicht
    ctx.fillStyle = '#f2cfa6';
    roundRect(ctx, -20, 40, 40, 56, 14); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -4, 54, 62, 0, 0, Math.PI * 2); ctx.fill();
    // Scheitel mit dunklerem Ansatz
    ctx.fillStyle = blondDark;
    ctx.beginPath(); ctx.ellipse(0, -30, 60, 46, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
    ctx.fillStyle = blond;
    ctx.beginPath(); ctx.moveTo(-58, -34); ctx.quadraticCurveTo(-30, -74, 6, -62); ctx.quadraticCurveTo(-34, -48, -52, -4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(58, -34); ctx.quadraticCurveTo(34, -72, 6, -62); ctx.quadraticCurveTo(40, -44, 54, 0); ctx.closePath(); ctx.fill();
    // Strähnen, die über Schulter und Oberteil fallen
    ctx.strokeStyle = blond; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-50, 20); ctx.quadraticCurveTo(-64, 90, -40, 170); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(50, 16); ctx.quadraticCurveTo(70, 80, 52, 168); ctx.stroke();
    // vom Wind verwehte Strähnen quer nach rechts
    ctx.lineWidth = 5; ctx.strokeStyle = blondDark;
    ctx.beginPath(); ctx.moveTo(-44, 40); ctx.quadraticCurveTo(20, 74, 92, 58); ctx.stroke();
    ctx.strokeStyle = blond;
    ctx.beginPath(); ctx.moveTo(-40, 60); ctx.quadraticCurveTo(24, 100, 96, 96); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(40, -30); ctx.quadraticCurveTo(78, -10, 100, 22); ctx.stroke();
    // Ohrstecker
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-52, 14, 4, 0, Math.PI * 2); ctx.fill();
    // Augen
    ctx.fillStyle = '#3a2c1c';
    ctx.beginPath(); ctx.arc(-20, -6, 6, 0, Math.PI * 2); ctx.arc(20, -6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    // Augenbrauen: freundlich bis genervt
    ctx.beginPath(); ctx.moveTo(-32, -24 - annoyed * 4); ctx.lineTo(-10, -24 + annoyed * 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, -24 - annoyed * 4); ctx.lineTo(10, -24 + annoyed * 9); ctx.stroke();
    // Mund: leichtes Lächeln bis schmaler Strich nach unten
    ctx.strokeStyle = '#b5584f';
    ctx.beginPath(); ctx.moveTo(-16, 24); ctx.quadraticCurveTo(0, 24 + lerp(12, -10, annoyed), 16, 24); ctx.stroke();
    ctx.restore();
    ctx.restore();

    // Sprung im Glas
    if (hit > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * clamp(hit * 4)})`; ctx.lineWidth = 3;
        for (let i = 0; i < 7; i++) {
            const angle = (i / 7) * Math.PI * 2 + 0.4;
            const length = (40 + rand(i, 3) * 70) * easeOut(clamp(hit * 3));
            ctx.beginPath(); ctx.moveTo(30, -40);
            ctx.lineTo(30 + Math.cos(angle) * length * 0.5 + rand(i, 5) * 12, -40 + Math.sin(angle) * length * 0.5);
            ctx.lineTo(30 + Math.cos(angle) * length, -40 + Math.sin(angle) * length);
            ctx.stroke();
        }
    }

    // Namensschild
    ctx.fillStyle = '#2b2118';
    roundRect(ctx, -84, PICTURE.h / 2 - 8, 168, 46, 8); ctx.fill();
    ctx.fillStyle = '#f4d58a';
    ctx.textAlign = 'center';
    fitFont(ctx, name.toUpperCase(), HEADING, 36, 20, 150);
    ctx.fillText(name.toUpperCase(), 0, PICTURE.h / 2 + 26);
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

    // die Becher bleiben unberührt stehen
    for (const spot of OPP_CUPS) {
        const p = tablePoint(spot.u, spot.v);
        drawCup(ctx, p.x, p.y, p.scale);
    }

    // Ball: fliegt in Schlangenlinien am Tisch vorbei aufs Bild und fällt dann herunter
    const k = ramp(time, THROW_AT, THROW_MS);
    const target = { x: PICTURE.x + 30, y: PICTURE.y - 40 };
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
