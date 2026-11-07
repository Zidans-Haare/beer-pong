'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Szene und Zeichencode nur laden, wenn der Modus eingeschaltet wird
const DrunkIntro = dynamic(() => import('@/components/DrunkIntro'), { ssr: false });

interface DrunkModeContextType {
    isDrunk: boolean;
    toggle: () => void;
}

const DrunkModeContext = createContext<DrunkModeContextType>({
    isDrunk: false,
    toggle: () => {},
});

export function DrunkModeProvider({ children }: { children: ReactNode }) {
    const [isDrunk, setIsDrunk] = useState(false);
    const [mounted, setMounted] = useState(false);
    // Szene läuft nur beim Einschalten, nicht beim Laden mit gespeichertem Modus
    const [intro, setIntro] = useState(false);
    const [frozenAt, setFrozenAt] = useState<number | undefined>(undefined);

    useEffect(() => {
        setMounted(true);
        setIsDrunk(localStorage.getItem('drunkMode') === 'true');
        // nur in der Entwicklung: ?drunkIntro=<ms> zeigt ein Standbild der Szene
        if (process.env.NODE_ENV !== 'production') {
            const at = new URLSearchParams(window.location.search).get('drunkIntro');
            if (at !== null && !isNaN(Number(at))) { setFrozenAt(Number(at)); setIntro(true); }
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (isDrunk) {
            document.body.classList.add('drunk-mode');
        } else {
            document.body.classList.remove('drunk-mode');
        }
    }, [isDrunk, mounted]);

    // Die Statusleiste des Handys (neben Notch bzw. Dynamic Island) gehört nicht zur Seite und lässt sich
    // nicht verwischen. Ihre Farbe kommt aber von theme-color, also pulsiert die im Rausch mit.
    useEffect(() => {
        if (!mounted || !isDrunk) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        // Next tauscht die Meta-Tags beim Seitenwechsel aus, deshalb bei jedem Schritt neu suchen
        const find = () => Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
        const original = find()[0]?.content ?? '#fafbfb';
        const started = performance.now();
        const mix = (from: number[], to: number[], t: number) => `rgb(${from.map((v, i) => Math.round(v + (to[i] - v) * t)).join(', ')})`;
        const tick = () => {
            // gleicher Takt wie die Unschärfe-Wellen des Schleiers (6,5 s)
            const phase = ((performance.now() - started) % 6500) / 6500;
            const wave = Math.max(0, Math.sin(phase * Math.PI * 4 - 0.6)) ** 2;
            const color = mix([250, 251, 251], [244, 190, 150], wave * 0.9);
            for (const meta of find()) meta.content = color;
        };
        tick();
        const timer = setInterval(tick, 250);
        return () => {
            clearInterval(timer);
            for (const meta of find()) meta.content = original;
        };
    }, [isDrunk, mounted]);

    const toggle = () => {
        const next = !isDrunk;
        localStorage.setItem('drunkMode', String(next));
        setIsDrunk(next);
        // wer Bewegung reduziert hat, bekommt keine Szene
        const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setIntro(next && !calm);
    };

    return (
        <DrunkModeContext.Provider value={{ isDrunk, toggle }}>
            {children}
            {/* Schleier, der die Seite in Wellen verschwimmen lässt; Dialoge liegen darüber und bleiben scharf */}
            {mounted && isDrunk && <div className="drunk-fx" aria-hidden="true" />}
            {intro && <DrunkIntro frozenAt={frozenAt} onDone={() => { setIntro(false); setFrozenAt(undefined); }} />}
        </DrunkModeContext.Provider>
    );
}

export function useDrunkMode() {
    return useContext(DrunkModeContext);
}
