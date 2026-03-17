'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

    useEffect(() => {
        setMounted(true);
        setIsDrunk(localStorage.getItem('drunkMode') === 'true');
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
        setIsDrunk(v => {
            const next = !v;
            localStorage.setItem('drunkMode', String(next));
            return next;
        });
    };

    return (
        <DrunkModeContext.Provider value={{ isDrunk, toggle }}>
            {children}
        </DrunkModeContext.Provider>
    );
}

export function useDrunkMode() {
    return useContext(DrunkModeContext);
}
