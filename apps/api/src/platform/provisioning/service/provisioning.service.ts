import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  tenants,
  tenantDetails,
  companies,
  users,
  memberships,
  tenantModules,
} from '../../../db/schema.js';
import { tenantRepository, TenantRepository } from '../../tenants/repository/tenant.repository.js';
import { companyRepository, CompanyRepository } from '../../companies/repository/company.repository.js';
import { platformUserRepository, PlatformUserRepository } from '../../users/repository/user.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { roleManagementService } from '../../access/service/roleManagement.service.js';
import { ConflictError, BadRequestError } from '../../../app/errors/AppError.js';
import { generateSurrogateId, hashPassword } from '../../auth/security.js';
import type { CustomerProvisioningDto, ProvisioningResult } from '../types/provisioning.types.js';
import type { ModuleCode } from '../../modules/types/module.types.js';

export class CustomerProvisioningService {
  constructor(
    private readonly tenantRepo: TenantRepository = tenantRepository,
    private readonly companyRepo: CompanyRepository = companyRepository,
    private readonly userRepo: PlatformUserRepository = platformUserRepository,
    private readonly audit: AuditService = auditService,
  ) {}

  async validatePreflight(dto: CustomerProvisioningDto): Promise<{ valid: boolean; summary: string }> {
    const existingTenant = await this.tenantRepo.findByCode(dto.tenant.code);
    if (existingTenant) {
      throw new ConflictError(`A tenant with code '${dto.tenant.code}' already exists`);
    }

    if (dto.admin.newUser) {
      const existingUser = await this.userRepo.findByEmail(dto.admin.newUser.email);
      if (existingUser && existingUser.memberships && existingUser.memberships.length > 0) {
        throw new BadRequestError(
          `User '${dto.admin.newUser.email}' already exists in another tenant. Please use an unassigned email or assign via userId.`,
        );
      }
    }

    return {
      valid: true,
      summary: `Tenant '${dto.tenant.name}' (${dto.tenant.code}) with company '${dto.company.name}' and ${dto.modules.length} modules is ready to provision.`,
    };
  }

  async provisionCustomer(
    dto: CustomerProvisioningDto,
    actor?: { id?: string; email?: string },
  ): Promise<ProvisioningResult> {
    await this.validatePreflight(dto);

    const db = getDb();
    const tenantId = dto.tenant.id?.trim() || generateSurrogateId('tnt');
    const companyId = dto.company.id?.trim() || generateSurrogateId('comp');
    let targetUserId = dto.admin.userId?.trim();
    let temporaryPassword: string | undefined;
    let isNewUser = false;

    // Determine or prepare company admin user
    if (!targetUserId && dto.admin.newUser) {
      const existingUser = await this.userRepo.findByEmail(dto.admin.newUser.email);
      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        targetUserId = generateSurrogateId('usr');
        temporaryPassword =
          dto.admin.newUser.tempPassword || `Admin!${crypto.randomBytes(4).toString('hex')}`;
        isNewUser = true;
      }
    }

    if (!targetUserId) {
      throw new BadRequestError('Admin user identifier could not be resolved');
    }

    // Execute atomic transactional provisioning
    await db.transaction(async (tx) => {
      // 1. Tenant
      await tx.insert(tenants).values({
        id: tenantId,
        name: dto.tenant.name.trim(),
        status: 'active',
      });

      // 2. Tenant Details
      await tx.insert(tenantDetails).values({
        tenantId,
        code: dto.tenant.code.trim().toUpperCase(),
        contactEmail: dto.tenant.contactEmail?.trim() || null,
        contactPhone: dto.tenant.contactPhone?.trim() || null,
      });

      // 3. Company
      await tx.insert(companies).values({
        id: companyId,
        tenantId,
        name: dto.company.name.trim(),
        code: dto.company.code.trim().toUpperCase(),
        legalName: dto.company.legalName?.trim() || null,
        businessEmail: dto.company.businessEmail?.trim() || null,
        contactPhone: dto.company.contactPhone?.trim() || null,
        country: dto.company.country?.trim() || null,
        timeZone: dto.company.timeZone?.trim() || null,
        status: 'active',
      });

      // 4. Module Access Entitlements
      for (const moduleCode of dto.modules) {
        const modId = generateSurrogateId('mod');
        await tx.insert(tenantModules).values({
          id: modId,
          tenantId,
          companyId,
          moduleCode,
          status: 'enabled',
          enabledAt: new Date(),
        });
      }

      // 5. Admin User (if new)
      if (isNewUser && dto.admin.newUser && temporaryPassword) {
        const { hash, salt } = hashPassword(temporaryPassword);
        await tx.insert(users).values({
          id: targetUserId!,
          email: dto.admin.newUser.email.toLowerCase().trim(),
          passwordHash: hash,
          salt,
          firstName: dto.admin.newUser.firstName.trim(),
          lastName: dto.admin.newUser.lastName.trim(),
          phone: dto.admin.newUser.phone?.trim() || null,
          status: 'active',
          isSuperAdmin: false,
        });
      }

      // 6. Company Admin Membership
      const membershipId = generateSurrogateId('mem');
      await tx.insert(memberships).values({
        id: membershipId,
        tenantId,
        companyId,
        userId: targetUserId!,
        role: 'company_admin',
        status: 'active',
      });
      await roleManagementService.syncMembershipRole(tx, {
        userId: targetUserId!,
        tenantId,
        companyId,
        role: 'company_admin',
        actorId: actor?.id ?? null,
      });
    });

    // Load full created records
    const createdTenant = await this.tenantRepo.findById(tenantId);
    const createdCompany = await this.companyRepo.findById(companyId);
    const assignedUser = await this.userRepo.findById(targetUserId);
    const [adminMembership] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, tenantId),
          eq(memberships.companyId, companyId),
          eq(memberships.userId, targetUserId),
        ),
      );

    const result: ProvisioningResult = {
      tenant: createdTenant!,
      company: createdCompany!,
      modules: (createdTenant?.activeModules || []).map((code) => ({
        id: generateSurrogateId('mod'),
        tenantId,
        companyId,
        moduleCode: code as ModuleCode,
        status: 'enabled',
        enabledAt: new Date().toISOString(),
        disabledAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      admin: {
        membershipId: adminMembership?.id || generateSurrogateId('mem'),
        userId: targetUserId,
        email: assignedUser?.email || '',
        firstName: assignedUser?.firstName || '',
        lastName: assignedUser?.lastName || '',
        phone: assignedUser?.phone || null,
        tenantId,
        tenantName: createdTenant?.name,
        companyId,
        companyName: createdCompany?.name,
        role: 'company_admin',
        status: 'active',
        assignedAt: new Date().toISOString(),
      },
      invitationDelivery: {
        status: isNewUser ? 'MANUAL_DELIVERY_REQUIRED' : 'ALREADY_ASSIGNED',
        message: isNewUser
          ? 'Customer provisioning complete. Email service is not configured; supply the generated administrator password to the customer admin.'
          : 'Customer provisioning complete. Existing user has been assigned as Company Administrator.',
        temporaryPassword,
      },
      status: 'COMPLETED',
    };

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'customer_provisioned',
      targetType: 'tenant',
      targetId: tenantId,
      tenantId,
      companyId,
      metadata: {
        tenantName: createdTenant?.name,
        companyName: createdCompany?.name,
        adminUserId: targetUserId,
        modules: dto.modules,
      },
    });

    return result;
  }
}

export const customerProvisioningService = new CustomerProvisioningService();
