import { WrappedAudio, audioSupported } from '@/lib/wrapped-audio';
import { BEAT_MS } from '@/lib/wrapped-scene';
import type { FilmTimeline } from '@/lib/tournament-scene';

// Ton für den Turnierfilm: gleiche Bausteine und Akkorde wie beim Wrapped, an die Zeitachse des Films gehängt.
// Vor dem entscheidenden Wurf setzt die Musik aus, man hört nur noch den Herzschlag.

const BARS = [
    { bass: 110.0, chord: [440.0, 523.25, 659.25] },
    { bass: 87.31, chord: [349.23, 440.0, 523.25] },
    { bass: 130.81, chord: [523.25, 659.25, 783.99] },
    { bass: 98.0, chord: [392.0, 493.88, 587.33] },
];

export class FilmAudio extends WrappedAudio {
    scheduleFilm(tl: FilmTimeline, fromMs: number) {
        this.stop();
        this.origin = this.ctx.currentTime + 0.08 - fromMs / 1000;
        this.scheduled = true;
        const at = (ms: number) => this.origin + ms / 1000;
        const due = (ms: number) => Number.isFinite(ms) && ms >= fromMs - 20;
        const beat = BEAT_MS;
        const last = tl.throws.find(th => th.last);
        // Stille für die Zeitlupe
        const hushFrom = last ? last.start - 350 : Infinity, hushTo = last ? last.start + last.flight : -Infinity;

        // ---- Musik ----
        const beats = Math.ceil(tl.total / beat);
        for (let b = 0; b < beats; b++) {
            const ms = b * beat;
            if (ms >= tl.total - 1600) break;
            if (ms >= hushFrom && ms < hushTo) continue;
            const bar = BARS[Math.floor(b / 4) % BARS.length];
            const calm = ms >= tl.facts;
            const driving = !calm && ((ms >= tl.final && ms < tl.podium) || (ms >= tl.win && ms < tl.facts) || (ms >= tl.podium + 1200 && ms < tl.facts));
            for (let half = 0; half < 2; half++) {
                const t = ms + half * beat / 2;
                if (due(t)) this.tone(this.music, at(t), bar.chord[(b * 2 + half) % 3] * (driving && half === 1 ? 2 : 1), 0.22, 'triangle', calm ? 0.12 : 0.16);
            }
            if (ms >= 800 && !calm) {
                if (due(ms)) this.tone(this.music, at(ms), 150, 0.2, 'sine', 0.9, 42);
                if (due(ms + beat / 2)) this.noise(this.music, at(ms + beat / 2), 0.05, 0.16, 'highpass', 7000);
            }
            if (driving) {
                if (b % 2 === 1 && due(ms)) this.noise(this.music, at(ms), 0.11, 0.3, 'bandpass', 1700);
                for (let half = 0; half < 2; half++) {
                    const t = ms + half * beat / 2;
                    if (due(t)) this.tone(this.music, at(t), bar.bass * (half ? 2 : 1), 0.2, 'sawtooth', 0.34, undefined, 420);
                }
            }
        }
        if (due(tl.total - 1500)) for (const f of [220, 261.63, 329.63, 440]) this.tone(this.music, at(tl.total - 1500), f, 1.4, 'triangle', 0.14);

        // ---- Aufbau am Tisch ----
        if (due(150)) this.noise(this.sfx, at(150), 0.9, 0.12, 'lowpass', 300, 1800);
        tl.nearCupPops.forEach((ms, i) => { if (due(ms)) this.tone(this.sfx, at(ms), 380 + i * 42, 0.09, 'sine', 0.26, 760 + i * 60); });
        tl.farCupPops.forEach((ms, i) => { if (due(ms)) this.tone(this.sfx, at(ms), 620 + i * 36, 0.07, 'sine', 0.18, 1100 + i * 40); });
        if (due(tl.nearEnter)) this.tone(this.sfx, at(tl.nearEnter), 130, 0.2, 'sine', 0.4, 70);
        if (due(tl.farEnter)) { this.tone(this.sfx, at(tl.farEnter), 196, 0.16, 'square', 0.12, undefined, 900); this.tone(this.sfx, at(tl.farEnter + 170), 146.83, 0.26, 'square', 0.12, undefined, 900); }

        // ---- Würfe ----
        let winnerHits = 0;
        for (const th of tl.throws) {
            const hit = th.start + th.flight;
            if (th.last) {
                // Zeitlupe: Herzschlag, anschwellendes Rauschen, dann der große Treffer
                for (let ms = th.start - 250; ms < hit - 250; ms += 520) {
                    if (due(ms)) this.tone(this.sfx, at(ms), 70, 0.14, 'sine', 0.8, 45);
                    if (due(ms + 170)) this.tone(this.sfx, at(ms + 170), 60, 0.16, 'sine', 0.55, 40);
                }
                if (due(th.start)) {
                    this.noise(this.sfx, at(th.start), th.flight / 1000, 0.22, 'bandpass', 300, 4200);
                    this.tone(this.sfx, at(th.start), 180, th.flight / 1000, 'sawtooth', 0.1, 720, 1400);
                }
                if (due(hit)) {
                    this.tone(this.sfx, at(hit), 110, 0.5, 'sine', 0.9, 40);
                    this.noise(this.sfx, at(hit), 0.4, 0.4, 'highpass', 2200);
                    for (const f of [880, 1108.73, 1318.51, 1760]) this.tone(this.sfx, at(hit + 50), f, 0.9, 'triangle', 0.18);
                }
                continue;
            }
            if (due(th.start)) this.noise(this.sfx, at(th.start), th.flight / 1000, th.by === 'winner' ? 0.16 : 0.1, 'bandpass', 500, 2400);
            if (!due(hit)) { if (th.by === 'winner') winnerHits++; continue; }
            if (th.by === 'winner') {
                // jeder Treffer des Siegers klingt einen Ton höher
                const base = 660 * Math.pow(2, winnerHits++ / 12);
                this.tone(this.sfx, at(hit), 520, 0.14, 'sine', 0.42, 130);
                this.noise(this.sfx, at(hit), 0.12, 0.24, 'highpass', 2600);
                this.tone(this.sfx, at(hit + 40), base, 0.25, 'triangle', 0.22);
            } else {
                this.tone(this.sfx, at(hit), 300, 0.14, 'sine', 0.36, 110);
                this.noise(this.sfx, at(hit), 0.1, 0.16, 'highpass', 1800);
            }
        }

        // ---- Sieg ----
        if (due(tl.stamp)) { this.tone(this.sfx, at(tl.stamp), 120, 0.3, 'sine', 0.7, 50); this.noise(this.sfx, at(tl.stamp), 0.25, 0.3, 'lowpass', 2400, 300); }
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
            const ms = tl.stamp + 600 + i * 120;
            if (due(ms)) this.tone(this.sfx, at(ms), f, i === 3 ? 0.9 : 0.16, 'square', 0.16, undefined, 3200);
        });
        // traurige Posaune für den Verlierer
        [233.08, 220, 207.65, 196].forEach((f, i) => {
            const ms = tl.stamp + 1900 + i * 330;
            const end = i === 3;
            if (due(ms)) this.tone(this.sfx, at(ms), f, end ? 0.9 : 0.3, 'sawtooth', 0.16, end ? f * 0.86 : undefined, 950);
        });

        // ---- Podium ----
        for (const rise of tl.stepRise) {
            if (due(rise.at)) this.tone(this.sfx, at(rise.at), 70, 0.55, 'sawtooth', 0.22, 170, 500);
            if (due(rise.at + 520)) this.tone(this.sfx, at(rise.at + 520), 110, 0.16, 'sine', 0.5, 55);
        }
        for (const landing of tl.landings) {
            // Schritte, Sprung, Landung mit Glocke; je höher die Stufe, desto heller
            for (let ms = landing.walk + 100; ms < landing.hop; ms += 190) if (due(ms)) this.noise(this.sfx, at(ms), 0.05, 0.16, 'lowpass', 500);
            if (due(landing.hop)) this.tone(this.sfx, at(landing.hop), 380, (landing.at - landing.hop) / 1000, 'sine', 0.2, 950);
            if (!due(landing.at)) continue;
            this.tone(this.sfx, at(landing.at), 130, 0.18, 'sine', 0.55, 60);
            const chime = landing.place === 3 ? [783.99] : landing.place === 2 ? [1046.5, 1318.51] : [1046.5, 1318.51, 1567.98, 2093];
            chime.forEach((f, i) => this.tone(this.sfx, at(landing.at + 120 + i * 70), f, landing.place === 1 ? 1.1 : 0.6, 'triangle', 0.22));
            if (landing.place === 1) {
                // Tusch für den Sieger
                [523.25, 523.25, 523.25, 698.46, 880].forEach((f, i) => this.tone(this.sfx, at(landing.at + 150 + [0, 140, 280, 420, 640][i]), f, i === 4 ? 1 : 0.14, 'square', 0.15, undefined, 3200));
            }
        }
        // Krone: helles Glitzern
        [1567.98, 1975.53, 2349.32, 3135.96].forEach((f, i) => {
            const ms = tl.crown + 300 + i * 60;
            if (due(ms)) this.tone(this.sfx, at(ms), f, 0.35, 'sine', 0.14);
        });

        // ---- Feuerwerk ----
        for (const ms of tl.fireworks) {
            if (!due(ms)) continue;
            this.tone(this.sfx, at(ms), 180, 0.25, 'sine', 0.3, 60);
            this.noise(this.sfx, at(ms + 40), 0.5, 0.14, 'highpass', 4200);
        }
    }
}

let shared: FilmAudio | null = null;

export function sharedFilmAudio(): FilmAudio | null {
    if (!audioSupported()) return null;
    if (!shared || shared.ctx.state === 'closed') shared = new FilmAudio();
    return shared;
}

// In einer Nutzeraktion aufrufen (Tippen auf den Play-Knopf), sonst bleibt der Browser stumm
export function primeFilmAudio() {
    try { sharedFilmAudio()?.resume(); } catch { /* ohne Ton weiter */ }
}
