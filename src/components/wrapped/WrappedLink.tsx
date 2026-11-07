'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { primeWrappedAudio } from '@/lib/wrapped-audio';

// Link zum Rückblick. Schaltet beim Tippen schon den Ton frei, damit er ab dem ersten Bild läuft.
export default function WrappedLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
    return <Link href={href} className={className} onClick={primeWrappedAudio}>{children}</Link>;
}
