import type { MonthlySummaryRow } from '../types/attendanceMonthlySummary.types.js';

interface PdfGeneratorOptions {
  companyName: string;
  month: string;
  records: MonthlySummaryRow[];
}

/**
 * Escapes characters for PDF literal strings in parentheses.
 * Replaces non-printable or non-ASCII characters to keep Type 1 Helvetica safe.
 */
function escapePdfText(text: unknown): string {
  if (text === null || text === undefined) return '';
  const str = String(text)
    .replace(/[^\x20-\x7E]/g, ' ') // Only printable ASCII
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
  return str;
}

/**
 * Truncates text to a specified character length to avoid table overflow.
 */
function truncate(text: unknown, maxLen: number): string {
  const str = String(text ?? '');
  if (str.length <= maxLen) return escapePdfText(str);
  return escapePdfText(str.slice(0, maxLen - 1) + '.');
}

/**
 * Generates a valid, standards-compliant PDF-1.4 document buffer for
 * the Monthly Attendance Summary register without external dependencies.
 */
export function generateMonthlySummaryPdf(options: PdfGeneratorOptions): Buffer {
  const { companyName, month, records } = options;
  const rowsPerPage = 23;
  const totalPages = Math.max(1, Math.ceil(records.length / rowsPerPage));

  // PDF Page Dimensions (US Letter Landscape in PostScript points: 792 x 612)
  const pageWidth = 792;
  const pageHeight = 612;
  const marginLeft = 36;
  const marginRight = 36;
  const printableWidth = pageWidth - marginLeft - marginRight; // 720 pt

  // Column definitions: width total = 720 pt
  const cols = [
    { title: 'Code', width: 55, align: 'left' },
    { title: 'Employee Name', width: 110, align: 'left' },
    { title: 'Department', width: 75, align: 'left' },
    { title: 'Sched', width: 38, align: 'right' },
    { title: 'Pres', width: 38, align: 'right' },
    { title: 'Abs', width: 38, align: 'right' },
    { title: 'Leave', width: 38, align: 'right' },
    { title: 'OD', width: 35, align: 'right' },
    { title: 'Off/H', width: 42, align: 'right' },
    { title: 'Worked', width: 52, align: 'right' },
    { title: 'Credit', width: 52, align: 'right' },
    { title: 'Issues', width: 40, align: 'right' },
    { title: 'Review State', width: 57, align: 'center' },
    { title: 'Payroll', width: 50, align: 'center' },
  ];

  // We will build objects dynamically.
  // Object IDs:
  // 1: Catalog
  // 2: Pages
  // 3: Font Helvetica-Bold
  // 4: Font Helvetica
  // Pages will be: 5, 7, 9...
  // Content streams will be: 6, 8, 10...
  const fontBoldObjId = 3;
  const fontRegularObjId = 4;

  const pageObjIds: number[] = [];
  const contentStreams: string[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageNum = pageIdx + 1;
    const pageObjId = 5 + pageIdx * 2;
    pageObjIds.push(pageObjId);

    const pageRecords = records.slice(pageIdx * rowsPerPage, (pageIdx + 1) * rowsPerPage);

    let stream = '';

    // --- Header Section ---
    // Title
    stream += 'BT\n';
    stream += `/F1 15 Tf\n`;
    stream += `0.11 0.16 0.25 rg\n`; // Slate 900
    stream += `${marginLeft} ${pageHeight - 45} Td\n`;
    stream += `(BEZENT HRMS — Monthly Attendance Summary) Tj\n`;
    stream += 'ET\n';

    // Subtitle metadata
    stream += 'BT\n';
    stream += `/F2 9 Tf\n`;
    stream += `0.39 0.45 0.55 rg\n`; // Slate 500
    stream += `${marginLeft} ${pageHeight - 60} Td\n`;
    const genDate = new Date().toISOString().slice(0, 10);
    stream += `(Company: ${escapePdfText(companyName)}   |   Month: ${escapePdfText(month)}   |   Generated: ${genDate}   |   Total Records: ${records.length}) Tj\n`;
    stream += 'ET\n';

    // Top rule
    stream += `0.85 0.88 0.92 RG\n`;
    stream += `0.75 w\n`;
    stream += `${marginLeft} ${pageHeight - 68} m ${pageWidth - marginRight} ${pageHeight - 68} l S\n`;

    // --- Table Header Bar ---
    const tableHeaderY = pageHeight - 88;
    const tableHeaderHeight = 18;

    // Header background fill
    stream += `0.94 0.96 0.98 rg\n`; // Slate 100
    stream += `${marginLeft} ${tableHeaderY} ${printableWidth} ${tableHeaderHeight} re f\n`;

    // Header border
    stream += `0.80 0.84 0.88 RG\n`;
    stream += `0.5 w\n`;
    stream += `${marginLeft} ${tableHeaderY} ${printableWidth} ${tableHeaderHeight} re S\n`;

    // Header labels
    let curX = marginLeft;
    for (const col of cols) {
      stream += 'BT\n';
      stream += `/F1 7.5 Tf\n`;
      stream += `0.18 0.24 0.35 rg\n`;
      const textX =
        col.align === 'right'
          ? curX + col.width - 4
          : col.align === 'center'
            ? curX + col.width / 2 - 10
            : curX + 4;
      stream += `${textX} ${tableHeaderY + 5} Td\n`;
      stream += `(${escapePdfText(col.title)}) Tj\n`;
      stream += 'ET\n';
      curX += col.width;
    }

    // --- Table Data Rows ---
    const rowHeight = 17;
    let rowY = tableHeaderY - rowHeight;

    for (let rIdx = 0; rIdx < pageRecords.length; rIdx++) {
      const row = pageRecords[rIdx];
      if (!row) continue;
      const isEven = rIdx % 2 === 0;

      // Alternating row background
      if (!isEven) {
        stream += `0.98 0.99 1.00 rg\n`;
        stream += `${marginLeft} ${rowY} ${printableWidth} ${rowHeight} re f\n`;
      }

      // Bottom row divider line
      stream += `0.90 0.92 0.95 RG\n`;
      stream += `0.5 w\n`;
      stream += `${marginLeft} ${rowY} m ${pageWidth - marginRight} ${rowY} l S\n`;

      const values = [
        truncate(row.employeeCode, 10),
        truncate(row.employeeName, 20),
        truncate(row.departmentName, 14),
        String(row.scheduledDays ?? 0),
        String(Number(row.presentDays ?? 0).toFixed(1)),
        String(Number(row.absentDays ?? 0).toFixed(1)),
        String(Number(row.leaveDays ?? 0).toFixed(1)),
        String(Number(row.onDutyDays ?? 0).toFixed(1)),
        `${row.weeklyOffDays ?? 0}/${row.holidayDays ?? 0}`,
        `${row.actualWorkedHours ?? '0.0'}h`,
        `${row.policyCreditedHours ?? '0.0'}h`,
        String((row.unresolvedExceptions ?? 0) + (row.processingIssues ?? 0)),
        truncate(row.reviewState, 12),
        truncate(row.payrollReadiness, 10),
      ];

      curX = marginLeft;
      for (let cIdx = 0; cIdx < cols.length; cIdx++) {
        const col = cols[cIdx];
        if (!col) continue;
        const val = values[cIdx] ?? '';
        const isNumeric = col.align === 'right';

        stream += 'BT\n';
        stream += `/F2 7 Tf\n`;

        // Status coloring
        if (col.title === 'Review State' && val === 'reviewed') {
          stream += `0.06 0.52 0.28 rg\n`; // Green
        } else if (col.title === 'Review State' && val === 'needs_correction') {
          stream += `0.78 0.15 0.15 rg\n`; // Red
        } else if (col.title === 'Payroll' && val === 'ready') {
          stream += `0.06 0.52 0.28 rg\n`;
        } else if (col.title === 'Payroll' && val === 'blocked') {
          stream += `0.78 0.15 0.15 rg\n`;
        } else if (col.title === 'Issues' && Number(val) > 0) {
          stream += `0.78 0.15 0.15 rg\n`;
        } else {
          stream += `0.20 0.25 0.33 rg\n`; // Neutral text
        }

        const textX = isNumeric
          ? curX + col.width - 4
          : col.align === 'center'
            ? curX + col.width / 2 - 12
            : curX + 4;

        stream += `${textX} ${rowY + 5} Td\n`;
        stream += `(${val}) Tj\n`;
        stream += 'ET\n';

        curX += col.width;
      }

      rowY -= rowHeight;
    }

    // Outer table border
    const tableBottomY = rowY;
    const totalTableHeight = tableHeaderY + tableHeaderHeight - tableBottomY;
    stream += `0.80 0.84 0.88 RG\n`;
    stream += `0.5 w\n`;
    stream += `${marginLeft} ${tableBottomY} ${printableWidth} ${totalTableHeight} re S\n`;

    // --- Footer ---
    stream += `0.85 0.88 0.92 RG\n`;
    stream += `0.5 w\n`;
    stream += `${marginLeft} 32 m ${pageWidth - marginRight} 32 l S\n`;

    stream += 'BT\n';
    stream += `/F2 7.5 Tf\n`;
    stream += `0.45 0.50 0.60 rg\n`;
    stream += `${marginLeft} 20 Td\n`;
    stream += `(BEZENT Business Ecosystem Zentram • Attendance Monthly Register • Confidential) Tj\n`;
    stream += 'ET\n';

    stream += 'BT\n';
    stream += `/F2 7.5 Tf\n`;
    stream += `0.45 0.50 0.60 rg\n`;
    stream += `${pageWidth - marginRight - 55} 20 Td\n`;
    stream += `(Page ${pageNum} of ${totalPages}) Tj\n`;
    stream += 'ET\n';

    contentStreams.push(stream);
  }

  // --- Assembly of PDF Objects ---
  const objects: string[] = [];

  // Obj 1: Catalog
  objects.push(`1 0 obj\n<<\n  /Type /Catalog\n  /Pages 2 0 R\n>>\nendobj`);

  // Obj 2: Pages
  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
  objects.push(
    `2 0 obj\n<<\n  /Type /Pages\n  /Kids [${kidsStr}]\n  /Count ${totalPages}\n>>\nendobj`,
  );

  // Obj 3: Font Helvetica-Bold
  objects.push(
    `3 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica-Bold\n  /Encoding /WinAnsiEncoding\n>>\nendobj`,
  );

  // Obj 4: Font Helvetica
  objects.push(
    `4 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica\n  /Encoding /WinAnsiEncoding\n>>\nendobj`,
  );

  // Add Page and Content objects
  for (let i = 0; i < totalPages; i++) {
    const pageObjId = pageObjIds[i]!;
    const contentObjId = pageObjId + 1;
    const streamContent = contentStreams[i] ?? '';
    const streamBuffer = Buffer.from(streamContent, 'utf-8');

    // Page object
    objects.push(
      `${pageObjId} 0 obj\n<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 ${pageWidth} ${pageHeight}]\n  /Resources <<\n    /Font <<\n      /F1 ${fontBoldObjId} 0 R\n      /F2 ${fontRegularObjId} 0 R\n    >>\n  >>\n  /Contents ${contentObjId} 0 R\n>>\nendobj`,
    );

    // Content Stream object
    objects.push(
      `${contentObjId} 0 obj\n<<\n  /Length ${streamBuffer.length}\n>>\nstream\n${streamContent}\nendstream\nendobj`,
    );
  }

  // Build the complete file with XRef table
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  let body = header;
  const offsets: number[] = [];

  // obj 0 dummy
  offsets.push(0);

  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(body, 'utf-8'));
    body += objects[i] + '\n';
  }

  const xrefOffset = Buffer.byteLength(body, 'utf-8');
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let i = 1; i <= objects.length; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    xref += `${offStr} 00000 n \n`;
  }

  const trailer = `trailer\n<<\n  /Size ${objects.length + 1}\n  /Root 1 0 R\n>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(body + xref + trailer, 'utf-8');
}
