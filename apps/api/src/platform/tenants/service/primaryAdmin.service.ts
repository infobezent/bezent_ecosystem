import crypto from 'node:crypto';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  tenants,
  tenantAdmins,
  users,
  invitations,
  companies,
  memberships,
  type TenantAdmin,
  type Invitation,
} from '../../../db/schema.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { emailService, EmailService } from '../../email/service/email.service.js';
import { roleManagementService } from '../../access/service/roleManagement.service.js';
import { transactionalOutboxService } from '../../outbox/service/transactionalOutbox.service.js';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from '../../../app/errors/AppError.js';
import { generateSurrogateId, createUnusableCredential } from '../../auth/security.js';

export interface PrimaryAdminInfo {
  id: string;
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  isPrimary: boolean;
  status: string;
  createdAt: Date;
}

export interface InvitationInfo {
  id: string;
  tenantId: string;
  email: string;
  authorityType: string;
  isPrimaryAdmin: boolean;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}

export class PrimaryAdminService {
  constructor(
    private readonly audit: AuditService = auditService,
    private readonly email: EmailService = emailService,
  ) {}

  async getPrimaryAdmin(tenantId: string): Promise<{
    primaryAdmin: PrimaryAdminInfo | null;
    pendingInvitation: InvitationInfo | null;
  }> {
    const db = getDb();

    const [adminRow] = await db
      .select({
        admin: tenantAdmins,
        user: users,
      })
      .from(tenantAdmins)
      .innerJoin(users, eq(tenantAdmins.userId, users.id))
      .where(
        and(
          eq(tenantAdmins.tenantId, tenantId),
          eq(tenantAdmins.isPrimary, true),
          eq(tenantAdmins.status, 'active'),
        ),
      );

    const [invitationRow] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.tenantId, tenantId),
          eq(invitations.authorityType, 'tenant_admin'),
          eq(invitations.isPrimaryAdmin, true),
          eq(invitations.status, 'pending'),
        ),
      )
      .orderBy(desc(invitations.createdAt));

    const primaryAdmin: PrimaryAdminInfo | null = adminRow
      ? {
          id: adminRow.admin.id,
          userId: adminRow.user.id,
          tenantId: adminRow.admin.tenantId,
          email: adminRow.user.email,
          name: `${adminRow.user.firstName} ${adminRow.user.lastName}`.trim(),
          avatarUrl: null,
          jobTitle: adminRow.admin.jobTitle,
          isPrimary: adminRow.admin.isPrimary,
          status: adminRow.admin.status,
          createdAt: adminRow.admin.createdAt,
        }
      : null;

    const pendingInvitation: InvitationInfo | null = invitationRow
      ? {
          id: invitationRow.id,
          tenantId: invitationRow.tenantId,
          email: invitationRow.email,
          authorityType: invitationRow.authorityType,
          isPrimaryAdmin: invitationRow.isPrimaryAdmin,
          status: invitationRow.status,
          expiresAt: invitationRow.expiresAt,
          createdAt: invitationRow.createdAt,
        }
      : null;

    return { primaryAdmin, pendingInvitation };
  }

  async invitePrimaryAdmin(
    tenantId: string,
    email: string,
    jobTitle?: string,
    actor?: { id?: string; email?: string },
  ): Promise<InvitationInfo> {
    const db = getDb();
    const normalizedEmail = email.toLowerCase().trim();

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }

    // Check if an active primary admin already exists
    const [existingPrimary] = await db
      .select()
      .from(tenantAdmins)
      .where(
        and(
          eq(tenantAdmins.tenantId, tenantId),
          eq(tenantAdmins.isPrimary, true),
          eq(tenantAdmins.status, 'active'),
        ),
      );

    if (existingPrimary) {
      throw new ConflictError(
        `Tenant '${tenantId}' already has an active Primary Admin. Use reassignment instead of inviting a new one.`,
      );
    }

    // Check if there is already a pending primary admin invitation
    const [existingPending] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.tenantId, tenantId),
          eq(invitations.authorityType, 'tenant_admin'),
          eq(invitations.isPrimaryAdmin, true),
          eq(invitations.status, 'pending'),
        ),
      );

    if (existingPending) {
      throw new ConflictError(
        `A pending Primary Admin invitation already exists for '${existingPending.email}'. Resend or revoke it first.`,
      );
    }

    // Lookup company for FK constraint
    const [company] = await db.select().from(companies).where(eq(companies.tenantId, tenantId));
    if (!company) {
      throw new BadRequestError(`Tenant '${tenantId}' has no initialized companies for invitation linkage`);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000); // Strict 72-hour requirement
    const invId = generateSurrogateId('inv');

    await db.insert(invitations).values({
      id: invId,
      tenantId,
      companyId: company.id,
      email: normalizedEmail,
      role: 'company_admin',
      authorityType: 'tenant_admin',
      isPrimaryAdmin: true,
      token: tokenHash,
      invitedByUserId: actor?.id || null,
      status: 'pending',
      expiresAt,
    });

    // Enqueue transactional outbox event for asynchronous email delivery (P2-1)
    await transactionalOutboxService.publishEvent({
      aggregateType: 'tenant_invitation',
      aggregateId: invId,
      eventType: 'tenant.invitation.issued',
      payload: {
        invitationId: invId,
        tenantId,
        companyId: company.id,
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0] || 'Administrator',
        roleLabel: 'Primary Tenant Administrator',
        rawToken,
      },
    });

    try {
      await this.email.sendSignInInvitation({
        to: normalizedEmail,
        firstName: normalizedEmail.split('@')[0] || 'Administrator',
        companyName: tenant.name,
        roleLabel: 'Primary Tenant Administrator',
      });
    } catch {}

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'primary_admin_invited',
      targetType: 'tenant',
      targetId: tenantId,
      tenantId,
      metadata: {
        invitationId: invId,
        email: normalizedEmail,
        jobTitle,
        expiresAt,
      },
    });

    return {
      id: invId,
      tenantId,
      email: normalizedEmail,
      authorityType: 'tenant_admin',
      isPrimaryAdmin: true,
      status: 'pending',
      expiresAt,
      createdAt: new Date(),
    };
  }

  async resendInvitation(
    tenantId: string,
    invitationId: string,
    actor?: { id?: string; email?: string },
  ): Promise<InvitationInfo> {
    const db = getDb();
    const [inv] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, invitationId), eq(invitations.tenantId, tenantId)));

    if (!inv) {
      throw new NotFoundError(`Invitation '${invitationId}' not found for tenant '${tenantId}'`);
    }

    if (inv.status !== 'pending') {
      throw new BadRequestError(`Cannot resend invitation with status '${inv.status}'`);
    }

    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000); // 72 hours
    await db
      .update(invitations)
      .set({ expiresAt })
      .where(eq(invitations.id, invitationId));

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));

    try {
      await this.email.sendSignInInvitation({
        to: inv.email,
        firstName: inv.email.split('@')[0] || 'Administrator',
        companyName: tenant?.name || 'BEZENT Platform',
        roleLabel: inv.isPrimaryAdmin ? 'Primary Tenant Administrator' : 'Tenant Administrator',
      });
    } catch {}

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'primary_admin_invitation_resent',
      targetType: 'tenant',
      targetId: tenantId,
      tenantId,
      metadata: { invitationId, email: inv.email },
    });

    return {
      id: inv.id,
      tenantId: inv.tenantId,
      email: inv.email,
      authorityType: inv.authorityType,
      isPrimaryAdmin: inv.isPrimaryAdmin,
      status: 'pending',
      expiresAt,
      createdAt: inv.createdAt,
    };
  }

  async revokeInvitation(
    tenantId: string,
    invitationId: string,
    reason?: string,
    actor?: { id?: string; email?: string },
  ): Promise<void> {
    const db = getDb();
    const [inv] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, invitationId), eq(invitations.tenantId, tenantId)));

    if (!inv) {
      throw new NotFoundError(`Invitation '${invitationId}' not found for tenant '${tenantId}'`);
    }

    if (inv.status !== 'pending') {
      throw new BadRequestError(`Cannot revoke invitation with status '${inv.status}'`);
    }

    await db
      .update(invitations)
      .set({ status: 'cancelled' })
      .where(eq(invitations.id, invitationId));

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'primary_admin_invitation_revoked',
      targetType: 'tenant',
      targetId: tenantId,
      tenantId,
      metadata: { invitationId, email: inv.email, reason },
    });
  }

  async acceptInvitation(
    token: string,
    caller?: { id?: string; email?: string },
  ): Promise<{ tenantId: string; userId: string }> {
    const db = getDb();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [inv] = await db
      .select()
      .from(invitations)
      .where(or(eq(invitations.token, tokenHash), eq(invitations.token, token)));

    if (!inv) {
      throw new NotFoundError('Invalid invitation token');
    }

    if (caller?.email && caller.email.toLowerCase().trim() !== inv.email.toLowerCase().trim()) {
      throw new ForbiddenError(
        `Authenticated identity '${caller.email}' does not match the invited address '${inv.email}'`,
      );
    }

    if (inv.status === 'accepted') {
      throw new BadRequestError('Invitation has already been accepted');
    }

    if (inv.status !== 'pending') {
      throw new BadRequestError(`Invitation is not pending (status: ${inv.status})`);
    }

    const now = new Date();
    if (inv.expiresAt < now) {
      await db.update(invitations).set({ status: 'expired' }).where(eq(invitations.id, inv.id));
      throw new BadRequestError('Invitation has expired');
    }

    // Reuse or create user record
    let [user] = await db.select().from(users).where(eq(users.email, inv.email));
    if (!user) {
      const { hash, salt } = createUnusableCredential();
      const newUserId = generateSurrogateId('usr');
      await db.insert(users).values({
        id: newUserId,
        email: inv.email,
        firstName: inv.email.split('@')[0] || 'Administrator',
        lastName: 'Admin',
        passwordHash: hash,
        salt,
        status: 'active',
      });
      [user] = await db.select().from(users).where(eq(users.id, newUserId));
    }

    const userId = user!.id;

    await db.transaction(async (tx) => {
      // Mark invitation accepted
      await tx
        .update(invitations)
        .set({ status: 'accepted', acceptedAt: now })
        .where(eq(invitations.id, inv.id));

      if (inv.isPrimaryAdmin) {
        // Demote any existing primary admin
        await tx
          .update(tenantAdmins)
          .set({ isPrimary: false })
          .where(and(eq(tenantAdmins.tenantId, inv.tenantId), eq(tenantAdmins.isPrimary, true)));
      }

      // Check if user is already tenant admin
      const [existingTa] = await tx
        .select()
        .from(tenantAdmins)
        .where(and(eq(tenantAdmins.tenantId, inv.tenantId), eq(tenantAdmins.userId, userId)));

      if (existingTa) {
        await tx
          .update(tenantAdmins)
          .set({
            isPrimary: inv.isPrimaryAdmin ? true : existingTa.isPrimary,
            status: 'active',
          })
          .where(eq(tenantAdmins.id, existingTa.id));
      } else {
        await tx.insert(tenantAdmins).values({
          id: generateSurrogateId('ta'),
          tenantId: inv.tenantId,
          userId,
          isPrimary: inv.isPrimaryAdmin,
          status: 'active',
        });
      }

      // Activate Primary Company membership for Primary Admin (P1-2)
      const companyId = inv.companyId;
      if (companyId) {
        const [existingMembership] = await tx
          .select()
          .from(memberships)
          .where(
            and(
              eq(memberships.tenantId, inv.tenantId),
              eq(memberships.companyId, companyId),
              eq(memberships.userId, userId),
            ),
          );

        if (existingMembership) {
          if (existingMembership.status !== 'active' || existingMembership.role !== 'company_admin') {
            await tx
              .update(memberships)
              .set({ status: 'active', role: 'company_admin' })
              .where(eq(memberships.id, existingMembership.id));
          }
        } else {
          await tx.insert(memberships).values({
            id: generateSurrogateId('mem'),
            tenantId: inv.tenantId,
            companyId,
            userId,
            role: 'company_admin',
            status: 'active',
          });
        }

        try {
          await roleManagementService.syncMembershipRole(tx, {
            userId,
            tenantId: inv.tenantId,
            companyId,
            role: 'company_admin',
            actorId: userId,
          });
        } catch {
          // Assignment already in desired state
        }
      }
    });

    await this.audit.logEvent({
      actorUserId: userId,
      actorEmail: inv.email,
      action: 'primary_admin_invitation_accepted',
      targetType: 'tenant',
      targetId: inv.tenantId,
      tenantId: inv.tenantId,
      metadata: { invitationId: inv.id, isPrimaryAdmin: inv.isPrimaryAdmin },
    });

    return { tenantId: inv.tenantId, userId };
  }

  async reassignPrimaryAdmin(
    tenantId: string,
    newPrimaryUserId: string,
    actor?: { id?: string; email?: string },
  ): Promise<void> {
    const db = getDb();

    const [user] = await db.select().from(users).where(eq(users.id, newPrimaryUserId));
    if (!user) {
      throw new NotFoundError(`User '${newPrimaryUserId}' not found`);
    }

    await db.transaction(async (tx) => {
      // Find current primary admin
      const [currentPrimary] = await tx
        .select()
        .from(tenantAdmins)
        .where(
          and(
            eq(tenantAdmins.tenantId, tenantId),
            eq(tenantAdmins.isPrimary, true),
            eq(tenantAdmins.status, 'active'),
          ),
        );

      if (currentPrimary && currentPrimary.userId === newPrimaryUserId) {
        // Already primary admin
        return;
      }

      // 1. Demote old primary admin
      if (currentPrimary) {
        await tx
          .update(tenantAdmins)
          .set({ isPrimary: false })
          .where(eq(tenantAdmins.id, currentPrimary.id));
      }

      // 2. Promote or insert new primary admin
      const [existingTa] = await tx
        .select()
        .from(tenantAdmins)
        .where(and(eq(tenantAdmins.tenantId, tenantId), eq(tenantAdmins.userId, newPrimaryUserId)));

      if (existingTa) {
        await tx
          .update(tenantAdmins)
          .set({ isPrimary: true, status: 'active' })
          .where(eq(tenantAdmins.id, existingTa.id));
      } else {
        await tx.insert(tenantAdmins).values({
          id: generateSurrogateId('ta'),
          tenantId,
          userId: newPrimaryUserId,
          isPrimary: true,
          status: 'active',
        });
      }
    });

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'primary_admin_reassigned',
      targetType: 'tenant',
      targetId: tenantId,
      tenantId,
      metadata: { newPrimaryUserId },
    });
  }

  async removeTenantAdmin(
    tenantId: string,
    adminId: string,
    actor?: { id?: string; email?: string },
  ): Promise<void> {
    const db = getDb();
    const [admin] = await db
      .select()
      .from(tenantAdmins)
      .where(and(eq(tenantAdmins.id, adminId), eq(tenantAdmins.tenantId, tenantId)));

    if (!admin) {
      throw new NotFoundError(`Tenant Admin '${adminId}' not found for tenant '${tenantId}'`);
    }

    if (admin.isPrimary) {
      throw new BadRequestError('Cannot remove Primary Admin directly. Reassign Primary Admin first.');
    }

    const allAdmins = await db
      .select()
      .from(tenantAdmins)
      .where(and(eq(tenantAdmins.tenantId, tenantId), eq(tenantAdmins.status, 'active')));

    if (allAdmins.length <= 1) {
      throw new BadRequestError('Cannot remove the last active Tenant Admin for this tenant');
    }

    await db
      .update(tenantAdmins)
      .set({ status: 'revoked' })
      .where(eq(tenantAdmins.id, adminId));

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'tenant_admin_removed',
      targetType: 'tenant',
      targetId: tenantId,
      tenantId,
      metadata: { adminId, userId: admin.userId },
    });
  }
}

export const primaryAdminService = new PrimaryAdminService();
