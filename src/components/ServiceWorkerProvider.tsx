'use client';

import { useEffect } from 'react';
import { registerSW } from '@/lib/serviceWorker';

/**
 * Handles Service Worker registration on app load
 */
export default function ServiceWorkerProvider() {
  useEffect(() => {
    registerSW({
      onUpdate: (registration) => {
        console.log('[App] New version available');
        // The ServiceWorkerUpdate component handles the UI for this
      },
      onSuccess: (registration) => {
        console.log('[App] App is ready for offline use');
      },
    });
  }, []);

  return null;
}
