'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/haptics';

interface BiometricLoginButtonProps {
  email?: string;
  onSuccess?: () => void;
  className?: string;
}

export default function BiometricLoginButton({
  email,
  onSuccess,
  className,
}: BiometricLoginButtonProps) {
  const router = useRouter();
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if WebAuthn is supported
    const checkSupport = async () => {
      if (
        typeof window !== 'undefined' &&
        'PublicKeyCredential' in window &&
        'get' in PublicKeyCredential
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

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get authentication options from server
      const optionsRes = await fetch('/api/auth/passkey/authenticate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!optionsRes.ok) {
        throw new Error('Fehler beim Abrufen der Optionen');
      }

      const options = await optionsRes.json();

      // Start authentication with authenticator
      const credential = await startAuthentication(options);

      // Verify with server
      const verifyRes = await fetch('/api/auth/passkey/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || 'Authentifizierung fehlgeschlagen');
      }

      haptic.success();
      onSuccess?.();

      // Redirect to home
      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('Passkey login error:', err);

      if (err.name === 'NotAllowedError') {
        setError('Anmeldung abgebrochen');
      } else if (err.message?.includes('nicht gefunden')) {
        setError('Kein Passkey für dieses Konto');
      } else {
        setError(err.message || 'Anmeldung fehlgeschlagen');
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
        onClick={handleLogin}
        disabled={isLoading}
        className="btn"
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '14px 20px',
          fontSize: '1rem',
          fontWeight: 600,
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={22} className="animate-spin" />
            Warte auf Bestätigung...
          </>
        ) : (
          <>
            <Fingerprint size={22} />
            Mit Face ID / Touch ID
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
              justifyContent: 'center',
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
