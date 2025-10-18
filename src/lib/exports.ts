import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type {
  Project,
  KPIResults,
  Scenario,
  SensitivityAnalysis1D,
  SensitivityAnalysis2D,
} from '../types';
import { arrayToCSVLine, formatDateShort } from './utils';

// ============================================================================
// EXPORT JSON (PROJET COMPLET)
// ============================================================================

export function exportProjectToJSON(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectFromJSON(jsonString: string): Project {
  const project = JSON.parse(jsonString);
  
  // Convertir les dates string en objets Date
  project.createdAt = new Date(project.createdAt);
  project.updatedAt = new Date(project.updatedAt);
  
  project.scenarios.forEach((scenario: Scenario) => {
    scenario.createdAt = new Date(scenario.createdAt);
    scenario.updatedAt = new Date(scenario.updatedAt);
  });
  
  project.sensitivityAnalyses1D.forEach((analysis: SensitivityAnalysis1D) => {
    analysis.createdAt = new Date(analysis.createdAt);
  });
  
  project.sensitivityAnalyses2D.forEach((analysis: SensitivityAnalysis2D) => {
    analysis.createdAt = new Date(analysis.createdAt);
  });
  
  return project;
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

