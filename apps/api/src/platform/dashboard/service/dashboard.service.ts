import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  tenantModules,
} from '../../../db/schema.js';
import { tenantRepository, TenantRepository } from '../../tenants/repository/tenant.repository.js';
import {
  companyRepository,
  CompanyRepository,
} from '../../companies/repository/company.repository.js';
import {
  platformUserRepository,
  PlatformUserRepository,
} from '../../users/repository/user.repository.js';
import { auditRepository, AuditRepository } from '../../audit/repository/audit.repository.js';
import type { TenantRecord, NextBestAction, TenantStatus } from '../../tenants/types/tenant.types.js';
import type { AuditLogRecord } from '../../audit/types/audit.types.js';
import {
  evaluateCustomerHealth,
  type EvaluationAdminInput,
  type EvaluationCompanyInput,
  type EvaluationTenantInput,
} from '../../tenants/service/tenantHealth.js';
import { MODULE_CATALOG } from '../../modules/types/module.types.js';

export interface NeedsAttentionItem {
  tenantId: string;
  tenantName: string;
  status: 'critical' | 'needs_attention';
  reason: string;
  reasons: string[];
  nextBestAction: NextBestAction | null;
}

export interface ApplicationOverviewItem {
  code: 'hrms' | 'crm' | 'project_management';
  name: string;
  availability: 'GA' | 'Beta' | 'Planned';
  entitledTenantsCount: number;
}

export interface DashboardOverview {
  metrics: {
    customers: {
      total: number;
      active: number;
      suspended: number;
    };
    companies: {
      total: number;
      active: number;
      suspended: number;
      withoutAdmin: number;
    };
    platformUsers: {
      total: number;
      active: number;
      suspended: number;
    };
    companyAdmins: {
      uniqueAdmins: number;
      totalAssignments: number;
      companiesWithoutAdmin: number;
    };
    healthSummary: {
      healthy: number;
      needsAttention: number;
      critical: number;
    };
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalCompanies: number;
    activeCompanies: number;
    suspendedCompanies: number;
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    uniqueAdmins: number;
    adminAssignments: number;
    companiesWithoutAdmin: number;
  };
  customerHealth: {
    health: {
      healthy: number;
      needsAttention: number;
      critical: number;
    };
    lifecycle: {
      active: number;
      suspended: number;
    };
  };
  applications: ApplicationOverviewItem[];
  needsAttention: NeedsAttentionItem[];
  totalNeedsAttention: number;
  recentCustomers: TenantRecord[];
  recentTenants: TenantRecord[];
  recentAuditLogs: AuditLogRecord[];
  recentActivities: AuditLogRecord[];
}

export class DashboardService {
  constructor(
    private readonly tenantRepo: TenantRepository = tenantRepository,
    private readonly companyRepo: CompanyRepository = companyRepository,
    private readonly userRepo: PlatformUserRepository = platformUserRepository,
    private readonly auditRepo: AuditRepository = auditRepository,
  ) {}

  async getOverview(): Promise<DashboardOverview> {
    const db = getDb();

    // 1. Entity status counts
    const tenantCounts = await this.tenantRepo.getCounts();
    const companyCounts = await this.companyRepo.getCounts();
    const userCounts = await this.userRepo.getCounts();

    // 2. Company Admins & Companies without admin
    const adminRows = await db
      .select({
        userId: memberships.userId,
        companyId: memberships.companyId,
      })
      .from(memberships)
      .where(
        and(
          eq(memberships.role, 'company_admin'),
          eq(memberships.status, 'active'),
        ),
      );

    const uniqueAdminUsers = new Set(adminRows.map((r) => r.userId)).size;
    const totalAssignments = adminRows.length;
    const adminAssignedCompanyIds = new Set(adminRows.map((r) => r.companyId));

    const activeCompaniesRows = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.status, 'active'));

    const companiesWithoutAdmin = activeCompaniesRows.filter(
      (c) => !adminAssignedCompanyIds.has(c.id),
    ).length;

    // 3. Platform-wide Health Evaluation & Attention Queue
    const allTenants = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        status: tenants.status,
        createdAt: tenants.createdAt,
      })
      .from(tenants);

    const allCompanies = await db
      .select({
        id: companies.id,
        tenantId: companies.tenantId,
        name: companies.name,
        code: companies.code,
        status: companies.status,
      })
      .from(companies);

    const allModules = await db
      .select({
        tenantId: tenantModules.tenantId,
        moduleCode: tenantModules.moduleCode,
        status: tenantModules.status,
      })
      .from(tenantModules)
      .where(
        and(
          isNull(tenantModules.companyId),
          eq(tenantModules.status, 'enabled'),
        ),
      );

    const allAdminMembers = await db
      .select({
        tenantId: memberships.tenantId,
        companyId: memberships.companyId,
        userId: memberships.userId,
        status: memberships.status,
        lastLoginAt: users.lastLoginAt,
      })
      .from(memberships)
      .leftJoin(users, eq(memberships.userId, users.id))
      .where(
        and(
          eq(memberships.role, 'company_admin'),
          eq(memberships.status, 'active'),
        ),
      );

    const companyMap = new Map<string, EvaluationCompanyInput[]>();
    for (const c of allCompanies) {
      const list = companyMap.get(c.tenantId) ?? [];
      list.push({ id: c.id, name: c.name, code: c.code, status: c.status });
      companyMap.set(c.tenantId, list);
    }

    const moduleMap = new Map<string, string[]>();
    for (const m of allModules) {
      const list = moduleMap.get(m.tenantId) ?? [];
      if (!list.includes(m.moduleCode)) list.push(m.moduleCode);
      moduleMap.set(m.tenantId, list);
    }

    const adminMap = new Map<string, EvaluationAdminInput[]>();
    for (const a of allAdminMembers) {
      const list = adminMap.get(a.tenantId) ?? [];
      list.push({
        userId: a.userId,
        companyId: a.companyId,
        status: a.status,
        lastLoginAt: a.lastLoginAt,
      });
      adminMap.set(a.tenantId, list);
    }

    const disabledHrmsRecords = await db
      .select({ tenantId: tenantModules.tenantId })
      .from(tenantModules)
      .where(
        and(
          isNull(tenantModules.companyId),
          eq(tenantModules.moduleCode, 'hrms'),
          eq(tenantModules.status, 'disabled'),
        ),
      );
    const disabledHrmsTenantIds = new Set(disabledHrmsRecords.map((r) => r.tenantId));

    let healthyCount = 0;
    let needsAttentionCount = 0;
    let criticalCount = 0;
    const attentionItems: NeedsAttentionItem[] = [];

    for (const t of allTenants) {
      const tComps = companyMap.get(t.id) ?? [];
      const tMods = [...(moduleMap.get(t.id) ?? [])];
      if (t.status === 'active' && !disabledHrmsTenantIds.has(t.id) && !tMods.includes('hrms')) {
        tMods.push('hrms');
      }
      const tAdms = adminMap.get(t.id) ?? [];

      const tenantInput: EvaluationTenantInput = {
        id: t.id,
        name: t.name,
        status: t.status as TenantStatus,
        createdAt: t.createdAt,
      };

      const health = evaluateCustomerHealth(tenantInput, tComps, tMods, tAdms);

      if (health.status === 'healthy') {
        healthyCount++;
      } else if (health.status === 'needs_attention') {
        needsAttentionCount++;
        attentionItems.push({
          tenantId: t.id,
          tenantName: t.name,
          status: 'needs_attention',
          reason: health.reason || health.reasons[0] || 'Attention required',
          reasons: health.reasons,
          nextBestAction: health.nextBestAction ?? null,
        });
      } else if (health.status === 'critical') {
        criticalCount++;
        attentionItems.push({
          tenantId: t.id,
          tenantName: t.name,
          status: 'critical',
          reason: health.reason || health.reasons[0] || 'Critical issue detected',
          reasons: health.reasons,
          nextBestAction: health.nextBestAction ?? null,
        });
      }
    }

    // Order: critical first, then needs_attention; secondary sort by tenantName
    attentionItems.sort((a, b) => {
      if (a.status === 'critical' && b.status !== 'critical') return -1;
      if (a.status !== 'critical' && b.status === 'critical') return 1;
      return a.tenantName.localeCompare(b.tenantName);
    });

    const topNeedsAttention = attentionItems.slice(0, 5);

    // 4. Application Overview
    const activeTenantList = allTenants.filter((t) => t.status === 'active');
    const hrmsEntitledCount = activeTenantList.filter(
      (t) => !disabledHrmsTenantIds.has(t.id),
    ).length;

    const applications: ApplicationOverviewItem[] = MODULE_CATALOG.map((cat) => {
      if (cat.code === 'hrms') {
        return {
          code: cat.code,
          name: cat.name,
          availability: cat.availability,
          entitledTenantsCount: hrmsEntitledCount,
        };
      }
      return {
        code: cat.code,
        name: cat.name,
        availability: cat.availability,
        entitledTenantsCount: 0,
      };
    });

    // 5. Recent Customers (enriched) and Recent Audit Logs
    const recentTenantsResult = await this.tenantRepo.list({ page: 1, limit: 5 });
    const recentAuditResult = await this.auditRepo.list({ page: 1, limit: 8 });

    return {
      metrics: {
        customers: {
          total: tenantCounts.total,
          active: tenantCounts.active,
          suspended: tenantCounts.suspended,
        },
        companies: {
          total: companyCounts.total,
          active: companyCounts.active,
          suspended: companyCounts.suspended,
          withoutAdmin: companiesWithoutAdmin,
        },
        platformUsers: {
          total: userCounts.total,
          active: userCounts.active,
          suspended: userCounts.suspended,
        },
        companyAdmins: {
          uniqueAdmins: uniqueAdminUsers,
          totalAssignments,
          companiesWithoutAdmin,
        },
        healthSummary: {
          healthy: healthyCount,
          needsAttention: needsAttentionCount,
          critical: criticalCount,
        },
        totalTenants: tenantCounts.total,
        activeTenants: tenantCounts.active,
        suspendedTenants: tenantCounts.suspended,
        totalCompanies: companyCounts.total,
        activeCompanies: companyCounts.active,
        suspendedCompanies: companyCounts.suspended,
        totalUsers: userCounts.total,
        activeUsers: userCounts.active,
        suspendedUsers: userCounts.suspended,
        uniqueAdmins: uniqueAdminUsers,
        adminAssignments: totalAssignments,
        companiesWithoutAdmin,
      },
      customerHealth: {
        health: {
          healthy: healthyCount,
          needsAttention: needsAttentionCount,
          critical: criticalCount,
        },
        lifecycle: {
          active: tenantCounts.active,
          suspended: tenantCounts.suspended,
        },
      },
      applications,
      needsAttention: topNeedsAttention,
      totalNeedsAttention: attentionItems.length,
      recentCustomers: recentTenantsResult.items,
      recentTenants: recentTenantsResult.items,
      recentAuditLogs: recentAuditResult.items,
      recentActivities: recentAuditResult.items,
    };
  }
}

export const dashboardService = new DashboardService();
