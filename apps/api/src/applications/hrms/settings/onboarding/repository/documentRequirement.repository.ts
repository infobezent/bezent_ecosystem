import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../../../db/connection.js';
import {
  formCustomizations,
  onboardingDocumentRequirements,
  type FormCustomization,
} from '../../../../../db/schema.js';
import type {
  DocumentCategory,
  DocumentRequirement,
  CandidateDocumentInstance,
} from '../types/documentRequirement.types.js';

const DOC_CATEGORIES_FORM_KEY = 'onboarding_document_categories';
const DOC_REQUIREMENTS_FORM_KEY = 'onboarding_document_requirements_v2';
const CANDIDATE_DOCS_KEY_PREFIX = 'onboarding_case_docs_';

export class DocumentRequirementRepository {
  private get db() {
    return getDb();
  }

  /**
   * Generates enterprise default document categories
   */
  getDefaultCategories(tenantId: string, companyId: string): DocumentCategory[] {
    const now = new Date().toISOString();
    return [
      {
        id: `cat_id_proof_${companyId}`,
        tenantId,
        companyId,
        name: 'Identity Proof',
        code: 'identity_proof',
        description: 'Government issued national identity credentials and proofs.',
        displayOrder: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `cat_address_proof_${companyId}`,
        tenantId,
        companyId,
        name: 'Address Proof',
        code: 'address_proof',
        description: 'Residential verification and permanent location documentation.',
        displayOrder: 2,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `cat_edu_cert_${companyId}`,
        tenantId,
        companyId,
        name: 'Educational Certificates',
        code: 'educational_certificates',
        description: 'High school, undergraduate, postgraduate, and technical transcripts.',
        displayOrder: 3,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `cat_emp_docs_${companyId}`,
        tenantId,
        companyId,
        name: 'Employment Documents',
        code: 'employment_documents',
        description: 'Past appointment letters, relieving certificates, and payslips.',
        displayOrder: 4,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `cat_bank_docs_${companyId}`,
        tenantId,
        companyId,
        name: 'Bank Documents',
        code: 'bank_documents',
        description: 'Direct deposit verification, cancelled cheques, and passbooks.',
        displayOrder: 5,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `cat_other_docs_${companyId}`,
        tenantId,
        companyId,
        name: 'Other Documents',
        code: 'other_documents',
        description: 'Medical fitness, NDA agreements, and miscellaneous certificates.',
        displayOrder: 6,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  /**
   * Generates enterprise default document requirements
   */
  getDefaultRequirements(
    tenantId: string,
    companyId: string,
    categories: DocumentCategory[],
  ): DocumentRequirement[] {
    const now = new Date().toISOString();
    const catMap = new Map<string, string>();
    categories.forEach((c) => catMap.set(c.code, c.id));

    const idCat = catMap.get('identity_proof') || categories[0]!.id;
    const addrCat = catMap.get('address_proof') || categories[1]!.id;
    const eduCat = catMap.get('educational_certificates') || categories[2]!.id;
    const empCat = catMap.get('employment_documents') || categories[3]!.id;
    const bankCat = catMap.get('bank_documents') || categories[4]!.id;

    return [
      {
        id: `doc_req_aadhaar_${companyId}`,
        tenantId,
        companyId,
        name: 'Aadhaar Card / National ID',
        documentType: 'id_national',
        description: 'Official national identity proof card with unique identification number.',
        categoryId: idCat,
        isRequired: true,
        isActive: true,
        displayOrder: 1,
        uploadConfig: {
          allowedFormats: ['pdf', 'jpg', 'png'],
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
        applicability: {
          allEmployees: true,
          employmentTypes: [],
          departmentIds: [],
          locationIds: [],
          pipelineIds: [],
          stageKeys: [],
        },
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `doc_req_passport_${companyId}`,
        tenantId,
        companyId,
        name: 'Passport',
        documentType: 'id_passport',
        description: 'Valid international travel passport identification document.',
        categoryId: idCat,
        isRequired: false,
        isActive: true,
        displayOrder: 2,
        uploadConfig: {
          allowedFormats: ['pdf', 'jpg', 'png'],
          maxFileSizeMb: 5,
          allowMultiple: false,
          maxFiles: 1,
          expiryApplicable: true,
          requireExpiry: true,
        },
        verificationConfig: {
          verificationRequired: true,
          verificationResponsibility: 'hr',
          allowReupload: true,
          reverificationOnExpiry: true,
        },
        applicability: {
          allEmployees: true,
          employmentTypes: [],
          departmentIds: [],
          locationIds: [],
          pipelineIds: [],
          stageKeys: [],
        },
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `doc_req_address_${companyId}`,
        tenantId,
        companyId,
        name: 'Permanent Address Proof',
        documentType: 'address_permanent',
        description: 'Utility bill, driving license, or registered rental lease proof.',
        categoryId: addrCat,
        isRequired: true,
        isActive: true,
        displayOrder: 1,
        uploadConfig: {
          allowedFormats: ['pdf', 'jpg', 'png'],
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
        applicability: {
          allEmployees: true,
          employmentTypes: [],
          departmentIds: [],
          locationIds: [],
          pipelineIds: [],
          stageKeys: [],
        },
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `doc_req_degree_${companyId}`,
        tenantId,
        companyId,
        name: 'Degree Certificate / Diploma',
        documentType: 'edu_degree',
        description: 'Highest academic degree qualification certificate or consolidated marksheets.',
        categoryId: eduCat,
        isRequired: true,
        isActive: true,
        displayOrder: 1,
        uploadConfig: {
          allowedFormats: ['pdf', 'jpg', 'png'],
          maxFileSizeMb: 10,
          allowMultiple: true,
          maxFiles: 3,
          expiryApplicable: false,
          requireExpiry: false,
        },
        verificationConfig: {
          verificationRequired: true,
          verificationResponsibility: 'hr',
          allowReupload: true,
          reverificationOnExpiry: false,
        },
        applicability: {
          allEmployees: true,
          employmentTypes: [],
          departmentIds: [],
          locationIds: [],
          pipelineIds: [],
          stageKeys: [],
        },
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `doc_req_relieving_${companyId}`,
        tenantId,
        companyId,
        name: 'Previous Experience & Relieving Letter',
        documentType: 'emp_relieving',
        description: 'Official service certificate and relieving letter from immediate prior employer.',
        categoryId: empCat,
        isRequired: false,
        isActive: true,
        displayOrder: 1,
        uploadConfig: {
          allowedFormats: ['pdf', 'docx'],
          maxFileSizeMb: 10,
          allowMultiple: true,
          maxFiles: 5,
          expiryApplicable: false,
          requireExpiry: false,
        },
        verificationConfig: {
          verificationRequired: true,
          verificationResponsibility: 'hr',
          allowReupload: true,
          reverificationOnExpiry: false,
        },
        applicability: {
          allEmployees: false,
          employmentTypes: ['full_time', 'contract'],
          departmentIds: [],
          locationIds: [],
          pipelineIds: [],
          stageKeys: [],
        },
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `doc_req_bank_${companyId}`,
        tenantId,
        companyId,
        name: 'Bank Passbook / Cancelled Cheque',
        documentType: 'bank_cheque',
        description: 'Account proof with visible beneficiary name, account number, and IFSC/routing code.',
        categoryId: bankCat,
        isRequired: true,
        isActive: true,
        displayOrder: 1,
        uploadConfig: {
          allowedFormats: ['pdf', 'jpg', 'png'],
          maxFileSizeMb: 5,
          allowMultiple: false,
          maxFiles: 1,
          expiryApplicable: false,
          requireExpiry: false,
        },
        verificationConfig: {
          verificationRequired: true,
          verificationResponsibility: 'specific_role',
          specificRoleName: 'Finance Team',
          allowReupload: true,
          reverificationOnExpiry: false,
        },
        applicability: {
          allEmployees: true,
          employmentTypes: [],
          departmentIds: [],
          locationIds: [],
          pipelineIds: [],
          stageKeys: [],
        },
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  // ==================== Category Operations ====================

  async getCategories(tenantId: string, companyId: string): Promise<DocumentCategory[]> {
    const rows = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, DOC_CATEGORIES_FORM_KEY),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row || !row.metadata) {
      const defaults = this.getDefaultCategories(tenantId, companyId);
      await this.saveAllCategories(tenantId, companyId, defaults);
      return defaults;
    }

    const metadata = row.metadata as { categories?: DocumentCategory[] };
    if (!metadata.categories || !Array.isArray(metadata.categories) || metadata.categories.length === 0) {
      const defaults = this.getDefaultCategories(tenantId, companyId);
      await this.saveAllCategories(tenantId, companyId, defaults);
      return defaults;
    }

    return metadata.categories;
  }

  async saveAllCategories(
    tenantId: string,
    companyId: string,
    categories: DocumentCategory[],
  ): Promise<void> {
    const rows = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, DOC_CATEGORIES_FORM_KEY),
        ),
      )
      .limit(1);

    if (rows.length > 0 && rows[0]) {
      await this.db
        .update(formCustomizations)
        .set({
          metadata: { categories },
          version: rows[0].version + 1,
          updatedAt: new Date(),
        })
        .where(eq(formCustomizations.id, rows[0].id));
    } else {
      await this.db.insert(formCustomizations).values({
        id: `cust_${randomUUID()}`,
        tenantId,
        companyId,
        formKey: DOC_CATEGORIES_FORM_KEY,
        version: 1,
        metadata: { categories },
      });
    }
  }

  // ==================== Requirement Operations ====================

  async getRequirements(tenantId: string, companyId: string): Promise<DocumentRequirement[]> {
    const rows = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, DOC_REQUIREMENTS_FORM_KEY),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row || !row.metadata) {
      const categories = await this.getCategories(tenantId, companyId);
      const defaults = this.getDefaultRequirements(tenantId, companyId, categories);
      await this.saveAllRequirements(tenantId, companyId, defaults);
      return defaults;
    }

    const metadata = row.metadata as { requirements?: DocumentRequirement[] };
    if (!metadata.requirements || !Array.isArray(metadata.requirements) || metadata.requirements.length === 0) {
      const categories = await this.getCategories(tenantId, companyId);
      const defaults = this.getDefaultRequirements(tenantId, companyId, categories);
      await this.saveAllRequirements(tenantId, companyId, defaults);
      return defaults;
    }

    return metadata.requirements;
  }

  async saveAllRequirements(
    tenantId: string,
    companyId: string,
    requirements: DocumentRequirement[],
  ): Promise<void> {
    const rows = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, DOC_REQUIREMENTS_FORM_KEY),
        ),
      )
      .limit(1);

    if (rows.length > 0 && rows[0]) {
      await this.db
        .update(formCustomizations)
        .set({
          metadata: { requirements },
          version: rows[0].version + 1,
          updatedAt: new Date(),
        })
        .where(eq(formCustomizations.id, rows[0].id));
    } else {
      await this.db.insert(formCustomizations).values({
        id: `cust_${randomUUID()}`,
        tenantId,
        companyId,
        formKey: DOC_REQUIREMENTS_FORM_KEY,
        version: 1,
        metadata: { requirements },
      });
    }
  }

  // ==================== Candidate Documents Workflow Operations ====================

  async getCandidateDocuments(
    tenantId: string,
    companyId: string,
    caseId: string,
  ): Promise<CandidateDocumentInstance[]> {
    const formKey = `${CANDIDATE_DOCS_KEY_PREFIX}${caseId}`;
    const rows = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, formKey),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row || !row.metadata) {
      return [];
    }

    const metadata = row.metadata as { instances?: CandidateDocumentInstance[] };
    return metadata.instances ?? [];
  }

  async saveCandidateDocuments(
    tenantId: string,
    companyId: string,
    caseId: string,
    instances: CandidateDocumentInstance[],
  ): Promise<void> {
    const formKey = `${CANDIDATE_DOCS_KEY_PREFIX}${caseId}`;
    const rows = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, formKey),
        ),
      )
      .limit(1);

    if (rows.length > 0 && rows[0]) {
      await this.db
        .update(formCustomizations)
        .set({
          metadata: { instances },
          version: rows[0].version + 1,
          updatedAt: new Date(),
        })
        .where(eq(formCustomizations.id, rows[0].id));
    } else {
      await this.db.insert(formCustomizations).values({
        id: `cust_${randomUUID()}`,
        tenantId,
        companyId,
        formKey,
        version: 1,
        metadata: { instances },
      });
    }
  }
}
