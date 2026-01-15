'use client';

import { useState, useEffect } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, Check, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/haptics';

interface PasskeyRegisterButtonProps {
  onSuccess?: () => void;
  className?: string;
}

export default function PasskeyRegisterButton({
  onSuccess,
  className,
}: PasskeyRegisterButtonProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if WebAuthn is supported
    const checkSupport = async () => {
      if (
        typeof window !== 'undefined' &&
        'PublicKeyCredential' in window &&
        'create' in PublicKeyCredential
      ) {
        try {
          const available =
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsSupported(available);
        } catch {
          setIsSupported(false);
        }
      }
    };
    checkSupport();
  }, []);

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get registration options from server
      const optionsRes = await fetch('/api/auth/passkey/register/start', {
        method: 'POST',
      });

      if (!optionsRes.ok) {
        throw new Error('Fehler beim Abrufen der Optionen');
      }

      const options = await optionsRes.json();

      // Start registration with authenticator
      const credential = await startRegistration(options);

      // Verify with server
      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: credential,
          friendlyName: getBrowserName(),
        }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || 'Verifizierung fehlgeschlagen');
      }

      setSuccess(true);
      haptic.success();
      onSuccess?.();

      // Reset after delay
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Passkey registration error:', err);

      if (err.name === 'NotAllowedError') {
        setError('Registrierung abgebrochen');
      } else if (err.name === 'InvalidStateError') {
        setError('Passkey bereits registriert');
      } else {
        setError(err.message || 'Registrierung fehlgeschlagen');
      }
      haptic.error();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className={className}>
      <button
        onClick={handleRegister}
        disabled={isLoading || success}
        className="btn"
        style={{
          width: '100%',
          background: success
            ? 'var(--color-success)'
            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '14px 20px',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Warte auf Bestätigung...
          </>
        ) : success ? (
          <>
            <Check size={20} />
            Passkey registriert!
          </>
        ) : (
          <>
            <Fingerprint size={20} />
            Face ID / Touch ID einrichten
          </>
        )}
      </button>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--color-error)',
              fontSize: '0.85rem',
              marginTop: '8px',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getBrowserName(): string {
  if (typeof navigator === 'undefined') return 'Unbekanntes Gerät';

  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(ua)) {
    return 'iPhone/iPad';
  }
  if (/Mac/.test(ua)) {
    return 'Mac';
  }
  if (/Android/.test(ua)) {
    return 'Android';
  }
  if (/Windows/.test(ua)) {
    return 'Windows';
  }

  return 'Passkey';
}
