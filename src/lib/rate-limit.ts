import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

// Separate Limiter für verschiedene Use Cases
const limiters = new Map<string, RateLimiterMemory>();

function getLimiter(maxAttempts: number, windowMs: number): RateLimiterMemory {
  const key = `${maxAttempts}:${windowMs}`;
  if (!limiters.has(key)) {
    limiters.set(key, new RateLimiterMemory({
      points: maxAttempts,
      duration: Math.ceil(windowMs / 1000),
    }));
  }
  return limiters.get(key)!;
}

/**
 * Prüft Rate Limit für einen Key.
 * Gibt true zurück wenn erlaubt, false wenn blockiert.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 60_000
): Promise<boolean> {
  const limiter = getLimiter(maxAttempts, windowMs);
  try {
    await limiter.consume(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Prüft Rate Limit und gibt ein NextResponse-ready Ergebnis zurück.
 * Enthält retry-after Header-Wert.
 */
export async function rateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 60_000
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const limiter = getLimiter(maxAttempts, windowMs);
  try {
    await limiter.consume(key);
    return { allowed: true };
  } catch (err) {
    const res = err as RateLimiterRes;
    return {
      allowed: false,
      retryAfter: Math.ceil(res.msBeforeNext / 1000),
    };
  }
}
