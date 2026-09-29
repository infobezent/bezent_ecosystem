import { authRepository, AuthRepository } from '../repository/auth.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import {
  generateSessionToken,
  generateSurrogateId,
  hashPassword,
  verifyPassword,
} from '../security.js';
import { UnauthorizedError, ForbiddenError } from '../../../app/errors/AppError.js';
import type { AuthenticatedUser, LoginResult } from '../types/auth.types.js';
import { getDb } from '../../../db/connection.js';
import { users } from '../../../db/schema.js';

const SESSION_TTL_HOURS = 24;

export class AuthService {
  constructor(
    private readonly repo: AuthRepository = authRepository,
    private readonly audit: AuditService = auditService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.repo.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === 'suspended') {
      throw new ForbiddenError('Account is suspended. Please contact administrator.');
    }
    if (user.status === 'inactive') {
      throw new UnauthorizedError('Account is inactive.');
    }

    const isValidPassword = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

    await this.repo.createSession(user.id, token, expiresAt);
    await this.repo.updateLastLogin(user.id);

    const memberships = await this.repo.getUserMemberships(user.id);

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
      isSuperAdmin: user.isSuperAdmin,
      memberships: memberships.map((m) => ({
        tenantId: m.tenantId,
        companyId: m.companyId,
        role: m.role,
        status: m.status,
        companyName: m.companyName,
        companyCode: m.companyCode,
        companyStatus: m.companyStatus,
        tenantName: m.tenantName,
        tenantStatus: m.tenantStatus,
      })),
    };

    await this.audit.logEvent({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'user_logged_in',
      targetType: 'user',
      targetId: user.id,
    });

    const isCompanyAdmin = memberships.some((m) => m.role === 'company_admin');
    const defaultDestination = user.isSuperAdmin
      ? '/super-admin'
      : isCompanyAdmin
        ? '/company-admin'
        : '/hrms/dashboard';

    return {
      token,
      user: authenticatedUser,
      expiresAt: expiresAt.toISOString(),
      defaultDestination,
    };
  }

  async logout(token: string, userId?: string, email?: string): Promise<void> {
    await this.repo.revokeSession(token);
    if (userId) {
      await this.audit.logEvent({
        actorUserId: userId,
        actorEmail: email,
        action: 'user_logged_out',
        targetType: 'session',
        targetId: token.substring(0, 8),
      });
    }
  }

  async validateToken(token: string): Promise<AuthenticatedUser> {
    const session = await this.repo.findActiveSession(token);
    if (!session) {
      throw new UnauthorizedError('Session expired or invalid');
    }

    const { user } = session;
    if (user.status !== 'active') {
      throw new ForbiddenError('Account is not active');
    }

    const memberships = await this.repo.getUserMemberships(user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
      isSuperAdmin: user.isSuperAdmin,
      memberships: memberships.map((m) => ({
        tenantId: m.tenantId,
        companyId: m.companyId,
        role: m.role,
        status: m.status,
        companyName: m.companyName,
        companyCode: m.companyCode,
        companyStatus: m.companyStatus,
        tenantName: m.tenantName,
        tenantStatus: m.tenantStatus,
      })),
    };
  }

  async bootstrapSuperAdmin(): Promise<void> {
    const defaultEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@bezent.com';
    const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || 'BezentSuperAdmin2026!';

    const existing = await this.repo.findUserByEmail(defaultEmail);
    if (existing) return;

    const { hash, salt } = hashPassword(defaultPassword);
    const db = getDb();
    const id = generateSurrogateId('usr_sa');

    await db.insert(users).values({
      id,
      email: defaultEmail.toLowerCase().trim(),
      passwordHash: hash,
      salt,
      firstName: 'Super',
      lastName: 'Admin',
      status: 'active',
      isSuperAdmin: true,
    });
  }
}

export const authService = new AuthService();
