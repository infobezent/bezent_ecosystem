import type { ModuleCode, TenantModuleRecord } from '../../modules/types/module.types.js';
import type { TenantRecord } from '../../tenants/types/tenant.types.js';
import type { CompanyRecord } from '../../companies/types/company.types.js';
import type {
  CompanyAdminAssignment,
  SignInInvitationDelivery,
} from '../../company-admins/types/companyAdmin.types.js';

export interface CustomerProvisioningDto {
  tenant: {
    id?: string;
    name: string;
    code: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
  };
  company: {
    id?: string;
    name: string;
    code: string;
    legalName?: string | null;
    businessEmail?: string | null;
    contactPhone?: string | null;
    country?: string | null;
    timeZone?: string | null;
  };
  modules: ModuleCode[];
  admin: {
    userId?: string;
    newUser?: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
    };
  };
  activateImmediately?: boolean;
}

export interface ProvisioningResult {
  tenant: TenantRecord;
  company: CompanyRecord;
  modules: TenantModuleRecord[];
  admin: CompanyAdminAssignment;
  invitationDelivery: SignInInvitationDelivery;
  status: 'COMPLETED';
}
