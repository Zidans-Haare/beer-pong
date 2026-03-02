/**
 * QR Code Generation Utilities
 */

import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

const defaultOptions: QRCodeOptions = {
  width: 256,
  margin: 2,
  color: {
    dark: '#000000', // Black QR code
    light: '#ffffff', // White background
  },
};

/**
 * Generate QR code as data URL
 */
export async function generateQRCodeDataURL(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const mergedOptions = { ...defaultOptions, ...options };

  return QRCode.toDataURL(data, {
    width: mergedOptions.width,
    margin: mergedOptions.margin,
    color: mergedOptions.color,
    errorCorrectionLevel: 'M',
  });
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRCodeSVG(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const mergedOptions = { ...defaultOptions, ...options };

  return QRCode.toString(data, {
    type: 'svg',
    width: mergedOptions.width,
    margin: mergedOptions.margin,
    color: mergedOptions.color,
    errorCorrectionLevel: 'M',
  });
}

/**
 * Generate tournament join URL
 */
export function getTournamentJoinURL(
  tournamentId: string,
  shortCode?: string,
  baseURL?: string
): string {
  const base = baseURL || (typeof window !== 'undefined' ? window.location.origin : '');

  if (shortCode) {
    return `${base}/join/${shortCode}`;
  }

  return `${base}/tournaments/${tournamentId}`;
}

/**
 * Generate a random 6-character alphanumeric code
 */
export function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, I, 1)
  const { randomBytes } = require('crypto');
  const bytes = randomBytes(6) as Buffer;
  return Array.from(bytes).map((b: number) => chars[b % chars.length]).join('');
}

/**
 * Validate short code format
 */
export function isValidShortCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/i.test(code);
}
