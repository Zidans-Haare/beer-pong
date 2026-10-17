import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sceneTimeline, type SceneModel, type SceneKey } from './wrapped-scene';

// Nachbau der Web-Audio-Schnittstelle: zählt, was wann geplant wird
const started: { kind: string; at: number }[] = [];
let now = 0;
const param = () => ({ value: 0, setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined });
const node = (extra: Record<string, unknown> = {}) => {
    const n: Record<string, unknown> = { connect: (target: unknown) => target, disconnect: () => undefined, ...extra };
    return n;
};
class FakeAudioContext {
    state = 'running';
    sampleRate = 100;
    destination = node();
    get currentTime() { return now; }
    createGain() { return node({ gain: param() }); }
    createDynamicsCompressor() { return node({ threshold: param(), ratio: param() }); }
    createMediaStreamDestination() { return node({ stream: { getAudioTracks: () => [] } }); }
    createBiquadFilter() { return node({ type: 'lowpass', frequency: param() }); }
    createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) }; }
    createOscillator() { return node({ type: 'sine', frequency: param(), start: (at: number) => started.push({ kind: 'osc', at }), stop: () => undefined }); }
    createBufferSource() { return node({ buffer: null, loop: false, start: (at: number) => started.push({ kind: 'noise', at }), stop: () => undefined }); }
    // wie im Browser: der Zustand wechselt erst verzögert
    resume() { return new Promise<void>(r => setTimeout(() => { this.state = 'running'; r(); }, 5)); }
    suspend() { return new Promise<void>(r => setTimeout(() => { this.state = 'suspended'; r(); }, 1)); }
    close() { return Promise.resolve(); }
}

const keys: SceneKey[] = ['table', 'setup', 'throw', 'rally', 'win', 'final'];
const model: SceneModel = {
    title: 'Wrapped 2026', playerName: 'Nick', opponentName: 'Heber', primary: '#006b50', winLabel: 'SIEG!',
    segments: keys.map(key => ({ key, eyebrow: 'E', value: '1', title: 'T', lines: [] })),
};

describe('WrappedAudio', () => {
    beforeEach(() => {
        started.length = 0;
        now = 0;
        vi.stubGlobal('window', { AudioContext: FakeAudioContext });
    });

    it('plant Musik und Effekte über die ganze Szene, ohne etwas hinter das Ende zu legen', async () => {
        const { WrappedAudio } = await import('./wrapped-audio');
        const tl = sceneTimeline(model);
        const audio = new WrappedAudio();
        audio.schedule(tl, 0);
        expect(started.length).toBeGreaterThan(300);
        const last = Math.max(...started.map(s => s.at));
        expect(last).toBeLessThanOrEqual(tl.total / 1000 + 0.2);
        // Tonuhr und Szenenzeit laufen gleich
        now = 5;
        expect(Math.round(audio.positionMs())).toBe(4920);
    });

    it('plant beim Springen nur noch, was nach der Stelle liegt', async () => {
        const { WrappedAudio } = await import('./wrapped-audio');
        const tl = sceneTimeline(model);
        const audio = new WrappedAudio();
        audio.schedule(tl, 0);
        const all = started.length;
        started.length = 0;
        audio.schedule(tl, tl.win);
        expect(started.length).toBeLessThan(all / 2);
        // nichts wird in die Vergangenheit gelegt
        expect(Math.min(...started.map(s => s.at))).toBeGreaterThanOrEqual(0);
    });

    it('läuft am Ende, wenn Anhalten und Weiterlaufen kurz nacheinander kommen', async () => {
        const { WrappedAudio } = await import('./wrapped-audio');
        const audio = new WrappedAudio();
        // wie beim doppelten Start in der Entwicklung: erst anhalten, sofort wieder starten
        const suspended = audio.suspend();
        const resumed = audio.resume();
        await Promise.all([suspended, resumed]);
        await new Promise(r => setTimeout(r, 30));
        expect(audio.ctx.state).toBe('running');

        // und umgekehrt bleibt er aus, wenn zuletzt Anhalten gewünscht war
        const r2 = audio.resume();
        const s2 = audio.suspend();
        await Promise.all([r2, s2]);
        await new Promise(r => setTimeout(r, 30));
        expect(audio.ctx.state).toBe('suspended');
    });
});
