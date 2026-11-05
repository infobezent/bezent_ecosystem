import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';
import { EmployeeTemplateService } from '../service/employeeTemplate.service.js';
import { EmployeeImportService } from '../service/employeeImport.service.js';
import type { EmployeeImportRepository } from '../repository/employeeImport.repository.js';
import { BadRequestError } from '../../../../../app/errors/AppError.js';

describe('EmployeeTemplateService', () => {
  let templateService: EmployeeTemplateService;
  const mockOrgRepo = {
    getMasters: vi.fn().mockResolvedValue({
      departments: [{ id: 'dept_1', name: 'Engineering', code: 'ENG' }],
      designations: [{ id: 'desig_1', name: 'Software Engineer', code: 'SE' }],
      locations: [{ id: 'loc_1', name: 'Main Campus', code: 'MC' }],
      companies: [{ id: 'comp_1', name: 'BEZENT Inc', code: 'BZ' }],
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    templateService = new EmployeeTemplateService(mockOrgRepo as any);
  });

  it('generates a 3-sheet Basic Excel template workbook', async () => {
    const workbook = await templateService.generateWorkbook('tenant_1', 'comp_1', 'basic');
    expect(workbook.worksheets.length).toBe(3);

    const sheet1 = workbook.getWorksheet('Employee Data');
    const sheet2 = workbook.getWorksheet('Instructions');
    const sheet3 = workbook.getWorksheet('Reference Data');

    expect(sheet1).toBeDefined();
    expect(sheet2).toBeDefined();
    expect(sheet3).toBeDefined();

    // Check Sheet 1 headers
    const row1 = sheet1!.getRow(1);
    const headers = row1.values as string[];
    expect(headers).toContain('First Name');
    expect(headers).toContain('Work Email');
    expect(headers).toContain('Date of Joining');
    expect(headers).toContain('Employment Type');

    // Check Sheet 3 reference data contains Engineering and Main Campus
    const deptCell = sheet3!.getCell('A2').value;
    expect(deptCell).toBe('Engineering');
  });

  it('generates CSV string for Basic template', async () => {
    const csv = await templateService.generateCsv('tenant_1', 'comp_1', 'basic');
    expect(csv).toContain('"First Name"');
    expect(csv).toContain('"Work Email"');
    expect(csv).toContain('"Arun"');
  });

  it('generates a Complete template with 36 columns', async () => {
    const workbook = await templateService.generateWorkbook('tenant_1', 'comp_1', 'complete');
    const sheet1 = workbook.getWorksheet('Employee Data');
    expect(sheet1).toBeDefined();
    expect(sheet1!.columns.length).toBeGreaterThan(30);
  });
});

describe('EmployeeImportService Validation & Processing', () => {
  let importService: EmployeeImportService;
  let mockRepo: Partial<EmployeeImportRepository>;

  beforeEach(() => {
    mockRepo = {
      createImport: vi
        .fn()
        .mockImplementation((data) => Promise.resolve({ ...data, createdAt: new Date() })),
      getImportById: vi.fn(),
      updateImport: vi.fn().mockResolvedValue(undefined),
      createImportRows: vi.fn().mockResolvedValue(undefined),
      getImportRows: vi.fn().mockResolvedValue([]),
      updateImportRowStatus: vi.fn().mockResolvedValue(undefined),
      listImports: vi.fn().mockResolvedValue([]),
    };
    importService = new EmployeeImportService(mockRepo as any);
  });

  it('rejects files larger than 10MB', async () => {
    const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024);
    await expect(
      importService.validateImportFile('tenant_1', 'comp_1', 'user_1', {
        fileName: 'oversized.xlsx',
        fileFormat: 'xlsx',
        fileSize: 11 * 1024 * 1024,
        buffer: oversizedBuffer,
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('rejects empty files or invalid workbooks', async () => {
    const emptyBuffer = Buffer.from('');
    await expect(
      importService.validateImportFile('tenant_1', 'comp_1', 'user_1', {
        fileName: 'empty.xlsx',
        fileFormat: 'xlsx',
        fileSize: 0,
        buffer: emptyBuffer,
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('validates CSV buffer with valid and invalid employee rows', async () => {
    // Mock db queries
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    importService = new EmployeeImportService(mockRepo as any, mockDb as any);

    const csvContent = [
      'First Name,Last Name,Work Email,Phone Number,Date of Joining,Employment Type',
      'Arun,Kumar,arun.kumar@example.com,+919876543210,2026-01-15,Full-Time',
      ',Sharma,bad-email,+919876543211,invalid-date,Full-Time',
    ].join('\n');

    const summary = await importService.validateImportFile('tenant_1', 'comp_1', 'user_1', {
      fileName: 'test.csv',
      fileFormat: 'csv',
      fileSize: Buffer.byteLength(csvContent),
      buffer: Buffer.from(csvContent),
    });

    expect(summary.totalRecords).toBe(2);
    expect(summary.validRecords).toBe(1);
    expect(summary.errorRecords).toBe(1);

    const errorRow = summary.rows.find((r) => r.status === 'error');
    expect(errorRow).toBeDefined();
    expect(errorRow?.issues.some((i) => i.field === 'First Name')).toBe(true);
    expect(errorRow?.issues.some((i) => i.field === 'Work Email')).toBe(true);
    expect(errorRow?.issues.some((i) => i.field === 'Date of Joining')).toBe(true);
  });

  it('detects duplicate emails within the file', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    importService = new EmployeeImportService(mockRepo as any, mockDb as any);

    const csvContent = [
      'First Name,Last Name,Work Email,Date of Joining,Employment Type',
      'Arun,Kumar,duplicate@example.com,2026-01-15,Full-Time',
      'Priya,Singh,duplicate@example.com,2026-01-15,Full-Time',
    ].join('\n');

    const summary = await importService.validateImportFile('tenant_1', 'comp_1', 'user_1', {
      fileName: 'duplicates.csv',
      fileFormat: 'csv',
      fileSize: Buffer.byteLength(csvContent),
      buffer: Buffer.from(csvContent),
    });

    expect(summary.totalRecords).toBe(2);
    expect(summary.validRecords).toBe(1);
    expect(summary.duplicateRecords).toBe(1);

    const dupRow = summary.rows.find((r) => r.status === 'duplicate');
    expect(dupRow).toBeDefined();
    expect(dupRow?.issues[0]?.category).toBe('duplicate');
  });
});
