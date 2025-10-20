import { jsPDF } from 'jspdf';
import { formatDateShort } from './utils';

// ============================================================================
// CONSTANTES DE MISE EN PAGE
// ============================================================================

export const PDF_CONFIG = {
  margin: 20,
  lineHeight: 6,
  fontSize: {
    title: 24,
    h1: 18,
    h2: 14,
    h3: 12,
    body: 10,
    small: 8,
  },
  colors: {
    primary: [41, 98, 255] as [number, number, number], // Bleu
    success: [34, 197, 94] as [number, number, number], // Vert
    warning: [251, 146, 60] as [number, number, number], // Orange
    danger: [239, 68, 68] as [number, number, number], // Rouge
    gray: [107, 114, 128] as [number, number, number],
    lightGray: [243, 244, 246] as [number, number, number],
    darkGray: [55, 65, 81] as [number, number, number],
  },
};

export interface PDFContext {
  pdf: jsPDF;
  yPosition: number;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  projectName: string;
  currentPage: number;
}

// ============================================================================
// INITIALISATION
// ============================================================================

export function createPDFContext(projectName: string): PDFContext {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  return {
    pdf,
    yPosition: PDF_CONFIG.margin,
    pageWidth,
    pageHeight,
    margin: PDF_CONFIG.margin,
    projectName,
    currentPage: 1,
  };
}

// ============================================================================
// GESTION DES PAGES
// ============================================================================

export function checkPageBreak(ctx: PDFContext, requiredSpace: number): PDFContext {
  if (ctx.yPosition + requiredSpace > ctx.pageHeight - ctx.margin) {
    ctx.pdf.addPage();
    ctx.currentPage++;
    ctx.yPosition = ctx.margin;
    addPageHeader(ctx);
    ctx.yPosition += 15;
  }
  return ctx;
}

export function addPageHeader(ctx: PDFContext): void {
  const oldFontSize = ctx.pdf.getFontSize();
  const oldTextColor = ctx.pdf.getTextColor();
  
  ctx.pdf.setFontSize(PDF_CONFIG.fontSize.small);
  ctx.pdf.setTextColor(...PDF_CONFIG.colors.gray);
  ctx.pdf.text(ctx.projectName, ctx.margin, ctx.margin - 5);
  
  ctx.pdf.setFontSize(oldFontSize);
  ctx.pdf.setTextColor(oldTextColor);
}

export function addPageFooter(ctx: PDFContext): void {
  const oldFontSize = ctx.pdf.getFontSize();
  const oldTextColor = ctx.pdf.getTextColor();
  
  ctx.pdf.setFontSize(PDF_CONFIG.fontSize.small);
  ctx.pdf.setTextColor(...PDF_CONFIG.colors.gray);
  
  const footerY = ctx.pageHeight - ctx.margin + 5;
  const date = formatDateShort(new Date());
  ctx.pdf.text(date, ctx.margin, footerY);
  
  const pageText = `Page ${ctx.currentPage}`;
  const pageTextWidth = ctx.pdf.getTextWidth(pageText);
  ctx.pdf.text(pageText, ctx.pageWidth - ctx.margin - pageTextWidth, footerY);
  
  ctx.pdf.setFontSize(oldFontSize);
  ctx.pdf.setTextColor(oldTextColor);
}

export function finalizeAllPages(ctx: PDFContext): void {
  const totalPages = ctx.pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    ctx.pdf.setPage(i);
    ctx.currentPage = i;
    addPageFooter(ctx);
  }
}

// ============================================================================
// STYLES DE TEXTE
// ============================================================================

export function addTitle(ctx: PDFContext, text: string, centered: boolean = false): PDFContext {
  checkPageBreak(ctx, 15);
  
  ctx.pdf.setFontSize(PDF_CONFIG.fontSize.title);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setTextColor(0, 0, 0);
  
  if (centered) {
    const textWidth = ctx.pdf.getTextWidth(text);
    const x = (ctx.pageWidth - textWidth) / 2;
    ctx.pdf.text(text, x, ctx.yPosition);
  } else {
    ctx.pdf.text(text, ctx.margin, ctx.yPosition);
  }
  
  ctx.yPosition += 12;
  return ctx;
}

export function addSection(ctx: PDFContext, text: string): PDFContext {
  checkPageBreak(ctx, 12);
  
  ctx.pdf.setFontSize(PDF_CONFIG.fontSize.h1);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setTextColor(...PDF_CONFIG.colors.primary);
  ctx.pdf.text(text, ctx.margin, ctx.yPosition);
  
  ctx.yPosition += 10;
  return ctx;
}

export function addSubsection(ctx: PDFContext, text: string): PDFContext {
  checkPageBreak(ctx, 10);
  
  ctx.pdf.setFontSize(PDF_CONFIG.fontSize.h2);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setTextColor(...PDF_CONFIG.colors.darkGray);
  ctx.pdf.text(text, ctx.margin, ctx.yPosition);
  
  ctx.yPosition += 8;
  return ctx;
}

export function addSubsubsection(ctx: PDFContext, text: string): PDFContext {
  checkPageBreak(ctx, 8);
  
  ctx.pdf.setFontSize(PDF_CONFIG.fontSize.h3);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setTextColor(...PDF_CONFIG.colors.darkGray);
  ctx.pdf.text(text, ctx.margin, ctx.yPosition);
  
  ctx.yPosition += 7;
  return ctx;
}

export function addParagraph(ctx: PDFContext, text: string, indent: number = 0): PDFContext {
  ctx.pdf.setFontSize(PDF_CONFIG.fontSize.body);
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setTextColor(0, 0, 0);
  
  const maxWidth = ctx.pageWidth - 2 * ctx.margin - indent;
  const lines = ctx.pdf.splitTextToSize(text, maxWidth);
  
  for (const line of lines) {
    checkPageBreak(ctx, PDF_CONFIG.lineHeight);
    ctx.pdf.text(line, ctx.margin + indent, ctx.yPosition);
    ctx.yPosition += PDF_CONFIG.lineHeight;
  }
  
  ctx.yPosition += 2;
  return ctx;
}

export function addSmallText(ctx: PDFContext, text: string, indent: number = 0): PDFContext {
  ctx.pdf.setFontSize(PDF_CONFIG.fontSize.small);
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setTextColor(...PDF_CONFIG.colors.gray);
  
  const maxWidth = ctx.pageWidth - 2 * ctx.margin - indent;
  const lines = ctx.pdf.splitTextToSize(text, maxWidth);
  
  for (const line of lines) {
    checkPageBreak(ctx, PDF_CONFIG.lineHeight - 1);
    ctx.pdf.text(line, ctx.margin + indent, ctx.yPosition);
    ctx.yPosition += PDF_CONFIG.lineHeight - 1;
  }
  
  ctx.yPosition += 2;
  return ctx;
}

export function addSpace(ctx: PDFContext, space: number = 5): PDFContext {
  ctx.yPosition += space;
  return ctx;
}

// ============================================================================
// BOÎTES ET MÉTRIQUES
// ============================================================================

export function addMetricBox(
  ctx: PDFContext,
  label: string,
  value: string,
  color: keyof typeof PDF_CONFIG.colors = 'primary',
  width?: number
): PDFContext {
  const boxWidth = width || (ctx.pageWidth - 2 * ctx.margin);
  const boxHeight = 20;
  
  checkPageBreak(ctx, boxHeight + 5);
  
  // Fond coloré
  ctx.pdf.setFillColor(...PDF_CONFIG.colors[color]);
  ctx.pdf.setDrawColor(...PDF_CONFIG.colors[color]);
  ctx.pdf.rect(ctx.margin, ctx.yPosition - 5, boxWidth, boxHeight, 'FD');
  
  // Label
  ctx.pdf.setFontSize(PDF_CONFIG.fontSize.small);
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setTextColor(255, 255, 255);
  ctx.pdf.text(label, ctx.margin + 3, ctx.yPosition);
  
  // Valeur
  ctx.pdf.setFontSize(PDF_CONFIG.fontSize.h2);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text(value, ctx.margin + 3, ctx.yPosition + 8);
  
  ctx.yPosition += boxHeight + 3;
  return ctx;
}

export function addMetricGrid(
  ctx: PDFContext,
  metrics: Array<{ label: string; value: string; color?: keyof typeof PDF_CONFIG.colors }>
): PDFContext {
  const cols = 2;
  const rows = Math.ceil(metrics.length / cols);
  const boxWidth = (ctx.pageWidth - 2 * ctx.margin - 5) / cols;
  const boxHeight = 20;
  
  checkPageBreak(ctx, rows * (boxHeight + 5));
  
  metrics.forEach((metric, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = ctx.margin + col * (boxWidth + 5);
    const y = ctx.yPosition + row * (boxHeight + 5);
    
    const color = metric.color || 'primary';
    
    // Fond
    ctx.pdf.setFillColor(...PDF_CONFIG.colors[color]);
    ctx.pdf.setDrawColor(...PDF_CONFIG.colors[color]);
    ctx.pdf.rect(x, y - 5, boxWidth, boxHeight, 'FD');
    
    // Label
    ctx.pdf.setFontSize(PDF_CONFIG.fontSize.small);
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setTextColor(255, 255, 255);
    ctx.pdf.text(metric.label, x + 3, y);
    
    // Valeur
    ctx.pdf.setFontSize(PDF_CONFIG.fontSize.h3);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.text(metric.value, x + 3, y + 8);
  });
  
  ctx.yPosition += rows * (boxHeight + 5) + 5;
  return ctx;
}

// ============================================================================
// TABLEAUX
// ============================================================================

export interface TableColumn {
  header: string;
  width: number; // Proportion (ex: 0.5 = 50%)
  align?: 'left' | 'right' | 'center';
}

export interface TableRow {
  values: string[];
  bold?: boolean;
  background?: boolean;
}

export function addTable(
  ctx: PDFContext,
  columns: TableColumn[],
  rows: TableRow[]
): PDFContext {
  const tableWidth = ctx.pageWidth - 2 * ctx.margin;
  const rowHeight = 7;
  const headerHeight = 9;
  
  // Vérifier si on a besoin d'une nouvelle page
  const estimatedHeight = headerHeight + rows.length * rowHeight;
  checkPageBreak(ctx, Math.min(estimatedHeight, 100));
  
  // En-tête du tableau
  ctx.pdf.setFillColor(...PDF_CONFIG.colors.darkGray);
  ctx.pdf.rect(ctx.margin, ctx.yPosition - 6, tableWidth, headerHeight, 'F');
  
  ctx.pdf.setFontSize(PDF_CONFIG.fontSize.body);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setTextColor(255, 255, 255);
  
  let xOffset = ctx.margin;
  columns.forEach((col) => {
    const colWidth = tableWidth * col.width;
    const text = col.header;
    const align = col.align || 'left';
    
    let textX = xOffset + 2;
    if (align === 'right') {
      textX = xOffset + colWidth - ctx.pdf.getTextWidth(text) - 2;
    } else if (align === 'center') {
      textX = xOffset + (colWidth - ctx.pdf.getTextWidth(text)) / 2;
    }
    
    ctx.pdf.text(text, textX, ctx.yPosition);
    xOffset += colWidth;
  });
  
  ctx.yPosition += headerHeight;
  
  // Lignes du tableau
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setTextColor(0, 0, 0);
  
  rows.forEach((row, rowIndex) => {
    checkPageBreak(ctx, rowHeight);
    
    // Fond alterné
    if (row.background || rowIndex % 2 === 0) {
      ctx.pdf.setFillColor(...PDF_CONFIG.colors.lightGray);
      ctx.pdf.rect(ctx.margin, ctx.yPosition - 5, tableWidth, rowHeight, 'F');
    }
    
    if (row.bold) {
      ctx.pdf.setFont('helvetica', 'bold');
    } else {
      ctx.pdf.setFont('helvetica', 'normal');
    }
    
    xOffset = ctx.margin;
    columns.forEach((col, colIndex) => {
      const colWidth = tableWidth * col.width;
      const text = row.values[colIndex] || '';
      const align = col.align || 'left';
      
      let textX = xOffset + 2;
      if (align === 'right') {
        textX = xOffset + colWidth - ctx.pdf.getTextWidth(text) - 2;
      } else if (align === 'center') {
        textX = xOffset + (colWidth - ctx.pdf.getTextWidth(text)) / 2;
      }
      
      ctx.pdf.text(text, textX, ctx.yPosition);
      xOffset += colWidth;
    });
    
    ctx.yPosition += rowHeight;
  });
  
  // Bordure finale
  ctx.pdf.setDrawColor(...PDF_CONFIG.colors.gray);
  ctx.pdf.line(ctx.margin, ctx.yPosition, ctx.margin + tableWidth, ctx.yPosition);
  
  ctx.yPosition += 5;
  return ctx;
}

// ============================================================================
// FORMULES ET CODE
// ============================================================================

export function addFormula(ctx: PDFContext, formula: string): PDFContext {
  ctx.pdf.setFillColor(245, 245, 245);
  
  const maxWidth = ctx.pageWidth - 2 * ctx.margin - 10;
  const lines = ctx.pdf.splitTextToSize(formula, maxWidth);
  const boxHeight = lines.length * PDF_CONFIG.lineHeight + 4;
  
  checkPageBreak(ctx, boxHeight + 5);
  
  ctx.pdf.rect(ctx.margin, ctx.yPosition - 3, ctx.pageWidth - 2 * ctx.margin, boxHeight, 'F');
  
  ctx.pdf.setFontSize(PDF_CONFIG.fontSize.small);
  ctx.pdf.setFont('courier', 'normal');
  ctx.pdf.setTextColor(0, 0, 0);
  
  lines.forEach((line: string) => {
    ctx.pdf.text(line, ctx.margin + 3, ctx.yPosition);
    ctx.yPosition += PDF_CONFIG.lineHeight;
  });
  
  ctx.yPosition += 5;
  return ctx;
}

export function addKPIDetail(
  ctx: PDFContext,
  label: string,
  formula: string,
  variables: Record<string, string>,
  result: string
): PDFContext {
  checkPageBreak(ctx, 50);
  
  // Label
  addSubsubsection(ctx, label);
  
  // Formule
  addSmallText(ctx, 'Formule :');
  addFormula(ctx, formula);
  
  // Variables
  if (Object.keys(variables).length > 0) {
    addSmallText(ctx, 'Variables :');
    Object.entries(variables).forEach(([key, value]) => {
      addSmallText(ctx, `  ${key} = ${value}`, 5);
    });
    addSpace(ctx, 2);
  }
  
  // Résultat
  ctx.pdf.setFontSize(PDF_CONFIG.fontSize.body);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setTextColor(...PDF_CONFIG.colors.primary);
  ctx.pdf.text(`Résultat : ${result}`, ctx.margin, ctx.yPosition);
  ctx.yPosition += 10;
  
  return ctx;
}

// ============================================================================
// LIGNES ET SÉPARATEURS
// ============================================================================

export function addHorizontalLine(ctx: PDFContext): PDFContext {
  ctx.pdf.setDrawColor(...PDF_CONFIG.colors.gray);
  ctx.pdf.setLineWidth(0.5);
  ctx.pdf.line(ctx.margin, ctx.yPosition, ctx.pageWidth - ctx.margin, ctx.yPosition);
  ctx.yPosition += 5;
  return ctx;
}

export function addDivider(ctx: PDFContext): PDFContext {
  ctx.pdf.setDrawColor(...PDF_CONFIG.colors.lightGray);
  ctx.pdf.setLineWidth(1);
  ctx.pdf.line(ctx.margin, ctx.yPosition, ctx.pageWidth - ctx.margin, ctx.yPosition);
  ctx.yPosition += 8;
  return ctx;
}

