'use client';

import { useDrunkMode } from '@/context/DrunkModeContext';
import { ReactNode } from 'react';

// show="sober" → only visible when NOT drunk
// show="drunk"  → only visible when drunk
export default function DrunkModeConditional({
    children,
    show,
}: {
    children: ReactNode;
    show: 'sober' | 'drunk';
}) {
    const { isDrunk } = useDrunkMode();

    if (show === 'sober' && isDrunk) return null;
    if (show === 'drunk' && !isDrunk) return null;

    return <>{children}</>;
}
