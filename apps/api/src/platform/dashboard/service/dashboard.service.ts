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
import type { TenantRecord } from '../../tenants/types/tenant.types.js';
import type { AuditLogRecord } from '../../audit/types/audit.types.js';

export interface DashboardOverview {
  metrics: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalCompanies: number;
    activeCompanies: number;
    totalUsers: number;
    pendingProvisioning: number;
  };
  recentCustomers: TenantRecord[];
  recentActivities: AuditLogRecord[];
  recentTenants: TenantRecord[];
  recentAuditLogs: AuditLogRecord[];
}

export class DashboardService {
  constructor(
    private readonly tenantRepo: TenantRepository = tenantRepository,
    private readonly companyRepo: CompanyRepository = companyRepository,
    private readonly userRepo: PlatformUserRepository = platformUserRepository,
    private readonly auditRepo: AuditRepository = auditRepository,
  ) {}

  async getOverview(): Promise<DashboardOverview> {
    const tenantCounts = await this.tenantRepo.getCounts();
    const companyCounts = await this.companyRepo.getCounts();
    const userCounts = await this.userRepo.getCounts();

    const recentTenantsResult = await this.tenantRepo.list({ page: 1, limit: 5 });
    const recentAuditResult = await this.auditRepo.list({ page: 1, limit: 10 });

    return {
      metrics: {
        totalTenants: tenantCounts.total,
        activeTenants: tenantCounts.active,
        suspendedTenants: tenantCounts.suspended,
        totalCompanies: companyCounts.total,
        activeCompanies: companyCounts.active,
        totalUsers: userCounts.total,
        pendingProvisioning: 0,
      },
      recentCustomers: recentTenantsResult.items,
      recentActivities: recentAuditResult.items,
      recentTenants: recentTenantsResult.items,
      recentAuditLogs: recentAuditResult.items,
    };
  }
}

export const dashboardService = new DashboardService();
