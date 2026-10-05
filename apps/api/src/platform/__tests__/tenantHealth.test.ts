import { describe, it, expect } from 'vitest';
import {
  evaluateCustomerHealth,
  evaluateSetupProgress,
  type EvaluationTenantInput,
  type EvaluationCompanyInput,
  type EvaluationAdminInput,
} from '../tenants/service/tenantHealth.js';

const baseTenant: EvaluationTenantInput = {
  id: 'tenant_1',
  name: 'Acme Corp',
  status: 'active',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const baseCompany: EvaluationCompanyInput = {
  id: 'comp_1',
  name: 'Acme India',
  code: 'ACME-IN',
  status: 'active',
};

const baseAdmin: EvaluationAdminInput = {
  userId: 'user_1',
  companyId: 'comp_1',
  status: 'active',
  email: 'admin@acme.com',
  lastLoginAt: new Date('2026-01-02T00:00:00Z'),
};

describe('Customer Attention & Health Engine', () => {

  it('evaluates healthy state when all operational signals are verified', () => {
    const health = evaluateCustomerHealth(
      baseTenant,
      [baseCompany],
      ['hrms'],
      [baseAdmin],
    );

    expect(health.status).toBe('healthy');
    expect(health.nextBestAction).toBeNull();
  });

  it('marks critical when tenant is suspended', () => {
    const health = evaluateCustomerHealth(
      { ...baseTenant, status: 'suspended' },
      [baseCompany],
      ['hrms'],
      [baseAdmin],
    );

    expect(health.status).toBe('critical');
    expect(health.nextBestAction?.actionType).toBe('reactivate_tenant');
  });

  it('marks critical when customer has zero companies', () => {
    const health = evaluateCustomerHealth(
      baseTenant,
      [],
      ['hrms'],
      [baseAdmin],
    );

    expect(health.status).toBe('critical');
    expect(health.nextBestAction?.actionType).toBe('create_company');
  });

  it('marks critical when customer has no active administrators', () => {
    const health = evaluateCustomerHealth(
      baseTenant,
      [baseCompany],
      ['hrms'],
      [],
    );

    expect(health.status).toBe('critical');
    expect(health.nextBestAction?.actionType).toBe('assign_admin');
  });

  it('marks needs_attention when all companies are inactive', () => {
    const health = evaluateCustomerHealth(
      baseTenant,
      [{ ...baseCompany, status: 'suspended' }],
      ['hrms'],
      [baseAdmin],
    );

    expect(health.status).toBe('needs_attention');
    expect(health.nextBestAction?.actionType).toBe('review_companies');
  });

  it('marks needs_attention when no applications are entitled', () => {
    const health = evaluateCustomerHealth(
      baseTenant,
      [baseCompany],
      [],
      [baseAdmin],
    );

    expect(health.status).toBe('needs_attention');
    expect(health.nextBestAction?.actionType).toBe('configure_applications');
  });

  it('marks needs_attention when admin has not yet logged in', () => {
    const health = evaluateCustomerHealth(
      baseTenant,
      [baseCompany],
      ['hrms'],
      [{ ...baseAdmin, lastLoginAt: null }],
    );

    expect(health.status).toBe('needs_attention');
    expect(health.nextBestAction?.actionType).toBe('resend_invitation');
  });

  it('marks needs_attention when a company is missing an admin', () => {
    const company2: EvaluationCompanyInput = {
      id: 'comp_2',
      name: 'Acme US',
      code: 'ACME-US',
      status: 'active',
    };

    const health = evaluateCustomerHealth(
      baseTenant,
      [baseCompany, company2],
      ['hrms'],
      [baseAdmin], // Only assigned to comp_1
    );

    expect(health.status).toBe('needs_attention');
    expect(health.nextBestAction?.actionType).toBe('assign_admin');
  });
});

describe('Customer Setup Progress Engine', () => {
  it('calculates 100% completion when all 5 milestones are met', () => {
    const progress = evaluateSetupProgress(
      baseTenant,
      [{ id: 'comp_1', name: 'Acme India', code: 'ACME-IN', status: 'active' }],
      ['hrms'],
      [
        {
          userId: 'user_1',
          companyId: 'comp_1',
          status: 'active',
          lastLoginAt: new Date('2026-01-02T00:00:00Z'),
        },
      ],
    );

    expect(progress.totalMilestones).toBe(5);
    expect(progress.completedMilestones).toBe(5);
    expect(progress.percentage).toBe(100);
    expect(progress.isComplete).toBe(true);
  });

  it('calculates partial completion when admin has not logged in', () => {
    const progress = evaluateSetupProgress(
      baseTenant,
      [{ id: 'comp_1', name: 'Acme India', code: 'ACME-IN', status: 'active' }],
      ['hrms'],
      [
        {
          userId: 'user_1',
          companyId: 'comp_1',
          status: 'active',
          lastLoginAt: null,
        },
      ],
    );

    expect(progress.completedMilestones).toBe(4);
    expect(progress.percentage).toBe(80);
    expect(progress.isComplete).toBe(false);
    const adminActivatedMilestone = progress.milestones.find(
      (m) => m.key === 'admin_activated',
    );
    expect(adminActivatedMilestone?.completed).toBe(false);
  });

  it('calculates 20% completion for newly created tenant with no companies or apps', () => {
    const progress = evaluateSetupProgress(baseTenant, [], [], []);

    expect(progress.completedMilestones).toBe(1);
    expect(progress.percentage).toBe(20);
    expect(progress.isComplete).toBe(false);
  });

  it('guarantees canonical contract with both reason and non-empty reasons array', () => {
    const healthy = evaluateCustomerHealth(baseTenant, [baseCompany], ['hrms'], [baseAdmin]);
    expect(Array.isArray(healthy.reasons)).toBe(true);
    expect(healthy.reasons.length).toBeGreaterThan(0);
    expect(healthy.reason).toBe(healthy.reasons[0]);

    const critical = evaluateCustomerHealth({ ...baseTenant, status: 'suspended' }, [baseCompany], ['hrms'], [baseAdmin]);
    expect(Array.isArray(critical.reasons)).toBe(true);
    expect(critical.reasons.length).toBeGreaterThan(0);
    expect(critical.reason).toBe(critical.reasons[0]);

    const needsAttention = evaluateCustomerHealth(baseTenant, [baseCompany], [], [baseAdmin]);
    expect(Array.isArray(needsAttention.reasons)).toBe(true);
    expect(needsAttention.reasons.length).toBeGreaterThan(0);
    expect(needsAttention.reason).toBe(needsAttention.reasons[0]);
  });

  it('guarantees setup progress milestones serialize both label and title', () => {
    const progress = evaluateSetupProgress(baseTenant, [baseCompany], ['hrms'], [baseAdmin]);
    for (const milestone of progress.milestones) {
      expect(typeof milestone.label).toBe('string');
      expect(typeof milestone.title).toBe('string');
      expect(milestone.label).toBe(milestone.title);
    }
  });

  it('evaluates legacy tenant data with missing/empty inputs without migration', () => {
    const legacyTenant: EvaluationTenantInput = {
      id: 'legacy_001',
      name: 'Legacy Customer',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const health = evaluateCustomerHealth(legacyTenant, [], [], []);
    expect(health.status).toBe('critical');
    expect(Array.isArray(health.reasons)).toBe(true);
    expect(health.reasons.length).toBe(1);

    const progress = evaluateSetupProgress(legacyTenant, [], [], []);
    expect(progress.totalMilestones).toBe(5);
    expect(progress.completedMilestones).toBe(1);
  });
});
