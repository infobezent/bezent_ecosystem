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

  it('updates Instructions-sheet description for Reporting Manager ID per Amendment 4', async () => {
    const mockOrgRepo = {
      getMasters: vi.fn().mockResolvedValue({
        departments: [],
        designations: [],
        locations: [],
        companies: [],
      }),
    };
    const tService = new EmployeeTemplateService(mockOrgRepo as any);
    const workbook = await tService.generateWorkbook('tenant_1', 'comp_1', 'complete');
    const instructionsSheet = workbook.getWorksheet('Instructions');
    expect(instructionsSheet).toBeDefined();

    let foundReportingManagerDesc = false;
    instructionsSheet!.eachRow((row) => {
      const values = row.values as string[];
      if (values && values.includes('Reporting Manager ID')) {
        expect(values).toContain('Employee ID already in BEZENT, or listed in this same file');
        foundReportingManagerDesc = true;
      }
    });
    expect(foundReportingManagerDesc).toBe(true);
  });

  it('validates in-file reporting manager successfully when manager is in the same file', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    importService = new EmployeeImportService(mockRepo as any, mockDb as any);

    const csvContent = [
      'Employee ID,First Name,Last Name,Work Email,Date of Joining,Employment Type,Reporting Manager ID',
      'EMP-001,Rajesh,Manager,rajesh@example.com,2025-01-01,Full-Time,',
      'EMP-002,Sunil,Developer,sunil@example.com,2025-02-01,Full-Time,EMP-001',
    ].join('\n');

    const summary = await importService.validateImportFile('tenant_1', 'comp_1', 'user_1', {
      fileName: 'infile_manager.csv',
      fileFormat: 'csv',
      fileSize: Buffer.byteLength(csvContent),
      buffer: Buffer.from(csvContent),
    });

    expect(summary.totalRecords).toBe(2);
    expect(summary.validRecords).toBe(2);
    expect(summary.errorRecords).toBe(0);
    expect(summary.rows[1]?.issues.length).toBe(0);
  });

  it('rejects row when reporting manager is in neither the file nor the DB', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    importService = new EmployeeImportService(mockRepo as any, mockDb as any);

    const csvContent = [
      'Employee ID,First Name,Last Name,Work Email,Date of Joining,Employment Type,Reporting Manager ID',
      'EMP-002,Sunil,Developer,sunil@example.com,2025-02-01,Full-Time,EMP-999',
    ].join('\n');

    const summary = await importService.validateImportFile('tenant_1', 'comp_1', 'user_1', {
      fileName: 'missing_manager.csv',
      fileFormat: 'csv',
      fileSize: Buffer.byteLength(csvContent),
      buffer: Buffer.from(csvContent),
    });

    expect(summary.validRecords).toBe(0);
    expect(summary.errorRecords).toBe(1);
    const errorIssue = summary.rows[0]?.issues.find((i) => i.field === 'Reporting Manager ID');
    expect(errorIssue?.message).toBe("Reporting manager 'EMP-999' not found.");
  });

  it('rejects an employee set as their own reporting manager', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    importService = new EmployeeImportService(mockRepo as any, mockDb as any);

    const csvContent = [
      'Employee ID,First Name,Last Name,Work Email,Date of Joining,Employment Type,Reporting Manager ID',
      'EMP-001,Rajesh,Self,rajesh@example.com,2025-01-01,Full-Time,EMP-001',
    ].join('\n');

    const summary = await importService.validateImportFile('tenant_1', 'comp_1', 'user_1', {
      fileName: 'self_manager.csv',
      fileFormat: 'csv',
      fileSize: Buffer.byteLength(csvContent),
      buffer: Buffer.from(csvContent),
    });

    expect(summary.validRecords).toBe(0);
    expect(summary.errorRecords).toBe(1);
    const errorIssue = summary.rows[0]?.issues.find((i) => i.field === 'Reporting Manager ID');
    expect(errorIssue?.message).toBe('An employee cannot be their own reporting manager.');
  });

  it('detects and rejects circular reporting chains (A -> B -> A)', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    importService = new EmployeeImportService(mockRepo as any, mockDb as any);

    const csvContent = [
      'Employee ID,First Name,Last Name,Work Email,Date of Joining,Employment Type,Reporting Manager ID',
      'EMP-001,Rajesh,One,rajesh@example.com,2025-01-01,Full-Time,EMP-002',
      'EMP-002,Sunil,Two,sunil@example.com,2025-01-01,Full-Time,EMP-001',
    ].join('\n');

    const summary = await importService.validateImportFile('tenant_1', 'comp_1', 'user_1', {
      fileName: 'circular.csv',
      fileFormat: 'csv',
      fileSize: Buffer.byteLength(csvContent),
      buffer: Buffer.from(csvContent),
    });

    expect(summary.validRecords).toBe(0);
    expect(summary.errorRecords).toBe(2);

    const row1Issue = summary.rows[0]?.issues.find((i) => i.field === 'Reporting Manager ID');
    const row2Issue = summary.rows[1]?.issues.find((i) => i.field === 'Reporting Manager ID');
    expect(row1Issue?.message).toContain('Circular reporting chain detected');
    expect(row2Issue?.message).toContain('Circular reporting chain detected');
  });

  it('propagates manager row validation failure to dependents as "Reporting manager row N failed validation"', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    importService = new EmployeeImportService(mockRepo as any, mockDb as any);

    // Row 2 (EMP-001) has invalid email format, so it fails validation
    // Row 3 (EMP-002) reports to EMP-001
    const csvContent = [
      'Employee ID,First Name,Last Name,Work Email,Date of Joining,Employment Type,Reporting Manager ID',
      'EMP-001,Rajesh,Manager,invalid-email,2025-01-01,Full-Time,',
      'EMP-002,Sunil,Report,sunil@example.com,2025-01-01,Full-Time,EMP-001',
    ].join('\n');

    const summary = await importService.validateImportFile('tenant_1', 'comp_1', 'user_1', {
      fileName: 'propagated_failure.csv',
      fileFormat: 'csv',
      fileSize: Buffer.byteLength(csvContent),
      buffer: Buffer.from(csvContent),
    });

    expect(summary.validRecords).toBe(0);
    expect(summary.errorRecords).toBe(2);

    const reportRow = summary.rows[1];
    const mgrIssue = reportRow?.issues.find((i) => i.field === 'Reporting Manager ID');
    expect(mgrIssue).toBeDefined();
    expect(mgrIssue?.message).toBe('Reporting manager row 2 failed validation.');
  });

  it('rejects a file Employee ID that already exists in DB as duplicate per Amendment 3', async () => {
    const existingDbEmployees = [
      { id: 'emp_existing_1', employeeNumber: 'EMP-EXISTING-001', email: 'db@example.com' },
    ];
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(existingDbEmployees),
        }),
      }),
    };
    importService = new EmployeeImportService(mockRepo as any, mockDb as any);

    const csvContent = [
      'Employee ID,First Name,Last Name,Work Email,Date of Joining,Employment Type',
      'EMP-EXISTING-001,New,Person,new.person@example.com,2026-01-01,Full-Time',
    ].join('\n');

    const summary = await importService.validateImportFile('tenant_1', 'comp_1', 'user_1', {
      fileName: 'existing_db_duplicate.csv',
      fileFormat: 'csv',
      fileSize: Buffer.byteLength(csvContent),
      buffer: Buffer.from(csvContent),
    });

    expect(summary.validRecords).toBe(0);
    expect(summary.duplicateRecords).toBe(1);
    const dupRow = summary.rows[0];
    const dupIssue = dupRow?.issues.find((i) => i.field === 'Employee ID');
    expect(dupIssue?.category).toBe('duplicate');
    expect(dupIssue?.message).toBe('Employee with this ID already exists.');
  });

  it('resolves in-file manager across batches and links correctly in processImport', async () => {
    // Simulate DB where updates can be tracked
    const insertedEmployees: any[] = [];
    const updatedEmployees = new Map<string, any>();

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((val) => {
          insertedEmployees.push(val);
          return Promise.resolve();
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((setVals) => ({
          where: vi.fn().mockImplementation(() => {
            // track update
            return Promise.resolve();
          }),
        })),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    // Create 60 rows to ensure crossing the BATCH_SIZE (50) boundary
    const mockImportRows: any[] = [];

    // Row 1: Manager in Batch 1
    mockImportRows.push({
      id: 'row_1',
      importId: 'imp_1',
      rowNumber: 2,
      status: 'valid' as const,
      rawData: {
        _parsed: {
          employeeNumber: 'EMP-MGR-01',
          firstName: 'Batch1',
          lastName: 'Manager',
          workEmail: 'mgr1@example.com',
          dateOfJoining: '2025-01-01',
          employmentType: 'full_time',
          employeeStatus: 'active',
          hierarchyDepth: 0,
        },
      },
    });

    // Rows 2..50: In batch 1
    for (let i = 2; i <= 50; i++) {
      mockImportRows.push({
        id: `row_${i}`,
        importId: 'imp_1',
        rowNumber: i + 1,
        status: 'valid' as const,
        rawData: {
          _parsed: {
            employeeNumber: `EMP-${i.toString().padStart(3, '0')}`,
            firstName: `Worker${i}`,
            workEmail: `worker${i}@example.com`,
            dateOfJoining: '2025-01-01',
            employmentType: 'full_time',
            employeeStatus: 'active',
            hierarchyDepth: 1,
            reportingManagerId: 'EMP-MGR-01',
          },
        },
      });
    }

    // Rows 51..60: In batch 2, also reporting to EMP-MGR-01 (who is in Batch 1)
    for (let i = 51; i <= 60; i++) {
      mockImportRows.push({
        id: `row_${i}`,
        importId: 'imp_1',
        rowNumber: i + 1,
        status: 'valid' as const,
        rawData: {
          _parsed: {
            employeeNumber: `EMP-${i.toString().padStart(3, '0')}`,
            firstName: `Worker${i}`,
            workEmail: `worker${i}@example.com`,
            dateOfJoining: '2025-01-01',
            employmentType: 'full_time',
            employeeStatus: 'active',
            hierarchyDepth: 1,
            reportingManagerId: 'EMP-MGR-01',
          },
        },
      });
    }

    const customRepo: Partial<EmployeeImportRepository> = {
      ...mockRepo,
      getImportById: vi.fn().mockResolvedValue({
        id: 'imp_1',
        status: 'validated',
        totalRecords: 60,
        options: {},
      }),
      getImportRows: vi.fn().mockResolvedValue(mockImportRows),
      updateImport: vi.fn().mockResolvedValue(undefined),
      updateImportRowStatus: vi.fn().mockResolvedValue(undefined),
    };

    const service = new EmployeeImportService(customRepo as any, mockDb as any);
    const res = await service.processImport('tenant_1', 'comp_1', 'user_1', 'imp_1');

    expect(res.importedRecords).toBe(60);
    expect(res.errorRecords).toBe(0);
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('validates 100-row file with 4 reporting levels with 0 manager errors', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    importService = new EmployeeImportService(mockRepo as any, mockDb as any);

    const rows: string[] = [
      'Employee ID,First Name,Last Name,Work Email,Date of Joining,Employment Type,Reporting Manager ID',
    ];

    // Level 1: CEO
    rows.push('EMP-100,Boss,CEO,ceo@example.com,2024-01-01,Full-Time,');

    // Level 2: 4 Directors reporting to CEO
    for (let d = 1; d <= 4; d++) {
      rows.push(`EMP-20${d},Director,${d},dir${d}@example.com,2024-02-01,Full-Time,EMP-100`);
    }

    // Level 3: 15 Managers reporting to Directors (spread across directors)
    for (let m = 1; m <= 15; m++) {
      const dirId = `EMP-20${((m - 1) % 4) + 1}`;
      rows.push(
        `EMP-3${m.toString().padStart(2, '0')},Manager,${m},mgr${m}@example.com,2024-03-01,Full-Time,${dirId}`,
      );
    }

    // Level 4: 80 ICs reporting to Managers (spread across managers)
    for (let ic = 1; ic <= 80; ic++) {
      const mgrId = `EMP-3${(((ic - 1) % 15) + 1).toString().padStart(2, '0')}`;
      rows.push(
        `EMP-4${ic.toString().padStart(2, '0')},IC,${ic},ic${ic}@example.com,2024-04-01,Full-Time,${mgrId}`,
      );
    }

    expect(rows.length).toBe(101); // 1 header + 100 employee rows

    const csvContent = rows.join('\n');
    const summary = await importService.validateImportFile('tenant_1', 'comp_1', 'user_1', {
      fileName: '100_rows_4_levels.csv',
      fileFormat: 'csv',
      fileSize: Buffer.byteLength(csvContent),
      buffer: Buffer.from(csvContent),
    });

    expect(summary.totalRecords).toBe(100);
    expect(summary.validRecords).toBe(100);
    expect(summary.errorRecords).toBe(0);
    expect(summary.duplicateRecords).toBe(0);

    const allIssues = summary.rows.flatMap((r) => r.issues);
    expect(allIssues.length).toBe(0);
  });
});
