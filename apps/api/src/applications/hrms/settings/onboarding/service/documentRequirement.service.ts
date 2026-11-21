import { randomUUID } from 'node:crypto';
import { DocumentRequirementRepository } from '../repository/documentRequirement.repository.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  AppError,
} from '../../../../../app/errors/AppError.js';
import type {
  DocumentCategory,
  DocumentRequirement,
  CandidateDocumentInstance,
  CandidateDocumentFile,
  DocumentVerificationHistoryEntry,
  CreateDocumentCategoryDto,
  UpdateDocumentCategoryDto,
  ReorderDocumentCategoriesDto,
  CreateDocumentRequirementDto,
  UpdateDocumentRequirementDto,
  SaveDocumentApplicabilityDto,
  UploadCandidateDocumentDto,
  VerifyCandidateDocumentDto,
  RequestCandidateReuploadDto,
  ResolveCandidateDocumentsParams,
} from '../types/documentRequirement.types.js';

export class DocumentRequirementService {
  constructor(private readonly repository = new DocumentRequirementRepository()) {}

  // ==================== Category Operations ====================

  async listCategories(tenantId: string, companyId: string): Promise<DocumentCategory[]> {
    const categories = await this.repository.getCategories(tenantId, companyId);
    return categories.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async createCategory(
    tenantId: string,
    companyId: string,
    dto: CreateDocumentCategoryDto,
  ): Promise<DocumentCategory> {
    const trimmedName = dto.name?.trim();
    if (!trimmedName) {
      throw new BadRequestError('Category name is required', 'CATEGORY_NAME_REQUIRED');
    }

    const categories = await this.repository.getCategories(tenantId, companyId);
    if (categories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new ConflictError(
        `A document category with name '${trimmedName}' already exists`,
        'DUPLICATE_CATEGORY_NAME',
      );
    }

    const code =
      trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'custom_category';

    const now = new Date().toISOString();
    const newCategory: DocumentCategory = {
      id: `cat_${randomUUID().slice(0, 8)}_${companyId}`,
      tenantId,
      companyId,
      name: trimmedName,
      code,
      description: dto.description?.trim() ?? null,
      displayOrder: dto.displayOrder ?? categories.length + 1,
      isActive: dto.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const next = [...categories, newCategory];
    await this.repository.saveAllCategories(tenantId, companyId, next);
    return newCategory;
  }

  async updateCategory(
    tenantId: string,
    companyId: string,
    categoryId: string,
    dto: UpdateDocumentCategoryDto,
  ): Promise<DocumentCategory> {
    const categories = await this.repository.getCategories(tenantId, companyId);
    const target = categories.find((c) => c.id === categoryId);
    if (!target) {
      throw new NotFoundError(`Document category '${categoryId}' not found`);
    }

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new BadRequestError('Category name cannot be empty', 'CATEGORY_NAME_EMPTY');
      }
      const duplicate = categories.find(
        (c) => c.id !== categoryId && c.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (duplicate) {
        throw new ConflictError(
          `Category name '${trimmedName}' is already in use`,
          'DUPLICATE_CATEGORY_NAME',
        );
      }
      target.name = trimmedName;
    }

    if (dto.description !== undefined) {
      target.description = dto.description?.trim() ?? null;
    }
    if (dto.displayOrder !== undefined) {
      target.displayOrder = dto.displayOrder;
    }
    if (dto.isActive !== undefined) {
      target.isActive = dto.isActive;
    }

    target.updatedAt = new Date().toISOString();
    await this.repository.saveAllCategories(tenantId, companyId, categories);
    return target;
  }

  async deleteCategory(tenantId: string, companyId: string, categoryId: string): Promise<void> {
    const categories = await this.repository.getCategories(tenantId, companyId);
    const target = categories.find((c) => c.id === categoryId);
    if (!target) {
      throw new NotFoundError(`Document category '${categoryId}' not found`);
    }

    // Safety rule: Prevent deleting categories that still contain active document requirements
    const requirements = await this.repository.getRequirements(tenantId, companyId);
    const attachedRequirements = requirements.filter((r) => r.categoryId === categoryId);

    if (attachedRequirements.length > 0) {
      throw new AppError(
        `Cannot delete category '${target.name}'. It contains ${attachedRequirements.length} document requirement(s). Reassign or delete these documents first.`,
        400,
        'CATEGORY_CONTAINS_DOCUMENTS',
      );
    }

    const next = categories.filter((c) => c.id !== categoryId);
    await this.repository.saveAllCategories(tenantId, companyId, next);
  }

  async reorderCategories(
    tenantId: string,
    companyId: string,
    dto: ReorderDocumentCategoriesDto,
  ): Promise<DocumentCategory[]> {
    const categories = await this.repository.getCategories(tenantId, companyId);
    const orderMap = new Map<string, number>();
    dto.categoryIds.forEach((id, index) => orderMap.set(id, index + 1));

    const updated = categories.map((c) => {
      const newOrder = orderMap.get(c.id);
      if (newOrder !== undefined) {
        return { ...c, displayOrder: newOrder, updatedAt: new Date().toISOString() };
      }
      return c;
    });

    updated.sort((a, b) => a.displayOrder - b.displayOrder);
    await this.repository.saveAllCategories(tenantId, companyId, updated);
    return updated;
  }

  // ==================== Document Requirement Operations ====================

  async listRequirements(tenantId: string, companyId: string): Promise<DocumentRequirement[]> {
    const requirements = await this.repository.getRequirements(tenantId, companyId);
    return requirements.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async getRequirementById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<DocumentRequirement> {
    const requirements = await this.repository.getRequirements(tenantId, companyId);
    const target = requirements.find((r) => r.id === id);
    if (!target) {
      throw new NotFoundError(`Document requirement '${id}' not found`);
    }
    return target;
  }

  async createRequirement(
    tenantId: string,
    companyId: string,
    dto: CreateDocumentRequirementDto,
  ): Promise<DocumentRequirement> {
    const trimmedName = dto.name?.trim();
    if (!trimmedName) {
      throw new BadRequestError('Document name is required', 'DOCUMENT_NAME_REQUIRED');
    }

    // Verify category exists
    const categories = await this.repository.getCategories(tenantId, companyId);
    const catExists = categories.some((c) => c.id === dto.categoryId);
    if (!catExists) {
      throw new BadRequestError(`Category '${dto.categoryId}' not found`, 'CATEGORY_NOT_FOUND');
    }

    const requirements = await this.repository.getRequirements(tenantId, companyId);
    const docType =
      dto.documentType?.trim() ||
      trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') ||
      `doc_${randomUUID().slice(0, 6)}`;

    const now = new Date().toISOString();
    const newDoc: DocumentRequirement = {
      id: `doc_req_${randomUUID().slice(0, 8)}_${companyId}`,
      tenantId,
      companyId,
      name: trimmedName,
      documentType: docType,
      description: dto.description?.trim() ?? null,
      categoryId: dto.categoryId,
      isRequired: dto.isRequired ?? true,
      isActive: dto.isActive ?? true,
      displayOrder: dto.displayOrder ?? requirements.length + 1,
      uploadConfig: {
        allowedFormats: dto.uploadConfig?.allowedFormats ?? ['pdf', 'jpg', 'png'],
        maxFileSizeMb: dto.uploadConfig?.maxFileSizeMb ?? 5,
        allowMultiple: Boolean(dto.uploadConfig?.allowMultiple),
        maxFiles: dto.uploadConfig?.maxFiles ?? (dto.uploadConfig?.allowMultiple ? 3 : 1),
        expiryApplicable: Boolean(dto.uploadConfig?.expiryApplicable),
        requireExpiry: Boolean(dto.uploadConfig?.requireExpiry),
      },
      verificationConfig: {
        verificationRequired: dto.verificationConfig?.verificationRequired ?? true,
        verificationResponsibility: dto.verificationConfig?.verificationResponsibility ?? 'hr',
        specificRoleName: dto.verificationConfig?.specificRoleName ?? null,
        allowReupload: dto.verificationConfig?.allowReupload ?? true,
        reverificationOnExpiry: Boolean(dto.verificationConfig?.reverificationOnExpiry),
      },
      applicability: {
        allEmployees: dto.applicability?.allEmployees ?? true,
        employmentTypes: dto.applicability?.employmentTypes ?? [],
        departmentIds: dto.applicability?.departmentIds ?? [],
        locationIds: dto.applicability?.locationIds ?? [],
        pipelineIds: dto.applicability?.pipelineIds ?? [],
        stageKeys: dto.applicability?.stageKeys ?? [],
      },
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const next = [...requirements, newDoc];
    await this.repository.saveAllRequirements(tenantId, companyId, next);
    return newDoc;
  }

  async updateRequirement(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateDocumentRequirementDto,
  ): Promise<DocumentRequirement> {
    const requirements = await this.repository.getRequirements(tenantId, companyId);
    const target = requirements.find((r) => r.id === id);
    if (!target) {
      throw new NotFoundError(`Document requirement '${id}' not found`);
    }

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new BadRequestError('Document name cannot be empty', 'DOCUMENT_NAME_EMPTY');
      }
      target.name = trimmed;
    }

    if (dto.categoryId !== undefined) {
      const categories = await this.repository.getCategories(tenantId, companyId);
      if (!categories.some((c) => c.id === dto.categoryId)) {
        throw new BadRequestError(`Category '${dto.categoryId}' not found`, 'CATEGORY_NOT_FOUND');
      }
      target.categoryId = dto.categoryId;
    }

    if (dto.description !== undefined) {
      target.description = dto.description?.trim() ?? null;
    }
    if (dto.isRequired !== undefined) {
      target.isRequired = dto.isRequired;
    }
    if (dto.isActive !== undefined) {
      target.isActive = dto.isActive;
    }
    if (dto.displayOrder !== undefined) {
      target.displayOrder = dto.displayOrder;
    }

    if (dto.uploadConfig) {
      target.uploadConfig = {
        ...target.uploadConfig,
        ...dto.uploadConfig,
        allowedFormats: dto.uploadConfig.allowedFormats ?? target.uploadConfig.allowedFormats,
        maxFileSizeMb: dto.uploadConfig.maxFileSizeMb ?? target.uploadConfig.maxFileSizeMb,
        allowMultiple:
          dto.uploadConfig.allowMultiple !== undefined
            ? dto.uploadConfig.allowMultiple
            : target.uploadConfig.allowMultiple,
        maxFiles: dto.uploadConfig.maxFiles ?? target.uploadConfig.maxFiles,
        expiryApplicable:
          dto.uploadConfig.expiryApplicable !== undefined
            ? dto.uploadConfig.expiryApplicable
            : target.uploadConfig.expiryApplicable,
        requireExpiry:
          dto.uploadConfig.requireExpiry !== undefined
            ? dto.uploadConfig.requireExpiry
            : target.uploadConfig.requireExpiry,
      };
    }

    if (dto.verificationConfig) {
      target.verificationConfig = {
        ...target.verificationConfig,
        ...dto.verificationConfig,
        verificationRequired:
          dto.verificationConfig.verificationRequired !== undefined
            ? dto.verificationConfig.verificationRequired
            : target.verificationConfig.verificationRequired,
        verificationResponsibility:
          dto.verificationConfig.verificationResponsibility ??
          target.verificationConfig.verificationResponsibility,
        specificRoleName:
          dto.verificationConfig.specificRoleName !== undefined
            ? dto.verificationConfig.specificRoleName
            : target.verificationConfig.specificRoleName,
        allowReupload:
          dto.verificationConfig.allowReupload !== undefined
            ? dto.verificationConfig.allowReupload
            : target.verificationConfig.allowReupload,
        reverificationOnExpiry:
          dto.verificationConfig.reverificationOnExpiry !== undefined
            ? dto.verificationConfig.reverificationOnExpiry
            : target.verificationConfig.reverificationOnExpiry,
      };
    }

    if (dto.applicability) {
      target.applicability = {
        ...target.applicability,
        ...dto.applicability,
      };
    }

    target.version += 1;
    target.updatedAt = new Date().toISOString();

    await this.repository.saveAllRequirements(tenantId, companyId, requirements);
    return target;
  }

  async duplicateRequirement(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<DocumentRequirement> {
    const requirements = await this.repository.getRequirements(tenantId, companyId);
    const source = requirements.find((r) => r.id === id);
    if (!source) {
      throw new NotFoundError(`Document requirement '${id}' not found`);
    }

    let copyIndex = 1;
    let newName = `${source.name} (Copy)`;
    while (requirements.some((r) => r.name.toLowerCase() === newName.toLowerCase())) {
      copyIndex += 1;
      newName = `${source.name} (Copy ${copyIndex})`;
    }

    const now = new Date().toISOString();
    const duplicated: DocumentRequirement = {
      ...source,
      id: `doc_req_${randomUUID().slice(0, 8)}_${companyId}`,
      name: newName,
      documentType: `${source.documentType}_copy_${copyIndex}`,
      displayOrder: requirements.length + 1,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const next = [...requirements, duplicated];
    await this.repository.saveAllRequirements(tenantId, companyId, next);
    return duplicated;
  }

  async deleteRequirement(tenantId: string, companyId: string, id: string): Promise<void> {
    const requirements = await this.repository.getRequirements(tenantId, companyId);
    const target = requirements.find((r) => r.id === id);
    if (!target) {
      throw new NotFoundError(`Document requirement '${id}' not found`);
    }

    const next = requirements.filter((r) => r.id !== id);
    await this.repository.saveAllRequirements(tenantId, companyId, next);
  }

  async saveApplicability(
    tenantId: string,
    companyId: string,
    id: string,
    dto: SaveDocumentApplicabilityDto,
  ): Promise<DocumentRequirement> {
    const requirements = await this.repository.getRequirements(tenantId, companyId);
    const target = requirements.find((r) => r.id === id);
    if (!target) {
      throw new NotFoundError(`Document requirement '${id}' not found`);
    }

    target.applicability = {
      allEmployees: dto.allEmployees,
      employmentTypes: dto.employmentTypes ?? [],
      departmentIds: dto.departmentIds ?? [],
      locationIds: dto.locationIds ?? [],
      pipelineIds: dto.pipelineIds ?? [],
      stageKeys: dto.stageKeys ?? [],
    };

    target.version += 1;
    target.updatedAt = new Date().toISOString();

    await this.repository.saveAllRequirements(tenantId, companyId, requirements);
    return target;
  }

  // ==================== Candidate Document Workflow Operations ====================

  /**
   * Evaluates applicability rules to find requirements matching candidate context
   */
  async resolveApplicableRequirements(
    tenantId: string,
    companyId: string,
    params: {
      employmentType?: string | null;
      departmentId?: string | null;
      locationId?: string | null;
      pipelineId?: string | null;
      stageKey?: string | null;
    },
  ): Promise<DocumentRequirement[]> {
    const all = await this.repository.getRequirements(tenantId, companyId);
    const active = all.filter((r) => r.isActive);

    return active.filter((r) => {
      const app = r.applicability;
      if (app.allEmployees) {
        // If allEmployees is true, check if pipeline or stage restrictions apply
        if (
          app.pipelineIds.length > 0 &&
          params.pipelineId &&
          !app.pipelineIds.includes(params.pipelineId)
        ) {
          return false;
        }
        if (
          app.stageKeys.length > 0 &&
          params.stageKey &&
          !app.stageKeys.includes(params.stageKey)
        ) {
          return false;
        }
        return true;
      }

      // Check Employment Type
      if (app.employmentTypes.length > 0) {
        if (!params.employmentType || !app.employmentTypes.includes(params.employmentType)) {
          return false;
        }
      }

      // Check Department
      if (app.departmentIds.length > 0) {
        if (!params.departmentId || !app.departmentIds.includes(params.departmentId)) {
          return false;
        }
      }

      // Check Location
      if (app.locationIds.length > 0) {
        if (!params.locationId || !app.locationIds.includes(params.locationId)) {
          return false;
        }
      }

      // Check Pipeline
      if (app.pipelineIds.length > 0) {
        if (!params.pipelineId || !app.pipelineIds.includes(params.pipelineId)) {
          return false;
        }
      }

      // Check Pipeline Stage
      if (app.stageKeys.length > 0) {
        if (!params.stageKey || !app.stageKeys.includes(params.stageKey)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Retrieves candidate document instances with real-time expiry evaluation
   */
  async getCandidateDocuments(
    tenantId: string,
    companyId: string,
    caseId: string,
  ): Promise<CandidateDocumentInstance[]> {
    const instances = await this.repository.getCandidateDocuments(tenantId, companyId, caseId);
    const today = new Date().toISOString().split('T')[0] ?? '';

    // Check expiry dynamically
    return instances.map((inst) => {
      const isExpired = Boolean(inst.expiryDate && inst.expiryDate < today);
      return {
        ...inst,
        isExpired,
      };
    });
  }

  /**
   * Generates or syncs candidate document requirements without overwriting existing files or history
   */
  async generateCandidateDocuments(
    tenantId: string,
    companyId: string,
    params: ResolveCandidateDocumentsParams,
  ): Promise<CandidateDocumentInstance[]> {
    const applicableRequirements = await this.resolveApplicableRequirements(tenantId, companyId, {
      employmentType: params.employmentType,
      departmentId: params.departmentId,
      locationId: params.locationId,
      pipelineId: params.pipelineId,
      stageKey: params.stageKey,
    });

    const categories = await this.repository.getCategories(tenantId, companyId);
    const categoryMap = new Map<string, string>();
    categories.forEach((c) => categoryMap.set(c.id, c.name));

    const existingInstances = await this.repository.getCandidateDocuments(
      tenantId,
      companyId,
      params.caseId,
    );
    const existingMap = new Map<string, CandidateDocumentInstance>();
    existingInstances.forEach((inst) => existingMap.set(inst.requirementId, inst));

    const now = new Date().toISOString();
    const result: CandidateDocumentInstance[] = [];

    // 1. Process applicable requirements (preserving existing uploads / verifications)
    for (const req of applicableRequirements) {
      const existing = existingMap.get(req.id);
      if (existing) {
        // Keep existing progress and files, but update requirement details if changed
        result.push({
          ...existing,
          documentName: req.name,
          categoryName: categoryMap.get(req.categoryId) || existing.categoryName,
          isRequired: req.isRequired,
          uploadConfig: req.uploadConfig,
          verificationConfig: req.verificationConfig,
          updatedAt: now,
        });
      } else {
        // Create new candidate instance in 'pending' status
        result.push({
          id: `cdi_${randomUUID().slice(0, 8)}_${params.caseId}`,
          caseId: params.caseId,
          requirementId: req.id,
          documentName: req.name,
          documentType: req.documentType,
          categoryId: req.categoryId,
          categoryName: categoryMap.get(req.categoryId) || 'General',
          isRequired: req.isRequired,
          status: 'pending',
          uploadConfig: req.uploadConfig,
          verificationConfig: req.verificationConfig,
          uploadedFiles: [],
          version: 1,
          history: [
            {
              id: `hist_${randomUUID().slice(0, 6)}`,
              action: 'uploaded',
              timestamp: now,
              actorId: 'system',
              actorRole: 'system',
              status: 'pending',
              remarks: 'Document requirement assigned during onboarding.',
              version: 1,
            },
          ],
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 2. Preserve any previously uploaded documents even if requirement template changed
    for (const inst of existingInstances) {
      if (!applicableRequirements.some((r) => r.id === inst.requirementId)) {
        // If candidate already uploaded files, DO NOT delete! Keep for compliance
        if (inst.uploadedFiles.length > 0 || inst.status !== 'pending') {
          result.push(inst);
        }
      }
    }

    await this.repository.saveCandidateDocuments(tenantId, companyId, params.caseId, result);
    return result;
  }

  /**
   * Uploads and attaches a document file for candidate onboarding
   */
  async uploadCandidateDocument(
    tenantId: string,
    companyId: string,
    caseId: string,
    docId: string,
    dto: UploadCandidateDocumentDto,
    actor: { id: string; role: string },
  ): Promise<CandidateDocumentInstance> {
    const instances = await this.repository.getCandidateDocuments(tenantId, companyId, caseId);
    const target = instances.find((i) => i.id === docId || i.requirementId === docId);
    if (!target) {
      throw new NotFoundError(
        `Candidate document instance '${docId}' not found for case '${caseId}'`,
      );
    }

    // 1. Validate file format
    const ext = dto.fileName.split('.').pop()?.toLowerCase() || '';
    const allowed = target.uploadConfig.allowedFormats.map((f) =>
      f.toLowerCase().replace(/^\./, ''),
    );
    if (allowed.length > 0 && !allowed.includes(ext)) {
      throw new BadRequestError(
        `File format '.${ext}' is not allowed. Permitted formats: ${allowed.join(', ')}`,
        'INVALID_FILE_FORMAT',
      );
    }

    // 2. Validate file size
    const maxBytes = target.uploadConfig.maxFileSizeMb * 1024 * 1024;
    if (dto.fileSizeBytes > maxBytes) {
      throw new BadRequestError(
        `File size (${(dto.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed size of ${target.uploadConfig.maxFileSizeMb} MB`,
        'FILE_TOO_LARGE',
      );
    }

    // 3. Validate multiple files limit
    if (!target.uploadConfig.allowMultiple && target.uploadedFiles.length >= 1) {
      // Replace file or verify allowReupload
      if (!target.verificationConfig.allowReupload && target.status === 'approved') {
        throw new BadRequestError(
          'Re-uploading is not permitted for this verified document.',
          'REUPLOAD_NOT_ALLOWED',
        );
      }
    } else if (
      target.uploadConfig.allowMultiple &&
      target.uploadedFiles.length >= target.uploadConfig.maxFiles
    ) {
      throw new BadRequestError(
        `Maximum file upload limit of ${target.uploadConfig.maxFiles} files reached for this document.`,
        'MAX_FILES_EXCEEDED',
      );
    }

    const now = new Date().toISOString();
    const newFile: CandidateDocumentFile = {
      fileId: `file_${randomUUID().slice(0, 8)}`,
      fileName: dto.fileName,
      fileSizeBytes: dto.fileSizeBytes,
      mimeType: dto.mimeType,
      uploadedAt: now,
      uploadedBy: actor.id,
      storageKey:
        dto.storageKey ||
        `secure/onboarding/${companyId}/${caseId}/${randomUUID()}_${dto.fileName}`,
    };

    if (!target.uploadConfig.allowMultiple) {
      target.uploadedFiles = [newFile];
    } else {
      target.uploadedFiles.push(newFile);
    }

    if (dto.documentNumber) {
      target.documentNumber = dto.documentNumber.trim();
    }
    if (dto.expiryDate) {
      target.expiryDate = dto.expiryDate;
    }

    target.status = 'submitted';
    target.version += 1;
    target.updatedAt = now;

    // Append to verification history
    target.history.push({
      id: `hist_${randomUUID().slice(0, 6)}`,
      action: target.uploadedFiles.length > 1 ? 'reuploaded' : 'uploaded',
      timestamp: now,
      actorId: actor.id,
      actorRole: actor.role,
      status: 'submitted',
      remarks: `Uploaded ${dto.fileName} (${(dto.fileSizeBytes / 1024).toFixed(1)} KB)`,
      version: target.version,
    });

    await this.repository.saveCandidateDocuments(tenantId, companyId, caseId, instances);
    return target;
  }

  /**
   * Verifies candidate document (HR approval or rejection)
   */
  async verifyCandidateDocument(
    tenantId: string,
    companyId: string,
    caseId: string,
    docId: string,
    dto: VerifyCandidateDocumentDto,
    actor: { id: string; role: string },
  ): Promise<CandidateDocumentInstance> {
    const instances = await this.repository.getCandidateDocuments(tenantId, companyId, caseId);
    const target = instances.find((i) => i.id === docId || i.requirementId === docId);
    if (!target) {
      throw new NotFoundError(
        `Candidate document instance '${docId}' not found for case '${caseId}'`,
      );
    }

    const now = new Date().toISOString();

    if (dto.status === 'approved') {
      target.status = 'approved';
      target.rejectionReason = null;
      target.verifiedBy = actor.id;
      target.verifiedAt = now;
    } else if (dto.status === 'rejected') {
      target.status = 'rejected';
      target.rejectionReason = dto.remarks?.trim() || 'Document rejected during HR verification.';
    }

    if (dto.documentNumber) {
      target.documentNumber = dto.documentNumber.trim();
    }
    if (dto.expiryDate) {
      target.expiryDate = dto.expiryDate;
    }

    target.version += 1;
    target.updatedAt = now;

    target.history.push({
      id: `hist_${randomUUID().slice(0, 6)}`,
      action: dto.status === 'approved' ? 'verified' : 'rejected',
      timestamp: now,
      actorId: actor.id,
      actorRole: actor.role,
      status: target.status,
      remarks: dto.remarks?.trim() ?? null,
      version: target.version,
    });

    await this.repository.saveCandidateDocuments(tenantId, companyId, caseId, instances);
    return target;
  }

  /**
   * Requests candidate to re-upload document with specified rejection reason
   */
  async requestCandidateReupload(
    tenantId: string,
    companyId: string,
    caseId: string,
    docId: string,
    dto: RequestCandidateReuploadDto,
    actor: { id: string; role: string },
  ): Promise<CandidateDocumentInstance> {
    const trimmedReason = dto.reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestError('Re-upload reason is required', 'REUPLOAD_REASON_REQUIRED');
    }

    const instances = await this.repository.getCandidateDocuments(tenantId, companyId, caseId);
    const target = instances.find((i) => i.id === docId || i.requirementId === docId);
    if (!target) {
      throw new NotFoundError(
        `Candidate document instance '${docId}' not found for case '${caseId}'`,
      );
    }

    const now = new Date().toISOString();
    target.status = 'rejected';
    target.rejectionReason = trimmedReason;
    target.version += 1;
    target.updatedAt = now;

    target.history.push({
      id: `hist_${randomUUID().slice(0, 6)}`,
      action: 'reupload_requested',
      timestamp: now,
      actorId: actor.id,
      actorRole: actor.role,
      status: 'rejected',
      remarks: `Re-upload requested: ${trimmedReason}`,
      version: target.version,
    });

    await this.repository.saveCandidateDocuments(tenantId, companyId, caseId, instances);
    return target;
  }
}
