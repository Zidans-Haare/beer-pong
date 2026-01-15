'use client';

import { useEffect, useRef, useCallback } from 'react';
import { haptic } from '@/lib/haptics';

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

interface ConfettiProps {
  isActive: boolean;
  duration?: number;
  particleCount?: number;
  colors?: string[];
  onComplete?: () => void;
}

const DEFAULT_COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Gold
  '#BB8FCE', // Purple
];

export default function Confetti({
  isActive,
  duration = 4000,
  particleCount = 150,
  colors = DEFAULT_COLORS,
  onComplete,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const piecesRef = useRef<ConfettiPiece[]>([]);
  const startTimeRef = useRef<number>(0);

  const createPieces = useCallback(() => {
    const pieces: ConfettiPiece[] = [];
    const canvas = canvasRef.current;
    if (!canvas) return pieces;

    for (let i = 0; i < particleCount; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 3 + 2,
        width: Math.random() * 10 + 5,
        height: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
      });
    }

    return pieces;
  }, [particleCount, colors]);

  const animate = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw pieces
      let activePieces = 0;
      piecesRef.current.forEach((piece) => {
        // Update physics
        piece.x += piece.vx;
        piece.vy += 0.1; // Gravity
        piece.y += piece.vy;
        piece.rotation += piece.rotationSpeed;

        // Add some air resistance
        piece.vx *= 0.99;

        // Fade out towards the end
        if (progress > 0.7) {
          piece.opacity = Math.max(0, 1 - (progress - 0.7) / 0.3);
        }

        // Only draw if on screen and visible
        if (piece.y < canvas.height + 50 && piece.opacity > 0) {
          activePieces++;

          ctx.save();
          ctx.translate(piece.x, piece.y);
          ctx.rotate(piece.rotation);
          ctx.globalAlpha = piece.opacity;

          // Draw confetti piece
          ctx.fillStyle = piece.color;
          ctx.fillRect(
            -piece.width / 2,
            -piece.height / 2,
            piece.width,
            piece.height
          );

          ctx.restore();
        }
      });

      // Continue animation if there are active pieces or duration hasn't elapsed
      if (activePieces > 0 && progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    },
    [duration, onComplete]
  );

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create confetti pieces
    piecesRef.current = createPieces();
    startTimeRef.current = performance.now();

    // Trigger haptic feedback
    haptic.success();

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive, createPieces, animate]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}

// Convenience component for celebration moments
export function CelebrationConfetti({
  show,
  onComplete,
}: {
  show: boolean;
  onComplete?: () => void;
}) {
  return (
    <Confetti
      isActive={show}
      duration={5000}
      particleCount={200}
      colors={[
        '#FFD700', // Gold
        '#FFA500', // Orange
        '#FF4500', // Red-Orange
        '#FFD700', // Gold
        '#FFFF00', // Yellow
        '#32CD32', // Lime Green
      ]}
      onComplete={onComplete}
    />
  );
}
