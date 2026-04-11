'use client';

import { useEffect, useRef } from 'react';
import { updatePwaStatus } from '@/app/actions/auth';

export default function PWATracker({ userId }: { userId?: string }) {
    const synced = useRef(false);

    useEffect(() => {
        // Run only once per session client-side
        if (!userId || synced.current) return;
        
        // Check if app is running in standalone mode (PWA)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        
        if (isStandalone) {
            const syncKey = 'pwa_synced_' + userId;
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
    }, [userId]);

    return null;
}
