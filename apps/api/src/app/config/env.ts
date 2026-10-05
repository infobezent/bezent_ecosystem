import 'dotenv/config';

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function required(name: string, fallback: string): string {
  return optional(name) ?? fallback;
}

export const env = {
  nodeEnv: required('NODE_ENV', 'development'),
  port: Number(optional('PORT') ?? optional('API_PORT') ?? '4000'),
  db: {
    url: optional('DATABASE_URL'),
    host: optional('DB_HOST'),
    port: optional('DB_PORT') ? Number(optional('DB_PORT')) : undefined,
    user: optional('DB_USER'),
    password: optional('DB_PASSWORD'),
    name: optional('DB_NAME'),
  },
  /** Email delivery (ADR-018). `outbox` writes to a local table: development/tests only. */
  email: {
    transport: required('EMAIL_TRANSPORT', 'outbox') as 'smtp' | 'outbox',
    from: optional('MAIL_FROM'),
    smtp: {
      host: optional('SMTP_HOST'),
      port: optional('SMTP_PORT') ? Number(optional('SMTP_PORT')) : 587,
      secure: optional('SMTP_SECURE') === 'true',
      user: optional('SMTP_USER'),
      password: optional('SMTP_PASSWORD'),
    },
  },
  /** Key for OTP code digests (ADR-018). Must be a long random secret in production. */
  otpSecret: optional('OTP_SECRET'),
  /** Public URL of the web app, used in sign-in invitation emails. */
  webAppUrl: required('WEB_APP_URL', 'http://localhost:3000'),
};

/**
 * Production must deliver OTP codes over SMTP with a real OTP secret; it never
 * falls back to the development outbox. Called once at API startup.
 */
export function assertProductionAuthConfig(): void {
  if (env.nodeEnv !== 'production') return;
  const missing: string[] = [];
  if (env.email.transport !== 'smtp') missing.push('EMAIL_TRANSPORT=smtp');
  if (!env.email.smtp.host) missing.push('SMTP_HOST');
  if (!env.email.from) missing.push('MAIL_FROM');
  if (!env.otpSecret || env.otpSecret.length < 32) missing.push('OTP_SECRET (32+ chars)');
  if (missing.length > 0) {
    throw new Error(`Authentication is not configured for production: ${missing.join(', ')}`);
  }
}

/**
 * True when enough connection information is present to attempt a database
 * connection. Phase 0 must run without any database configured at all.
 */
export const isDatabaseConfigured = Boolean(
  env.db.url || (env.db.host && env.db.user && env.db.name),
);
