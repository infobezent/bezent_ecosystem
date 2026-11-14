import crypto from 'node:crypto';
import ExcelJS from 'exceljs';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../../../db/connection.js';
import {
  employees,
  employeePersonalDetails,
  employeeEmergencyContacts,
  departments,
  designations,
  locations,
} from '../../../../../db/schema.js';
import { EmployeeImportRepository } from '../repository/employeeImport.repository.js';
import { workforceSettingsService } from '../../../workforce/service/workforceSettings.service.js';
import { BadRequestError, NotFoundError } from '../../../../../app/errors/AppError.js';
import type {
  ImportOptions,
  ImportIssue,
  ParsedEmployeeRow,
  ValidationSummary,
  ProcessImportResult,
} from '../types/employeeImport.types.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_REGEX = /^[+]?[\d\s\-().]{7,25}$/;

export class EmployeeImportService {
  constructor(
    private readonly repo = new EmployeeImportRepository(),
    private readonly customDb?: any,
  ) {}

  private get db() {
    return this.customDb || getDb();
  }

  /**
   * Parses and validates an uploaded XLSX or CSV file buffer.
   */
  async validateImportFile(
    tenantId: string,
    companyId: string,
    userId: string | undefined,
    file: {
      fileName: string;
      fileFormat: 'xlsx' | 'csv';
      fileSize: number;
      buffer: Buffer;
    },
    options: ImportOptions = {
      skipDuplicates: true,
      sendInvitations: false,
      autoGenerateId: false,
    },
  ): Promise<ValidationSummary> {
    if (file.fileSize > 10 * 1024 * 1024) {
      throw new BadRequestError('File size exceeds the maximum allowed limit of 10 MB.');
    }

    const workbook = new ExcelJS.Workbook();
    try {
      if (file.fileFormat === 'csv') {
        const { Readable } = await import('node:stream');
        const stream = Readable.from(file.buffer);
        await workbook.csv.read(stream);
      } else {
        // ExcelJS load expects Buffer
        await workbook.xlsx.load(
          file.buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
        );
      }
    } catch {
      throw new BadRequestError(
        'Unable to read the uploaded employee file. Please ensure it is a valid XLSX or CSV file.',
      );
    }

    // Sheet 1: Prefer 'Employee Data' or the first worksheet
    const worksheet = workbook.getWorksheet('Employee Data') || workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      throw new BadRequestError('The uploaded file contains no employee records.');
    }

    // 1. Map and validate headers
    const headerRow = worksheet.getRow(1);
    const headerMap = new Map<number, string>();
    headerRow.eachCell((cell, colNumber) => {
      const headerText = cell.value ? String(cell.value).trim().toLowerCase() : '';
      if (headerText) {
        headerMap.set(colNumber, this.normalizeHeader(headerText));
      }
    });

    const mappedKeys = Array.from(headerMap.values());
    if (
      !mappedKeys.includes('firstName') ||
      (!mappedKeys.includes('workEmail') && !mappedKeys.includes('dateOfJoining'))
    ) {
      throw new BadRequestError(
        'Required column headers are missing. Please use the official BEZENT employee template.',
      );
    }

    // 2. Fetch company reference data for Tier 4 validation
    const [deptList, desigList, locList, existingEmps] = await Promise.all([
      this.db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(
          and(
            eq(departments.tenantId, tenantId),
            eq(departments.companyId, companyId),
            eq(departments.status, 'active'),
          ),
        ),
      this.db
        .select({ id: designations.id, name: designations.name })
        .from(designations)
        .where(
          and(
            eq(designations.tenantId, tenantId),
            eq(designations.companyId, companyId),
            eq(designations.status, 'active'),
          ),
        ),
      this.db
        .select({ id: locations.id, name: locations.name })
        .from(locations)
        .where(
          and(
            eq(locations.tenantId, tenantId),
            eq(locations.companyId, companyId),
            eq(locations.status, 'active'),
          ),
        ),
      this.db
        .select({
          id: employees.id,
          employeeNumber: employees.employeeNumber,
          email: employees.email,
        })
        .from(employees)
        .where(and(eq(employees.tenantId, tenantId), eq(employees.companyId, companyId))),
    ]);

    const deptMap = new Map<string, string>(
      deptList.map((d: { id: string; name: string }) => [d.name.trim().toLowerCase(), d.id]),
    );
    const desigMap = new Map<string, string>(
      desigList.map((d: { id: string; name: string }) => [d.name.trim().toLowerCase(), d.id]),
    );
    const locMap = new Map<string, string>(
      locList.map((l: { id: string; name: string }) => [l.name.trim().toLowerCase(), l.id]),
    );
    const existingEmpNumbers = new Set(
      existingEmps.map((e: { employeeNumber: string }) => e.employeeNumber.trim().toLowerCase()),
    );
    const existingEmails = new Set(
      existingEmps.map((e: { email: string }) => e.email.trim().toLowerCase()),
    );

    // Internal duplicate tracking
    const seenFileEmpNumbers = new Set<string>();
    const seenFileEmails = new Set<string>();

    const parsedRows: ParsedEmployeeRow[] = [];
    let rowNumberCounter = 0;

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const rowData: Record<string, unknown> = {};
      let hasData = false;

      headerMap.forEach((key, colNumber) => {
        const cell = row.getCell(colNumber);
        let val = cell.value;
        if (val !== null && val !== undefined) {
          if (typeof val === 'object' && 'text' in val) {
            val = (val as { text: string }).text;
          } else if (val instanceof Date) {
            val = val.toISOString().slice(0, 10);
          }
          const strVal = String(val).trim();
          if (strVal.length > 0) {
            hasData = true;
            rowData[key] = strVal;
          }
        }
      });

      if (!hasData) continue;
      rowNumberCounter++;

      if (rowNumberCounter > 1000) {
        throw new BadRequestError(
          'File exceeds maximum limit of 1,000 employee records per import.',
        );
      }

      const issues: ImportIssue[] = [];

      // Extract raw strings
      const firstName = String(rowData.firstName || '').trim();
      const middleName = rowData.middleName ? String(rowData.middleName).trim() : undefined;
      const lastName = rowData.lastName ? String(rowData.lastName).trim() : undefined;
      const workEmail = String(rowData.workEmail || '').trim();
      const phone = rowData.phone ? String(rowData.phone).trim() : undefined;
      const employeeNumber = rowData.employeeNumber
        ? String(rowData.employeeNumber).trim()
        : undefined;
      const dateOfJoining = String(rowData.dateOfJoining || '').trim();
      const employmentTypeRaw = String(rowData.employmentType || 'full_time').trim();
      const employeeStatusRaw = String(rowData.employeeStatus || 'active').trim();
      const departmentName = rowData.department ? String(rowData.department).trim() : undefined;
      const designationName = rowData.designation ? String(rowData.designation).trim() : undefined;
      const locationName = rowData.workLocation ? String(rowData.workLocation).trim() : undefined;
      const reportingManagerId = rowData.reportingManagerId
        ? String(rowData.reportingManagerId).trim()
        : undefined;
      const personalEmail = rowData.personalEmail
        ? String(rowData.personalEmail).trim()
        : undefined;
      const postalCode = rowData.postalCode ? String(rowData.postalCode).trim() : undefined;

      // Tier 1 & 2: Required Field Validation
      if (!firstName) {
        issues.push({
          category: 'required',
          field: 'First Name',
          message: 'First name is required.',
        });
      }
      if (!dateOfJoining) {
        issues.push({
          category: 'required',
          field: 'Date of Joining',
          message: 'Date of joining is required.',
        });
      }
      if (!employmentTypeRaw) {
        issues.push({
          category: 'required',
          field: 'Employment Type',
          message: 'Employment type is required.',
        });
      }
      if (!workEmail) {
        issues.push({
          category: 'required',
          field: 'Work Email',
          message: 'Work email is required.',
        });
      }

      // Format Validations
      if (workEmail && !EMAIL_REGEX.test(workEmail)) {
        issues.push({
          category: 'format',
          field: 'Work Email',
          message: 'Invalid email address format.',
        });
      }
      if (personalEmail && !EMAIL_REGEX.test(personalEmail)) {
        issues.push({
          category: 'format',
          field: 'Personal Email',
          message: 'Invalid personal email format.',
        });
      }
      if (phone && !PHONE_REGEX.test(phone)) {
        issues.push({
          category: 'format',
          field: 'Phone Number',
          message: 'Invalid phone number format.',
        });
      }
      if (dateOfJoining && !DATE_REGEX.test(dateOfJoining)) {
        issues.push({
          category: 'format',
          field: 'Date of Joining',
          message: 'Date of joining must follow YYYY-MM-DD.',
        });
      }
      if (postalCode && postalCode.length > 20) {
        issues.push({
          category: 'format',
          field: 'Postal Code',
          message: 'Invalid postal code length.',
        });
      }

      // Tier 3: Duplicate Validations
      let isDuplicate = false;
      if (workEmail) {
        const lowerEmail = workEmail.toLowerCase();
        if (seenFileEmails.has(lowerEmail)) {
          issues.push({
            category: 'duplicate',
            field: 'Work Email',
            message: 'Duplicate work email in uploaded file.',
          });
          isDuplicate = true;
        } else if (existingEmails.has(lowerEmail)) {
          issues.push({
            category: 'duplicate',
            field: 'Work Email',
            message: 'Employee with this work email already exists.',
          });
          isDuplicate = true;
        }
        seenFileEmails.add(lowerEmail);
      }

      if (employeeNumber) {
        const lowerEmpNo = employeeNumber.toLowerCase();
        if (seenFileEmpNumbers.has(lowerEmpNo)) {
          issues.push({
            category: 'duplicate',
            field: 'Employee ID',
            message: 'Duplicate Employee ID in uploaded file.',
          });
          isDuplicate = true;
        } else if (existingEmpNumbers.has(lowerEmpNo)) {
          issues.push({
            category: 'duplicate',
            field: 'Employee ID',
            message: 'Employee with this ID already exists.',
          });
          isDuplicate = true;
        }
        seenFileEmpNumbers.add(lowerEmpNo);
      }

      // Tier 4: Reference Validations
      let departmentId: string | null = null;
      if (departmentName) {
        departmentId = deptMap.get(departmentName.toLowerCase()) ?? null;
        if (!departmentId) {
          issues.push({
            category: 'reference',
            field: 'Department',
            message: `Department '${departmentName}' not found.`,
          });
        }
      }

      let designationId: string | null = null;
      if (designationName) {
        designationId = desigMap.get(designationName.toLowerCase()) ?? null;
        if (!designationId) {
          issues.push({
            category: 'reference',
            field: 'Designation',
            message: `Designation '${designationName}' not found.`,
          });
        }
      }

      let locationId: string | null = null;
      if (locationName) {
        locationId = locMap.get(locationName.toLowerCase()) ?? null;
        if (!locationId) {
          issues.push({
            category: 'reference',
            field: 'Work Location',
            message: `Work location '${locationName}' not found.`,
          });
        }
      }

      let resolvedReportingManagerId: string | null = null;
      if (reportingManagerId) {
        const matched = existingEmps.find(
          (e: { id: string; employeeNumber: string }) =>
            e.employeeNumber.toLowerCase() === reportingManagerId.toLowerCase() ||
            e.id === reportingManagerId,
        );
        if (matched) {
          resolvedReportingManagerId = matched.id;
        } else {
          issues.push({
            category: 'reference',
            field: 'Reporting Manager ID',
            message: `Reporting manager '${reportingManagerId}' not found.`,
          });
        }
      }

      // Normalize employment type
      const normalizedEmploymentType = this.normalizeEmploymentType(employmentTypeRaw);
      const normalizedStatus = this.normalizeEmployeeStatus(employeeStatusRaw);

      let rowStatus: 'valid' | 'error' | 'duplicate' = 'valid';
      if (isDuplicate) {
        rowStatus = 'duplicate';
      } else if (issues.length > 0) {
        rowStatus = 'error';
      }

      parsedRows.push({
        rowNumber: r,
        employeeNumber,
        firstName,
        middleName,
        lastName,
        workEmail,
        personalEmail,
        phone,
        gender: rowData.gender ? String(rowData.gender).trim() : undefined,
        dateOfBirth: rowData.dateOfBirth ? String(rowData.dateOfBirth).trim() : undefined,
        dateOfJoining,
        employmentType: normalizedEmploymentType,
        employeeStatus: normalizedStatus,
        department: departmentName,
        designation: designationName,
        workLocation: locationName,
        jobLevel: rowData.jobLevel ? String(rowData.jobLevel).trim() : undefined,
        reportingManagerId,
        probationStartDate: rowData.probationStartDate
          ? String(rowData.probationStartDate).trim()
          : undefined,
        probationEndDate: rowData.probationEndDate
          ? String(rowData.probationEndDate).trim()
          : undefined,
        confirmationDate: rowData.confirmationDate
          ? String(rowData.confirmationDate).trim()
          : undefined,
        contractStartDate: rowData.contractStartDate
          ? String(rowData.contractStartDate).trim()
          : undefined,
        contractEndDate: rowData.contractEndDate
          ? String(rowData.contractEndDate).trim()
          : undefined,
        addressLine1: rowData.addressLine1 ? String(rowData.addressLine1).trim() : undefined,
        addressLine2: rowData.addressLine2 ? String(rowData.addressLine2).trim() : undefined,
        city: rowData.city ? String(rowData.city).trim() : undefined,
        state: rowData.state ? String(rowData.state).trim() : undefined,
        country: rowData.country ? String(rowData.country).trim() : undefined,
        postalCode,
        emergencyContactName: rowData.emergencyContactName
          ? String(rowData.emergencyContactName).trim()
          : undefined,
        emergencyContactPhone: rowData.emergencyContactPhone
          ? String(rowData.emergencyContactPhone).trim()
          : undefined,
        emergencyContactRelationship: rowData.emergencyContactRelationship
          ? String(rowData.emergencyContactRelationship).trim()
          : undefined,
        skills: rowData.skills ? String(rowData.skills).trim() : undefined,
        notes: rowData.notes ? String(rowData.notes).trim() : undefined,
        status: rowStatus,
        issues,
        rawData: rowData,
        departmentId,
        designationId,
        locationId,
        resolvedReportingManagerId,
      });
    }

    if (parsedRows.length === 0) {
      throw new BadRequestError('The uploaded file contains no employee records.');
    }

    const totalRecords = parsedRows.length;
    const validRecords = parsedRows.filter((r) => r.status === 'valid').length;
    const duplicateRecords = parsedRows.filter((r) => r.status === 'duplicate').length;
    const errorRecords = parsedRows.filter((r) => r.status === 'error').length;

    // Create import record in DB
    const importId = `imp_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    await this.repo.createImport({
      id: importId,
      tenantId,
      companyId,
      fileName: file.fileName,
      fileFormat: file.fileFormat,
      fileSize: file.fileSize,
      totalRecords,
      validRecords,
      errorRecords,
      duplicateRecords,
      importedRecords: 0,
      status: 'validated',
      options,
      createdByUserId: userId ?? null,
    });

    // Create row records
    const rowRecords = parsedRows.map((r) => ({
      id: `impr_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
      importId,
      rowNumber: r.rowNumber,
      employeeName: r.lastName ? `${r.firstName} ${r.lastName}` : r.firstName,
      employeeNumber: r.employeeNumber ?? null,
      workEmail: r.workEmail,
      status: r.status,
      issues: r.issues,
      rawData: { ...r.rawData, _parsed: r },
    }));

    await this.repo.createImportRows(rowRecords);

    return {
      id: importId,
      fileName: file.fileName,
      fileFormat: file.fileFormat,
      fileSize: file.fileSize,
      totalRecords,
      validRecords,
      errorRecords,
      duplicateRecords,
      status: 'validated',
      options,
      rows: parsedRows.map((r) => ({
        rowNumber: r.rowNumber,
        employeeName: r.lastName ? `${r.firstName} ${r.lastName}` : r.firstName,
        employeeNumber: r.employeeNumber,
        workEmail: r.workEmail,
        department: r.department,
        designation: r.designation,
        workLocation: r.workLocation,
        status: r.status,
        issues: r.issues,
        rawData: r.rawData,
      })),
    };
  }

  /**
   * Processes the validated batch and creates employees in MySQL.
   */
  async processImport(
    tenantId: string,
    companyId: string,
    _userId: string | undefined,
    importId: string,
    optionsOverride?: ImportOptions,
  ): Promise<ProcessImportResult> {
    const importRecord = await this.repo.getImportById(tenantId, companyId, importId);
    if (!importRecord) {
      throw new NotFoundError(`Import batch '${importId}' not found.`);
    }

    if (importRecord.status === 'completed' || importRecord.status === 'processing') {
      throw new BadRequestError(`Import batch is already ${importRecord.status}.`);
    }

    const options: ImportOptions = {
      ...(importRecord.options ?? {}),
      ...(optionsOverride ?? {}),
    };

    await this.repo.updateImport(importId, { status: 'processing' });

    const rows = await this.repo.getImportRows(importId);
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      if (row.status === 'duplicate') {
        skippedCount++;
        await this.repo.updateImportRowStatus(row.id, 'skipped');
        continue;
      }

      if (row.status === 'error') {
        errorCount++;
        continue;
      }

      if (row.status === 'valid') {
        try {
          const rawParsed = (row.rawData as { _parsed?: ParsedEmployeeRow })?._parsed;
          if (!rawParsed) {
            throw new Error('Parsed employee payload missing');
          }

          let employeeNumber = rawParsed.employeeNumber;
          if (!employeeNumber || options.autoGenerateId) {
            const reserved = await workforceSettingsService.reserveNextEmployeeId(
              tenantId,
              companyId,
            );
            employeeNumber = reserved.nextId;
          }

          const empId = `emp_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
          await this.db.insert(employees).values({
            id: empId,
            tenantId,
            companyId,
            employeeNumber,
            firstName: rawParsed.firstName,
            lastName: rawParsed.lastName ?? null,
            email: rawParsed.workEmail,
            phone: rawParsed.phone ?? null,
            departmentId: rawParsed.departmentId ?? null,
            designationId: rawParsed.designationId ?? null,
            locationId: rawParsed.locationId ?? null,
            reportingManagerId: rawParsed.resolvedReportingManagerId ?? null,
            joiningDate: rawParsed.dateOfJoining,
            probationEndDate: rawParsed.probationEndDate ?? null,
            confirmationDate: rawParsed.confirmationDate ?? null,
            contractEndDate: rawParsed.contractEndDate ?? null,
            employmentType: rawParsed.employmentType as
              'full_time' | 'part_time' | 'contract' | 'intern',
            employmentStatus: rawParsed.employeeStatus as
              'active' | 'probation' | 'pending_activation',
          });

          // Insert Personal details if any provided
          if (
            rawParsed.middleName ||
            rawParsed.gender ||
            rawParsed.dateOfBirth ||
            rawParsed.personalEmail ||
            rawParsed.addressLine1 ||
            rawParsed.city ||
            rawParsed.country
          ) {
            await this.db.insert(employeePersonalDetails).values({
              employeeId: empId,
              tenantId,
              companyId,
              middleName: rawParsed.middleName ?? null,
              gender: rawParsed.gender ?? null,
              dateOfBirth: rawParsed.dateOfBirth ?? null,
              personalEmail: rawParsed.personalEmail ?? null,
              addressStreet: rawParsed.addressLine1 ?? null,
              addressLine2: rawParsed.addressLine2 ?? null,
              addressCity: rawParsed.city ?? null,
              addressState: rawParsed.state ?? null,
              addressCountry: rawParsed.country ?? null,
              addressPostalCode: rawParsed.postalCode ?? null,
            });
          }

          // Insert Emergency contact if provided
          if (rawParsed.emergencyContactName || rawParsed.emergencyContactPhone) {
            await this.db.insert(employeeEmergencyContacts).values({
              id: `emc_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
              tenantId,
              companyId,
              employeeId: empId,
              priority: 'primary',
              name: rawParsed.emergencyContactName ?? 'Emergency Contact',
              relationship: rawParsed.emergencyContactRelationship ?? 'Other',
              phone: rawParsed.emergencyContactPhone ?? '',
            });
          }

          importedCount++;
          await this.repo.updateImportRowStatus(row.id, 'imported');
        } catch {
          errorCount++;
          await this.repo.updateImportRowStatus(row.id, 'error');
        }
      }
    }

    const finalStatus = errorCount > 0 ? 'completed_with_errors' : 'completed';
    await this.repo.updateImport(importId, {
      importedRecords: importedCount,
      status: finalStatus,
      completedAt: new Date(),
    });

    return {
      importId,
      totalRecords: importRecord.totalRecords,
      importedRecords: importedCount,
      skippedRecords: skippedCount,
      errorRecords: errorCount,
      status: finalStatus,
      message: `Successfully processed import. ${importedCount} employees created.`,
    };
  }

  async getImportDetails(tenantId: string, companyId: string, importId: string) {
    const record = await this.repo.getImportById(tenantId, companyId, importId);
    if (!record) {
      throw new NotFoundError(`Import batch '${importId}' not found.`);
    }
    const rows = await this.repo.getImportRows(importId);
    return {
      ...record,
      rows: rows.map((r) => ({
        id: r.id,
        rowNumber: r.rowNumber,
        employeeName: r.employeeName,
        employeeNumber: r.employeeNumber,
        workEmail: r.workEmail,
        status: r.status,
        issues: r.issues,
        rawData: r.rawData,
      })),
    };
  }

  async listImports(tenantId: string, companyId: string) {
    return this.repo.listImports(tenantId, companyId);
  }

  async generateErrorReportCsv(
    tenantId: string,
    companyId: string,
    importId: string,
  ): Promise<string> {
    const record = await this.repo.getImportById(tenantId, companyId, importId);
    if (!record) {
      throw new NotFoundError(`Import batch '${importId}' not found.`);
    }

    const rows = await this.repo.getImportRows(importId);
    const issueRows = rows.filter(
      (r) => r.status === 'error' || r.status === 'duplicate' || r.status === 'skipped',
    );

    const headers = [
      'Row Number',
      'Employee ID',
      'Employee Name',
      'Work Email',
      'Status',
      'Category',
      'Field',
      'Issue',
    ];
    const lines: string[] = [headers.map((h) => `"${h}"`).join(',')];

    for (const row of issueRows) {
      const issues = (row.issues || []) as ImportIssue[];
      if (issues.length === 0) {
        lines.push(
          [
            row.rowNumber,
            row.employeeNumber || '',
            row.employeeName || '',
            row.workEmail || '',
            row.status,
            'duplicate',
            'Employee',
            'Skipped duplicate record',
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(','),
        );
      } else {
        for (const iss of issues) {
          lines.push(
            [
              row.rowNumber,
              row.employeeNumber || '',
              row.employeeName || '',
              row.workEmail || '',
              row.status,
              iss.category,
              iss.field,
              iss.message,
            ]
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(','),
          );
        }
      }
    }

    return lines.join('\n');
  }

  private normalizeHeader(header: string): string {
    const clean = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean.includes('employeenumber') || clean.includes('employeeid') || clean === 'empid')
      return 'employeeNumber';
    if (clean.includes('firstname')) return 'firstName';
    if (clean.includes('middlename')) return 'middleName';
    if (clean.includes('lastname')) return 'lastName';
    if (clean.includes('workemail') || clean === 'email' || clean === 'officialemail')
      return 'workEmail';
    if (clean.includes('personalemail')) return 'personalEmail';
    if (clean.includes('phone') || clean.includes('contactnumber') || clean.includes('mobile'))
      return 'phone';
    if (clean.includes('department')) return 'department';
    if (clean.includes('designation') || clean.includes('jobtitle')) return 'designation';
    if (
      clean.includes('worklocation') ||
      clean.includes('location') ||
      clean.includes('branch') ||
      clean.includes('office')
    )
      return 'workLocation';
    if (clean.includes('dateofjoining') || clean.includes('joiningdate') || clean.includes('doj'))
      return 'dateOfJoining';
    if (clean.includes('employmenttype')) return 'employmentType';
    if (clean.includes('employeestatus') || clean === 'status') return 'employeeStatus';
    if (clean.includes('gender')) return 'gender';
    if (clean.includes('dateofbirth') || clean === 'dob') return 'dateOfBirth';
    if (clean.includes('joblevel') || clean === 'grade') return 'jobLevel';
    if (
      clean.includes('reportingmanager') ||
      clean.includes('managerid') ||
      clean.includes('manager')
    )
      return 'reportingManagerId';
    if (clean.includes('probationstart')) return 'probationStartDate';
    if (clean.includes('probationend')) return 'probationEndDate';
    if (clean.includes('confirmationdate')) return 'confirmationDate';
    if (clean.includes('contractstart')) return 'contractStartDate';
    if (clean.includes('contractend')) return 'contractEndDate';
    if (clean.includes('addressline1') || clean.includes('address1') || clean.includes('street'))
      return 'addressLine1';
    if (clean.includes('addressline2') || clean.includes('address2')) return 'addressLine2';
    if (clean.includes('city')) return 'city';
    if (clean.includes('state')) return 'state';
    if (clean.includes('country')) return 'country';
    if (clean.includes('postalcode') || clean.includes('zip') || clean.includes('pincode'))
      return 'postalCode';
    if (clean.includes('emergencycontactname') || clean.includes('emergencyname'))
      return 'emergencyContactName';
    if (clean.includes('emergencycontactnumber') || clean.includes('emergencyphone'))
      return 'emergencyContactPhone';
    if (clean.includes('relationship')) return 'emergencyContactRelationship';
    if (clean.includes('skills')) return 'skills';
    if (clean.includes('notes') || clean.includes('remarks')) return 'notes';
    return clean;
  }

  private normalizeEmploymentType(raw: string): string {
    const val = raw.toLowerCase().replace(/[^a-z]/g, '');
    if (val.includes('part')) return 'part_time';
    if (val.includes('contract')) return 'contract';
    if (val.includes('intern')) return 'intern';
    return 'full_time';
  }

  private normalizeEmployeeStatus(raw: string): string {
    const val = raw.toLowerCase().replace(/[^a-z]/g, '');
    if (val.includes('probation')) return 'probation';
    if (val.includes('pending') || val.includes('activation')) return 'pending_activation';
    return 'active';
  }
}
