import crypto from 'node:crypto';
import { otpRepository, OtpRepository } from '../repository/otp.repository.js';
import { authRepository, AuthRepository } from '../repository/auth.repository.js';
import { authService, AuthService } from './auth.service.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { emailService, EmailService } from '../../email/service/email.service.js';
import { env } from '../../../app/config/env.js';
import { AppError, UnauthorizedError } from '../../../app/errors/AppError.js';
import {
  digestOtpCode,
  generateOtpCode,
  generateSurrogateId,
  timingSafeEqualHex,
} from '../security.js';
import type { LoginResult, OtpChallengeResult } from '../types/auth.types.js';

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
const RATE_WINDOW_MINUTES = 15;
const MAX_REQUESTS_PER_EMAIL = 5;
const MAX_REQUESTS_PER_IP = 30;

/**
 * Outside production an OTP_SECRET may be omitted; a per-process secret is
 * used instead (codes then do not survive an API restart). Production startup
 * refuses to run without OTP_SECRET (assertProductionAuthConfig).
 */
const OTP_SECRET = env.otpSecret ?? crypto.randomBytes(32).toString('hex');

export class OtpRateLimitedError extends AppError {
  constructor(
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message, 429, 'OTP_RATE_LIMITED');
    this.name = 'OtpRateLimitedError';
  }
}

/**
 * Passwordless Email OTP sign-in for EVERY BEZENT user (ADR-018). There is no
 * role-specific path: Super Admin, Company Admin, HR, Manager, Employee and
 * custom roles all request a code, verify it, and receive a session. What the
 * session may reach is resolved afterwards, per request (ADR-017).
 */
export class OtpAuthService {
  constructor(
    private readonly otp: OtpRepository = otpRepository,
    private readonly users: AuthRepository = authRepository,
    private readonly sessions: AuthService = authService,
    private readonly email: EmailService = emailService,
    private readonly audit: AuditService = auditService,
  ) {}

  /**
   * Issues a code to the account email. The response is identical whether or
   * not the email belongs to an active account; for unknown or inactive
   * accounts no email is sent and the challenge can never succeed.
   */
  async requestCode(rawEmail: string, requestIp: string | null): Promise<OtpChallengeResult> {
    const email = rawEmail.trim().toLowerCase();
    const now = Date.now();
    const windowStart = new Date(now - RATE_WINDOW_MINUTES * 60_000);

    const latest = await this.otp.latestForEmail(email);
    if (latest) {
      const createdTime = Math.min(latest.createdAt.getTime(), now);
      const readyAt = createdTime + OTP_RESEND_COOLDOWN_SECONDS * 1000;
      if (readyAt > now) {
        throw new OtpRateLimitedError(
          'Please wait before requesting another code',
          Math.min(OTP_RESEND_COOLDOWN_SECONDS, Math.max(1, Math.ceil((readyAt - now) / 1000))),
        );
      }
    }
    if ((await this.otp.countForEmailSince(email, windowStart)) >= MAX_REQUESTS_PER_EMAIL) {
      throw new OtpRateLimitedError(
        'Too many code requests. Try again later.',
        RATE_WINDOW_MINUTES * 60,
      );
    }
    if (
      requestIp &&
      (await this.otp.countForIpSince(requestIp, windowStart)) >= MAX_REQUESTS_PER_IP
    ) {
      throw new OtpRateLimitedError(
        'Too many code requests. Try again later.',
        RATE_WINDOW_MINUTES * 60,
      );
    }

    const user = await this.users.findUserByEmail(email);
    const eligible = user !== null && user.status === 'active';

    const challengeId = generateSurrogateId('otp');
    const code = eligible ? generateOtpCode() : null;
    const expiresAt = new Date(now + OTP_TTL_MINUTES * 60_000);

    await this.otp.create({
      id: challengeId,
      userId: eligible ? user.id : null,
      email,
      codeDigest: code ? digestOtpCode(OTP_SECRET, challengeId, code) : null,
      expiresAt,
      requestIp,
    });

    if (eligible && code) {
      await this.email.send({
        to: user.email,
        subject: 'Your BEZENT sign-in code',
        text:
          `Your BEZENT sign-in code is ${code}.\n\n` +
          `It expires in ${OTP_TTL_MINUTES} minutes and can be used once. ` +
          'If you did not try to sign in, you can ignore this email.',
      });

      if (env.nodeEnv !== 'production' && env.email.transport === 'outbox') {
        console.log(
          `[auth:dev] Sign-in OTP\nEmail: ${user.email}\nOTP: ${code}\nExpires in: ${OTP_TTL_MINUTES} minutes`,
        );
      }
    }

    await this.audit.logEvent({
      actorUserId: eligible ? user.id : null,
      actorEmail: email,
      action: 'otp_requested',
      targetType: 'otp_challenge',
      targetId: challengeId,
      metadata: { accountEligible: eligible, requestIp },
    });

    return {
      challengeId,
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_SECONDS * 1000).toISOString(),
    };
  }

  /** Verifies a code and, on success, issues a session through the one session system. */
  async verifyCode(challengeId: string, code: string): Promise<LoginResult> {
    const challenge = await this.otp.findById(challengeId);
    if (!challenge) {
      throw new UnauthorizedError('Invalid or expired code', 'OTP_INVALID');
    }
    if (challenge.status === 'locked') {
      throw new UnauthorizedError('Too many incorrect attempts. Request a new code.', 'OTP_LOCKED');
    }
    if (challenge.status !== 'pending') {
      throw new UnauthorizedError('Invalid or expired code', 'OTP_INVALID');
    }
    if (challenge.expiresAt.getTime() <= Date.now()) {
      await this.otp.setStatus(challenge.id, 'expired');
      throw new UnauthorizedError('This code has expired. Request a new code.', 'OTP_EXPIRED');
    }

    const attempts = await this.otp.recordAttempt(challenge.id);
    if (attempts === null) {
      throw new UnauthorizedError('Invalid or expired code', 'OTP_INVALID');
    }

    // Unknown-account challenges have no digest: they fail exactly like a wrong code.
    const matches =
      challenge.codeDigest !== null &&
      timingSafeEqualHex(digestOtpCode(OTP_SECRET, challenge.id, code), challenge.codeDigest);

    if (!matches || attempts > OTP_MAX_ATTEMPTS) {
      const locked = attempts >= OTP_MAX_ATTEMPTS;
      if (locked) await this.otp.setStatus(challenge.id, 'locked');
      await this.audit.logEvent({
        actorUserId: challenge.userId,
        actorEmail: challenge.email,
        action: locked ? 'otp_locked' : 'otp_failed',
        targetType: 'otp_challenge',
        targetId: challenge.id,
        metadata: { attempts },
      });
      if (locked) {
        throw new UnauthorizedError(
          'Too many incorrect attempts. Request a new code.',
          'OTP_LOCKED',
        );
      }
      throw new UnauthorizedError('Invalid or expired code', 'OTP_INVALID');
    }

    // Single use: a concurrent verification of the same code loses here.
    if (!(await this.otp.consume(challenge.id)) || !challenge.userId) {
      throw new UnauthorizedError('Invalid or expired code', 'OTP_INVALID');
    }

    const user = await this.users.findUserById(challenge.userId);
    if (!user) {
      throw new UnauthorizedError('Invalid or expired code', 'OTP_INVALID');
    }

    await this.audit.logEvent({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'otp_verified',
      targetType: 'otp_challenge',
      targetId: challenge.id,
      metadata: { attempts },
    });

    // Account status is re-checked here: a suspension after the request still blocks.
    return this.sessions.issueSession(user);
  }
}

export const otpAuthService = new OtpAuthService();
