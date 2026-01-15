'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, RotateCcw, Check, SwitchCamera, ImageIcon } from 'lucide-react';
import { haptic } from '@/lib/haptics';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose?: () => void;
  aspectRatio?: number; // width/height, e.g., 1 for square
  quality?: number; // 0-1
  maxSize?: number; // max dimension in pixels
  showGalleryOption?: boolean;
}

export default function CameraCapture({
  onCapture,
  onClose,
  aspectRatio = 1,
  quality = 0.85,
  maxSize = 800,
  showGalleryOption = true,
}: CameraCaptureProps) {
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: maxSize },
          height: { ideal: maxSize },
        },
        audio: false,
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      setHasPermission(false);
      setError('Kamera-Zugriff verweigert');
      haptic.error();
    }
  }, [facingMode, maxSize]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  }, []);

  // Take photo
  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate crop dimensions for aspect ratio
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;

    const videoAspect = video.videoWidth / video.videoHeight;

    if (videoAspect > aspectRatio) {
      // Video is wider - crop sides
      sourceWidth = video.videoHeight * aspectRatio;
      sourceX = (video.videoWidth - sourceWidth) / 2;
    } else {
      // Video is taller - crop top/bottom
      sourceHeight = video.videoWidth / aspectRatio;
      sourceY = (video.videoHeight - sourceHeight) / 2;
    }

    // Set canvas size
    const outputSize = Math.min(maxSize, Math.max(sourceWidth, sourceHeight));
    canvas.width = outputSize;
    canvas.height = outputSize / aspectRatio;

    // Mirror if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // Draw cropped image
    ctx.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Get data URL
    const imageData = canvas.toDataURL('image/jpeg', quality);
    setCapturedImage(imageData);
    haptic.medium();

    // Stop camera preview
    stopCamera();
  }, [aspectRatio, facingMode, maxSize, quality, stopCamera]);

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    haptic.light();
  }, []);

  // Retake photo
  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  // Confirm photo
  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      haptic.success();
    }
  }, [capturedImage, onCapture]);

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Calculate crop for aspect ratio
          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = img.width;
          let sourceHeight = img.height;

          const imgAspect = img.width / img.height;

          if (imgAspect > aspectRatio) {
            sourceWidth = img.height * aspectRatio;
            sourceX = (img.width - sourceWidth) / 2;
          } else {
            sourceHeight = img.width / aspectRatio;
            sourceY = (img.height - sourceHeight) / 2;
          }

          // Set canvas size
          const outputSize = Math.min(maxSize, Math.max(sourceWidth, sourceHeight));
          canvas.width = outputSize;
          canvas.height = outputSize / aspectRatio;

          // Draw cropped image
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            canvas.width,
            canvas.height
          );

          const imageData = canvas.toDataURL('image/jpeg', quality);
          setCapturedImage(imageData);
          haptic.medium();
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [aspectRatio, maxSize, quality]
  );

  // Restart camera when facing mode changes
  useEffect(() => {
    if (isActive) {
      startCamera();
    }
  }, [facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'black',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Header */}
      <div
        style={{
          padding: '16px',
          paddingTop: 'calc(16px + env(safe-area-inset-top))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => {
            stopCamera();
            onClose?.();
          }}
          style={{
            padding: 8,
            color: 'white',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
          }}
        >
          <X size={24} />
        </button>

        {isActive && (
          <button
            onClick={switchCamera}
            style={{
              padding: 8,
              color: 'white',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
            }}
          >
            <SwitchCamera size={24} />
          </button>
        )}
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <AnimatePresence mode="wait">
          {/* Initial state - show start button */}
          {!isActive && !capturedImage && (
            <motion.div
              key="start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              {error && (
                <p style={{ color: 'var(--color-error)', marginBottom: 10 }}>
                  {error}
                </p>
              )}

              <button
                onClick={startCamera}
                className="btn btn-primary"
                style={{
                  padding: '20px 40px',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Camera size={24} />
                Kamera starten
              </button>

              {showGalleryOption && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn"
                  style={{
                    padding: '16px 32px',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <ImageIcon size={20} />
                  Aus Galerie wählen
                </button>
              )}
            </motion.div>
          )}

          {/* Camera preview */}
          {isActive && !capturedImage && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                width: '100%',
                maxWidth: 400,
                aspectRatio: String(aspectRatio),
                position: 'relative',
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />

              {/* Overlay guide */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: '3px solid rgba(255,255,255,0.5)',
                  borderRadius: 20,
                  pointerEvents: 'none',
                }}
              />
            </motion.div>
          )}

          {/* Captured image preview */}
          {capturedImage && (
            <motion.div
              key="captured"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                width: '100%',
                maxWidth: 400,
                aspectRatio: String(aspectRatio),
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              <img
                src={capturedImage}
                alt="Captured"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div
        style={{
          padding: '20px',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        {/* Camera active - show capture button */}
        {isActive && !capturedImage && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={takePhoto}
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'white',
              border: '4px solid rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            whileTap={{ scale: 0.9 }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'white',
              }}
            />
          </motion.button>
        )}

        {/* Photo captured - show retake/confirm */}
        {capturedImage && (
          <>
            <motion.button
              initial={{ scale: 0, x: 50 }}
              animate={{ scale: 1, x: 0 }}
              onClick={retake}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RotateCcw size={24} />
            </motion.button>

            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={confirmPhoto}
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--color-success)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              whileTap={{ scale: 0.9 }}
            >
              <Check size={32} />
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}
