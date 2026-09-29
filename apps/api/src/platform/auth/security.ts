import crypto from 'node:crypto';

/**
 * Platform Authentication Security Utilities
 * Production-grade password hashing via scrypt and secure token generation.
 * Zero external dependencies — leverages Node.js crypto module.
 */

const KEY_LENGTH = 64;

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
    const hashBuffer = Buffer.from(hash, 'hex');
    if (derivedKey.length !== hashBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, hashBuffer);
  } catch {
    return false;
  }
}

/**
 * Credential material for new users under passwordless sign-in (ADR-018).
 * The password columns remain NOT NULL (additive schema) but grant nothing:
 * this is a random secret that is hashed and immediately discarded, so no one
 * — including the platform — ever knows a password for the account.
 */
export function createUnusableCredential(): { hash: string; salt: string } {
  return hashPassword(crypto.randomBytes(32).toString('hex'));
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Stored form of a session token (ADR-018): only the digest ever reaches the database. */
export function hashSessionToken(token: string): string {
  return `sha256:${crypto.createHash('sha256').update(token).digest('hex')}`;
}

/** Bearer tokens are exactly what generateSessionToken produces; anything else is rejected. */
export function isWellFormedSessionToken(token: string): boolean {
  return /^[0-9a-f]{64}$/.test(token);
}

/** Uniformly random 6-digit one-time code. */
export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Keyed digest of a one-time code, bound to its challenge so digests cannot be reused. */
export function digestOtpCode(secret: string, challengeId: string, code: string): string {
  return crypto.createHmac('sha256', secret).update(`${challengeId}:${code}`).digest('hex');
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

export function generateSurrogateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}
