import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth/service/auth.service.js';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
  isWellFormedSessionToken,
  generateOtpCode,
  digestOtpCode,
  timingSafeEqualHex,
} from '../auth/security.js';
import type { AuthRepository } from '../auth/repository/auth.repository.js';
import type { User, Session } from '../../db/schema.js';
import { UnauthorizedError, ForbiddenError } from '../../app/errors/AppError.js';

describe('Platform Auth - Security Primitives', () => {
  it('hashes and verifies passwords correctly', async () => {
    const password = 'SuperSecurePassword123!';
    const { hash, salt } = hashPassword(password);

    expect(hash).toBeDefined();
    expect(salt).toBeDefined();
    expect(hash).not.toBe(password);

    const isValid = verifyPassword(password, hash, salt);
    expect(isValid).toBe(true);

    const isInvalid = verifyPassword('WrongPassword', hash, salt);
    expect(isInvalid).toBe(false);
  });

  it('generates secure session tokens with valid length', () => {
    const token = generateSessionToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64);
    expect(isWellFormedSessionToken(token)).toBe(true);
  });

  it('stores only a digest of the session token, which is never a valid bearer token', () => {
    const token = generateSessionToken();
    const stored = hashSessionToken(token);
    expect(stored).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(stored).not.toContain(token);
    expect(isWellFormedSessionToken(stored)).toBe(false);
  });

  it('generates 6-digit OTP codes and challenge-bound digests', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
    const a = digestOtpCode('secret', 'otp_1', '123456');
    expect(timingSafeEqualHex(a, digestOtpCode('secret', 'otp_1', '123456'))).toBe(true);
    expect(timingSafeEqualHex(a, digestOtpCode('secret', 'otp_2', '123456'))).toBe(false);
    expect(timingSafeEqualHex(a, digestOtpCode('other', 'otp_1', '123456'))).toBe(false);
    expect(timingSafeEqualHex(a, '')).toBe(false);
  });
});

describe('AuthService', () => {
  let mockRepo: Partial<AuthRepository>;
  let mockAudit: { logEvent: ReturnType<typeof vi.fn> };
  let authService: AuthService;

  const { hash: mockHash, salt: mockSalt } = hashPassword('CorrectPassword123!');

  const sampleSuperAdmin: User = {
    id: 'usr_super_admin_01',
    email: 'superadmin@bezent.com',
    passwordHash: mockHash,
    salt: mockSalt,
    firstName: 'Super',
    lastName: 'Admin',
    phone: null,
    status: 'active',
    isSuperAdmin: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleRegularUser: User = {
    ...sampleSuperAdmin,
    id: 'usr_company_admin_01',
    email: 'admin@company.com',
    firstName: 'Company',
    isSuperAdmin: false,
  };

  const sessionFor = (user: User): Session & { user: User } => ({
    id: 'sess_1',
    token: 'sha256:stored',
    userId: user.id,
    expiresAt: new Date(Date.now() + 86400000),
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user,
  });

  beforeEach(() => {
    mockRepo = {
      findUserByEmail: vi.fn(),
      findUserById: vi.fn(),
      createSession: vi.fn().mockImplementation(
        async (userId, token, expiresAt) =>
          ({
            id: 'sess_1',
            token,
            userId,
            expiresAt,
            revokedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }) as Session,
      ),
      findActiveSession: vi.fn(),
      revokeSession: vi.fn().mockResolvedValue(undefined),
      getUserMemberships: vi.fn().mockResolvedValue([]),
      updateLastLogin: vi.fn().mockResolvedValue(undefined),
    };
    mockAudit = {
      logEvent: vi.fn().mockResolvedValue({
        id: 'aud_1',
      } as unknown as import('../audit/types/audit.types.js').AuditLogRecord),
    };
    authService = new AuthService(
      mockRepo as AuthRepository,
      mockAudit as unknown as import('../audit/service/audit.service.js').AuditService,
    );
  });

  it('issues a session and platform access for a Super Admin without memberships', async () => {
    const result = await authService.issueSession(sampleSuperAdmin);

    expect(isWellFormedSessionToken(result.token)).toBe(true);
    expect(result.user.isSuperAdmin).toBe(true);
    expect(result.access.platformWorkspaces).toEqual(['super_admin']);
    expect(result.access.companies).toEqual([]);
    expect(result.defaultDestination).toBe('/super-admin');
    expect(mockRepo.createSession).toHaveBeenCalledWith(
      sampleSuperAdmin.id,
      result.token,
      expect.any(Date),
    );
    expect(JSON.stringify(mockAudit.logEvent.mock.calls)).not.toContain(result.token);
  });

  it('refuses sessions for suspended or inactive accounts', async () => {
    await expect(
      authService.issueSession({ ...sampleRegularUser, status: 'suspended' }),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      authService.issueSession({ ...sampleRegularUser, status: 'inactive' }),
    ).rejects.toThrow(UnauthorizedError);
    expect(mockRepo.createSession).not.toHaveBeenCalled();
  });

  it('validates active session and identifies super admin status', async () => {
    vi.mocked(mockRepo.findActiveSession!).mockResolvedValue(sessionFor(sampleSuperAdmin));

    const validated = await authService.validateToken(generateSessionToken());
    expect(validated.isSuperAdmin).toBe(true);
    expect(validated.id).toBe('usr_super_admin_01');
  });

  it('rejects expired or non-existent session token', async () => {
    vi.mocked(mockRepo.findActiveSession!).mockResolvedValue(null);

    await expect(authService.validateToken(generateSessionToken())).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('rejects malformed tokens (including stored digests) before any lookup', async () => {
    for (const token of ['bzt_sess_valid_token', hashSessionToken(generateSessionToken()), '']) {
      await expect(authService.validateToken(token)).rejects.toThrow(UnauthorizedError);
    }
    expect(mockRepo.findActiveSession).not.toHaveBeenCalled();
  });

  it('rejects a valid session whose account is no longer active', async () => {
    vi.mocked(mockRepo.findActiveSession!).mockResolvedValue(
      sessionFor({ ...sampleRegularUser, status: 'suspended' }),
    );
    await expect(authService.validateToken(generateSessionToken())).rejects.toThrow(ForbiddenError);
  });

  it('correctly reports regular user is NOT a Super Admin', async () => {
    vi.mocked(mockRepo.findActiveSession!).mockResolvedValue(sessionFor(sampleRegularUser));

    const validated = await authService.validateToken(generateSessionToken());
    expect(validated.isSuperAdmin).toBe(false);
  });
});
