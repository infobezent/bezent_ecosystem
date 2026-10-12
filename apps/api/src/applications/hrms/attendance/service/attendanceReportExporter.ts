import type {
  ReportColumnDefinition,
  ReportDefinition,
  ReportAnalyticsResult,
} from '../types/attendanceReports.types.js';

/**
 * Formula injection protection:
 * Ensures cells starting with =, +, -, @, \t, \r are escaped by prefixing a single quote.
 */
export function sanitizeFormula(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Escapes CSV values and wraps in quotes if needed.
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const sanitized = sanitizeFormula(val);
  const escaped = sanitized.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generate CSV buffer with formula protection and UTF-8 BOM.
 */
export function generateCsvExport(
  reportDef: ReportDefinition,
  columns: ReportColumnDefinition[],
  rows: Record<string, unknown>[],
  metadata: {
    companyName: string;
    generatedAt: string;
    timezone: string;
    appliedFilters: Record<string, unknown>;
  },
): Buffer {
  const lines: string[] = [];

  // Report metadata headers
  lines.push(`"BEZENT HRMS — ${reportDef.name}"`);
  lines.push(`"Company: ${metadata.companyName}"`);
  lines.push(`"Generated At: ${metadata.generatedAt} (${metadata.timezone})"`);
  const filterSummary = Object.entries(metadata.appliedFilters)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  if (filterSummary) {
    lines.push(`"Filters: ${filterSummary}"`);
  }
  lines.push('""'); // Empty line

  // Column Headers
  const headerRow = columns.map((c) => escapeCsvValue(c.label)).join(',');
  lines.push(headerRow);

  // Data Rows
  for (const row of rows) {
    const rowValues = columns.map((c) => {
      const val = row[c.id];
      return escapeCsvValue(val);
    });
    lines.push(rowValues.join(','));
  }

  // Prepend UTF-8 BOM so Excel decodes characters properly
  const bom = '\uFEFF';
  return Buffer.from(bom + lines.join('\r\n'), 'utf-8');
}

/**
 * Escape XML special characters.
 */
function escapeXml(str: unknown): string {
  if (str === null || str === undefined) return '';
  const sanitized = sanitizeFormula(str);
  return sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate Excel XML (SpreadsheetML 2003) workbook buffer.
 * Compatible with Microsoft Excel, Apple Numbers, Google Sheets, LibreOffice Calc.
 */
export function generateExcelExport(
  reportDef: ReportDefinition,
  columns: ReportColumnDefinition[],
  rows: Record<string, unknown>[],
  metadata: {
    companyName: string;
    generatedAt: string;
    timezone: string;
    appliedFilters: Record<string, unknown>;
  },
): Buffer {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#0F172A"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Meta">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
   </Borders>
  </Style>
  <Style ss:ID="DataLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(reportDef.code)}">
  <Table ss:DefaultRowHeight="20">
`;

  // Define column widths
  for (const col of columns) {
    const width = Math.max(70, col.width ?? 100);
    xml += `   <Column ss:Width="${width}"/>\n`;
  }

  // Title Row
  xml += `   <Row ss:Height="28">\n`;
  xml += `    <Cell ss:StyleID="Title" ss:MergeAcross="${Math.max(0, columns.length - 1)}"><Data ss:Type="String">BEZENT HRMS — ${escapeXml(reportDef.name)}</Data></Cell>\n`;
  xml += `   </Row>\n`;

  // Company and Date Row
  xml += `   <Row ss:Height="18">\n`;
  xml += `    <Cell ss:StyleID="Meta" ss:MergeAcross="${Math.max(0, columns.length - 1)}"><Data ss:Type="String">Company: ${escapeXml(metadata.companyName)} | Generated At: ${escapeXml(metadata.generatedAt)} (${escapeXml(metadata.timezone)})</Data></Cell>\n`;
  xml += `   </Row>\n`;

  // Filter Row
  const filterSummary = Object.entries(metadata.appliedFilters)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  if (filterSummary) {
    xml += `   <Row ss:Height="18">\n`;
    xml += `    <Cell ss:StyleID="Meta" ss:MergeAcross="${Math.max(0, columns.length - 1)}"><Data ss:Type="String">Filters: ${escapeXml(filterSummary)}</Data></Cell>\n`;
    xml += `   </Row>\n`;
  }

  // Blank row separator
  xml += `   <Row ss:Height="10"/>\n`;

  // Header Row
  xml += `   <Row ss:Height="24">\n`;
  for (const col of columns) {
    xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(col.label)}</Data></Cell>\n`;
  }
  xml += `   </Row>\n`;

  // Data Rows
  for (const row of rows) {
    xml += `   <Row ss:Height="20">\n`;
    for (const col of columns) {
      const val = row[col.id];
      const isNum = typeof val === 'number';
      const cellStyle = col.align === 'right' ? 'DataRight' : col.align === 'center' ? 'DataCenter' : 'DataLeft';

      if (isNum) {
        xml += `    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="Number">${val}</Data></Cell>\n`;
      } else {
        xml += `    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(val ?? '')}</Data></Cell>\n`;
      }
    }
    xml += `   </Row>\n`;
  }

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  return Buffer.from(xml, 'utf-8');
}

/**
 * Escapes characters for PDF literal strings in parentheses.
 */
function escapePdfText(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function truncatePdfText(text: unknown, maxLen: number): string {
  const str = String(text ?? '');
  if (str.length <= maxLen) return escapePdfText(str);
  return escapePdfText(str.slice(0, Math.max(1, maxLen - 1)) + '.');
}

function buildAnalyticsPdfPage(
  reportDef: ReportDefinition,
  metadata: {
    companyName: string;
    generatedAt: string;
    timezone: string;
    appliedFilters: Record<string, unknown>;
  },
  analytics: ReportAnalyticsResult,
  pageNum: number,
  totalPages: number,
  pageWidth: number,
  pageHeight: number,
  marginLeft: number,
  marginRight: number,
  printableWidth: number,
): string {
  let stream = '';

  // Header Title
  stream += 'BT\n/F1 15 Tf\n0.09 0.13 0.22 rg\n';
  stream += `${marginLeft} ${pageHeight - 40} Td\n`;
  stream += `(${escapePdfText(`BEZENT HRMS — ${reportDef.name} — Executive Visual Analytics`)}) Tj\nET\n`;

  // Subtitle
  stream += 'BT\n/F2 8.5 Tf\n0.35 0.40 0.50 rg\n';
  stream += `${marginLeft} ${pageHeight - 54} Td\n`;
  const metaLine = `Company: ${metadata.companyName} | Generated: ${metadata.generatedAt} (${metadata.timezone}) | Total Evaluated Dataset: ${analytics.totalDatasetRows} rows`;
  stream += `(${truncatePdfText(metaLine, 130)}) Tj\nET\n`;

  // Decorative line
  stream += `0.80 0.84 0.90 RG\n0.75 w\n`;
  stream += `${marginLeft} ${pageHeight - 64} m ${pageWidth - marginRight} ${pageHeight - 64} l S\n`;

  // Section 1: KPI Cards
  const kpiTop = pageHeight - 84;
  stream += 'BT\n/F1 11 Tf\n0.15 0.20 0.30 rg\n';
  stream += `${marginLeft} ${kpiTop} Td\n`;
  stream += `(1. EXECUTIVE KEY PERFORMANCE INDICATORS) Tj\nET\n`;

  const kpis = analytics.kpis.slice(0, 5);
  const cardGap = 12;
  const numCards = Math.max(1, kpis.length);
  const cardWidth = Math.floor((printableWidth - (numCards - 1) * cardGap) / numCards);
  const cardHeight = 52;
  const cardY = kpiTop - 12 - cardHeight;

  for (let i = 0; i < kpis.length; i++) {
    const kpi = kpis[i]!;
    const cardX = marginLeft + i * (cardWidth + cardGap);

    // Card background
    stream += `0.96 0.97 0.99 rg\n`;
    stream += `${cardX} ${cardY} ${cardWidth} ${cardHeight} re f\n`;

    // Card border
    stream += `0.85 0.88 0.92 RG\n0.75 w\n`;
    stream += `${cardX} ${cardY} ${cardWidth} ${cardHeight} re S\n`;

    // Top accent line
    stream += `0.20 0.45 0.85 RG\n2 w\n`;
    stream += `${cardX} ${cardY + cardHeight} m ${cardX + cardWidth} ${cardY + cardHeight} l S\n`;

    // KPI Value
    stream += 'BT\n/F1 14 Tf\n0.09 0.13 0.22 rg\n';
    stream += `${cardX + 8} ${cardY + 28} Td\n`;
    stream += `(${escapePdfText(String(kpi.value))}) Tj\nET\n`;

    // KPI Label
    stream += 'BT\n/F2 8 Tf\n0.40 0.45 0.55 rg\n';
    stream += `${cardX + 8} ${cardY + 12} Td\n`;
    stream += `(${truncatePdfText(kpi.label, Math.floor(cardWidth / 5.5))}) Tj\nET\n`;
  }

  // Section 2: Breakdown & Distribution Tables
  const distTop = cardY - 26;
  stream += 'BT\n/F1 11 Tf\n0.15 0.20 0.30 rg\n';
  stream += `${marginLeft} ${distTop} Td\n`;
  stream += `(2. CATEGORY BREAKDOWN & METRIC DISTRIBUTIONS) Tj\nET\n`;

  const colWidth = Math.floor(printableWidth / 2) - 10;
  const leftTableX = marginLeft;
  const rightTableX = marginLeft + colWidth + 20;
  const tableY = distTop - 14;

  // Left side: Status Distribution
  const slices = analytics.charts.statusDistribution?.slices || [];
  if (slices.length > 0) {
    stream += 'BT\n/F1 9 Tf\n0.20 0.25 0.35 rg\n';
    stream += `${leftTableX} ${tableY} Td\n`;
    stream += `(${escapePdfText(analytics.charts.statusDistribution?.title || 'Distribution')}) Tj\nET\n`;

    const rowH = 16;
    let currY = tableY - 18;
    stream += `0.11 0.16 0.25 rg\n`;
    stream += `${leftTableX} ${currY} ${colWidth} ${rowH} re f\n`;

    stream += 'BT\n/F1 8 Tf\n1 1 1 rg\n';
    stream += `${leftTableX + 6} ${currY + 5} Td\n(Category) Tj\nET\n`;

    stream += 'BT\n/F1 8 Tf\n1 1 1 rg\n';
    stream += `${leftTableX + colWidth - 85} ${currY + 5} Td\n(Count) Tj\nET\n`;

    stream += 'BT\n/F1 8 Tf\n1 1 1 rg\n';
    stream += `${leftTableX + colWidth - 35} ${currY + 5} Td\n(Share) Tj\nET\n`;

    const totalSliceVal = slices.reduce((sum, s) => sum + s.value, 0);

    for (let sIdx = 0; sIdx < Math.min(8, slices.length); sIdx++) {
      currY -= rowH;
      const s = slices[sIdx]!;
      const pct = totalSliceVal > 0 ? `${((s.value / totalSliceVal) * 100).toFixed(1)}%` : '0%';

      if (sIdx % 2 === 1) {
        stream += `0.97 0.98 0.99 rg\n`;
        stream += `${leftTableX} ${currY} ${colWidth} ${rowH} re f\n`;
      }
      stream += `0.90 0.92 0.95 RG\n0.5 w\n`;
      stream += `${leftTableX} ${currY} m ${leftTableX + colWidth} ${currY} l S\n`;

      stream += 'BT\n/F2 8 Tf\n0.15 0.20 0.28 rg\n';
      stream += `${leftTableX + 6} ${currY + 4} Td\n`;
      stream += `(${truncatePdfText(s.label, 28)}) Tj\nET\n`;

      stream += 'BT\n/F2 8 Tf\n0.15 0.20 0.28 rg\n';
      stream += `${leftTableX + colWidth - 85} ${currY + 4} Td\n`;
      stream += `(${s.value}) Tj\nET\n`;

      stream += 'BT\n/F1 8 Tf\n0.20 0.45 0.85 rg\n';
      stream += `${leftTableX + colWidth - 35} ${currY + 4} Td\n`;
      stream += `(${pct}) Tj\nET\n`;
    }
  }

  // Right side: Comparison or Composition
  const comp = analytics.charts.departmentComparison || analytics.charts.comparisonOrComposition;
  if (comp && comp.categories && comp.categories.length > 0) {
    stream += 'BT\n/F1 9 Tf\n0.20 0.25 0.35 rg\n';
    stream += `${rightTableX} ${tableY} Td\n`;
    stream += `(${escapePdfText(comp.title || 'Department Comparison')}) Tj\nET\n`;

    const rowH = 16;
    let currY = tableY - 18;
    stream += `0.11 0.16 0.25 rg\n`;
    stream += `${rightTableX} ${currY} ${colWidth} ${rowH} re f\n`;

    stream += 'BT\n/F1 8 Tf\n1 1 1 rg\n';
    stream += `${rightTableX + 6} ${currY + 5} Td\n(Segment) Tj\nET\n`;

    const seriesName = comp.series?.[0]?.name || 'Metric';
    stream += 'BT\n/F1 8 Tf\n1 1 1 rg\n';
    stream += `${rightTableX + colWidth - 65} ${currY + 5} Td\n(${escapePdfText(truncatePdfText(seriesName, 12))}) Tj\nET\n`;

    for (let cIdx = 0; cIdx < Math.min(8, comp.categories.length); cIdx++) {
      currY -= rowH;
      const cat = comp.categories[cIdx]!;
      const val = comp.series?.[0]?.values?.[cIdx] ?? 0;

      if (cIdx % 2 === 1) {
        stream += `0.97 0.98 0.99 rg\n`;
        stream += `${rightTableX} ${currY} ${colWidth} ${rowH} re f\n`;
      }
      stream += `0.90 0.92 0.95 RG\n0.5 w\n`;
      stream += `${rightTableX} ${currY} m ${rightTableX + colWidth} ${currY} l S\n`;

      stream += 'BT\n/F2 8 Tf\n0.15 0.20 0.28 rg\n';
      stream += `${rightTableX + 6} ${currY + 4} Td\n`;
      stream += `(${truncatePdfText(cat, 28)}) Tj\nET\n`;

      stream += 'BT\n/F1 8 Tf\n0.15 0.20 0.28 rg\n';
      stream += `${rightTableX + colWidth - 65} ${currY + 4} Td\n`;
      stream += `(${val}) Tj\nET\n`;
    }
  }

  // Footer
  stream += `0.80 0.84 0.90 RG\n0.5 w\n`;
  stream += `${marginLeft} 40 m ${pageWidth - marginRight} 40 l S\n`;

  stream += 'BT\n/F2 8 Tf\n0.45 0.50 0.60 rg\n';
  stream += `${marginLeft} 28 Td\n`;
  stream += `(BEZENT Business Ecosystem Zentram — Executive Visual Analytics) Tj\nET\n`;

  stream += 'BT\n/F2 8 Tf\n0.45 0.50 0.60 rg\n';
  stream += `${pageWidth - marginRight - 70} 28 Td\n`;
  stream += `(Page ${pageNum} of ${totalPages}) Tj\nET\n`;

  return stream;
}

/**
 * Generates a valid standards-compliant PDF-1.4 binary buffer.
 */
export function generatePdfExport(
  reportDef: ReportDefinition,
  columns: ReportColumnDefinition[],
  rows: Record<string, unknown>[],
  metadata: {
    companyName: string;
    generatedAt: string;
    timezone: string;
    appliedFilters: Record<string, unknown>;
    analytics?: ReportAnalyticsResult;
  },
): Buffer {
  const rowsPerPage = 22;
  const hasAnalyticsPage = Boolean(metadata.analytics);
  const tablePages = Math.max(rows.length === 0 && !hasAnalyticsPage ? 1 : 0, Math.ceil(rows.length / rowsPerPage));
  const totalPages = (hasAnalyticsPage ? 1 : 0) + tablePages;

  // US Letter Landscape: 792 x 612 pt
  const pageWidth = 792;
  const pageHeight = 612;
  const marginLeft = 36;
  const marginRight = 36;
  const printableWidth = pageWidth - marginLeft - marginRight; // 720 pt

  // Scale column widths to fit printable width
  const rawTotalWidth = columns.reduce((sum, c) => sum + (c.width ?? 100), 0);
  const scaledCols = columns.map((c) => ({
    ...c,
    calcWidth: Math.floor(((c.width ?? 100) / rawTotalWidth) * printableWidth),
  }));

  const fontBoldObjId = 3;
  const fontRegularObjId = 4;

  const pageObjIds: number[] = [];
  const contentStreams: string[] = [];

  let nextObjId = 5;

  // Render Page 1: Executive Analytics Summary if provided
  if (hasAnalyticsPage && metadata.analytics) {
    pageObjIds.push(nextObjId);
    nextObjId += 2;
    const analyticsStream = buildAnalyticsPdfPage(
      reportDef,
      metadata,
      metadata.analytics,
      1,
      totalPages,
      pageWidth,
      pageHeight,
      marginLeft,
      marginRight,
      printableWidth,
    );
    contentStreams.push(analyticsStream);
  }

  // Render Tabular Data Pages
  for (let pageIdx = 0; pageIdx < tablePages; pageIdx++) {
    const pageNum = (hasAnalyticsPage ? 2 : 1) + pageIdx;
    const pageObjId = nextObjId;
    nextObjId += 2;
    pageObjIds.push(pageObjId);

    const pageRecords = rows.slice(pageIdx * rowsPerPage, (pageIdx + 1) * rowsPerPage);

    let stream = '';

    // Header Title
    stream += 'BT\n';
    stream += `/F1 14 Tf\n`;
    stream += `0.09 0.13 0.22 rg\n`;
    stream += `${marginLeft} ${pageHeight - 40} Td\n`;
    stream += `(${escapePdfText(`BEZENT HRMS — ${reportDef.name}`)}) Tj\n`;
    stream += 'ET\n';

    // Subtitle Metadata
    stream += 'BT\n';
    stream += `/F2 8.5 Tf\n`;
    stream += `0.35 0.40 0.50 rg\n`;
    stream += `${marginLeft} ${pageHeight - 54} Td\n`;
    const filterSummary = Object.entries(metadata.appliedFilters)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    const metaLine = `Company: ${metadata.companyName} | Generated: ${metadata.generatedAt} (${metadata.timezone})${filterSummary ? ` | Filters: ${filterSummary}` : ''}`;
    stream += `(${truncatePdfText(metaLine, 130)}) Tj\n`;
    stream += 'ET\n';

    // Decorative line below header
    stream += `0.80 0.84 0.90 RG\n0.75 w\n`;
    stream += `${marginLeft} ${pageHeight - 64} m ${pageWidth - marginRight} ${pageHeight - 64} l S\n`;

    // Table Header Background (Slate 900)
    const tableTop = pageHeight - 88;
    stream += `0.11 0.16 0.25 rg\n`;
    stream += `${marginLeft} ${tableTop} ${printableWidth} 20 re f\n`;

    // Table Header Text
    let currentX = marginLeft;
    for (const col of scaledCols) {
      stream += 'BT\n';
      stream += `/F1 8 Tf\n`;
      stream += `1 1 1 rg\n`; // White text
      const xPad = col.align === 'right' ? col.calcWidth - 6 : 4;
      stream += `${currentX + xPad} ${tableTop + 6} Td\n`;
      const titleTrunc = truncatePdfText(col.label, Math.floor(col.calcWidth / 5.5));
      stream += `(${titleTrunc}) Tj\n`;
      stream += 'ET\n';
      currentX += col.calcWidth;
    }

    // Table Rows
    const rowHeight = 18;
    for (let rIdx = 0; rIdx < pageRecords.length; rIdx++) {
      const record = pageRecords[rIdx]!;
      const rowY = tableTop - (rIdx + 1) * rowHeight;

      // Alternating row background
      if (rIdx % 2 === 1) {
        stream += `0.97 0.98 0.99 rg\n`;
        stream += `${marginLeft} ${rowY} ${printableWidth} ${rowHeight} re f\n`;
      }

      // Bottom border
      stream += `0.90 0.92 0.95 RG\n0.5 w\n`;
      stream += `${marginLeft} ${rowY} m ${pageWidth - marginRight} ${rowY} l S\n`;

      // Cells
      let cellX = marginLeft;
      for (const col of scaledCols) {
        const val = record[col.id];
        const valStr = val !== null && val !== undefined ? String(val) : '—';
        const maxChars = Math.max(3, Math.floor(col.calcWidth / 5.2));
        const truncated = truncatePdfText(valStr, maxChars);

        stream += 'BT\n';
        stream += `/F2 7.5 Tf\n`;
        stream += `0.15 0.20 0.28 rg\n`;
        const padX = col.align === 'right' ? col.calcWidth - 6 : 4;
        stream += `${cellX + padX} ${rowY + 5} Td\n`;
        stream += `(${truncated}) Tj\n`;
        stream += 'ET\n';

        cellX += col.calcWidth;
      }
    }

    // Page Footer
    stream += `0.80 0.84 0.90 RG\n0.5 w\n`;
    stream += `${marginLeft} 40 m ${pageWidth - marginRight} 40 l S\n`;

    stream += 'BT\n';
    stream += `/F2 8 Tf\n`;
    stream += `0.45 0.50 0.60 rg\n`;
    stream += `${marginLeft} 28 Td\n`;
    stream += `(BEZENT Business Ecosystem Zentram — Confidential & Proprietary Report) Tj\n`;
    stream += 'ET\n';

    stream += 'BT\n';
    stream += `/F2 8 Tf\n`;
    stream += `0.45 0.50 0.60 rg\n`;
    stream += `${pageWidth - marginRight - 70} 28 Td\n`;
    stream += `(Page ${pageNum} of ${totalPages}) Tj\n`;
    stream += 'ET\n';

    contentStreams.push(stream);
  }

  // Assemble PDF Objects
  const objects: string[] = [];
  objects.push(`1 0 obj\n<<\n  /Type /Catalog\n  /Pages 2 0 R\n>>\nendobj`);
  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
  objects.push(
    `2 0 obj\n<<\n  /Type /Pages\n  /Kids [${kidsStr}]\n  /Count ${totalPages}\n>>\nendobj`,
  );
  objects.push(
    `3 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica-Bold\n  /Encoding /WinAnsiEncoding\n>>\nendobj`,
  );
  objects.push(
    `4 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica\n  /Encoding /WinAnsiEncoding\n>>\nendobj`,
  );

  for (let i = 0; i < totalPages; i++) {
    const pageObjId = pageObjIds[i]!;
    const contentObjId = pageObjId + 1;
    const streamContent = contentStreams[i] ?? '';
    const streamBuffer = Buffer.from(streamContent, 'utf-8');

    objects.push(
      `${pageObjId} 0 obj\n<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 ${pageWidth} ${pageHeight}]\n  /Resources <<\n    /Font <<\n      /F1 ${fontBoldObjId} 0 R\n      /F2 ${fontRegularObjId} 0 R\n    >>\n  >>\n  /Contents ${contentObjId} 0 R\n>>\nendobj`,
    );

    objects.push(
      `${contentObjId} 0 obj\n<<\n  /Length ${streamBuffer.length}\n>>\nstream\n${streamContent}\nendstream\nendobj`,
    );
  }

  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  let body = header;
  const offsets: number[] = [0];

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
