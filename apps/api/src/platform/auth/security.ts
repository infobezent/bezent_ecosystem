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

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateSurrogateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}
