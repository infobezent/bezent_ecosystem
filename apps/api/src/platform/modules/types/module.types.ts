export type ModuleCode = 'hrms' | 'crm' | 'project_management';

export interface ModuleCatalogItem {
  code: ModuleCode;
  name: string;
  description: string;
  category: string;
  version: string;
  availability: 'GA' | 'Beta' | 'Planned';
}

export interface TenantModuleRecord {
  id: string;
  tenantId: string;
  companyId: string | null;
  moduleCode: ModuleCode;
  status: 'enabled' | 'disabled';
  enabledAt: string | null;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const MODULE_CATALOG: readonly ModuleCatalogItem[] = [
  {
    code: 'hrms',
    name: 'HRMS (Human Resource Management System)',
    description:
      'Workforce management, organization hierarchy, onboarding, attendance, leave, payroll and employee lifecycle.',
    category: 'Workforce & Talent',
    version: '1.0.0',
    availability: 'GA',
  },
  {
    code: 'crm',
    name: 'CRM (Customer Relationship Management)',
    description:
      'Pipeline tracking, client account management, sales deals, contacts and relationship engagement.',
    category: 'Sales & Growth',
    version: '0.9.0',
    availability: 'Planned',
  },
  {
    code: 'project_management',
    name: 'Project Management',
    description:
      'Cross-functional initiatives, sprint boards, task milestones, resource scheduling and time tracking.',
    category: 'Operations & Execution',
    version: '0.9.0',
    availability: 'Planned',
  },
];
export * from '../catalog/applicationModuleCatalog.js';
