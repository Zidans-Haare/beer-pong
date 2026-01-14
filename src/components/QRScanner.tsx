'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, FlashlightOff, Flashlight, SwitchCamera } from 'lucide-react';
import jsQR from 'jsqr';
import { haptic } from '@/lib/haptics';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose?: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Kamera-Zugriff verweigert. Bitte erlaube den Zugriff in den Einstellungen.');
      haptic.error();
    }
  }, [facingMode]);

  const scanQRCode = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code) {
      haptic.success();
      onScan(code.data);
      handleClose();
      return;
    }

    animationRef.current = requestAnimationFrame(scanQRCode);
  }, [onScan]);

  useEffect(() => {
    if (isOpen) {
      startCamera().then(() => {
        animationRef.current = requestAnimationFrame(scanQRCode);
      });
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, scanQRCode, stopCamera]);

  const handleOpen = () => {
    setIsOpen(true);
    haptic.medium();
  };

  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
    setError(null);
    onClose?.();
  };

  const toggleTorch = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && 'torch' in track.getCapabilities()) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !torch } as MediaTrackConstraintSet],
          });
          setTorch(!torch);
          haptic.light();
        } catch (err) {
          console.error('Torch error:', err);
        }
      }
    }
  };

  const switchCamera = async () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    haptic.light();
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleOpen}
        className="btn"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
        }}
      >
        <Camera size={20} />
        QR scannen
      </button>

      {/* Scanner Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: '#000',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                paddingTop: 'calc(16px + env(safe-area-inset-top))',
              }}
            >
              <button
                onClick={handleClose}
                style={{
                  padding: '12px',
                  color: 'white',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                }}
              >
                <X size={24} />
              </button>

              <span
                style={{
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                QR-Code scannen
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={toggleTorch}
                  style={{
                    padding: '12px',
                    color: 'white',
                    background: torch ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                  }}
                >
                  {torch ? <Flashlight size={24} /> : <FlashlightOff size={24} />}
                </button>
                <button
                  onClick={switchCamera}
                  style={{
                    padding: '12px',
                    color: 'white',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                  }}
                >
                  <SwitchCamera size={24} />
                </button>
              </div>
            </div>

            {/* Camera View */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {error ? (
                <div
                  style={{
                    color: 'white',
                    textAlign: 'center',
                    padding: '20px',
                  }}
                >
                  <p style={{ marginBottom: '16px' }}>{error}</p>
                  <button
                    onClick={startCamera}
                    className="btn btn-primary"
                  >
                    Erneut versuchen
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    playsInline
                    muted
                  />

                  {/* Scan Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    {/* Scan Frame */}
                    <motion.div
                      animate={{
                        boxShadow: [
                          '0 0 0 4px rgba(217, 70, 239, 0.5)',
                          '0 0 0 8px rgba(217, 70, 239, 0.2)',
                          '0 0 0 4px rgba(217, 70, 239, 0.5)',
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      style={{
                        width: '250px',
                        height: '250px',
                        border: '4px solid var(--color-primary)',
                        borderRadius: '24px',
                        background: 'transparent',
                      }}
                    />
                  </div>

                  {/* Vignette Effect */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.7) 100%)',
                      pointerEvents: 'none',
                    }}
                  />
                </>
              )}
            </div>

            {/* Hidden Canvas for Processing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Footer Hint */}
            <div
              style={{
                padding: '20px',
                paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem',
              }}
            >
              Halte den QR-Code in den Rahmen
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
