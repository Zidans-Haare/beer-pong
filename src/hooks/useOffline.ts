'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  queueAction,
  getPendingActionCount,
  syncPendingActions,
  PendingAction,
} from '@/lib/offlineStore';
import { haptic } from '@/lib/haptics';

/**
 * Hook for handling offline state and pending actions
 */
export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update online status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      haptic.success();
    };

    const handleOffline = () => {
      setIsOnline(false);
      haptic.warning();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const count = await getPendingActionCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  // Queue an action for later sync
  const queueOfflineAction = useCallback(
    async (type: PendingAction['type'], payload: unknown) => {
      const id = await queueAction({ type, payload });
      await updatePendingCount();
      return id;
    },
    [updatePendingCount]
  );

  // Sync all pending actions
  const sync = useCallback(
    async (processor: (action: PendingAction) => Promise<boolean>) => {
      if (!isOnline || isSyncing) return { success: 0, failed: 0 };

      setIsSyncing(true);
      try {
        const result = await syncPendingActions(processor);
        await updatePendingCount();

        if (result.success > 0) {
          haptic.success();
        }

        return result;
      } finally {
        setIsSyncing(false);
      }
    },
    [isOnline, isSyncing, updatePendingCount]
  );

  return {
    isOnline,
    isOffline: !isOnline,
    pendingCount,
    isSyncing,
    queueOfflineAction,
    sync,
    updatePendingCount,
  };
}

export default useOffline;
