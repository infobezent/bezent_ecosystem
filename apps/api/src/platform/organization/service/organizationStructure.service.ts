import { OrganizationStructureRepository } from '../repository/organizationStructure.repository.js';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../../../app/errors/AppError.js';
import type {
  OrganizationHierarchy,
  BusinessUnitRecord,
  DivisionRecord,
  EligibleHead,
  CreateBusinessUnitDto,
  UpdateBusinessUnitDto,
  CreateDivisionDto,
  UpdateDivisionDto,
  StructuralStatus,
} from '../types/structure.types.js';

export class OrganizationStructureService {
  constructor(private readonly repo = new OrganizationStructureRepository()) {}

  async getHierarchy(tenantId: string, companyId: string): Promise<OrganizationHierarchy> {
    const company = await this.repo.getCompanySummary(tenantId, companyId);
    if (!company) {
      throw new NotFoundError(`Company not found for ID: ${companyId}`);
    }

    const [businessUnits, allDivisions] = await Promise.all([
      this.repo.listBusinessUnits(tenantId, companyId),
      this.repo.listDivisions(tenantId, companyId),
    ]);

    // Group divisions by businessUnitId
    const divisionsByBu = new Map<string, DivisionRecord[]>();
    for (const div of allDivisions) {
      const list = divisionsByBu.get(div.businessUnitId) ?? [];
      list.push(div);
      divisionsByBu.set(div.businessUnitId, list);
    }

    const hierarchicalBus: BusinessUnitRecord[] = businessUnits.map((bu) => {
      const nestedDivisions = divisionsByBu.get(bu.id) ?? [];
      return {
        ...bu,
        divisionCount: nestedDivisions.length,
        divisions: nestedDivisions,
      };
    });

    return {
      company,
      businessUnits: hierarchicalBus,
      totalBusinessUnits: businessUnits.length,
      totalDivisions: allDivisions.length,
    };
  }

  async getEligibleHeads(tenantId: string, companyId: string): Promise<EligibleHead[]> {
    return this.repo.listEligibleHeads(tenantId, companyId);
  }

  async listBusinessUnits(tenantId: string, companyId: string): Promise<BusinessUnitRecord[]> {
    return this.repo.listBusinessUnits(tenantId, companyId);
  }

  async getBusinessUnitById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<BusinessUnitRecord> {
    const bu = await this.repo.findBusinessUnitById(tenantId, companyId, id);
    if (!bu) {
      throw new NotFoundError(`Business unit not found for ID: ${id}`);
    }
    return bu;
  }

  async createBusinessUnit(
    tenantId: string,
    companyId: string,
    dto: CreateBusinessUnitDto,
  ): Promise<BusinessUnitRecord> {
    const trimmedCode = dto.code?.trim() || null;
    if (trimmedCode) {
      const existing = await this.repo.findBusinessUnitByCode(tenantId, companyId, trimmedCode);
      if (existing) {
        throw new ConflictError(
          `Business unit code "${trimmedCode}" is already in use in this company`,
        );
      }
    }

    return this.repo.createBusinessUnit(tenantId, companyId, {
      ...dto,
      name: dto.name.trim(),
      code: trimmedCode,
      description: dto.description?.trim() || null,
      status: dto.status ?? 'active',
    });
  }

  async updateBusinessUnit(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateBusinessUnitDto,
  ): Promise<BusinessUnitRecord> {
    const existing = await this.repo.findBusinessUnitById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Business unit not found for ID: ${id}`);
    }

    const trimmedCode = dto.code?.trim() || null;
    if (trimmedCode) {
      const codeMatch = await this.repo.findBusinessUnitByCode(tenantId, companyId, trimmedCode);
      if (codeMatch && codeMatch.id !== id) {
        throw new ConflictError(
          `Business unit code "${trimmedCode}" is already in use by another business unit in this company`,
        );
      }
    }

    return this.repo.updateBusinessUnit(tenantId, companyId, id, {
      ...dto,
      name: dto.name.trim(),
      code: trimmedCode,
      description: dto.description?.trim() || null,
      status: dto.status ?? existing.status,
    });
  }

  async setBusinessUnitStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: StructuralStatus,
  ): Promise<BusinessUnitRecord> {
    const existing = await this.repo.findBusinessUnitById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Business unit not found for ID: ${id}`);
    }

    return this.repo.setBusinessUnitStatus(tenantId, companyId, id, status);
  }

  async listDivisions(
    tenantId: string,
    companyId: string,
    businessUnitId?: string,
  ): Promise<DivisionRecord[]> {
    return this.repo.listDivisions(tenantId, companyId, businessUnitId);
  }

  async getDivisionById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<DivisionRecord> {
    const div = await this.repo.findDivisionById(tenantId, companyId, id);
    if (!div) {
      throw new NotFoundError(`Division not found for ID: ${id}`);
    }
    return div;
  }

  async createDivision(
    tenantId: string,
    companyId: string,
    dto: CreateDivisionDto,
  ): Promise<DivisionRecord> {
    const parentBu = await this.repo.findBusinessUnitById(tenantId, companyId, dto.businessUnitId);
    if (!parentBu) {
      throw new BadRequestError('Parent business unit does not exist in this company');
    }
    if (parentBu.status === 'inactive') {
      throw new BadRequestError('Cannot add division to an inactive business unit');
    }

    const trimmedCode = dto.code?.trim() || null;
    if (trimmedCode) {
      const existing = await this.repo.findDivisionByCode(tenantId, companyId, trimmedCode);
      if (existing) {
        throw new ConflictError(`Division code "${trimmedCode}" is already in use in this company`);
      }
    }

    return this.repo.createDivision(tenantId, companyId, {
      ...dto,
      name: dto.name.trim(),
      code: trimmedCode,
      description: dto.description?.trim() || null,
      status: dto.status ?? 'active',
    });
  }

  async updateDivision(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateDivisionDto,
  ): Promise<DivisionRecord> {
    const existing = await this.repo.findDivisionById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Division not found for ID: ${id}`);
    }

    const trimmedCode = dto.code?.trim() || null;
    if (trimmedCode) {
      const codeMatch = await this.repo.findDivisionByCode(tenantId, companyId, trimmedCode);
      if (codeMatch && codeMatch.id !== id) {
        throw new ConflictError(
          `Division code "${trimmedCode}" is already in use by another division in this company`,
        );
      }
    }

    return this.repo.updateDivision(tenantId, companyId, id, {
      ...dto,
      name: dto.name.trim(),
      code: trimmedCode,
      description: dto.description?.trim() || null,
      status: dto.status ?? existing.status,
    });
  }

  async setDivisionStatus(
    tenantId: string,
    companyId: string,
    id: string,
    status: StructuralStatus,
  ): Promise<DivisionRecord> {
    const existing = await this.repo.findDivisionById(tenantId, companyId, id);
    if (!existing) {
      throw new NotFoundError(`Division not found for ID: ${id}`);
    }

    if (status === 'active') {
      const parentBu = await this.repo.findBusinessUnitById(
        tenantId,
        companyId,
        existing.businessUnitId,
      );
      if (parentBu && parentBu.status === 'inactive') {
        throw new BadRequestError(
          'Cannot activate division because its parent business unit is inactive',
        );
      }
    }

    return this.repo.setDivisionStatus(tenantId, companyId, id, status);
  }
}
