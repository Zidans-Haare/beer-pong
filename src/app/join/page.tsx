'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Hash, ArrowRight, Loader2 } from 'lucide-react';
import QRScanner from '@/components/QRScanner';
import { haptic } from '@/lib/haptics';
import { isValidShortCode } from '@/lib/qrcode';

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    // Only allow alphanumeric
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (cleaned.length <= 1) {
      const newCode = [...code];
      newCode[index] = cleaned;
      setCode(newCode);
      setError(null);

      // Auto-focus next input
      if (cleaned && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when complete
      if (cleaned && index === 5) {
        const fullCode = newCode.join('');
        if (isValidShortCode(fullCode)) {
          handleSubmit(fullCode);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (submitCode?: string) => {
    const fullCode = submitCode || code.join('');

    if (!isValidShortCode(fullCode)) {
      setError('Bitte gib einen gültigen 6-stelligen Code ein');
      haptic.error();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if tournament exists
      const res = await fetch(`/api/tournaments/by-code/${fullCode}`);

      if (res.ok) {
        haptic.success();
        router.push(`/join/${fullCode}`);
      } else {
        setError('Turnier nicht gefunden. Prüfe den Code.');
        haptic.error();
        setIsLoading(false);
      }
    } catch (err) {
      setError('Verbindungsfehler. Bitte versuche es erneut.');
      haptic.error();
      setIsLoading(false);
    }
  };

  const handleQRScan = (data: string) => {
    // Check if it's a URL or just a code
    if (data.includes('/join/')) {
      const codeMatch = data.match(/\/join\/([A-Z0-9]{6})/i);
      if (codeMatch) {
        handleSubmit(codeMatch[1].toUpperCase());
        return;
      }
    }

    if (data.includes('/tournaments/')) {
      // Direct tournament link - just redirect
      const url = new URL(data);
      router.push(url.pathname);
      return;
    }

    // Assume it's a plain code
    if (isValidShortCode(data)) {
      handleSubmit(data.toUpperCase());
    }
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-8)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
        style={{
          padding: 'var(--spacing-8)',
          maxWidth: '400px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--spacing-4)',
          }}
        >
          <Hash size={32} color="white" />
        </div>

        <h1
          className="title-display"
          style={{
            fontSize: '1.5rem',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          Turnier beitreten
        </h1>

        <p
          style={{
            color: 'var(--color-text-dim)',
            marginBottom: 'var(--spacing-6)',
          }}
        >
          Gib den 6-stelligen Code ein oder scanne den QR-Code
        </p>

        {/* Code Input */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            marginBottom: 'var(--spacing-4)',
          }}
          onPaste={handlePaste}
        >
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading}
              style={{
                width: '48px',
                height: '56px',
                fontSize: '1.5rem',
                fontWeight: 700,
                textAlign: 'center',
                background: 'var(--color-surface-hover)',
                border: '2px solid',
                borderColor: error
                  ? 'var(--color-error)'
                  : digit
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text)',
                outline: 'none',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
              }}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              color: 'var(--color-error)',
              fontSize: '0.9rem',
              marginBottom: 'var(--spacing-4)',
            }}
          >
            {error}
          </motion.p>
        )}

        {/* Submit Button */}
        <button
          onClick={() => handleSubmit()}
          disabled={isLoading || code.join('').length < 6}
          className="btn btn-primary"
          style={{
            width: '100%',
            marginBottom: 'var(--spacing-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: isLoading || code.join('').length < 6 ? 0.5 : 1,
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Wird gesucht...
            </>
          ) : (
            <>
              Beitreten
              <ArrowRight size={18} />
            </>
          )}
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-4)',
            marginBottom: 'var(--spacing-4)',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          <span style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>oder</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
        </div>

        {/* QR Scanner */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <QRScanner onScan={handleQRScan} />
        </div>
      </motion.div>
    </div>
  );
}
