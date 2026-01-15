'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Share2, Download, Trophy } from 'lucide-react';
import CameraCapture from './CameraCapture';
import { CelebrationConfetti } from './Confetti';
import { haptic } from '@/lib/haptics';

interface VictoryPhotoProps {
  isOpen: boolean;
  onClose: () => void;
  winnerName: string;
  loserName: string;
  score: string;
  tournamentName: string;
  matchType?: string; // e.g., "Finale", "Halbfinale"
}

export default function VictoryPhoto({
  isOpen,
  onClose,
  winnerName,
  loserName,
  score,
  tournamentName,
  matchType,
}: VictoryPhotoProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);

  const handleCapture = (imageData: string) => {
    setCapturedPhoto(imageData);
    setShowCamera(false);
    haptic.success();
  };

  const handleShare = async () => {
    if (!capturedPhoto) return;

    try {
      // Convert data URL to blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      const file = new File([blob], 'victory-photo.jpg', { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${winnerName} gewinnt! 🏆`,
          text: `${winnerName} vs ${loserName} (${score}) - ${tournamentName}`,
          files: [file],
        });
        haptic.success();
      } else {
        // Fallback: Download
        handleDownload();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
        handleDownload();
      }
    }
  };

  const handleDownload = () => {
    if (!capturedPhoto) return;

    const link = document.createElement('a');
    link.href = capturedPhoto;
    link.download = `victory-${winnerName}-${Date.now()}.jpg`;
    link.click();
    haptic.medium();
  };

  const handleClose = () => {
    setCapturedPhoto(null);
    setShowCamera(false);
    setShowConfetti(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <CelebrationConfetti
        show={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      <AnimatePresence>
        {showCamera ? (
          <CameraCapture
            onCapture={handleCapture}
            onClose={() => setShowCamera(false)}
            aspectRatio={1}
            showGalleryOption={true}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(10px)',
              zIndex: 9998,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              paddingTop: 'calc(20px + env(safe-area-inset-top))',
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
            }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: 'calc(16px + env(safe-area-inset-top))',
                right: 16,
                padding: 8,
                color: 'white',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
              }}
            >
              <X size={24} />
            </button>

            {/* Victory announcement */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              style={{ textAlign: 'center', marginBottom: 30 }}
            >
              <Trophy
                size={64}
                style={{ color: '#FFD700', marginBottom: 16 }}
              />
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: 8,
                }}
              >
                {winnerName} gewinnt!
              </h1>
              {matchType && (
                <p
                  style={{
                    color: 'var(--color-primary)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {matchType}
                </p>
              )}
              <p style={{ color: 'white', fontSize: '1.2rem' }}>
                vs {loserName}
              </p>
              <p
                style={{
                  color: 'var(--color-text-dim)',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  marginTop: 8,
                }}
              >
                {score}
              </p>
              <p
                style={{
                  color: 'var(--color-text-dim)',
                  fontSize: '0.9rem',
                  marginTop: 4,
                }}
              >
                {tournamentName}
              </p>
            </motion.div>

            {/* Photo area */}
            {capturedPhoto ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  width: '100%',
                  maxWidth: 300,
                  marginBottom: 30,
                }}
              >
                {/* Photo with overlay */}
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                  }}
                >
                  <img
                    src={capturedPhoto}
                    alt="Victory"
                    style={{
                      width: '100%',
                      display: 'block',
                    }}
                  />

                  {/* Branding overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '20px 16px 16px',
                      background:
                        'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <Trophy size={16} style={{ color: '#FFD700' }} />
                      <span
                        style={{
                          color: '#FFD700',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                        }}
                      >
                        {winnerName}
                      </span>
                    </div>
                    <p
                      style={{
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '0.75rem',
                      }}
                    >
                      {score} vs {loserName} • {tournamentName}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    marginTop: 20,
                    justifyContent: 'center',
                  }}
                >
                  <button
                    onClick={() => {
                      setCapturedPhoto(null);
                      setShowCamera(true);
                    }}
                    className="btn"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Camera size={18} />
                    Neues Foto
                  </button>

                  <button
                    onClick={handleShare}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Share2 size={18} />
                    Teilen
                  </button>

                  <button
                    onClick={handleDownload}
                    className="btn"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      padding: '12px',
                    }}
                  >
                    <Download size={18} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => setShowCamera(true)}
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  color: 'black',
                  padding: '16px 32px',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 20,
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Camera size={24} />
                Siegerfoto machen!
              </motion.button>
            )}

            {/* Skip button */}
            {!capturedPhoto && (
              <button
                onClick={handleClose}
                style={{
                  color: 'var(--color-text-dim)',
                  fontSize: '0.9rem',
                  padding: '8px 16px',
                }}
              >
                Überspringen
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
