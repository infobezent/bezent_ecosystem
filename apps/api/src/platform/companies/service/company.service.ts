import { sql } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { companies } from '../../../db/schema.js';
import { generateSurrogateId } from '../../auth/security.js';
import { companyRepository, CompanyRepository } from '../repository/company.repository.js';
import { tenantRepository, TenantRepository } from '../../tenants/repository/tenant.repository.js';
import { moduleService, ModuleService } from '../../modules/service/module.service.js';
import {
  companyAdminService,
  CompanyAdminService,
} from '../../company-admins/service/companyAdmin.service.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from '../../../app/errors/AppError.js';
import {
  normalizeText,
  normalizeEmail,
  normalizePhone,
  normalizeCountryCode,
  normalizePostalCode,
  normalizeIdentifier,
  referenceDataService,
} from '../../data/index.js';
import type {
  CompanyFilter,
  CompanyRecord,
  CompanyProfile,
  CreateCompanyDto,
  CreateTenantAdminCompanyDto,
  UpdateCompanyDto,
  UpdateCompanyProfileInput,
} from '../types/company.types.js';

export class CompanyService {
  constructor(
    private readonly repo: CompanyRepository = companyRepository,
    private readonly tenantRepo: TenantRepository = tenantRepository,
    private readonly moduleSvc: ModuleService = moduleService,
    private readonly companyAdminSvc: CompanyAdminService = companyAdminService,
    private readonly audit: AuditService = auditService,
  ) {}

  async listCompanies(filter: CompanyFilter): Promise<{ items: CompanyRecord[]; total: number }> {
    return this.repo.list(filter);
  }

  async getCompanyById(id: string): Promise<CompanyRecord> {
    const company = await this.repo.findById(id);
    if (!company) {
      throw new NotFoundError(`Company '${id}' not found`);
    }
    return company;
  }

  async createCompany(
    dto: CreateCompanyDto,
    actor?: { id?: string; email?: string },
  ): Promise<CompanyRecord> {
    const tenant = await this.tenantRepo.findById(dto.tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant '${dto.tenantId}' not found`);
    }
    if (tenant.status === 'suspended') {
      throw new BadRequestError(`Cannot create company under suspended tenant '${tenant.name}'`);
    }

    const existingCode = await this.repo.findByTenantAndCode(dto.tenantId, dto.code);
    if (existingCode) {
      throw new ConflictError(`Company with code '${dto.code}' already exists for this tenant`);
    }

    // Enforce Tenant Entitlement Ceiling before creation
    if (dto.modules && dto.modules.length > 0) {
      for (const mod of dto.modules) {
        const entitled = await this.moduleSvc.isTenantEntitled(dto.tenantId, mod);
        if (!entitled) {
          throw new BadRequestError(
            `Cannot enable application '${mod}' for company: parent tenant '${tenant.name}' is not entitled to it`,
          );
        }
      }
    }

    const created = await this.repo.create(dto);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'company_created',
      targetType: 'company',
      targetId: created.id,
      tenantId: dto.tenantId,
      companyId: created.id,
      metadata: { name: created.name, code: created.code },
    });

    // Enable initial modules
    if (dto.modules && dto.modules.length > 0) {
      for (const mod of dto.modules) {
        await this.moduleSvc.enableModule(dto.tenantId, mod, created.id, actor);
      }
    }

    // Assign initial company administrator if provided
    if (dto.admin && (dto.admin.userId || dto.admin.newUser)) {
      await this.companyAdminSvc.assignCompanyAdmin(
        {
          tenantId: dto.tenantId,
          companyId: created.id,
          userId: dto.admin.userId,
          newUser: dto.admin.newUser,
        },
        actor,
      );
    }

    return this.getCompanyById(created.id);
  }

  async updateCompany(
    id: string,
    dto: UpdateCompanyDto,
    actor?: { id?: string; email?: string },
  ): Promise<CompanyRecord> {
    const existing = await this.getCompanyById(id);
    const updated = await this.repo.update(id, dto);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'company_updated',
      targetType: 'company',
      targetId: id,
      tenantId: existing.tenantId,
      companyId: id,
      metadata: { changes: dto },
    });

    return updated;
  }

  async activateCompany(
    id: string,
    actor?: { id?: string; email?: string },
  ): Promise<CompanyRecord> {
    const existing = await this.getCompanyById(id);
    const updated = await this.repo.updateStatus(id, 'active');

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'company_reactivated',
      targetType: 'company',
      targetId: id,
      tenantId: existing.tenantId,
      companyId: id,
    });

    return updated;
  }

  async suspendCompany(
    id: string,
    actor?: { id?: string; email?: string },
  ): Promise<CompanyRecord> {
    const existing = await this.getCompanyById(id);
    const updated = await this.repo.updateStatus(id, 'suspended');

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'company_suspended',
      targetType: 'company',
      targetId: id,
      tenantId: existing.tenantId,
      companyId: id,
    });

    return updated;
  }

  async getCompanyProfile(companyId: string): Promise<CompanyProfile> {
    const comp = await this.repo.getCompanyProfile(companyId);
    if (!comp) {
      throw new NotFoundError(`Company '${companyId}' not found`);
    }

    return {
      id: comp.id,
      tenantId: comp.tenantId,
      name: comp.name,
      code: comp.code,
      displayName: comp.displayName ?? null,
      legalName: comp.legalName ?? null,
      organizationType: comp.organizationType ?? null,
      industry: comp.industry ?? null,
      website: comp.website ?? null,
      logoUrl: comp.logoUrl ?? null,
      businessEmail: comp.businessEmail ?? null,
      contactPhone: comp.contactPhone ?? null,
      alternateEmail: comp.alternateEmail ?? null,
      alternatePhone: comp.alternatePhone ?? null,
      addressLine1: comp.addressLine1 ?? null,
      addressLine2: comp.addressLine2 ?? null,
      city: comp.city ?? null,
      state: comp.state ?? null,
      country: comp.country ?? null,
      postalCode: comp.postalCode ?? null,
      timeZone: comp.timeZone ?? null,
      registrationNumber: comp.registrationNumber ?? null,
      currency: comp.currency ?? null,
      locale: comp.locale ?? null,
      dateFormat: comp.dateFormat ?? null,
      status: comp.status,
      createdAt: comp.createdAt,
    };
  }

  async updateCompanyProfile(
    tenantId: string,
    companyId: string,
    input: UpdateCompanyProfileInput,
    actor?: { id?: string; email?: string },
  ): Promise<CompanyProfile> {
    const comp = await this.repo.getCompanyProfile(companyId);
    if (!comp) {
      throw new NotFoundError(`Company '${companyId}' not found`);
    }

    if (comp.tenantId !== tenantId) {
      throw new ForbiddenError(
        'Requested company belongs to another tenant. Cross-tenant access is prohibited.',
        'CROSS_TENANT_COMPANY_ACCESS_DENIED',
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d+\-()\s.]{7,25}$/;
    const websiteRegex =
      /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
    const indiaPinRegex = /^\d{6}$/;
    const genericPostalRegex = /^[a-zA-Z0-9\s-]{2,20}$/;

    // Explicit sanitize & allowlist object
    const sanitizedInput: UpdateCompanyProfileInput = {};

    if (input.displayName !== undefined) {
      if (input.displayName !== null && typeof input.displayName !== 'string') {
        throw new BadRequestError('Display name must be a string');
      }
      sanitizedInput.displayName = input.displayName ? input.displayName.trim() : null;
    }

    if (input.legalName !== undefined) {
      if (input.legalName !== null && typeof input.legalName !== 'string') {
        throw new BadRequestError('Legal name must be a string');
      }
      sanitizedInput.legalName = input.legalName ? input.legalName.trim() : null;
    }

    if (input.organizationType !== undefined) {
      if (input.organizationType !== null && typeof input.organizationType !== 'string') {
        throw new BadRequestError('Organization type must be a string');
      }
      sanitizedInput.organizationType = input.organizationType
        ? input.organizationType.trim()
        : null;
    }

    if (input.industry !== undefined) {
      if (input.industry !== null && typeof input.industry !== 'string') {
        throw new BadRequestError('Industry must be a string');
      }
      sanitizedInput.industry = input.industry ? input.industry.trim() : null;
    }

    if (input.website !== undefined) {
      if (input.website !== null && typeof input.website !== 'string') {
        throw new BadRequestError('Website must be a string');
      }
      const trimmed = input.website ? input.website.trim() : null;
      if (trimmed && !websiteRegex.test(trimmed)) {
        throw new BadRequestError('Please enter a valid website URL (e.g. www.example.com)');
      }
      sanitizedInput.website = trimmed;
    }

    if (input.logoUrl !== undefined) {
      if (input.logoUrl !== null && typeof input.logoUrl !== 'string') {
        throw new BadRequestError('Logo URL must be a string');
      }
      sanitizedInput.logoUrl = input.logoUrl ? input.logoUrl.trim() : null;
    }

    if (input.businessEmail !== undefined) {
      if (input.businessEmail !== null && typeof input.businessEmail !== 'string') {
        throw new BadRequestError('Business email must be a string');
      }
      const trimmed = input.businessEmail ? input.businessEmail.trim().toLowerCase() : null;
      if (trimmed && !emailRegex.test(trimmed)) {
        throw new BadRequestError('Invalid business email address');
      }
      sanitizedInput.businessEmail = trimmed;
    }

    if (input.contactPhone !== undefined) {
      if (input.contactPhone !== null && typeof input.contactPhone !== 'string') {
        throw new BadRequestError('Contact phone must be a string');
      }
      const trimmed = input.contactPhone ? input.contactPhone.trim() : null;
      if (trimmed && !phoneRegex.test(trimmed)) {
        throw new BadRequestError('Invalid contact phone format');
      }
      sanitizedInput.contactPhone = trimmed;
    }

    if (input.alternateEmail !== undefined) {
      if (input.alternateEmail !== null && typeof input.alternateEmail !== 'string') {
        throw new BadRequestError('Alternate email must be a string');
      }
      const trimmed = input.alternateEmail ? input.alternateEmail.trim().toLowerCase() : null;
      if (trimmed && !emailRegex.test(trimmed)) {
        throw new BadRequestError('Invalid alternate email format');
      }
      sanitizedInput.alternateEmail = trimmed;
    }

    if (input.alternatePhone !== undefined) {
      if (input.alternatePhone !== null && typeof input.alternatePhone !== 'string') {
        throw new BadRequestError('Alternate phone must be a string');
      }
      const trimmed = input.alternatePhone ? input.alternatePhone.trim() : null;
      if (trimmed && !phoneRegex.test(trimmed)) {
        throw new BadRequestError('Invalid alternate phone format');
      }
      sanitizedInput.alternatePhone = trimmed;
    }

    if (input.addressLine1 !== undefined) {
      if (input.addressLine1 !== null && typeof input.addressLine1 !== 'string') {
        throw new BadRequestError('Address line 1 must be a string');
      }
      sanitizedInput.addressLine1 = input.addressLine1 ? input.addressLine1.trim() : null;
    }

    if (input.addressLine2 !== undefined) {
      if (input.addressLine2 !== null && typeof input.addressLine2 !== 'string') {
        throw new BadRequestError('Address line 2 must be a string');
      }
      sanitizedInput.addressLine2 = input.addressLine2 ? input.addressLine2.trim() : null;
    }

    if (input.city !== undefined) {
      if (input.city !== null && typeof input.city !== 'string') {
        throw new BadRequestError('City must be a string');
      }
      sanitizedInput.city = input.city ? input.city.trim() : null;
    }

    if (input.state !== undefined) {
      if (input.state !== null && typeof input.state !== 'string') {
        throw new BadRequestError('State must be a string');
      }
      sanitizedInput.state = input.state ? input.state.trim() : null;
    }

    if (input.country !== undefined) {
      if (input.country !== null && typeof input.country !== 'string') {
        throw new BadRequestError('Country must be a string');
      }
      sanitizedInput.country = input.country ? input.country.trim() : null;
    }

    if (input.postalCode !== undefined) {
      if (input.postalCode !== null && typeof input.postalCode !== 'string') {
        throw new BadRequestError('Postal code must be a string');
      }
      const trimmed = input.postalCode ? input.postalCode.trim() : null;
      if (trimmed) {
        const countryVal = sanitizedInput.country ?? comp.country;
        const isIndia = typeof countryVal === 'string' && countryVal.toLowerCase() === 'india';
        if (isIndia && !indiaPinRegex.test(trimmed)) {
          throw new BadRequestError('PIN code must be a 6-digit number');
        } else if (!genericPostalRegex.test(trimmed)) {
          throw new BadRequestError('Invalid postal code format');
        }
      }
      sanitizedInput.postalCode = trimmed;
    }

    if (input.timeZone !== undefined) {
      if (input.timeZone !== null && typeof input.timeZone !== 'string') {
        throw new BadRequestError('Time zone must be a string');
      }
      sanitizedInput.timeZone = input.timeZone ? input.timeZone.trim() : null;
    }

    if (input.registrationNumber !== undefined) {
      if (input.registrationNumber !== null && typeof input.registrationNumber !== 'string') {
        throw new BadRequestError('Registration number must be a string');
      }
      const trimmed = input.registrationNumber ? input.registrationNumber.trim() : null;
      if (trimmed && trimmed.length > 100) {
        throw new BadRequestError('Registration number cannot exceed 100 characters');
      }
      sanitizedInput.registrationNumber = trimmed;
    }

    if (input.currency !== undefined) {
      if (input.currency !== null && typeof input.currency !== 'string') {
        throw new BadRequestError('Currency must be a string');
      }
      const trimmed = input.currency ? input.currency.trim().toUpperCase() : null;
      if (trimmed && (trimmed.length < 3 || trimmed.length > 10)) {
        throw new BadRequestError('Currency must be a valid currency code');
      }
      sanitizedInput.currency = trimmed;
    }

    if (input.locale !== undefined) {
      if (input.locale !== null && typeof input.locale !== 'string') {
        throw new BadRequestError('Locale must be a string');
      }
      sanitizedInput.locale = input.locale ? input.locale.trim() : null;
    }

    if (input.dateFormat !== undefined) {
      if (input.dateFormat !== null && typeof input.dateFormat !== 'string') {
        throw new BadRequestError('Date format must be a string');
      }
      sanitizedInput.dateFormat = input.dateFormat ? input.dateFormat.trim() : null;
    }

    const updated = await this.repo.updateCompanyProfile(companyId, sanitizedInput);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'company_profile_updated',
      targetType: 'company',
      targetId: companyId,
      tenantId,
      companyId,
      metadata: { fieldsUpdated: Object.keys(sanitizedInput) },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      code: updated.code,
      displayName: updated.displayName,
      legalName: updated.legalName,
      organizationType: updated.organizationType,
      industry: updated.industry,
      website: updated.website,
      logoUrl: updated.logoUrl,
      businessEmail: updated.businessEmail,
      contactPhone: updated.contactPhone,
      alternateEmail: updated.alternateEmail,
      alternatePhone: updated.alternatePhone,
      addressLine1: updated.addressLine1,
      addressLine2: updated.addressLine2,
      city: updated.city,
      state: updated.state,
      country: updated.country,
      postalCode: updated.postalCode,
      timeZone: updated.timeZone,
      registrationNumber: updated.registrationNumber ?? null,
      currency: updated.currency ?? null,
      locale: updated.locale ?? null,
      dateFormat: updated.dateFormat ?? null,
      status: updated.status,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Canonical company creation for Tenant Administrators.
   * - Enforces tenant capacity ceiling server-side with FOR UPDATE transactional locking.
   * - Validates code uniqueness within the tenant.
   * - Does NOT automatically assign company_admin membership (Tenant Admin has inherited authority).
   * - Does NOT automatically allocate modules (preserves tenant ceiling, Phase 2E handles distribution).
   * - Emits canonical audit event.
   */
  async createCompanyForTenantAdmin(
    tenantId: string,
    dto: CreateTenantAdminCompanyDto,
    actor?: { id?: string; email?: string },
  ): Promise<CompanyRecord> {
    const normalizedCode =
      normalizeIdentifier(dto.code, { uppercase: true }) || dto.code.trim().toUpperCase();
    const normalizedCountry =
      normalizeCountryCode(dto.country) || (dto.country ? dto.country.trim() : null);
    const normalizedEmail = normalizeEmail(dto.businessEmail);
    const normalizedPhone =
      normalizePhone(dto.contactPhone) || (dto.contactPhone ? dto.contactPhone.trim() : null);
    const normalizedPostal =
      normalizePostalCode(dto.postalCode, normalizedCountry ?? undefined) ||
      (dto.postalCode ? dto.postalCode.trim() : null);
    const normalizedName =
      normalizeText(dto.name, { collapseWhitespace: true }) || dto.name.trim();
    const normalizedDisplayName =
      normalizeText(dto.displayName, { collapseWhitespace: true }) ||
      (dto.displayName ? dto.displayName.trim() : normalizedName);

    const db = getDb();
    const createdId = await db.transaction(async (tx) => {
      // 1. Lock tenant row for transactional capacity check (FOR UPDATE)
      const [rawTenantRows] = await tx.execute(
        sql`SELECT id, max_companies, status FROM tenants WHERE id = ${tenantId} FOR UPDATE`,
      );
      const tenantRows = rawTenantRows as unknown as Array<{
        id: string;
        max_companies: number;
        status: string;
      }>;
      const lockedTenant = tenantRows[0];
      if (!lockedTenant) {
        throw new NotFoundError(`Tenant '${tenantId}' not found`);
      }
      if (lockedTenant.status === 'suspended' || lockedTenant.status === 'archived') {
        throw new BadRequestError(`Cannot create company under ${lockedTenant.status} tenant`);
      }

      // 2. Count capacity-consuming companies inside transaction
      const [rawCountRows] = await tx.execute(
        sql`SELECT COUNT(*) as cnt FROM companies WHERE tenant_id = ${tenantId}`,
      );
      const countRows = rawCountRows as unknown as Array<{ cnt: number | string }>;
      const currentUsage = Number(countRows[0]?.cnt ?? 0);
      const maxCompanies = Number(lockedTenant.max_companies ?? 5);

      if (currentUsage >= maxCompanies) {
        throw new ConflictError(
          `Company capacity ceiling reached for tenant (${currentUsage}/${maxCompanies})`,
          'COMPANY_CAPACITY_REACHED',
        );
      }

      // 3. Check duplicate code inside tenant
      const [rawCodeRows] = await tx.execute(
        sql`SELECT id FROM companies WHERE tenant_id = ${tenantId} AND code = ${normalizedCode}`,
      );
      const codeRows = rawCodeRows as unknown as Array<{ id: string }>;
      if (codeRows.length > 0) {
        throw new ConflictError(
          `Company with code '${normalizedCode}' already exists for this tenant`,
          'COMPANY_CODE_ALREADY_EXISTS',
        );
      }

      // 4. Insert company into companies table
      const id = generateSurrogateId('comp');
      await tx.insert(companies).values({
        id,
        tenantId,
        name: normalizedName,
        code: normalizedCode,
        displayName: normalizedDisplayName,
        legalName: dto.legalName?.trim() || null,
        organizationType: dto.organizationType?.trim() || null,
        industry: dto.industry?.trim() || null,
        businessEmail: normalizedEmail,
        contactPhone: normalizedPhone,
        country: normalizedCountry,
        addressLine1: dto.addressLine1?.trim() || null,
        addressLine2: dto.addressLine2?.trim() || null,
        city: dto.city?.trim() || null,
        state: dto.state?.trim() || null,
        postalCode: normalizedPostal,
        timeZone: dto.timeZone?.trim() || null,
        registrationNumber: dto.registrationNumber ? dto.registrationNumber.trim() : null,
        currency: dto.currency ? dto.currency.trim().toUpperCase() : null,
        locale: dto.locale ? (referenceDataService.getLocale(dto.locale)?.code ?? dto.locale.trim()) : null,
        dateFormat: dto.dateFormat ? dto.dateFormat.trim() : null,
        weekStartsOn: dto.weekStartsOn ? dto.weekStartsOn.trim().toLowerCase() : null,
        financialYearStart: dto.financialYearStart ? dto.financialYearStart.trim() : null,
        logoUrl: dto.logoUrl?.trim() || null,
        brandingMode: dto.brandingMode || (dto.logoUrl ? 'own_logo' : 'initials'),
        status: 'active',
      });

      return id;
    });

    // 5. Emit canonical audit log post-commit
    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'company_created',
      targetType: 'company',
      targetId: createdId,
      tenantId,
      companyId: createdId,
      metadata: {
        companyCode: normalizedCode,
        source: 'tenant_admin',
      },
    });

    return this.getCompanyById(createdId);
  }
}

export const companyService = new CompanyService();
