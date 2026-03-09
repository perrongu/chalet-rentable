import type {
  KPIResults,
  SensitivityAnalysis1D,
  SensitivityAnalysis2D,
} from "../../types";
import { arrayToCSVLine } from "../utils";

// ============================================================================
// UTILITAIRE DE TÉLÉCHARGEMENT EXCEL
// ============================================================================

async function downloadWorkbook(
  workbook: import("exceljs").Workbook,
  filename: string,
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// EXPORT EXCEL
// ============================================================================

export async function exportKPIsToExcel(
  scenarios: Array<{ name: string; kpis: KPIResults }>,
  filename: string = "analyse-rentabilite.xlsx",
) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  // Feuille 1: Comparaison des scénarios
  const ws1 = workbook.addWorksheet("Comparaison");
  const comparisonData: (string | number)[][] = [
    ["Métrique", ...scenarios.map((s) => s.name)],
    ["Nuitées vendues", ...scenarios.map((s) => s.kpis.nightsSold)],
    [
      "Revenus annuels bruts ($)",
      ...scenarios.map((s) => s.kpis.annualRevenue),
    ],
    ["Dépenses totales ($)", ...scenarios.map((s) => s.kpis.totalExpenses)],
    ["Montant du prêt ($)", ...scenarios.map((s) => s.kpis.loanAmount)],
    [
      "Paiement périodique ($)",
      ...scenarios.map((s) => s.kpis.periodicPayment),
    ],
    [
      "Service de la dette annuel ($)",
      ...scenarios.map((s) => s.kpis.annualDebtService),
    ],
    [
      "Frais d'acquisition ($)",
      ...scenarios.map((s) => s.kpis.totalAcquisitionFees),
    ],
    [
      "Investissement initial ($)",
      ...scenarios.map((s) => s.kpis.initialInvestment),
    ],
    ["Cashflow annuel ($)", ...scenarios.map((s) => s.kpis.annualCashflow)],
    ["Cash-on-Cash (%)", ...scenarios.map((s) => s.kpis.cashOnCash)],
    ["Cap Rate (%)", ...scenarios.map((s) => s.kpis.capRate)],
  ];
  comparisonData.forEach((row) => ws1.addRow(row));

  // Feuille 2: Détails par catégorie de dépenses (premier scénario)
  if (scenarios.length > 0) {
    const ws2 = workbook.addWorksheet("Dépenses par catégorie");
    ws2.addRow(["Catégorie", "Montant ($)"]);
    Object.entries(scenarios[0].kpis.expensesByCategory).forEach(
      ([category, amount]) => {
        ws2.addRow([category, amount]);
      },
    );
    ws2.addRow(["TOTAL", scenarios[0].kpis.totalExpenses]);
  }

  await downloadWorkbook(workbook, filename);
}

export async function exportSensitivityToExcel(
  analysis: SensitivityAnalysis1D,
  filename: string = "analyse-sensibilite.xlsx",
) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  // Feuille 1: Impacts relatifs (tornado)
  if (analysis.results) {
    const ws1 = workbook.addWorksheet("Impacts");
    [
      ["Paramètre", "Impact Min", "Impact Max", "Impact Relatif"],
      ...analysis.results.impacts.map((impact) => [
        impact.label,
        impact.impactLow,
        impact.impactHigh,
        impact.relativeImpact,
      ]),
    ].forEach((row) => ws1.addRow(row));

    // Feuille 2+: Résultats détaillés par paramètre
    analysis.results.detailedResults.forEach((result, index) => {
      const ws = workbook.addWorksheet(`Param ${index + 1}`);
      ws.addRow(["Valeur du paramètre", "Valeur de l'objectif"]);
      result.values.forEach((v) => ws.addRow([v.paramValue, v.objectiveValue]));
    });
  }

  await downloadWorkbook(workbook, filename);
}

export async function exportHeatmapToExcel(
  analysis: SensitivityAnalysis2D,
  filename: string = "heatmap.xlsx",
) {
  if (!analysis.results) return;

  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Heatmap");

  // Ligne d'en-tête avec les valeurs X
  ws.addRow(["", ...analysis.results.xValues.map((v) => v.toFixed(2))]);

  // Lignes de données avec les valeurs Y
  analysis.results.yValues.forEach((yValue, rowIndex) => {
    ws.addRow([yValue.toFixed(2), ...analysis.results!.grid[rowIndex]]);
  });

  await downloadWorkbook(workbook, filename);
}

// ============================================================================
// EXPORT CSV (RFC 4180 compliant)
// ============================================================================

export function exportToCSV(
  data: Array<Record<string, unknown>>,
  filename: string = "export.csv",
) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    arrayToCSVLine(headers),
    ...data.map((row) => arrayToCSVLine(headers.map((h) => row[h]))),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
