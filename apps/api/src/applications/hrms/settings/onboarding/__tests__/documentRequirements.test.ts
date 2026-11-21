import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { hrmsTestHeaders } from '../../../../../platform/__tests__/support/testSession.js';
import { createApp } from '../../../../../app/server/createApp.js';
import { pingDatabase } from '../../../../../db/connection.js';

describe('HRMS Required Documents Configuration & Candidate Workflow API', () => {
  const app = createApp();
  let hrmsA: ReturnType<typeof request.agent>;
  let hrmsB: ReturnType<typeof request.agent>;

  const runId = Date.now().toString(36);
  const companyA = `comp_docs_${runId}`;
  const tenantA = `tenant_docs_${runId}`;
  const companyB = `comp_other_${runId}`;
  const tenantB = `tenant_other_${runId}`;

  beforeAll(async () => {
    const connected = await pingDatabase();
    if (!connected) {
      throw new Error('MySQL database is unreachable.');
    }
    hrmsA = request.agent(app).set(await hrmsTestHeaders(companyA, tenantA));
    hrmsB = request.agent(app).set(await hrmsTestHeaders(companyB, tenantB));
  });

  // ==================== 1. Document Categories ====================
  describe('1. Document Categories Management', () => {
    it('returns seeded default document categories for Company A', async () => {
      const res = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/document-categories')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(6);

      const categoryNames = res.body.data.map((c: { name: string }) => c.name);
      expect(categoryNames).toContain('Identity Proof');
      expect(categoryNames).toContain('Address Proof');
      expect(categoryNames).toContain('Educational Certificates');
      expect(categoryNames).toContain('Employment Documents');
      expect(categoryNames).toContain('Bank Documents');
      expect(categoryNames).toContain('Other Documents');
    });

    it('creates a custom document category', async () => {
      const res = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/document-categories')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Compliance & Legal Forms',
          description: 'Statutory compliance declarations and non-disclosure forms.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Compliance & Legal Forms');
      expect(res.body.data.isActive).toBe(true);
    });

    it('updates an existing category name and description', async () => {
      // Create first
      const createRes = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/document-categories')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Certifications Temp',
        });
      const catId = createRes.body.data.id;

      const updateRes = await hrmsA
        .patch(`/api/v1/hrms/settings/onboarding/document-categories/${catId}`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Professional Certifications',
          description: 'Industry recognized cloud and project management certifications.',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Professional Certifications');
      expect(updateRes.body.data.description).toContain('Industry recognized');
    });

    it('prevents deleting a category that contains active document requirements', async () => {
      const catsRes = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/document-categories')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const idProofCat = catsRes.body.data.find((c: { name: string }) => c.name === 'Identity Proof');
      expect(idProofCat).toBeDefined();

      const deleteRes = await hrmsA
        .delete(`/api/v1/hrms/settings/onboarding/document-categories/${idProofCat.id}`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(deleteRes.status).toBe(400);
      expect(deleteRes.body.error.code).toBe('CATEGORY_CONTAINS_DOCUMENTS');
    });

    it('safely deletes an empty category', async () => {
      const createRes = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/document-categories')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Temporary Category to Delete',
        });
      const catId = createRes.body.data.id;

      const deleteRes = await hrmsA
        .delete(`/api/v1/hrms/settings/onboarding/document-categories/${catId}`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(deleteRes.status).toBe(204);
    });
  });

  // ==================== 2. Document Requirements & Applicability ====================
  describe('2. Document Requirements Configuration & Applicability', () => {
    let createdDocId: string;
    let targetCatId: string;

    beforeAll(async () => {
      const catsRes = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/document-categories')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);
      targetCatId = catsRes.body.data[0].id;
    });

    it('returns seeded default document requirements', async () => {
      const res = await hrmsA
        .get('/api/v1/hrms/settings/onboarding/document-requirements')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(6);

      const names = res.body.data.map((r: { name: string }) => r.name);
      expect(names).toContain('Aadhaar Card / National ID');
      expect(names).toContain('Passport');
      expect(names).toContain('Permanent Address Proof');
    });

    it('creates a new document requirement with upload and verification configs', async () => {
      const res = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/document-requirements')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          name: 'Internship Recommendation Letter',
          description: 'Official letter from university dean or department head.',
          categoryId: targetCatId,
          isRequired: true,
          uploadConfig: {
            allowedFormats: ['pdf', 'docx'],
            maxFileSizeMb: 5,
            allowMultiple: false,
            maxFiles: 1,
            expiryApplicable: false,
            requireExpiry: false,
          },
          verificationConfig: {
            verificationRequired: true,
            verificationResponsibility: 'hr',
            allowReupload: true,
            reverificationOnExpiry: false,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Internship Recommendation Letter');
      expect(res.body.data.uploadConfig.allowedFormats).toEqual(['pdf', 'docx']);
      expect(res.body.data.verificationConfig.verificationRequired).toBe(true);
      createdDocId = res.body.data.id;
    });

    it('configures applicability rules across employment type and pipeline', async () => {
      const res = await hrmsA
        .put(`/api/v1/hrms/settings/onboarding/document-requirements/${createdDocId}/applicability`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          allEmployees: false,
          employmentTypes: ['intern'],
          pipelineIds: ['pipe-intern-onboarding'],
          stageKeys: ['documents'],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.applicability.allEmployees).toBe(false);
      expect(res.body.data.applicability.employmentTypes).toEqual(['intern']);
      expect(res.body.data.applicability.pipelineIds).toEqual(['pipe-intern-onboarding']);
    });

    it('duplicates an existing document requirement', async () => {
      const res = await hrmsA
        .post(`/api/v1/hrms/settings/onboarding/document-requirements/${createdDocId}/duplicate`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toContain('Internship Recommendation Letter (Copy');
      expect(res.body.data.id).not.toBe(createdDocId);
    });

    it('resolves applicable documents for an intern candidate', async () => {
      const res = await hrmsA
        .post('/api/v1/hrms/settings/onboarding/document-requirements/resolve')
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          employmentType: 'intern',
          pipelineId: 'pipe-intern-onboarding',
          stageKey: 'documents',
        });

      expect(res.status).toBe(200);
      const docNames = res.body.data.map((d: { name: string }) => d.name);
      expect(docNames).toContain('Internship Recommendation Letter');
    });
  });

  // ==================== 3. Candidate Document Workflow Integration ====================
  describe('3. Candidate Document Workflow Integration', () => {
    const testCaseId = `case_test_${runId}`;

    it('generates candidate document instances matching candidate context', async () => {
      const res = await hrmsA
        .post(`/api/v1/hrms/onboarding/cases/${testCaseId}/documents/generate`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          employmentType: 'full_time',
          stageKey: 'documents',
        });

      expect(res.status).toBe(201);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const firstDoc = res.body.data[0];
      expect(firstDoc.caseId).toBe(testCaseId);
      expect(firstDoc.status).toBe('pending');
      expect(firstDoc.uploadedFiles).toEqual([]);
      expect(firstDoc.history.length).toBeGreaterThanOrEqual(1);
    });

    it('uploads a document file successfully and updates status to submitted', async () => {
      const listRes = await hrmsA
        .get(`/api/v1/hrms/onboarding/cases/${testCaseId}/documents`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const docToUpload = listRes.body.data[0];

      const uploadRes = await hrmsA
        .post(`/api/v1/hrms/onboarding/cases/${testCaseId}/documents/${docToUpload.id}/upload`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          fileName: 'national_id_card.pdf',
          fileSizeBytes: 1024 * 500, // 500 KB
          mimeType: 'application/pdf',
          documentNumber: 'ABCD-1234-5678',
        });

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.data.status).toBe('submitted');
      expect(uploadRes.body.data.uploadedFiles.length).toBe(1);
      expect(uploadRes.body.data.uploadedFiles[0].fileName).toBe('national_id_card.pdf');
      expect(uploadRes.body.data.documentNumber).toBe('ABCD-1234-5678');
      expect(uploadRes.body.data.version).toBeGreaterThanOrEqual(2);
    });

    it('rejects an invalid file format on upload', async () => {
      const listRes = await hrmsA
        .get(`/api/v1/hrms/onboarding/cases/${testCaseId}/documents`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const doc = listRes.body.data[0];

      const res = await hrmsA
        .post(`/api/v1/hrms/onboarding/cases/${testCaseId}/documents/${doc.id}/upload`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          fileName: 'malicious_script.exe',
          fileSizeBytes: 1024 * 10,
          mimeType: 'application/x-msdownload',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILE_FORMAT');
    });

    it('rejects an oversized file on upload', async () => {
      const listRes = await hrmsA
        .get(`/api/v1/hrms/onboarding/cases/${testCaseId}/documents`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const doc = listRes.body.data[0];

      const res = await hrmsA
        .post(`/api/v1/hrms/onboarding/cases/${testCaseId}/documents/${doc.id}/upload`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          fileName: 'huge_document.pdf',
          fileSizeBytes: 50 * 1024 * 1024, // 50 MB
          mimeType: 'application/pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    });

    it('HR reviews and verifies document as Approved', async () => {
      const listRes = await hrmsA
        .get(`/api/v1/hrms/onboarding/cases/${testCaseId}/documents`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const doc = listRes.body.data[0];

      const verifyRes = await hrmsA
        .patch(`/api/v1/hrms/onboarding/cases/${testCaseId}/documents/${doc.id}/verify`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          status: 'approved',
          remarks: 'All visual and digital security credentials verified.',
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.status).toBe('approved');
      expect(verifyRes.body.data.verifiedBy).toBeDefined();
      expect(verifyRes.body.data.verifiedAt).toBeDefined();
    });

    it('HR requests re-upload with rejection reason', async () => {
      const listRes = await hrmsA
        .get(`/api/v1/hrms/onboarding/cases/${testCaseId}/documents`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA);

      const doc = listRes.body.data[0];

      const reqRes = await hrmsA
        .post(`/api/v1/hrms/onboarding/cases/${testCaseId}/documents/${doc.id}/request-reupload`)
        .set('x-company-id', companyA)
        .set('x-tenant-id', tenantA)
        .send({
          reason: 'Uploaded copy is blurry. Please provide a clear color scan.',
        });

      expect(reqRes.status).toBe(200);
      expect(reqRes.body.data.status).toBe('rejected');
      expect(reqRes.body.data.rejectionReason).toBe('Uploaded copy is blurry. Please provide a clear color scan.');
    });
  });

  // ==================== 4. Tenant Isolation ====================
  describe('4. Tenant & Company Isolation', () => {
    it('guarantees Company B cannot access Company A custom categories or requirements', async () => {
      const resB = await hrmsB
        .get('/api/v1/hrms/settings/onboarding/document-categories')
        .set('x-company-id', companyB)
        .set('x-tenant-id', tenantB);

      expect(resB.status).toBe(200);
      const bNames = resB.body.data.map((c: { name: string }) => c.name);
      expect(bNames).not.toContain('Compliance & Legal Forms');
    });
  });
});
