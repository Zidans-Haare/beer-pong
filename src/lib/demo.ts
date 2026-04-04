/**
 * Demo Mode utility
 * Activated via DEMO_MODE=true in .env
 * Only used on dedicated demo instances — never on production.
 */
export const isDemoMode = process.env.DEMO_MODE === 'true';

export const DEMO_USER_EMAIL = 'demo@beer-pong.app';
