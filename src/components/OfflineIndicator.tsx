'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { haptic } from '@/lib/haptics';

/**
 * Shows a banner when the user goes offline/online
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowBanner(true);
        haptic.success();
        // Auto-hide after 3 seconds
        setTimeout(() => setShowBanner(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowBanner(true);
      haptic.warning();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top) + 16px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '100px',
            background: isOnline
              ? 'rgba(34, 197, 94, 0.9)'
              : 'rgba(239, 68, 68, 0.9)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          {isOnline ? (
            <>
              <Wifi size={18} />
              <span>Wieder online</span>
            </>
          ) : (
            <>
              <WifiOff size={18} />
              <span>Keine Verbindung</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
