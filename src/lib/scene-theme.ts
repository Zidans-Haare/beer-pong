// Hintergründe der Szenen (Minispiel, Wrapped, Turnierfilm). Jeder wählt seinen im Profil, Standard ist das Stadion.
// Gezeichnet wird nur der Raum hinter dem Tisch und der Boden davor; Tisch, Becher und Figuren kommen darüber.
// `cheer` (0 bis 1) lässt die Szene jubeln: Fans springen auf, Blitze, Licht.

import { SCENE_WIDTH, SCENE_HEIGHT, CENTER_X, HEADING, rand, shade, drawBackdrop } from '@/lib/wrapped-scene';

export const SCENE_THEMES = ['stadium', 'classic', 'bar', 'beach', 'club'] as const;
export type SceneTheme = typeof SCENE_THEMES[number];
export const DEFAULT_THEME: SceneTheme = 'stadium';
export const isSceneTheme = (value: unknown): value is SceneTheme => typeof value === 'string' && (SCENE_THEMES as readonly string[]).includes(value);

// Jubel nach besonderen Momenten: springt auf 1 und klingt in `ms` ab
export function cheerAt(time: number, moments: number[], ms = 1800) {
    let cheer = 0;
    for (const at of moments) if (time >= at && time < at + ms) cheer = Math.max(cheer, 1 - (time - at) / ms);
    return cheer;
}

// Oberkante des Tisches im Bild; darunter liegt nur noch der Boden vor dem Tisch
const TABLE_FAR_Y = 960;

export function drawSceneBackdrop(ctx: CanvasRenderingContext2D, theme: SceneTheme, primary: string, time: number, beat: number, cheer = 0) {
    switch (theme) {
        case 'stadium': return drawStadium(ctx, primary, time, beat, cheer);
        case 'bar': return drawBar(ctx, primary, time, beat, cheer);
        case 'beach': return drawBeach(ctx, time, beat, cheer);
        case 'club': return drawClub(ctx, primary, time, beat, cheer);
        default: return drawBackdrop(ctx, primary, time, beat);
    }
}

// ---- Stadion: Flutlicht, Tribünen voller Fans, LED-Bande ----
const SHIRTS = ['#e4572e', '#f4f1de', '#2e86de', '#ffd23f', '#10ac84', '#8e44ad', '#ee5253', '#222f3e', '#ff9ff3', '#48dbfb'];
const SKINS = ['#fbe3c0', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a1e'];

function drawFan(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, i: number, time: number, cheer: number) {
    // jeder Fan springt etwas anders; wer jubelt, reißt die Arme hoch
    const own = rand(i, 3);
    const excited = cheer > 0 && own < 0.35 + cheer * 0.65;
    const jump = excited ? Math.abs(Math.sin(time / (150 + own * 70) + i)) * 18 * s * cheer : Math.sin(time / (700 + own * 400) + i) * 1.5 * s;
    const shirt = SHIRTS[Math.floor(rand(i, 4) * SHIRTS.length)];
    const skin = SKINS[Math.floor(rand(i, 5) * SKINS.length)];
    const by = y - jump;
    ctx.fillStyle = shirt;
    ctx.beginPath(); ctx.roundRect(x - 15 * s, by - 26 * s, 30 * s, 34 * s, 10 * s); ctx.fill();
    if (excited) {
        ctx.strokeStyle = shirt; ctx.lineWidth = 7 * s; ctx.lineCap = 'round';
        const wave = Math.sin(time / 120 + i) * 6 * s;
        ctx.beginPath(); ctx.moveTo(x - 12 * s, by - 20 * s); ctx.lineTo(x - 20 * s + wave, by - 52 * s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 12 * s, by - 20 * s); ctx.lineTo(x + 20 * s - wave, by - 52 * s); ctx.stroke();
    }
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(x, by - 36 * s, 11 * s, 0, Math.PI * 2); ctx.fill();
    // manche haben eine Mütze oder einen Schal in Vereinsfarbe
    if (rand(i, 6) < 0.25) { ctx.fillStyle = shirt === SHIRTS[1] ? '#e4572e' : '#f4f1de'; ctx.beginPath(); ctx.arc(x, by - 40 * s, 11 * s, Math.PI, 0); ctx.fill(); }
}

function drawStadium(ctx: CanvasRenderingContext2D, primary: string, time: number, beat: number, cheer: number) {
    // Nachthimmel
    const sky = ctx.createLinearGradient(0, 0, 0, 700);
    sky.addColorStop(0, '#060b1d'); sky.addColorStop(1, '#16224a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    // Dach der Tribüne
    ctx.fillStyle = '#0b1022';
    ctx.beginPath(); ctx.moveTo(0, 230); ctx.lineTo(SCENE_WIDTH, 230); ctx.lineTo(SCENE_WIDTH, 300); ctx.lineTo(0, 300); ctx.fill();
    // Tribüne: Ränge von hinten (klein, weit oben) nach vorn (groß, unten)
    const rows = 6;
    for (let r = 0; r < rows; r++) {
        const k = r / (rows - 1);
        const y = 330 + r * 96 + k * k * 20;
        const s = 0.62 + k * 0.5;
        ctx.fillStyle = r % 2 ? '#1a2240' : '#1e2749';
        ctx.fillRect(0, y - 70 * s, SCENE_WIDTH, 96 * s + 4);
        const step = 46 * s;
        const offset = (r % 2) * step * 0.5;
        for (let x = -step + offset, n = 0; x < SCENE_WIDTH + step; x += step, n++) {
            const id = r * 100 + n;
            // ein paar Lücken, damit es nicht wie Tapete aussieht
            if (rand(id, 2) < 0.08) continue;
            drawFan(ctx, x + (rand(id, 1) - 0.5) * 8, y, s, id, time, cheer);
        }
    }
    // Kamerablitze im Publikum, beim Jubeln viele
    const flashes = 3 + Math.round(cheer * 18);
    for (let i = 0; i < flashes; i++) {
        const slot = Math.floor(time / 140) + i * 7;
        if (rand(slot, 9) > 0.55) continue;
        const fx = rand(slot, 10) * SCENE_WIDTH, fy = 300 + rand(slot, 11) * 520;
        const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, 26);
        glow.addColorStop(0, 'rgba(255,255,255,0.95)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(fx, fy, 26, 0, Math.PI * 2); ctx.fill();
    }
    // Flutlichtmasten mit Lichtkegeln
    for (const side of [-1, 1]) {
        const lx = CENTER_X + side * 470, ly = 120;
        const cone = ctx.createRadialGradient(lx, ly, 20, lx, ly, 1100);
        cone.addColorStop(0, `rgba(255,250,225,${0.32 + 0.1 * beat + 0.15 * cheer})`); cone.addColorStop(1, 'rgba(255,250,225,0)');
        ctx.fillStyle = cone;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(CENTER_X - side * 120, SCENE_HEIGHT); ctx.lineTo(CENTER_X + side * 520, SCENE_HEIGHT); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e9eef7';
        for (let gx = 0; gx < 4; gx++) for (let gy = 0; gy < 2; gy++) {
            ctx.beginPath(); ctx.arc(lx - 45 + gx * 30, ly - 15 + gy * 30, 11, 0, Math.PI * 2); ctx.fill();
        }
    }
    // LED-Bande hinter dem Tisch, läuft durch
    const boardY = 860, boardH = 70;
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, boardY, SCENE_WIDTH, boardH);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, boardY, SCENE_WIDTH, boardH); ctx.clip();
    ctx.font = `700 50px ${HEADING}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cheer > 0.2 && Math.floor(time / 160) % 2 ? '#ffd23f' : shade(primary, 1.9);
    const text = '  BIER PONG  ·  ';
    const w = ctx.measureText(text).width;
    for (let x = -((time / 8) % w); x < SCENE_WIDTH; x += w) ctx.fillText(text, x, boardY + boardH / 2 + 2);
    ctx.restore();
    // Boden vor dem Tisch: dunkler Rasen mit Mähstreifen
    const floor = ctx.createLinearGradient(0, TABLE_FAR_Y, 0, SCENE_HEIGHT);
    floor.addColorStop(0, '#13261c'); floor.addColorStop(1, '#070d0a');
    ctx.fillStyle = floor;
    ctx.fillRect(0, boardY + boardH, SCENE_WIDTH, SCENE_HEIGHT - boardY - boardH);
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let i = 0; i < 6; i += 2) ctx.fillRect(i * 180, boardY + boardH, 180, SCENE_HEIGHT);
}

// ---- Kneipe: Ziegelwand, Neonschild, Regal mit Flaschen, Hängelampen ----
function drawBar(ctx: CanvasRenderingContext2D, primary: string, time: number, beat: number, cheer: number) {
    const wall = ctx.createLinearGradient(0, 0, 0, TABLE_FAR_Y);
    wall.addColorStop(0, '#2b1710'); wall.addColorStop(1, '#45261a');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    // Ziegelfugen
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3;
    for (let y = 40, row = 0; y < TABLE_FAR_Y; y += 46, row++) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SCENE_WIDTH, y); ctx.stroke();
        for (let x = (row % 2) * 60; x < SCENE_WIDTH; x += 120) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 46); ctx.stroke(); }
    }
    // Neonschild, flackert gelegentlich
    const flicker = rand(Math.floor(time / 90), 3) < 0.04 ? 0.35 : 1;
    ctx.save();
    ctx.font = `700 150px ${HEADING}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = (30 + 20 * beat + 40 * cheer) * flicker;
    ctx.fillStyle = `rgba(255,170,215,${0.95 * flicker})`;
    ctx.fillText('BIER PONG', CENTER_X, 250);
    ctx.restore();
    // Regal mit Flaschen
    const shelfY = 640;
    ctx.fillStyle = '#5a3420'; ctx.fillRect(80, shelfY, SCENE_WIDTH - 160, 22);
    const bottles = ['#2f6b3a', '#7a4a12', '#b8860b', '#3d5a80', '#2f6b3a', '#8b2e2e', '#b8860b', '#7a4a12', '#3d5a80', '#2f6b3a'];
    bottles.forEach((c, i) => {
        const bx = 140 + i * 88, h = 120 + rand(i, 2) * 50;
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.roundRect(bx - 20, shelfY - h, 40, h, [16, 16, 4, 4]); ctx.fill();
        ctx.fillRect(bx - 8, shelfY - h - 36, 16, 40);
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(bx - 12, shelfY - h + 14, 6, h - 30);
    });
    // Hängelampen mit warmem Licht, schwingen beim Jubeln
    for (const lx of [260, CENTER_X, 820]) {
        const swing = Math.sin(time / 500 + lx) * 6 * (0.3 + cheer);
        const x = lx + swing;
        ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(x, 420); ctx.stroke();
        ctx.fillStyle = '#1d1d1d';
        ctx.beginPath(); ctx.moveTo(x - 50, 470); ctx.lineTo(x + 50, 470); ctx.lineTo(x + 22, 420); ctx.lineTo(x - 22, 420); ctx.fill();
        const light = ctx.createRadialGradient(x, 470, 10, x, 470, 620);
        light.addColorStop(0, `rgba(255,205,130,${0.4 + 0.1 * beat + 0.15 * cheer})`); light.addColorStop(1, 'rgba(255,205,130,0)');
        ctx.fillStyle = light;
        ctx.beginPath(); ctx.moveTo(x - 50, 470); ctx.lineTo(x + 50, 470); ctx.lineTo(x + 380, SCENE_HEIGHT); ctx.lineTo(x - 380, SCENE_HEIGHT); ctx.fill();
    }
    // Holzboden
    const floor = ctx.createLinearGradient(0, TABLE_FAR_Y - 40, 0, SCENE_HEIGHT);
    floor.addColorStop(0, '#3b2416'); floor.addColorStop(1, '#170d07');
    ctx.fillStyle = floor;
    ctx.fillRect(0, TABLE_FAR_Y - 40, SCENE_WIDTH, SCENE_HEIGHT);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
    for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(CENTER_X + i * 40, TABLE_FAR_Y - 40); ctx.lineTo(CENTER_X + i * 260, SCENE_HEIGHT); ctx.stroke(); }
    void primary;
}

// ---- Strand: Sonnenuntergang, Meer, Palmen ----
function drawBeach(ctx: CanvasRenderingContext2D, time: number, beat: number, cheer: number) {
    const sky = ctx.createLinearGradient(0, 0, 0, 760);
    sky.addColorStop(0, '#2b1b5a'); sky.addColorStop(0.55, '#e0567a'); sky.addColorStop(1, '#ffb15e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    // Sonne am Horizont
    const sun = ctx.createRadialGradient(CENTER_X, 740, 20, CENTER_X, 740, 360);
    sun.addColorStop(0, '#fff3c4'); sun.addColorStop(0.35, `rgba(255,214,120,${0.9 + 0.1 * cheer})`); sun.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = sun;
    ctx.beginPath(); ctx.arc(CENTER_X, 740, 360, 0, Math.PI * 2); ctx.fill();
    // Meer mit Glitzern
    const sea = ctx.createLinearGradient(0, 760, 0, 940);
    sea.addColorStop(0, '#5a3d8a'); sea.addColorStop(1, '#2d6f9e');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 760, SCENE_WIDTH, 180);
    for (let i = 0; i < 18; i++) {
        const y = 775 + rand(i, 1) * 150;
        const w = 40 + rand(i, 2) * 90;
        const x = (rand(i, 3) * SCENE_WIDTH + time / (40 + rand(i, 4) * 40)) % (SCENE_WIDTH + w) - w;
        ctx.fillStyle = `rgba(255,230,180,${0.25 + 0.2 * Math.sin(time / 400 + i) ** 2})`;
        ctx.fillRect(x, y, w, 4);
    }
    // Palmen als Schattenrisse
    for (const [px, flip] of [[70, 1], [1010, -1]] as const) {
        ctx.strokeStyle = '#1a0f22'; ctx.lineWidth = 26; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px, 960); ctx.quadraticCurveTo(px + flip * 60, 600, px + flip * 30, 300); ctx.stroke();
        ctx.fillStyle = '#1a0f22';
        for (let l = 0; l < 6; l++) {
            const a = (-Math.PI / 2) + (l - 2.5) * 0.55 + Math.sin(time / 900 + l) * 0.05 * (1 + cheer * 2);
            ctx.save(); ctx.translate(px + flip * 30, 300); ctx.rotate(a);
            ctx.beginPath(); ctx.ellipse(110, 0, 120, 22, 0.15, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }
    // Sand
    const sand = ctx.createLinearGradient(0, 930, 0, SCENE_HEIGHT);
    sand.addColorStop(0, '#e9c08a'); sand.addColorStop(1, '#a8794a');
    ctx.fillStyle = sand;
    ctx.fillRect(0, 930, SCENE_WIDTH, SCENE_HEIGHT);
    void beat;
}

// ---- Club: Discokugel, Lichtstrahlen, Stroboskop beim Jubeln ----
function drawClub(ctx: CanvasRenderingContext2D, primary: string, time: number, beat: number, cheer: number) {
    const bg = ctx.createLinearGradient(0, 0, 0, SCENE_HEIGHT);
    bg.addColorStop(0, '#12061f'); bg.addColorStop(0.6, '#1d0b33'); bg.addColorStop(1, '#05020a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    // Lichtstrahlen von der Decke, drehen sich, beim Jubeln schneller
    const colors = ['255,60,200', '60,220,255', '160,90,255', '255,210,60'];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) {
        const ox = 120 + (i % 4) * 280, oy = 0;
        const a = Math.PI / 2 + Math.sin(time / (900 - cheer * 500) + i * 1.7) * 0.7;
        const len = 1500;
        const grad = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len);
        grad.addColorStop(0, `rgba(${colors[i % 4]},${0.3 + 0.1 * beat})`); grad.addColorStop(1, `rgba(${colors[i % 4]},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + Math.cos(a - 0.06) * len, oy + Math.sin(a - 0.06) * len);
        ctx.lineTo(ox + Math.cos(a + 0.06) * len, oy + Math.sin(a + 0.06) * len);
        ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // Discokugel mit Glitzern
    const bx = CENTER_X, by = 170;
    ctx.strokeStyle = '#555'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, by - 70); ctx.stroke();
    const ball = ctx.createRadialGradient(bx - 25, by - 25, 10, bx, by, 75);
    ball.addColorStop(0, '#ffffff'); ball.addColorStop(1, '#6b6b86');
    ctx.fillStyle = ball;
    ctx.beginPath(); ctx.arc(bx, by, 72, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 26; i++) {
        const tw = Math.sin(time / 200 + i * 3) ** 8;
        if (tw < 0.2) continue;
        const sx = rand(i, 1) * SCENE_WIDTH, sy = rand(i, 2) * 900;
        ctx.fillStyle = `rgba(255,255,255,${tw * 0.8})`;
        ctx.beginPath(); ctx.arc(sx, sy, 3 + tw * 3, 0, Math.PI * 2); ctx.fill();
    }
    // Boden mit farbigem Schein
    const floor = ctx.createLinearGradient(0, TABLE_FAR_Y - 20, 0, SCENE_HEIGHT);
    floor.addColorStop(0, '#1a0a2a'); floor.addColorStop(1, '#040108');
    ctx.fillStyle = floor;
    ctx.fillRect(0, TABLE_FAR_Y - 20, SCENE_WIDTH, SCENE_HEIGHT);
    const glow = ctx.createRadialGradient(CENTER_X, 1500, 50, CENTER_X, 1500, 700);
    glow.addColorStop(0, `${shade(primary, 1.4).replace('rgb', 'rgba').replace(')', `,${0.25 + 0.15 * beat})`)}`); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, TABLE_FAR_Y, SCENE_WIDTH, SCENE_HEIGHT);
    // Stroboskop beim Jubeln
    if (cheer > 0.3 && Math.floor(time / 90) % 3 === 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.18 * cheer})`;
        ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    }
}
