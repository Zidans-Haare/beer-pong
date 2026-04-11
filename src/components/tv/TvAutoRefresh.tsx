'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TvAutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
    const router = useRouter();

    useEffect(() => {
        const id = setInterval(() => {
            router.refresh();
        }, intervalMs);
        return () => clearInterval(id);
    }, [intervalMs, router]);

    return null;
}
