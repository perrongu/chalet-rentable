import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type {
  Project,
  ProjectInputs,
  KPIResults,
  SensitivityAnalysis1D,
  SensitivityAnalysis2D,
} from '../types';
import { arrayToCSVLine, formatDateShort } from './utils';
import { sanitizeProject } from './validation';
import { KPI_THRESHOLDS, EXPENSE_TYPE_LABELS, PAYMENT_FREQUENCY_LABELS, PDF_SPACING } from './constants';

// ============================================================================
// EXPORT JSON (PROJET COMPLET)
// ============================================================================

export function exportProjectToJSON(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectFromJSON(jsonString: string): Project {
  const parsed = JSON.parse(jsonString);
  
  // Valider et sanitizer avec Zod
  const sanitized = sanitizeProject(parsed);
  
  if (!sanitized) {
    throw new Error('Le fichier de projet est invalide ou corrompu');
  }
  
  return sanitized;
}

export function downloadJSON(project: Project, filename: string = 'projet-chalet.json') {
  const json = exportProjectToJSON(project);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// EXPORT EXCEL
// ============================================================================

export function exportKPIsToExcel(
  scenarios: Array<{ name: string; kpis: KPIResults }>,
  filename: string = 'analyse-rentabilite.xlsx'
) {
  const workbook = XLSX.utils.book_new();

  // Feuille 1: Comparaison des scénarios
  const comparisonData: any[][] = [
    ['Métrique', ...scenarios.map((s) => s.name)],
    ['Nuitées vendues', ...scenarios.map((s) => s.kpis.nightsSold)],
    ['Revenus annuels bruts ($)', ...scenarios.map((s) => s.kpis.annualRevenue)],
    ['Dépenses totales ($)', ...scenarios.map((s) => s.kpis.totalExpenses)],
    ['Montant du prêt ($)', ...scenarios.map((s) => s.kpis.loanAmount)],
    ['Paiement périodique ($)', ...scenarios.map((s) => s.kpis.periodicPayment)],
    ['Service de la dette annuel ($)', ...scenarios.map((s) => s.kpis.annualDebtService)],
    ['Frais d\'acquisition ($)', ...scenarios.map((s) => s.kpis.totalAcquisitionFees)],
    ['Investissement initial ($)', ...scenarios.map((s) => s.kpis.initialInvestment)],
    ['Cashflow annuel ($)', ...scenarios.map((s) => s.kpis.annualCashflow)],
    ['Cash-on-Cash (%)', ...scenarios.map((s) => s.kpis.cashOnCash)],
    ['Cap Rate (%)', ...scenarios.map((s) => s.kpis.capRate)],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(comparisonData);
  XLSX.utils.book_append_sheet(workbook, ws1, 'Comparaison');

  // Feuille 2: Détails par catégorie de dépenses (premier scénario)
  if (scenarios.length > 0) {
    const expenseData: any[][] = [['Catégorie', 'Montant ($)']];
    Object.entries(scenarios[0].kpis.expensesByCategory).forEach(([category, amount]) => {
      expenseData.push([category, amount]);
    });
    expenseData.push(['TOTAL', scenarios[0].kpis.totalExpenses]);

    const ws2 = XLSX.utils.aoa_to_sheet(expenseData);
    XLSX.utils.book_append_sheet(workbook, ws2, 'Dépenses par catégorie');
  }

  // Télécharger
  XLSX.writeFile(workbook, filename);
}

export function exportSensitivityToExcel(
  analysis: SensitivityAnalysis1D,
  filename: string = 'analyse-sensibilite.xlsx'
) {
  const workbook = XLSX.utils.book_new();

  // Feuille 1: Impacts relatifs (tornado)
  if (analysis.results) {
    const impactData = [
      ['Paramètre', 'Impact Min', 'Impact Max', 'Impact Relatif'],
      ...analysis.results.impacts.map((impact) => [
        impact.label,
        impact.impactLow,
        impact.impactHigh,
        impact.relativeImpact,
      ]),
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(impactData);
    XLSX.utils.book_append_sheet(workbook, ws1, 'Impacts');

    // Feuille 2+: Résultats détaillés par paramètre
    analysis.results.detailedResults.forEach((result, index) => {
      const detailData = [
        ['Valeur du paramètre', 'Valeur de l\'objectif'],
        ...result.values.map((v) => [v.paramValue, v.objectiveValue]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(detailData);
      const sheetName = `Param ${index + 1}`;
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    });
  }

  XLSX.writeFile(workbook, filename);
}

export function exportHeatmapToExcel(
  analysis: SensitivityAnalysis2D,
  filename: string = 'heatmap.xlsx'
) {
  if (!analysis.results) return;

  const workbook = XLSX.utils.book_new();

  // Construire la grille avec les labels
  const data: any[][] = [
    ['', ...analysis.results.xValues.map((v) => v.toFixed(2))],
  ];

  analysis.results.yValues.forEach((yValue, rowIndex) => {
    const row = [yValue.toFixed(2), ...analysis.results!.grid[rowIndex]];
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, ws, 'Heatmap');

  XLSX.writeFile(workbook, filename);
}

// ============================================================================
// EXPORT CSV (RFC 4180 compliant)
// ============================================================================

export function exportToCSV(
  data: Array<Record<string, any>>,
  filename: string = 'export.csv'
) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    arrayToCSVLine(headers),
    ...data.map((row) => arrayToCSVLine(headers.map((h) => row[h]))),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// EXPORT PNG (GRAPHIQUES)
// ============================================================================

export async function exportChartToPNG(
  elementId: string,
  filename: string = 'graphique.png'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2, // Haute qualité
  });

  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
}

// ============================================================================
// EXPORT PDF (RAPPORT COMPLET)
// ============================================================================

export async function exportReportToPDF(
  project: Project,
  scenarios: Array<{ name: string; kpis: KPIResults }>,
  chartElementIds: string[] = [],
  filename: string = 'rapport-rentabilite.pdf'
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Titre
  pdf.setFontSize(20);
  pdf.text('Analyse de Rentabilité', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(12);
  pdf.text(`Projet: ${project.name}`, margin, yPosition);
  yPosition += 7;

  if (project.description) {
    pdf.setFontSize(10);
    const splitDescription = pdf.splitTextToSize(project.description, pageWidth - 2 * margin);
    pdf.text(splitDescription, margin, yPosition);
    yPosition += splitDescription.length * 5 + 5;
  }

  // Date
  pdf.setFontSize(9);
  pdf.text(`Date: ${formatDateShort(new Date())}`, margin, yPosition);
  yPosition += 10;

  // Résumé des KPIs par scénario
  scenarios.forEach((scenario) => {
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(14);
    pdf.text(`Scénario: ${scenario.name}`, margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    const kpiData = [
      `Revenus annuels bruts: ${scenario.kpis.annualRevenue.toLocaleString('fr-CA')} $`,
      `Dépenses totales: ${scenario.kpis.totalExpenses.toLocaleString('fr-CA')} $`,
      `Service de la dette: ${scenario.kpis.annualDebtService.toLocaleString('fr-CA')} $`,
      `Cashflow annuel: ${scenario.kpis.annualCashflow.toLocaleString('fr-CA')} $`,
      `Cash-on-Cash: ${scenario.kpis.cashOnCash.toFixed(2)} %`,
      `Cap Rate: ${scenario.kpis.capRate.toFixed(2)} %`,
    ];

    kpiData.forEach((line) => {
      pdf.text(line, margin + 5, yPosition);
      yPosition += 6;
    });

    yPosition += 5;
  });

  // Ajouter les graphiques
  for (const chartId of chartElementIds) {
    const element = document.getElementById(chartId);
    if (element) {
      if (yPosition > pageHeight - 100) {
        pdf.addPage();
        yPosition = margin;
      }

      try {
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      } catch (error) {
        console.error(`Error capturing chart ${chartId}:`, error);
      }
    }
  }

  // Télécharger
  pdf.save(filename);
}

// ============================================================================
// EXPORT PDF PROFESSIONNEL
// ============================================================================

/**
 * Détermine la couleur d'un KPI selon les seuils définis
 */
function getKPIColor(metric: 'cashOnCash' | 'capRate', value: number): 'success' | 'warning' | 'danger' {
  const thresholds = KPI_THRESHOLDS[metric];
  if (value >= thresholds.good) return 'success';
  if (value >= thresholds.medium) return 'warning';
  return 'danger';
}

/**
 * Formate un cashflow avec gestion des valeurs négatives
 */
function formatCashflowValue(value: number): string {
  if (value >= 0) {
    return `${value.toLocaleString('fr-CA')} $`;
  } else {
    return `(${Math.abs(value).toLocaleString('fr-CA')} $)`;
  }
}

export async function exportProfessionalReportToPDF(
  project: Project,
  inputs: ProjectInputs,
  kpis: KPIResults,
  scenarioName: string,
  filename: string = 'rapport-rentabilite.pdf'
): Promise<void> {
  try {
  const {
    createPDFContext,
    addTitle,
    addSection,
    addSubsection,
    addParagraph,
    addSmallText,
    addSpace,
    addMetricGrid,
    addTable,
    addKPIDetail,
    finalizeAllPages,
    checkPageBreak,
  } = await import('./pdfHelpers');

  let ctx = createPDFContext(project.name);
  
  // Ajouter métadonnées PDF
  ctx.pdf.setProperties({
    title: `Analyse de rentabilité - ${project.name}`,
    subject: 'Rapport d\'analyse financière - Location court terme',
    author: 'Chalet Rentable',
    creator: 'Application Chalet Rentable',
    keywords: 'immobilier, rentabilité, analyse financière, location court terme',
  });

  // ============================================================================
  // PAGE DE GARDE
  // ============================================================================
  
  addSpace(ctx, PDF_SPACING.COVER_PAGE_TOP_MARGIN);
  addTitle(ctx, 'ANALYSE DE RENTABILITÉ', true);
  addSpace(ctx, PDF_SPACING.SUBSECTION_SPACING);
  
  ctx.pdf.setFontSize(14);
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setTextColor(100, 100, 100);
  const projectNameWidth = ctx.pdf.getTextWidth(project.name);
  ctx.pdf.text(project.name, (ctx.pageWidth - projectNameWidth) / 2, ctx.yPosition);
  ctx.yPosition += PDF_SPACING.HEADER_BOTTOM_SPACING;
  
  ctx.pdf.setFontSize(12);
  const scenarioText = `Scénario : ${scenarioName}`;
  const scenarioWidth = ctx.pdf.getTextWidth(scenarioText);
  ctx.pdf.text(scenarioText, (ctx.pageWidth - scenarioWidth) / 2, ctx.yPosition);
  ctx.yPosition += 10;
  
  const dateText = `Généré le ${formatDateShort(new Date())}`;
  const dateWidth = ctx.pdf.getTextWidth(dateText);
  ctx.pdf.text(dateText, (ctx.pageWidth - dateWidth) / 2, ctx.yPosition);
  ctx.yPosition += 30;
  
  if (project.description) {
    addParagraph(ctx, project.description);
  }
  
  // ============================================================================
  // SOMMAIRE EXÉCUTIF
  // ============================================================================
  
  ctx.pdf.addPage();
  ctx.currentPage++;
  ctx.yPosition = ctx.margin + 15;
  
  addSection(ctx, 'SOMMAIRE EXÉCUTIF');
  addSpace(ctx, 5);
  
  // Métriques principales en grille
  const roiColor: 'success' | 'warning' | 'danger' = 
    kpis.totalROI >= 10 ? 'success' : kpis.totalROI >= 5 ? 'warning' : 'danger';
  const cashflowColor: 'success' | 'danger' = 
    kpis.annualCashflow >= 0 ? 'success' : 'danger';
  
  const mainMetrics = [
    {
      label: 'Cash-on-Cash',
      value: `${kpis.cashOnCash.toFixed(2)} %`,
      color: getKPIColor('cashOnCash', kpis.cashOnCash),
    },
    {
      label: 'Cap Rate',
      value: `${kpis.capRate.toFixed(2)} %`,
      color: getKPIColor('capRate', kpis.capRate),
    },
    {
      label: 'ROI Total',
      value: `${kpis.totalROI.toFixed(2)} %`,
      color: roiColor,
    },
    {
      label: 'Cashflow annuel',
      value: formatCashflowValue(kpis.annualCashflow),
      color: cashflowColor,
    },
  ];
  
  addMetricGrid(ctx, mainMetrics);
  addSpace(ctx, PDF_SPACING.SECTION_SPACING);
  
  // Tableau récapitulatif
  addSubsection(ctx, 'Vue d\'ensemble');
  
  const summaryRows = [
    { values: ['Revenus annuels bruts', `${kpis.annualRevenue.toLocaleString('fr-CA')} $`] },
    { values: ['Nuitées vendues', `${kpis.nightsSold}`] },
    { values: ['Dépenses totales', `${kpis.totalExpenses.toLocaleString('fr-CA')} $`] },
    { values: ['NOI (Net Operating Income)', `${kpis.noi.toLocaleString('fr-CA')} $`], bold: true },
    { values: ['Service de la dette', `${kpis.annualDebtService.toLocaleString('fr-CA')} $`] },
    { values: ['Cashflow annuel', `${kpis.annualCashflow.toLocaleString('fr-CA')} $`], bold: true, background: true },
    { values: ['', ''] },
    { values: ['Capitalisation (an 1)', `${kpis.principalPaidFirstYear.toLocaleString('fr-CA')} $`] },
    { values: ['Plus-value (an 1)', `${kpis.propertyAppreciation.toLocaleString('fr-CA')} $`] },
    { values: ['Profit total annuel', `${kpis.totalAnnualProfit.toLocaleString('fr-CA')} $`], bold: true, background: true },
  ];
  
  addTable(
    ctx,
    [
      { header: 'Métrique', width: 0.6, align: 'left' },
      { header: 'Valeur', width: 0.4, align: 'right' },
    ],
    summaryRows
  );
  
  addSpace(ctx, 10);
  
  // Investissement requis
  addSubsection(ctx, 'Investissement requis');
  
  const investmentRows = [
    { values: ['Mise de fonds', `${(kpis.initialInvestment - kpis.totalAcquisitionFees).toLocaleString('fr-CA')} $`] },
    { values: ['Frais d\'acquisition', `${kpis.totalAcquisitionFees.toLocaleString('fr-CA')} $`] },
    { values: ['Investissement initial total', `${kpis.initialInvestment.toLocaleString('fr-CA')} $`], bold: true, background: true },
  ];
  
  addTable(
    ctx,
    [
      { header: 'Composante', width: 0.6, align: 'left' },
      { header: 'Montant', width: 0.4, align: 'right' },
    ],
    investmentRows
  );
  
  addSpace(ctx, 10);
  
  // Analyse du ROI
  addSubsection(ctx, 'Décomposition du ROI');
  
  const roiRows = [
    { values: ['Cashflow', `${kpis.annualCashflow.toLocaleString('fr-CA')} $`, `${kpis.cashflowROI.toFixed(2)} %`] },
    { values: ['Capitalisation', `${kpis.principalPaidFirstYear.toLocaleString('fr-CA')} $`, `${kpis.capitalizationROI.toFixed(2)} %`] },
    { values: ['Plus-value', `${kpis.propertyAppreciation.toLocaleString('fr-CA')} $`, `${kpis.appreciationROI.toFixed(2)} %`] },
    { values: ['Total', `${kpis.totalAnnualProfit.toLocaleString('fr-CA')} $`, `${kpis.totalROI.toFixed(2)} %`], bold: true, background: true },
  ];
  
  addTable(
    ctx,
    [
      { header: 'Source', width: 0.4, align: 'left' },
      { header: 'Montant annuel', width: 0.3, align: 'right' },
      { header: 'ROI', width: 0.3, align: 'right' },
    ],
    roiRows
  );
  
  // ============================================================================
  // ANNEXE A - PARAMÈTRES D'ENTRÉE
  // ============================================================================
  
  ctx.pdf.addPage();
  ctx.currentPage++;
  ctx.yPosition = ctx.margin + 15;
  
  addSection(ctx, 'ANNEXE A - PARAMÈTRES D\'ENTRÉE');
  addSpace(ctx, 5);
  
  // Revenus
  addSubsection(ctx, '1. Revenus');
  
  const adr = inputs.revenue.averageDailyRate;
  const occupancy = inputs.revenue.occupancyRate;
  
  addSmallText(ctx, 'Tarif moyen par nuitée (ADR) :');
  if (adr.range && adr.range.useRange) {
    addParagraph(ctx, `Valeur : ${adr.range.default.toLocaleString('fr-CA')} $ (plage : ${adr.range.min.toLocaleString('fr-CA')} $ - ${adr.range.max.toLocaleString('fr-CA')} $)`, 5);
  } else {
    addParagraph(ctx, `${adr.value.toLocaleString('fr-CA')} $`, 5);
  }
  if (adr.sourceInfo?.source) {
    addSmallText(ctx, `Source : ${adr.sourceInfo.source}`, 5);
  }
  
  addSpace(ctx, 3);
  addSmallText(ctx, 'Taux d\'occupation :');
  if (occupancy.range && occupancy.range.useRange) {
    addParagraph(ctx, `${occupancy.range.default.toFixed(1)} % (plage : ${occupancy.range.min.toFixed(1)} % - ${occupancy.range.max.toFixed(1)} %)`, 5);
  } else {
    addParagraph(ctx, `${occupancy.value.toFixed(1)} %`, 5);
  }
  if (occupancy.sourceInfo?.source) {
    addSmallText(ctx, `Source : ${occupancy.sourceInfo.source}`, 5);
  }
  
  addSpace(ctx, 5);
  
  // Financement
  addSubsection(ctx, '2. Financement');
  
  const financing = inputs.financing;
  
  addSmallText(ctx, 'Prix d\'achat :');
  addParagraph(ctx, `${financing.purchasePrice.value.toLocaleString('fr-CA')} $`, 5);
  
  addSmallText(ctx, 'Mise de fonds :');
  addParagraph(ctx, `${financing.downPayment.value.toLocaleString('fr-CA')} $`, 5);
  
  addSmallText(ctx, 'Taux d\'intérêt :');
  addParagraph(ctx, `${financing.interestRate.value.toFixed(2)} %`, 5);
  
  addSmallText(ctx, 'Amortissement :');
  addParagraph(ctx, `${financing.amortizationYears.value} ans`, 5);
  
  addSmallText(ctx, 'Taux d\'appréciation annuel :');
  addParagraph(ctx, `${financing.annualAppreciationRate.value.toFixed(2)} %`, 5);
  
  addSmallText(ctx, 'Fréquence de paiement :');
  addParagraph(ctx, PAYMENT_FREQUENCY_LABELS[financing.paymentFrequency] || financing.paymentFrequency, 5);
  
  addSpace(ctx, 5);
  
  // Frais d'acquisition
  addSubsection(ctx, '3. Frais d\'acquisition');
  
  addSmallText(ctx, 'Droits de mutation (calculés) :');
  addParagraph(ctx, `${kpis.transferDuties.toLocaleString('fr-CA')} $`, 5);
  
  addSmallText(ctx, 'Frais de notaire :');
  addParagraph(ctx, `${inputs.acquisitionFees.notaryFees.value.toLocaleString('fr-CA')} $`, 5);
  
  addSmallText(ctx, 'Autres frais :');
  addParagraph(ctx, `${inputs.acquisitionFees.other.value.toLocaleString('fr-CA')} $`, 5);
  
  addSpace(ctx, 5);
  
  // Dépenses opérationnelles
  addSubsection(ctx, '4. Dépenses opérationnelles');
  addSpace(ctx, 3);
  
  if (inputs.expenses && inputs.expenses.length > 0) {
    const expenseRows = inputs.expenses.map((expense) => {
      let amountText = '';
      const amount = expense.amount.value;
      if (expense.type === 'PERCENTAGE_REVENUE' || expense.type === 'PERCENTAGE_PROPERTY_VALUE') {
        amountText = `${amount.toFixed(2)} %`;
      } else {
        amountText = `${amount.toLocaleString('fr-CA')} $`;
      }
      
      return {
        values: [
          expense.name,
          EXPENSE_TYPE_LABELS[expense.type] || expense.type,
          amountText,
        ],
      };
    });
    
    addTable(
      ctx,
      [
        { header: 'Dépense', width: 0.4, align: 'left' },
        { header: 'Type', width: 0.3, align: 'left' },
        { header: 'Montant', width: 0.3, align: 'right' },
      ],
      expenseRows
    );
  }
  
  // Paramètres de projection (si définis)
  if (inputs.projectionSettings) {
    checkPageBreak(ctx, 50);
    addSpace(ctx, 5);
    addSubsection(ctx, '5. Paramètres de projection');
    
    const projSettings = inputs.projectionSettings;
    
    addSmallText(ctx, 'Taux d\'escalade des revenus :');
    addParagraph(ctx, `${projSettings.revenueEscalationRate.value.toFixed(2)} % par an`, 5);
    
    addSmallText(ctx, 'Taux d\'escalade des dépenses :');
    addParagraph(ctx, `${projSettings.expenseEscalationRate.value.toFixed(2)} % par an`, 5);
    
    addSmallText(ctx, 'CAPEX annuel :');
    addParagraph(ctx, `${projSettings.capexRate.value.toFixed(2)} % de la valeur`, 5);
    
    addSmallText(ctx, 'Taux d\'actualisation :');
    addParagraph(ctx, `${projSettings.discountRate.value.toFixed(2)} %`, 5);
    
    addSmallText(ctx, 'Frais de vente :');
    addParagraph(ctx, `${projSettings.saleCostsRate.value.toFixed(2)} %`, 5);
  }
  
  // ============================================================================
  // ANNEXE B - CALCULS ET FORMULES DES KPIs
  // ============================================================================
  
  ctx.pdf.addPage();
  ctx.currentPage++;
  ctx.yPosition = ctx.margin + 15;
  
  addSection(ctx, 'ANNEXE B - CALCULS ET FORMULES DES KPIs');
  addSpace(ctx, 5);
  
  addParagraph(ctx, 'Cette annexe présente les formules détaillées et les calculs pour chaque indicateur de performance clé (KPI).');
  addSpace(ctx, 8);
  
  // Parcourir les KPIs importants avec leurs traces
  const importantKPIs: Array<{ key: keyof typeof kpis.traces; label: string }> = [
    { key: 'nightsSold', label: 'Nuitées vendues' },
    { key: 'annualRevenue', label: 'Revenus annuels bruts' },
    { key: 'totalExpenses', label: 'Dépenses totales' },
    { key: 'noi', label: 'NOI (Net Operating Income)' },
    { key: 'loanAmount', label: 'Montant du prêt' },
    { key: 'periodicPayment', label: 'Paiement périodique' },
    { key: 'annualDebtService', label: 'Service de la dette annuel' },
    { key: 'transferDuties', label: 'Droits de mutation' },
    { key: 'totalAcquisitionFees', label: 'Frais d\'acquisition totaux' },
    { key: 'initialInvestment', label: 'Investissement initial' },
    { key: 'annualCashflow', label: 'Cashflow annuel' },
    { key: 'cashOnCash', label: 'Cash-on-Cash' },
    { key: 'capRate', label: 'Cap Rate' },
    { key: 'principalPaidFirstYear', label: 'Capital remboursé (an 1)' },
    { key: 'propertyAppreciation', label: 'Appréciation de la propriété' },
    { key: 'totalAnnualProfit', label: 'Profit total annuel' },
    { key: 'totalROI', label: 'ROI Total' },
  ];
  
  importantKPIs.forEach((kpi) => {
    const trace = kpis.traces[kpi.key];
    if (trace) {
      const variables: Record<string, string> = {};
      Object.entries(trace.variables).forEach(([key, value]) => {
        if (typeof value === 'number') {
          variables[key] = value.toLocaleString('fr-CA');
        } else {
          variables[key] = String(value);
        }
      });
      
      let resultText = '';
      const resultValue = trace.result;
      if (typeof resultValue === 'number') {
        // Déterminer si c'est une valeur monétaire ou un pourcentage
        if (kpi.key.includes('Rate') || kpi.key.includes('ROI') || kpi.key === 'cashOnCash' || kpi.key === 'capRate') {
          resultText = `${resultValue.toFixed(2)} %`;
        } else if (kpi.key === 'nightsSold') {
          resultText = resultValue.toFixed(0);
        } else {
          resultText = `${resultValue.toLocaleString('fr-CA')} $`;
        }
      } else {
        resultText = String(resultValue);
      }
      
      addKPIDetail(ctx, kpi.label, trace.formula, variables, resultText);
    }
  });
  
  // ============================================================================
  // ANNEXE C - DÉTAILS DES DÉPENSES
  // ============================================================================
  
  ctx.pdf.addPage();
  ctx.currentPage++;
  ctx.yPosition = ctx.margin + 15;
  
  addSection(ctx, 'ANNEXE C - DÉTAILS DES DÉPENSES');
  addSpace(ctx, 5);
  
  // Par catégorie
  addSubsection(ctx, 'Dépenses par catégorie');
  addSpace(ctx, 3);
  
  const categoryRows = Object.entries(kpis.expensesByCategory).map(([category, amount]) => ({
    values: [category, `${(amount as number).toLocaleString('fr-CA')} $`],
  }));
  
  categoryRows.push({
    values: ['TOTAL', `${kpis.totalExpenses.toLocaleString('fr-CA')} $`],
  });
  
  addTable(
    ctx,
    [
      { header: 'Catégorie', width: 0.6, align: 'left' },
      { header: 'Montant annuel', width: 0.4, align: 'right' },
    ],
    categoryRows
  );
  
  addSpace(ctx, 10);
  
  // Détail ligne par ligne
  addSubsection(ctx, 'Détail des dépenses');
  addSpace(ctx, 3);
  
  if (inputs.expenses && inputs.expenses.length > 0) {
    const detailRows = inputs.expenses.map((expense) => {
      const category = expense.category || 'Autre';
      const type = EXPENSE_TYPE_LABELS[expense.type] || expense.type;
      
      let inputText = '';
      let annualText = '';
      const amount = expense.amount.value;
      
      if (expense.type === 'FIXED_ANNUAL') {
        inputText = `${amount.toLocaleString('fr-CA')} $`;
        annualText = inputText;
      } else if (expense.type === 'FIXED_MONTHLY') {
        inputText = `${amount.toLocaleString('fr-CA')} $ / mois`;
        annualText = `${(amount * 12).toLocaleString('fr-CA')} $`;
      } else if (expense.type === 'PERCENTAGE_REVENUE') {
        inputText = `${amount.toFixed(2)} %`;
        const annual = (kpis.annualRevenue * amount) / 100;
        annualText = `${annual.toLocaleString('fr-CA')} $`;
      } else if (expense.type === 'PERCENTAGE_PROPERTY_VALUE') {
        inputText = `${amount.toFixed(2)} %`;
        const purchasePrice = inputs.financing.purchasePrice.value;
        const annual = (purchasePrice * amount) / 100;
        annualText = `${annual.toLocaleString('fr-CA')} $`;
      }
      
      return {
        values: [expense.name, category, type, inputText, annualText],
      };
    });
    
    addTable(
      ctx,
      [
        { header: 'Dépense', width: 0.25, align: 'left' },
        { header: 'Catégorie', width: 0.15, align: 'left' },
        { header: 'Type', width: 0.2, align: 'left' },
        { header: 'Valeur entrée', width: 0.2, align: 'right' },
        { header: 'Annuel', width: 0.2, align: 'right' },
      ],
      detailRows
    );
  }
  
  // ============================================================================
  // ANNEXE D - PROJECTIONS MULTI-ANNÉES
  // ============================================================================
  
  // Importer la fonction de calcul des projections
  const { calculateProjections } = await import('./projections');
  const { LIMITS } = await import('./constants');
  
  const projectionYears = Math.min(10, LIMITS.DEFAULT_PROJECTION_YEARS);
  const projection = calculateProjections(inputs, projectionYears);
  
  // Note dans le PDF si projections limitées
  const noteProjectionLimit = projectionYears < LIMITS.DEFAULT_PROJECTION_YEARS
    ? ` (limité à ${projectionYears} ans pour le rapport)`
    : '';
  
  ctx.pdf.addPage();
  ctx.currentPage++;
  ctx.yPosition = ctx.margin + 15;
  
  addSection(ctx, 'ANNEXE D - PROJECTIONS MULTI-ANNÉES');
  addSpace(ctx, PDF_SPACING.SUBSECTION_SPACING);
  
  addParagraph(ctx, `Projection sur ${projectionYears} ans avec hypothèses d'escalade et d'appréciation${noteProjectionLimit}.`);
  addSpace(ctx, PDF_SPACING.TABLE_SPACING);
  
  // Métriques globales de la projection
  addSubsection(ctx, 'Vue d\'ensemble');
  
  const projectionSummary = [
    { values: ['TRI (Taux de rendement interne)', `${projection.irr.toFixed(2)} %`] },
    { values: ['Retour total sur investissement', `${projection.totalReturn.toLocaleString('fr-CA')} $`] },
    { values: ['Rendement annuel moyen', `${projection.averageAnnualReturn.toLocaleString('fr-CA')} $`] },
    { values: ['ROE moyen', `${projection.averageROE.toFixed(2)} %`] },
    { values: ['', ''] },
    { values: ['Période de récupération (cashflow)', projection.paybackPeriodCashflow ? `${projection.paybackPeriodCashflow} ans` : 'N/A'] },
    { values: ['Période de récupération (profit total)', projection.paybackPeriodTotal ? `${projection.paybackPeriodTotal} ans` : 'N/A'] },
    { values: ['', ''] },
    { values: ['Taux d\'occupation break-even', `${projection.breakEvenOccupancy?.toFixed(1) || 'N/A'} %`] },
    { values: ['DSCR minimum', `${projection.minDSCR.toFixed(2)}`] },
    { values: ['LTV maximum', `${projection.maxLTV.toFixed(2)} %`] },
  ];
  
  addTable(
    ctx,
    [
      { header: 'Métrique', width: 0.6, align: 'left' },
      { header: 'Valeur', width: 0.4, align: 'right' },
    ],
    projectionSummary
  );
  
  addSpace(ctx, 10);
  
  // Scénarios de sortie
  addSubsection(ctx, 'Scénarios de sortie (vente)');
  addSpace(ctx, 3);
  
  const exitRows = projection.exitScenarios.slice(0, 5).map(exit => ({
    values: [
      `Année ${exit.year}`,
      `${exit.propertyValue.toLocaleString('fr-CA')} $`,
      `${exit.netProceeds.toLocaleString('fr-CA')} $`,
      `${exit.netProfit.toLocaleString('fr-CA')} $`,
      `${exit.moic.toFixed(2)}x`,
      `${exit.irr.toFixed(2)} %`,
    ],
  }));
  
  addTable(
    ctx,
    [
      { header: 'Année', width: 0.15, align: 'left' },
      { header: 'Valeur', width: 0.2, align: 'right' },
      { header: 'Net après vente', width: 0.2, align: 'right' },
      { header: 'Profit net', width: 0.2, align: 'right' },
      { header: 'MOIC', width: 0.1, align: 'right' },
      { header: 'TRI', width: 0.15, align: 'right' },
    ],
    exitRows
  );
  
  addSpace(ctx, 10);
  
  // Projection détaillée année par année (première moitié)
  addSubsection(ctx, 'Projection détaillée (années 1-5)');
  addSpace(ctx, 3);
  
  const firstHalfYears = projection.years.slice(0, Math.min(5, projection.years.length));
  const detailRows1 = firstHalfYears.map(year => ({
    values: [
      year.year.toString(),
      `${year.revenue.toLocaleString('fr-CA')}`,
      `${year.expenses.toLocaleString('fr-CA')}`,
      `${year.noi.toLocaleString('fr-CA')}`,
      `${year.cashflow.toLocaleString('fr-CA')}`,
      `${year.equity.toLocaleString('fr-CA')}`,
      `${year.dscr.toFixed(2)}`,
      `${year.roiTotal.toFixed(1)} %`,
    ],
  }));
  
  checkPageBreak(ctx, 80);
  
  addTable(
    ctx,
    [
      { header: 'An', width: 0.08, align: 'left' },
      { header: 'Revenus', width: 0.14, align: 'right' },
      { header: 'Dépenses', width: 0.14, align: 'right' },
      { header: 'NOI', width: 0.14, align: 'right' },
      { header: 'Cashflow', width: 0.14, align: 'right' },
      { header: 'Équité', width: 0.14, align: 'right' },
      { header: 'DSCR', width: 0.1, align: 'right' },
      { header: 'ROI', width: 0.12, align: 'right' },
    ],
    detailRows1
  );
  
  // Deuxième moitié si disponible
  if (projection.years.length > 5) {
    addSpace(ctx, 10);
    addSubsection(ctx, `Projection détaillée (années 6-${Math.min(10, projection.years.length)})`);
    addSpace(ctx, 3);
    
    const secondHalfYears = projection.years.slice(5, Math.min(10, projection.years.length));
    const detailRows2 = secondHalfYears.map(year => ({
      values: [
        year.year.toString(),
        `${year.revenue.toLocaleString('fr-CA')}`,
        `${year.expenses.toLocaleString('fr-CA')}`,
        `${year.noi.toLocaleString('fr-CA')}`,
        `${year.cashflow.toLocaleString('fr-CA')}`,
        `${year.equity.toLocaleString('fr-CA')}`,
        `${year.dscr.toFixed(2)}`,
        `${year.roiTotal.toFixed(1)} %`,
      ],
    }));
    
    checkPageBreak(ctx, 80);
    
    addTable(
      ctx,
      [
        { header: 'An', width: 0.08, align: 'left' },
        { header: 'Revenus', width: 0.14, align: 'right' },
        { header: 'Dépenses', width: 0.14, align: 'right' },
        { header: 'NOI', width: 0.14, align: 'right' },
        { header: 'Cashflow', width: 0.14, align: 'right' },
        { header: 'Équité', width: 0.14, align: 'right' },
        { header: 'DSCR', width: 0.1, align: 'right' },
        { header: 'ROI', width: 0.12, align: 'right' },
      ],
      detailRows2
    );
  }
  
  addSpace(ctx, 10);
  
  // Évolution du profit (graphique sous forme de tableau)
  addSubsection(ctx, 'Décomposition du profit annuel');
  addSpace(ctx, 3);
  
  const profitRows = projection.years.slice(0, Math.min(10, projection.years.length)).map(year => ({
    values: [
      year.year.toString(),
      formatCashflowValue(year.cashflow),
      `${year.principalPaid.toLocaleString('fr-CA')}`,
      `${year.appreciation.toLocaleString('fr-CA')}`,
      `${year.totalProfit.toLocaleString('fr-CA')}`,
      `${year.cumulativeTotalProfit.toLocaleString('fr-CA')}`,
    ],
  }));
  
  checkPageBreak(ctx, 80);
  
  addTable(
    ctx,
    [
      { header: 'Année', width: 0.1, align: 'left' },
      { header: 'Cashflow', width: 0.18, align: 'right' },
      { header: 'Capital', width: 0.18, align: 'right' },
      { header: 'Plus-value', width: 0.18, align: 'right' },
      { header: 'Total an', width: 0.18, align: 'right' },
      { header: 'Cumulé', width: 0.18, align: 'right' },
    ],
    profitRows
  );
  
  addSpace(ctx, PDF_SPACING.SUBSECTION_SPACING);
  addSmallText(ctx, 'Le profit total annuel combine : Cashflow (liquidités), Capitalisation (capital remboursé), Plus-value (appréciation de la propriété).');
  addSmallText(ctx, 'Note : Les valeurs négatives de cashflow sont affichées entre parenthèses.');
  
  // Finaliser toutes les pages avec pieds de page
  finalizeAllPages(ctx);
  
  // Télécharger
  ctx.pdf.save(filename);
  
  } catch (error) {
    console.error('Erreur lors de la génération du rapport PDF:', error);
    throw new Error(
      `Échec de la génération du rapport PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    );
  }
}

// ============================================================================
// FILE SYSTEM ACCESS API (SAVE/LOAD)
// ============================================================================

export async function saveProjectFile(project: Project): Promise<void> {
  try {
    // Vérifier si l'API File System Access est supportée
    const isSupported = typeof window !== 'undefined' && 
                       'showSaveFilePicker' in window &&
                       typeof (window as any).showSaveFilePicker === 'function';
    
    if (isSupported) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${project.name.replace(/[^a-z0-9]/gi, '_')}.json`,
        types: [
          {
            description: 'Projet Chalet JSON',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(exportProjectToJSON(project));
      await writable.close();
    } else {
      // Fallback pour navigateurs sans File System Access API
      downloadJSON(project, `${project.name}.json`);
    }
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Error saving file:', error);
      throw error;
    }
  }
}

export async function loadProjectFile(): Promise<Project | null> {
  try {
    // Vérifier si l'API File System Access est supportée
    const isSupported = typeof window !== 'undefined' && 
                       'showOpenFilePicker' in window &&
                       typeof (window as any).showOpenFilePicker === 'function';
    
    if (isSupported) {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Projet Chalet JSON',
            accept: { 'application/json': ['.json'] },
          },
        ],
        multiple: false,
      });

      const file = await handle.getFile();
      const content = await file.text();
      return importProjectFromJSON(content);
    } else {
      // Fallback avec input file classique
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const content = await file.text();
            resolve(importProjectFromJSON(content));
          } else {
            resolve(null);
          }
        };
        input.click();
      });
    }
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Error loading file:', error);
      throw error;
    }
    return null;
  }
}

