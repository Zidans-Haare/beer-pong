'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { updatePwaStatus } from '@/app/actions/auth';

export default function PWATracker() {
    const { data: session } = useSession();
    const synced = useRef(false);

    useEffect(() => {
        // Run only once per session client-side
        if (!session?.user || synced.current) return;
        
        // Check if app is running in standalone mode (PWA)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        
        if (isStandalone) {
            const syncKey = 'pwa_synced_' + session.user.id;
            const hasSynced = localStorage.getItem(syncKey);
            
            if (!hasSynced) {
                updatePwaStatus(true).then(() => {
                    localStorage.setItem(syncKey, 'true');
                }).catch(err => {
                    console.error('Failed to update PWA status:', err);
                });
            }
        }
        
        synced.current = true;
    }, [session]);

    return null;
}
