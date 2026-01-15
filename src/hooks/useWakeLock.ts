'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseWakeLockOptions {
  /** Automatically request wake lock when component mounts */
  autoRequest?: boolean;
  /** Re-acquire wake lock when page becomes visible again */
  reacquireOnVisibility?: boolean;
}

interface UseWakeLockReturn {
  /** Whether wake lock is currently active */
  isActive: boolean;
  /** Whether wake lock is supported by the browser */
  isSupported: boolean;
  /** Request the wake lock */
  request: () => Promise<boolean>;
  /** Release the wake lock */
  release: () => Promise<void>;
  /** Error message if wake lock request failed */
  error: string | null;
}

/**
 * Hook to prevent the screen from sleeping using the Screen Wake Lock API.
 * Useful for keeping the display on during active tournaments or matches.
 */
export function useWakeLock(options: UseWakeLockOptions = {}): UseWakeLockReturn {
  const { autoRequest = false, reacquireOnVisibility = true } = options;

  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const shouldReacquireRef = useRef(false);

  // Check if wake lock is supported
  useEffect(() => {
    const supported = 'wakeLock' in navigator;
    setIsSupported(supported);

    if (!supported) {
      setError('Screen Wake Lock API is not supported');
    }
  }, []);

  // Request wake lock
  const request = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Screen Wake Lock API is not supported');
      return false;
    }

    try {
      // Release any existing wake lock first
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
      }

      const sentinel = await navigator.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      shouldReacquireRef.current = true;
      setIsActive(true);
      setError(null);

      // Listen for release event (e.g., when tab becomes hidden)
      sentinel.addEventListener('release', () => {
        setIsActive(false);
        wakeLockRef.current = null;
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request wake lock';
      setError(message);
      setIsActive(false);
      return false;
    }
  }, [isSupported]);

  // Release wake lock
  const release = useCallback(async (): Promise<void> => {
    shouldReacquireRef.current = false;

    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to release wake lock';
        setError(message);
      }
    }
  }, []);

  // Re-acquire wake lock when page becomes visible
  useEffect(() => {
    if (!reacquireOnVisibility || !isSupported) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && shouldReacquireRef.current) {
        await request();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reacquireOnVisibility, isSupported, request]);

  // Auto-request on mount if enabled
  useEffect(() => {
    if (autoRequest && isSupported) {
      request();
    }

    // Cleanup on unmount
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {
          // Ignore errors on cleanup
        });
      }
    };
  }, [autoRequest, isSupported, request]);

  return {
    isActive,
    isSupported,
    request,
    release,
    error,
  };
}

/**
 * Hook specifically for tournament pages.
 * Automatically manages wake lock based on tournament status.
 */
export function useTournamentWakeLock(isRunning: boolean): UseWakeLockReturn {
  const wakeLock = useWakeLock({ reacquireOnVisibility: true });

  useEffect(() => {
    if (isRunning && wakeLock.isSupported) {
      wakeLock.request();
    } else {
      wakeLock.release();
    }

    return () => {
      wakeLock.release();
    };
  }, [isRunning, wakeLock.isSupported]);

  return wakeLock;
}
