/**
 * Haptic Feedback System
 * Provides tactile feedback for mobile devices using the Vibration API
 */

type HapticPattern = number | number[];

const canVibrate = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

const vibrate = (pattern: HapticPattern): boolean => {
  if (!canVibrate()) return false;
  return navigator.vibrate(pattern);
};

/**
 * Haptic feedback patterns for different interactions
 */
export const haptic = {
  /** Light tap - for subtle feedback (10ms) */
  light: () => vibrate(10),

  /** Medium tap - for button presses (25ms) */
  medium: () => vibrate(25),

  /** Heavy tap - for important actions (50ms) */
  heavy: () => vibrate(50),

  /** Success pattern - for confirmations */
  success: () => vibrate([10, 50, 10]),

  /** Error pattern - for failures */
  error: () => vibrate([50, 100, 50]),

  /** Warning pattern - for alerts */
  warning: () => vibrate([30, 50, 30, 50, 30]),

  /** Selection change - for toggles/switches */
  selection: () => vibrate(15),

  /** Impact - for collisions/drops */
  impact: () => vibrate([20, 30, 40]),

  /** Notification - for incoming notifications */
  notification: () => vibrate([100, 50, 100]),

  /** Custom pattern */
  custom: (pattern: HapticPattern) => vibrate(pattern),

  /** Stop any ongoing vibration */
  stop: () => vibrate(0),
};

/**
 * Check if haptic feedback is supported
 */
export const isHapticSupported = canVibrate;

/**
 * React hook for haptic feedback
 */
export function useHaptic() {
  return {
    haptic,
    isSupported: canVibrate(),
  };
}

export default haptic;
