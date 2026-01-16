'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Share2, Copy, Check, X } from 'lucide-react';
import { generateQRCodeDataURL, getTournamentJoinURL } from '@/lib/qrcode';
import { haptic } from '@/lib/haptics';

interface TournamentQRCodeProps {
  tournamentId: string;
  tournamentName: string;
  shortCode?: string;
}

export default function TournamentQRCode({
  tournamentId,
  tournamentName,
  shortCode,
}: TournamentQRCodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrDataURL, setQrDataURL] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const joinURL = getTournamentJoinURL(tournamentId, shortCode);

  useEffect(() => {
    if (isOpen && !qrDataURL) {
      generateQRCodeDataURL(joinURL, { width: 280 }).then(setQrDataURL);
    }
  }, [isOpen, joinURL, qrDataURL]);

  const handleOpen = () => {
    setIsOpen(true);
    haptic.medium();
  };

  const handleClose = () => {
    setIsOpen(false);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinURL);
      setCopied(true);
      haptic.success();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      haptic.error();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${tournamentName} - Bier Pong`,
          text: `Tritt dem Turnier "${tournamentName}" bei!`,
          url: joinURL,
        });
        haptic.success();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleOpen}
        className="btn"
        style={{
          background: 'var(--gradient-secondary)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '4px', // Reduced gap
          padding: '6px 10px', // Compact padding
          fontSize: '0.9rem', // Smaller text
          whiteSpace: 'nowrap' // Prevent text wrapping
        }}
      >
        <QrCode size={18} />
        QR-Code
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel"
              style={{
                padding: 'var(--spacing-6)',
                maxWidth: '360px',
                width: '100%',
                textAlign: 'center',
              }}
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '8px',
                  color: 'var(--color-text-dim)',
                }}
              >
                <X size={20} />
              </button>

              {/* Title */}
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  marginBottom: 'var(--spacing-2)',
                }}
              >
                Turnier beitreten
              </h3>
              <p
                style={{
                  color: 'var(--color-text-dim)',
                  fontSize: '0.9rem',
                  marginBottom: 'var(--spacing-4)',
                }}
              >
                {tournamentName}
              </p>

              {/* QR Code */}
              <div
                style={{
                  background: 'white',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: 'var(--spacing-4)',
                  display: 'inline-block',
                }}
              >
                {qrDataURL ? (
                  <img
                    src={qrDataURL}
                    alt="QR Code"
                    style={{
                      width: '200px',
                      height: '200px',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '200px',
                      height: '200px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666',
                    }}
                  >
                    Laden...
                  </div>
                )}
              </div>

              {/* Short Code Display */}
              {shortCode && (
                <div
                  style={{
                    marginBottom: 'var(--spacing-4)',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-text-dim)',
                      marginBottom: '4px',
                    }}
                  >
                    Oder Code eingeben:
                  </p>
                  <div
                    style={{
                      fontSize: '2rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-heading)',
                      letterSpacing: '0.2em',
                      background: 'var(--gradient-primary)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {shortCode}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center',
                }}
              >
                <button
                  onClick={handleCopy}
                  className="btn"
                  style={{
                    background: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flex: 1,
                    justifyContent: 'center',
                  }}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Kopiert!' : 'Link kopieren'}
                </button>

                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={handleShare}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flex: 1,
                      justifyContent: 'center',
                    }}
                  >
                    <Share2 size={18} />
                    Teilen
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
