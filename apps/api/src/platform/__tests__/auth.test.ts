import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth/service/auth.service.js';
import { hashPassword, verifyPassword, generateSessionToken } from '../auth/security.js';
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
    id: 'usr_company_admin_01',
    email: 'admin@company.com',
    passwordHash: mockHash,
    salt: mockSalt,
    firstName: 'Company',
    lastName: 'Admin',
    phone: null,
    status: 'active',
    isSuperAdmin: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = {
      findUserByEmail: vi.fn(),
      findUserById: vi.fn(),
      createSession: vi.fn().mockImplementation(async (userId, token, expiresAt) => ({
        id: 'sess_1',
        token,
        userId,
        expiresAt,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Session)),
      findActiveSession: vi.fn(),
      revokeSession: vi.fn().mockResolvedValue(undefined),
      getUserMemberships: vi.fn().mockResolvedValue([]),
      updateLastLogin: vi.fn().mockResolvedValue(undefined),
    };
    mockAudit = {
      logEvent: vi.fn().mockResolvedValue({ id: 'aud_1' } as unknown as import('../audit/types/audit.types.js').AuditLogRecord),
    };
    authService = new AuthService(
      mockRepo as AuthRepository,
      mockAudit as unknown as import('../audit/service/audit.service.js').AuditService,
    );
  });

  it('successfully logs in an active Super Admin', async () => {
    vi.mocked(mockRepo.findUserByEmail!).mockResolvedValue(sampleSuperAdmin);

    const result = await authService.login(
      'superadmin@bezent.com',
      'CorrectPassword123!'
    );

    expect(result.token).toBeDefined();
    expect(result.user.isSuperAdmin).toBe(true);
    expect(result.user.email).toBe('superadmin@bezent.com');
  });

  it('rejects login with incorrect password', async () => {
    vi.mocked(mockRepo.findUserByEmail!).mockResolvedValue(sampleSuperAdmin);

    await expect(
      authService.login(
        'superadmin@bezent.com',
        'WrongPassword!'
      )
    ).rejects.toThrow(UnauthorizedError);
  });

  it('rejects login for non-existent user', async () => {
    vi.mocked(mockRepo.findUserByEmail!).mockResolvedValue(null);

    await expect(
      authService.login(
        'ghost@bezent.com',
        'AnyPassword123!'
      )
    ).rejects.toThrow(UnauthorizedError);
  });

  it('rejects login for suspended or inactive accounts', async () => {
    const suspendedUser: User = { ...sampleSuperAdmin, status: 'suspended' };
    vi.mocked(mockRepo.findUserByEmail!).mockResolvedValue(suspendedUser);

    await expect(
      authService.login(
        'superadmin@bezent.com',
        'CorrectPassword123!'
      )
    ).rejects.toThrow(ForbiddenError);
  });

  it('validates active session and identifies super admin status', async () => {
    const futureDate = new Date(Date.now() + 86400000);
    vi.mocked(mockRepo.findActiveSession!).mockResolvedValue({
      id: 'sess_1',
      token: 'bzt_sess_valid_token',
      userId: 'usr_super_admin_01',
      expiresAt: futureDate,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: sampleSuperAdmin,
    });

    const validated = await authService.validateToken('bzt_sess_valid_token');
    expect(validated.isSuperAdmin).toBe(true);
    expect(validated.id).toBe('usr_super_admin_01');
  });

  it('rejects expired or non-existent session token', async () => {
    vi.mocked(mockRepo.findActiveSession!).mockResolvedValue(null);

    await expect(authService.validateToken('bzt_sess_expired')).rejects.toThrow(
      UnauthorizedError
    );
  });

  it('correctly reports regular user is NOT a Super Admin', async () => {
    const futureDate = new Date(Date.now() + 86400000);
    vi.mocked(mockRepo.findActiveSession!).mockResolvedValue({
      id: 'sess_2',
      token: 'bzt_sess_regular_user',
      userId: 'usr_company_admin_01',
      expiresAt: futureDate,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: sampleRegularUser,
    });

    const validated = await authService.validateToken('bzt_sess_regular_user');
    expect(validated.isSuperAdmin).toBe(false);
  });
});
