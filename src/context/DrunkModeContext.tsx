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
