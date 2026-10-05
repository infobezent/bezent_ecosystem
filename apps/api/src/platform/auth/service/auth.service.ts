import { authRepository, AuthRepository } from '../repository/auth.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import {
  accessResolverService,
  AccessResolverService,
} from '../../access/service/accessResolver.service.js';
import { generateSessionToken, isWellFormedSessionToken } from '../security.js';
import { UnauthorizedError, ForbiddenError } from '../../../app/errors/AppError.js';
import type { AuthenticatedUser, LoginResult } from '../types/auth.types.js';
import type { User } from '../../../db/schema.js';

export const SESSION_TTL_HOURS = 24;

/**
 * Platform sessions (ADR-018). There is ONE way to obtain a session for every
 * user: a verified Email OTP (see OtpAuthService), which calls issueSession.
 * Authorization is never decided here; it is resolved per request (ADR-017).
 */
export class AuthService {
  constructor(
    private readonly repo: AuthRepository = authRepository,
    private readonly audit: AuditService = auditService,
    private readonly access: AccessResolverService = accessResolverService,
  ) {}

  /**
   * Opens a session for an already-verified identity and resolves what it may
   * reach: platform workspaces, companies, roles, permissions and workspaces.
   */
  async issueSession(user: User): Promise<LoginResult> {
    if (user.status === 'suspended') {
      throw new ForbiddenError('Account is suspended. Please contact administrator.');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is inactive.');
    }

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

    await this.repo.createSession(user.id, token, expiresAt);
    await this.repo.updateLastLogin(user.id);

    const authenticatedUser = await this.toAuthenticatedUser(user);

    await this.audit.logEvent({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'user_logged_in',
      targetType: 'user',
      targetId: user.id,
      metadata: { method: 'email_otp' },
    });

    const access = await this.access.resolveOverview(authenticatedUser);

    // Landing destination follows the workspaces the user's effective
    // permissions actually grant, never a role name.
    const workspaces = new Set(access.companies.flatMap((c) => c.workspaces));
    const defaultDestination = user.isSuperAdmin
      ? '/super-admin'
      : workspaces.has('company_admin')
        ? '/company-admin'
        : workspaces.has('hrms')
          ? '/hrms/dashboard'
          : workspaces.has('ess')
            ? '/ess'
            : '/hrms/dashboard';

    return {
      token,
      user: authenticatedUser,
      expiresAt: expiresAt.toISOString(),
      defaultDestination,
      access,
    };
  }

  async logout(token: string, userId?: string, email?: string): Promise<void> {
    await this.repo.revokeSession(token);
    if (userId) {
      await this.audit.logEvent({
        actorUserId: userId,
        actorEmail: email,
        action: 'user_logged_out',
        // Never record any part of the session token.
        targetType: 'user',
        targetId: userId,
      });
    }
  }

  async validateToken(token: string): Promise<AuthenticatedUser> {
    // Only raw tokens as issued are accepted; a stored digest is never a credential.
    if (!isWellFormedSessionToken(token)) {
      throw new UnauthorizedError('Session expired or invalid');
    }
    const session = await this.repo.findActiveSession(token);
    if (!session) {
      throw new UnauthorizedError('Session expired or invalid');
    }

    const { user } = session;
    if (user.status !== 'active') {
      throw new ForbiddenError('Account is not active');
    }

    return this.toAuthenticatedUser(user);
  }

  private async toAuthenticatedUser(user: User): Promise<AuthenticatedUser> {
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
}

export const authService = new AuthService();
