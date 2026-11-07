import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimaler Ersatz für Web Audio: zählt nur, was geplant wird
function fakeContext() {
    const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
    const node = (extra: object = {}) => {
        const n: Record<string, unknown> = { connect: (to: unknown) => to ?? n, disconnect: vi.fn(), gain: param(), frequency: param(), threshold: param(), ratio: param(), ...extra };
        return n;
    };
    return class {
        currentTime = 0; sampleRate = 8000; state = 'running'; destination = node();
        createGain = () => node();
        createDynamicsCompressor = () => node();
        createMediaStreamDestination = () => node({ stream: {} });
        createBuffer = (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) });
        createOscillator = () => node({ start: vi.fn(), stop: vi.fn(), type: 'sine' });
        createBufferSource = () => node({ start: vi.fn(), stop: vi.fn() });
        createBiquadFilter = () => node({ type: 'lowpass' });
        resume = async () => undefined; suspend = async () => undefined; close = async () => undefined;
    };
}

describe('DrunkAudio', () => {
    beforeEach(() => { vi.stubGlobal('window', { AudioContext: fakeContext() }); });

    it('plant die ganze Szene ohne Fehler', async () => {
        const { DrunkAudio } = await import('./drunk-audio');
        const audio = new DrunkAudio();
        expect(() => audio.scheduleDrunk(0)).not.toThrow();
        expect(audio.running).toBe(true);
        // Ein Teil der Quellen: Musik und Effekte
        expect((audio as unknown as { sources: unknown[] }).sources.length).toBeGreaterThan(40);
    });

    it('plant beim Springen nur die Rest-Szene', async () => {
        const { DrunkAudio } = await import('./drunk-audio');
        const audio = new DrunkAudio();
        audio.scheduleDrunk(0);
        const all = (audio as unknown as { sources: unknown[] }).sources.length;
        audio.scheduleDrunk(4500);
        expect((audio as unknown as { sources: unknown[] }).sources.length).toBeLessThan(all);
    });

    it('spielt den nüchternen Ton beim Ausschalten', async () => {
        const { DrunkAudio } = await import('./drunk-audio');
        const audio = new DrunkAudio();
        expect(() => audio.playSober()).not.toThrow();
        expect((audio as unknown as { sources: unknown[] }).sources.length).toBe(4);
    });
});
