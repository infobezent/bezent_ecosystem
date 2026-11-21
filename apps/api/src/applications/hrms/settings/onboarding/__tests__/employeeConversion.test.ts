import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { hrmsTestHeaders } from '../../../../../platform/__tests__/support/testSession.js';
import { createApp } from '../../../../../app/server/createApp.js';
import { pingDatabase } from '../../../../../db/connection.js';

describe('HRMS Employee Conversion Configuration & Candidate Conversion API', () => {
  const app = createApp();
  let hrms: ReturnType<typeof request.agent>;
  let hrmsOther: ReturnType<typeof request.agent>;

  const runId = Date.now().toString(36);
  const companyA = 'comp_demo_01';
  const tenantA = 'tenant_demo_01';
  const otherCompany = `comp_conv_other_${runId}`;
  const otherTenant = `tenant_conv_other_${runId}`;

  let deptId: string;
  let desigId: string;
  let locId: string;

  beforeAll(async () => {
    const connected = await pingDatabase();
    if (!connected) {
      throw new Error('MySQL database is unreachable.');
    }
    hrms = request.agent(app).set(await hrmsTestHeaders(companyA, tenantA));
    hrmsOther = request.agent(app).set(await hrmsTestHeaders(otherCompany, otherTenant));

    // Fetch org master IDs from comp_demo_01
    const mastersRes = await hrms.get('/api/v1/hrms/organization/masters');
    expect(mastersRes.status).toBe(200);
    deptId = mastersRes.body.data.departments[0].id;
    desigId = mastersRes.body.data.designations[0].id;
    locId = mastersRes.body.data.locations[0]?.id;
  });

  // ==================== 1. Conversion Configuration Retrieval & Defaults ====================
  describe('1. Conversion Configuration Defaults & Persistence', () => {
    it('returns seeded default conversion configuration', async () => {
      const res = await hrms.get('/api/v1/hrms/settings/onboarding/conversion-config');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      // 1. Settings
      expect(data.settings).toBeDefined();
      expect(data.settings.conversionMode).toBe('both');
      expect(data.settings.defaultMode).toBe('manual');
      expect(data.settings.conversionTriggerStage).toBe('completed');
      expect(data.settings.defaultEmploymentStatus).toBe('probation');
      expect(data.settings.effectiveDateType).toBe('joining_date');
      expect(data.settings.allowHrOverride).toBe(true);

      // 2. Field Mappings
      expect(Array.isArray(data.fieldMappings)).toBe(true);
      expect(data.fieldMappings.length).toBeGreaterThanOrEqual(12);
      const destFields = data.fieldMappings.map((m: { destinationField: string }) => m.destinationField);
      expect(destFields).toContain('displayName');
      expect(destFields).toContain('email');
      expect(destFields).toContain('phone');
      expect(destFields).toContain('dateOfBirth');
      expect(destFields).toContain('gender');
      expect(destFields).toContain('departmentId');
      expect(destFields).toContain('designationId');
      expect(destFields).toContain('employmentType');
      expect(destFields).toContain('joiningDate');
      expect(destFields).toContain('locationId');
      expect(destFields).toContain('reportingManagerId');
      expect(destFields).toContain('address');

      // 3. Required Information
      expect(Array.isArray(data.requiredInformation)).toBe(true);
      const reqKeys = data.requiredInformation
        .filter((r: { isRequired: boolean }) => r.isRequired)
        .map((r: { fieldKey: string }) => r.fieldKey);
      expect(reqKeys).toContain('fullName');
      expect(reqKeys).toContain('email');
      expect(reqKeys).toContain('departmentId');
      expect(reqKeys).toContain('designationId');
      expect(reqKeys).toContain('joiningDate');

      // 4. Post-Conversion Actions
      expect(data.postConversionActions.createEmployeeProfile).toBe(true);
      expect(data.postConversionActions.applyChecklistTemplates).toBe(true);
      expect(data.postConversionActions.applyRequiredDocuments).toBe(true);
      expect(data.postConversionActions.enableEssAccess).toBe(true);
      expect(data.postConversionActions.sendNotifications).toBe(true);

      // 5. Conversion Rules
      expect(data.conversionRules.preventDuplicateEmployee).toBe(true);
      expect(data.conversionRules.validateRequiredFields).toBe(true);
      expect(data.conversionRules.preserveCandidateHistory).toBe(true);
      expect(data.conversionRules.allowRetryFailedConversion).toBe(true);
      expect(data.conversionRules.recordAuditHistory).toBe(true);
    });

    it('updates conversion settings, post-actions, and rules', async () => {
      const updatePayload = {
        settings: {
          conversionMode: 'automatic',
          defaultMode: 'automatic',
          defaultEmploymentStatus: 'active',
          allowHrOverride: false,
        },
        postConversionActions: {
          sendNotifications: false,
        },
        conversionRules: {
          preventDuplicateEmployee: true,
          validateRequiredFields: true,
        },
      };

      const res = await hrms
        .put('/api/v1/hrms/settings/onboarding/conversion-config')
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.data.settings.conversionMode).toBe('automatic');
      expect(res.body.data.settings.defaultEmploymentStatus).toBe('active');
      expect(res.body.data.postConversionActions.sendNotifications).toBe(false);

      // Verify persistent fetch
      const fetchRes = await hrms.get('/api/v1/hrms/settings/onboarding/conversion-config');
      expect(fetchRes.body.data.settings.conversionMode).toBe('automatic');
      expect(fetchRes.body.data.settings.defaultEmploymentStatus).toBe('active');
    });

    it('rejects duplicate destination mappings in field mappings', async () => {
      const duplicateMapping = {
        fieldMappings: [
          {
            id: 'm1',
            sourceField: 'fullName',
            destinationField: 'displayName',
            sourceLabel: 'Full Name',
            destinationLabel: 'Employee Name',
            isActive: true,
          },
          {
            id: 'm2',
            sourceField: 'nickname',
            destinationField: 'displayName', // Duplicate destination!
            sourceLabel: 'Nickname',
            destinationLabel: 'Employee Name',
            isActive: true,
          },
        ],
      };

      const res = await hrms
        .put('/api/v1/hrms/settings/onboarding/conversion-config')
        .send(duplicateMapping);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DUPLICATE_DESTINATION_MAPPING');
    });

    it('rejects making system-mandatory fields optional', async () => {
      const invalidReqInfo = {
        requiredInformation: [
          {
            id: 'req_name',
            fieldKey: 'fullName',
            fieldName: 'Full Name',
            group: 'personal',
            isRequired: false, // Trying to make system mandatory field optional!
            isSystemMandatory: true,
          },
        ],
      };

      const res = await hrms
        .put('/api/v1/hrms/settings/onboarding/conversion-config')
        .send(invalidReqInfo);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SYSTEM_MANDATORY_FIELD_REQUIRED');
    });

    it('resets configuration back to system defaults', async () => {
      const res = await hrms.post('/api/v1/hrms/settings/onboarding/conversion-config/reset');

      expect(res.status).toBe(200);
      expect(res.body.data.settings.conversionMode).toBe('both');
      expect(res.body.data.settings.defaultMode).toBe('manual');
      expect(res.body.data.settings.defaultEmploymentStatus).toBe('probation');
      expect(res.body.data.postConversionActions.sendNotifications).toBe(true);
    });
  });

  // ==================== 2. Conversion Preview & Eligibility ====================
  describe('2. Conversion Preview & Candidate Diagnostics', () => {
    let testCaseId: string;
    const candidateEmail = `test_cand_${runId}@bezent.test`;

    beforeAll(async () => {
      // Create a test onboarding case
      const caseRes = await hrms.post('/api/v1/hrms/onboarding/cases').send({
        firstName: 'Alexander',
        lastName: 'Hamilton',
        email: candidateEmail,
        phone: '+1-555-0199',
        departmentId: deptId,
        designationId: desigId,
        locationId: locId,
        joiningDate: '2026-12-01',
        employmentType: 'full_time',
        draftPayload: {
          dateOfBirth: '1990-01-11',
          gender: 'male',
          address: '57 Wall Street, New York, NY',
        },
      });
      expect(caseRes.status).toBe(201);
      testCaseId = caseRes.body.data.id;
    });

    it('previews conversion readiness for complete candidate case', async () => {
      const res = await hrms.get(
        `/api/v1/hrms/onboarding/cases/${testCaseId}/conversion-preview`,
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data.caseId).toBe(testCaseId);
      expect(data.candidateName).toBe('Alexander Hamilton');
      expect(data.email).toBe(candidateEmail);
      expect(data.isEligible).toBe(true);
      expect(data.missingRequiredFields).toHaveLength(0);
      expect(data.mappedEmployeePayload.displayName).toBe('Alexander Hamilton');
      expect(data.mappedEmployeePayload.email).toBe(candidateEmail);
      expect(data.mappedEmployeePayload.departmentId).toBe(deptId);
    });

    it('identifies missing mandatory fields in preview for incomplete candidate', async () => {
      // Create incomplete candidate with missing email / department
      const draftRes = await hrms.post('/api/v1/hrms/onboarding/cases').send({
        firstName: 'Incomplete',
        lastName: 'Candidate',
        status: 'draft',
      });
      const incompleteId = draftRes.body.data.id;

      const previewRes = await hrms.get(
        `/api/v1/hrms/onboarding/cases/${incompleteId}/conversion-preview`,
      );

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.isEligible).toBe(false);
      expect(previewRes.body.data.missingRequiredFields.length).toBeGreaterThan(0);
      expect(previewRes.body.data.missingRequiredFields).toContain('Work Email');
    });
  });

  // ==================== 3. Candidate to Employee Conversion Execution ====================
  describe('3. Candidate Conversion Execution, Safeguards & Post-Actions', () => {
    let activeCaseId: string;
    const empEmail = `emp_convert_${runId}@bezent.test`;

    beforeAll(async () => {
      // Create and submit active onboarding case
      const caseRes = await hrms.post('/api/v1/hrms/onboarding/cases').send({
        firstName: 'Grace',
        lastName: 'Hopper',
        email: empEmail,
        phone: '+1-555-4088',
        departmentId: deptId,
        designationId: desigId,
        locationId: locId,
        joiningDate: '2026-11-20',
        employmentType: 'full_time',
        status: 'active',
        draftPayload: {
          dateOfBirth: '1982-12-09',
          gender: 'female',
          address: '42 Compiler Way, Arlington, VA',
        },
      });
      expect(caseRes.status).toBe(201);
      activeCaseId = caseRes.body.data.id;
    });

    it('executes manual candidate to employee conversion', async () => {
      const res = await hrms
        .post(`/api/v1/hrms/onboarding/cases/${activeCaseId}/convert`)
        .send({
          effectiveDate: '2026-11-20',
          status: 'probation',
          notes: 'Converted via manual HR verification.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data.caseId).toBe(activeCaseId);
      expect(data.employeeId).toBeDefined();
      expect(data.employeeNumber).toBeDefined();
      expect(data.postConversionResults.profileCreated).toBe(true);
      expect(data.postConversionResults.checklistsApplied).toBe(true);
      expect(data.postConversionResults.documentsApplied).toBe(true);
      expect(data.postConversionResults.essAccessEnabled).toBe(true);

      // Verify onboarding case status is now completed
      const caseRes = await hrms.get(`/api/v1/hrms/onboarding/cases/${activeCaseId}`);
      expect(caseRes.status).toBe(200);
      expect(caseRes.body.data.status).toBe('completed');
    });

    it('prevents duplicate conversion idempotently on repeated calls', async () => {
      const res = await hrms
        .post(`/api/v1/hrms/onboarding/cases/${activeCaseId}/convert`)
        .send();

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Returns the same employee record without creating a new one
      expect(res.body.data.caseId).toBe(activeCaseId);
      expect(res.body.data.employeeId).toBeDefined();
    });

    it('blocks conversion when duplicate employee email exists in company', async () => {
      // Attempt to convert another case with the SAME email as Grace Hopper
      const duplicateCaseRes = await hrms.post('/api/v1/hrms/onboarding/cases').send({
        firstName: 'Imposter',
        lastName: 'Hopper',
        email: empEmail, // Duplicate!
        phone: '+1-555-9999',
        departmentId: deptId,
        designationId: desigId,
        joiningDate: '2026-11-25',
        status: 'active',
      });
      const imposterCaseId = duplicateCaseRes.body.data.id;

      const convertRes = await hrms
        .post(`/api/v1/hrms/onboarding/cases/${imposterCaseId}/convert`)
        .send();

      expect(convertRes.status).toBe(409);
      expect(convertRes.body.error.code).toBe('DUPLICATE_EMPLOYEE_EXISTS');
    });

    it('blocks conversion when required fields are missing', async () => {
      const missingFieldCaseRes = await hrms.post('/api/v1/hrms/onboarding/cases').send({
        firstName: 'NoEmail',
        lastName: 'Candidate',
        status: 'draft',
      });
      const noEmailCaseId = missingFieldCaseRes.body.data.id;

      const convertRes = await hrms
        .post(`/api/v1/hrms/onboarding/cases/${noEmailCaseId}/convert`)
        .send();

      expect(convertRes.status).toBe(400);
      expect(convertRes.body.error.code).toBe('CONVERSION_REQUIRED_FIELDS_MISSING');
    });

    it('retries secondary post-conversion actions without recreating employee record', async () => {
      const retryRes = await hrms
        .post(`/api/v1/hrms/onboarding/cases/${activeCaseId}/conversion-retry`)
        .send();

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.success).toBe(true);
      expect(retryRes.body.data.employeeId).toBeDefined();
      expect(retryRes.body.data.postConversionResults.checklistsApplied).toBe(true);
    });
  });

  // ==================== 4. Tenant & Company Isolation ====================
  describe('4. Tenant & Company Isolation', () => {
    it('isolates conversion configuration across different companies', async () => {
      // Configure company B with manual-only mode
      await hrmsOther.put('/api/v1/hrms/settings/onboarding/conversion-config').send({
        settings: {
          conversionMode: 'manual',
          defaultEmploymentStatus: 'active',
        },
      });

      const resA = await hrms.get('/api/v1/hrms/settings/onboarding/conversion-config');
      const resB = await hrmsOther.get('/api/v1/hrms/settings/onboarding/conversion-config');

      expect(resA.body.data.settings.conversionMode).toBe('both');
      expect(resB.body.data.settings.conversionMode).toBe('manual');
    });
  });
});
