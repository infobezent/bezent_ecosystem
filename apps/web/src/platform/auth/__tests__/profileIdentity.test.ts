import { describe, it, expect } from 'vitest';
import { resolveProfileIdentity } from '../profileIdentity';
import type { AccessOverview, CompanyAccess } from '../authApi';

describe('resolveProfileIdentity', () => {
  it('returns default fallback values when access is null', () => {
    const res = resolveProfileIdentity(null, null);
    expect(res).toEqual({
      userName: 'User',
      userEmail: '',
      userInitials: 'U',
      userRole: 'Member',
    });
  });

  it('derives identity and "Super Admin" role for platform superadmin', () => {
    const access: AccessOverview = {
      user: {
        id: 'usr_sa',
        email: 'superadmin@bezent.com',
        firstName: 'Platform',
        lastName: 'Superadmin',
        isSuperAdmin: true,
      },
      platformWorkspaces: ['super_admin'],
      companies: [],
    };

    const res = resolveProfileIdentity(access, null);
    expect(res.userName).toBe('Platform Superadmin');
    expect(res.userEmail).toBe('superadmin@bezent.com');
    expect(res.userInitials).toBe('PS');
    expect(res.userRole).toBe('Super Admin');
  });

  it('derives "Company Admin" role for company administrator', () => {
    const access: AccessOverview = {
      user: {
        id: 'usr_ca',
        email: 'companyadmin@bezent.com',
        firstName: 'Company',
        lastName: 'Admin',
        isSuperAdmin: false,
      },
      platformWorkspaces: [],
      companies: [],
    };

    const company: CompanyAccess = {
      tenantId: 't1',
      tenantName: 'Tenant 1',
      companyId: 'c1',
      companyName: 'Company 1',
      companyCode: 'C1',
      isMember: true,
      isPlatformOversight: false,
      roles: [
        {
          id: 'role_sys_company_admin',
          code: 'company_admin',
          name: 'Company Administrator',
          isSystem: true,
          moduleCode: null,
        },
      ],
      permissions: [],
      enabledModules: ['hrms'],
      essEligible: false,
      employeeId: null,
      workspaces: ['company_admin'],
    };

    const res = resolveProfileIdentity(access, company);
    expect(res.userName).toBe('Company Admin');
    expect(res.userEmail).toBe('companyadmin@bezent.com');
    expect(res.userInitials).toBe('CA');
    expect(res.userRole).toBe('Company Admin');
  });

  it('derives "HR • HRMS" role for HR manager', () => {
    const access: AccessOverview = {
      user: {
        id: 'usr_hr',
        email: 'hr@bezent.com',
        firstName: 'HR',
        lastName: 'Manager',
        isSuperAdmin: false,
      },
      platformWorkspaces: [],
      companies: [],
    };

    const company: CompanyAccess = {
      tenantId: 't1',
      tenantName: 'Tenant 1',
      companyId: 'c1',
      companyName: 'Company 1',
      companyCode: 'C1',
      isMember: true,
      isPlatformOversight: false,
      roles: [
        {
          id: 'role_sys_hr_manager',
          code: 'hr_manager',
          name: 'HR',
          isSystem: true,
          moduleCode: 'hrms',
        },
      ],
      permissions: [],
      enabledModules: ['hrms'],
      essEligible: false,
      employeeId: null,
      workspaces: ['hrms'],
    };

    const res = resolveProfileIdentity(access, company);
    expect(res.userName).toBe('HR Manager');
    expect(res.userEmail).toBe('hr@bezent.com');
    expect(res.userInitials).toBe('HM');
    expect(res.userRole).toBe('HR • HRMS');
  });

  it('derives "Employee • ESS" role for self-service employee', () => {
    const access: AccessOverview = {
      user: {
        id: 'usr_emp',
        email: 'employee@bezent.com',
        firstName: 'Jane',
        lastName: 'Employee',
        isSuperAdmin: false,
      },
      platformWorkspaces: [],
      companies: [],
    };

    const company: CompanyAccess = {
      tenantId: 't1',
      tenantName: 'Tenant 1',
      companyId: 'c1',
      companyName: 'Company 1',
      companyCode: 'C1',
      isMember: true,
      isPlatformOversight: false,
      roles: [
        {
          id: 'role_sys_employee',
          code: 'employee',
          name: 'Employee',
          isSystem: true,
          moduleCode: 'hrms',
        },
      ],
      permissions: [],
      enabledModules: ['hrms'],
      essEligible: true,
      employeeId: 'emp_01',
      workspaces: ['ess'],
    };

    const res = resolveProfileIdentity(access, company);
    expect(res.userName).toBe('Jane Employee');
    expect(res.userEmail).toBe('employee@bezent.com');
    expect(res.userInitials).toBe('JE');
    expect(res.userRole).toBe('Employee • ESS');
  });
});
