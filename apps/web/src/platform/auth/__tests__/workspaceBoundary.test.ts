/**
 * Workspace Access Boundary — Frontend Route Guard Tests
 *
 * Proves that landingPath routes each workspace to the correct entry point.
 * Backend enforcement is tested in devIdentities.test.ts (API-level).
 * These tests cover the UX layer.
 */
import { describe, it, expect } from 'vitest';
import { landingPath } from '../landing';
import type { AccessOverview, ModuleCode, WorkspaceId } from '../authApi';

function makeAccess(
  userOverrides: Partial<AccessOverview['user']> = {},
  workspaces: WorkspaceId[] = [],
  essEligible = false,
): AccessOverview {
  return {
    user: {
      id: 'u1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      isSuperAdmin: false,
      ...userOverrides,
    },
    platformWorkspaces: [],
    companies:
      workspaces.length > 0
        ? [
            {
              tenantId: 't1',
              tenantName: 'Demo',
              companyId: 'c1',
              companyName: 'Demo Co',
              companyCode: 'DEMO',
              isMember: true,
              isPlatformOversight: false,
              roles: [],
              permissions: [],
              enabledModules: ['hrms' as ModuleCode],
              essEligible,
              employeeId: essEligible ? 'emp_1' : null,
              workspaces,
            },
          ]
        : [],
  };
}

describe('landingPath — workspace-aware routing', () => {
  it('routes Super Admin to /super-admin regardless of company workspaces', () => {
    const access = makeAccess({ isSuperAdmin: true }, ['company_admin']);
    expect(landingPath(access)).toBe('/super-admin');
  });

  it('routes company_admin workspace to /company-admin', () => {
    const access = makeAccess({}, ['company_admin']);
    expect(landingPath(access)).toBe('/company-admin');
  });

  it('routes hrms workspace to /hrms/dashboard', () => {
    const access = makeAccess({}, ['hrms']);
    expect(landingPath(access)).toBe('/hrms/dashboard');
  });

  it('routes ess-only workspace (Employee) to /ess — NOT /hrms', () => {
    const access = makeAccess({}, ['ess'], true);
    expect(landingPath(access)).toBe('/ess');
  });

  it('routes hrms+ess workspace to /hrms/dashboard (hrms takes priority)', () => {
    const access = makeAccess({}, ['hrms', 'ess'], true);
    expect(landingPath(access)).toBe('/hrms/dashboard');
  });

  it('routes a user with no resolved workspaces to /login (safe default — not /hrms)', () => {
    const access = makeAccess({}, []);
    expect(landingPath(access)).toBe('/login');
  });
});
