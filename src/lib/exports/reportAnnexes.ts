import type { ProjectInputs, KPIResults } from "../../types";
import type { PDFContext } from "../pdfHelpers";
import {
  EXPENSE_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  PDF_SPACING,
  PDF_REPORT,
} from "../constants";

// Type for dynamically imported pdfHelpers
type PDFHelpers = Awaited<typeof import("../pdfHelpers")>;

// ============================================================================
// UTILITAIRES PARTAGÉS
// ============================================================================

export function formatCashflowValue(value: number): string {
  if (value >= 0) {
    return `${value.toLocaleString("fr-CA")} $`;
  } else {
    return `(${Math.abs(value).toLocaleString("fr-CA")} $)`;
  }
}

// ============================================================================
// ANNEXE A — PARAMÈTRES D'ENTRÉE
// ============================================================================

export function buildAnnexeA(
  ctx: PDFContext,
  h: PDFHelpers,
  inputs: ProjectInputs,
  kpis: KPIResults,
): void {
  ctx.pdf.addPage();
  ctx.currentPage++;
  ctx.yPosition = ctx.margin + 15;

  h.addSection(ctx, "ANNEXE A - PARAMÈTRES D'ENTRÉE");
  h.addSpace(ctx, 5);

  // Revenus
  h.addSubsection(ctx, "1. Revenus");
  const adr = inputs.revenue.averageDailyRate;
  const occupancy = inputs.revenue.occupancyRate;

  h.addSmallText(ctx, "Tarif moyen par nuitée (ADR) :");
  if (adr.range && adr.range.useRange) {
    h.addParagraph(
      ctx,
      `Valeur : ${adr.range.default.toLocaleString("fr-CA")} $ (plage : ${adr.range.min.toLocaleString("fr-CA")} $ - ${adr.range.max.toLocaleString("fr-CA")} $)`,
      5,
    );
  } else {
    h.addParagraph(ctx, `${adr.value.toLocaleString("fr-CA")} $`, 5);
  }
  if (adr.sourceInfo?.source) {
    h.addSmallText(ctx, `Source : ${adr.sourceInfo.source}`, 5);
  }

  h.addSpace(ctx, 3);
  h.addSmallText(ctx, "Taux d'occupation :");
  if (occupancy.range && occupancy.range.useRange) {
    h.addParagraph(
      ctx,
      `${occupancy.range.default.toFixed(1)} % (plage : ${occupancy.range.min.toFixed(1)} % - ${occupancy.range.max.toFixed(1)} %)`,
      5,
    );
  } else {
    h.addParagraph(ctx, `${occupancy.value.toFixed(1)} %`, 5);
  }
  if (occupancy.sourceInfo?.source) {
    h.addSmallText(ctx, `Source : ${occupancy.sourceInfo.source}`, 5);
  }

  h.addSpace(ctx, 5);

  // Financement
  h.addSubsection(ctx, "2. Financement");
  const financing = inputs.financing;

  h.addSmallText(ctx, "Prix d'achat :");
  h.addParagraph(
    ctx,
    `${financing.purchasePrice.value.toLocaleString("fr-CA")} $`,
    5,
  );
  h.addSmallText(ctx, "Mise de fonds :");
  h.addParagraph(
    ctx,
    `${financing.downPayment.value.toLocaleString("fr-CA")} $`,
    5,
  );
  h.addSmallText(ctx, "Taux d'intérêt :");
  h.addParagraph(ctx, `${financing.interestRate.value.toFixed(2)} %`, 5);
  h.addSmallText(ctx, "Amortissement :");
  h.addParagraph(ctx, `${financing.amortizationYears.value} ans`, 5);
  h.addSmallText(ctx, "Taux d'appréciation annuel :");
  h.addParagraph(
    ctx,
    `${financing.annualAppreciationRate.value.toFixed(2)} %`,
    5,
  );
  h.addSmallText(ctx, "Fréquence de paiement :");
  h.addParagraph(
    ctx,
    PAYMENT_FREQUENCY_LABELS[financing.paymentFrequency] ||
      financing.paymentFrequency,
    5,
  );

  h.addSpace(ctx, 5);

  // Frais d'acquisition
  h.addSubsection(ctx, "3. Frais d'acquisition");
  h.addSmallText(ctx, "Droits de mutation (calculés) :");
  h.addParagraph(ctx, `${kpis.transferDuties.toLocaleString("fr-CA")} $`, 5);
  h.addSmallText(ctx, "Frais de notaire :");
  h.addParagraph(
    ctx,
    `${inputs.acquisitionFees.notaryFees.value.toLocaleString("fr-CA")} $`,
    5,
  );
  h.addSmallText(ctx, "Autres frais :");
  h.addParagraph(
    ctx,
    `${inputs.acquisitionFees.other.value.toLocaleString("fr-CA")} $`,
    5,
  );

  h.addSpace(ctx, 5);

  // Dépenses opérationnelles
  h.addSubsection(ctx, "4. Dépenses opérationnelles");
  h.addSpace(ctx, 3);

  if (inputs.expenses && inputs.expenses.length > 0) {
    const expenseRows = inputs.expenses.map((expense) => {
      const amount = expense.amount.value;
      const amountText =
        expense.type === "PERCENTAGE_REVENUE" ||
        expense.type === "PERCENTAGE_PROPERTY_VALUE"
          ? `${amount.toFixed(2)} %`
          : `${amount.toLocaleString("fr-CA")} $`;
      return {
        values: [
          expense.name,
          EXPENSE_TYPE_LABELS[expense.type] || expense.type,
          amountText,
        ],
      };
    });

    h.addTable(
      ctx,
      [
        { header: "Dépense", width: 0.4, align: "left" },
        { header: "Type", width: 0.3, align: "left" },
        { header: "Montant", width: 0.3, align: "right" },
      ],
      expenseRows,
    );
  }

  // Paramètres de projection
  if (inputs.projectionSettings) {
    h.checkPageBreak(ctx, 50);
    h.addSpace(ctx, 5);
    h.addSubsection(ctx, "5. Paramètres de projection");
    const ps = inputs.projectionSettings;
    h.addSmallText(ctx, "Taux d'escalade des revenus :");
    h.addParagraph(
      ctx,
      `${ps.revenueEscalationRate.value.toFixed(2)} % par an`,
      5,
    );
    h.addSmallText(ctx, "Taux d'escalade des dépenses :");
    h.addParagraph(
      ctx,
      `${ps.expenseEscalationRate.value.toFixed(2)} % par an`,
      5,
    );
    h.addSmallText(ctx, "CAPEX annuel :");
    h.addParagraph(ctx, `${ps.capexRate.value.toFixed(2)} % de la valeur`, 5);
    h.addSmallText(ctx, "Taux d'actualisation :");
    h.addParagraph(ctx, `${ps.discountRate.value.toFixed(2)} %`, 5);
    h.addSmallText(ctx, "Frais de vente :");
    h.addParagraph(ctx, `${ps.saleCostsRate.value.toFixed(2)} %`, 5);
  }
}

// ============================================================================
// ANNEXE B — CALCULS ET FORMULES DES KPIs
// ============================================================================

export function buildAnnexeB(
  ctx: PDFContext,
  h: PDFHelpers,
  kpis: KPIResults,
): void {
  ctx.pdf.addPage();
  ctx.currentPage++;
  ctx.yPosition = ctx.margin + 15;

  h.addSection(ctx, "ANNEXE B - CALCULS ET FORMULES DES KPIs");
  h.addSpace(ctx, 5);
  h.addParagraph(
    ctx,
    "Cette annexe présente les formules détaillées et les calculs pour chaque indicateur de performance clé (KPI).",
  );
  h.addSpace(ctx, 8);

  const importantKPIs: Array<{ key: keyof typeof kpis.traces; label: string }> =
    [
      { key: "nightsSold", label: "Nuitées vendues" },
      { key: "annualRevenue", label: "Revenus annuels bruts" },
      { key: "totalExpenses", label: "Dépenses totales" },
      { key: "noi", label: "NOI (Net Operating Income)" },
      { key: "loanAmount", label: "Montant du prêt" },
      { key: "periodicPayment", label: "Paiement périodique" },
      { key: "annualDebtService", label: "Service de la dette annuel" },
      { key: "transferDuties", label: "Droits de mutation" },
      { key: "totalAcquisitionFees", label: "Frais d'acquisition totaux" },
      { key: "initialInvestment", label: "Investissement initial" },
      { key: "annualCashflow", label: "Cashflow annuel" },
      { key: "cashOnCash", label: "Cash-on-Cash" },
      { key: "capRate", label: "Cap Rate" },
      { key: "principalPaidFirstYear", label: "Capital remboursé (an 1)" },
      { key: "propertyAppreciation", label: "Appréciation de la propriété" },
      { key: "totalAnnualProfit", label: "Profit total annuel" },
      { key: "totalROI", label: "ROI Total" },
    ];

  importantKPIs.forEach((kpi) => {
    const trace = kpis.traces[kpi.key];
    if (trace) {
      const variables: Record<string, string> = {};
      Object.entries(trace.variables).forEach(([key, value]) => {
        variables[key] =
          typeof value === "number"
            ? value.toLocaleString("fr-CA")
            : String(value);
      });

      let resultText = "";
      const resultValue = trace.result;
      if (typeof resultValue === "number") {
        if (
          kpi.key.includes("Rate") ||
          kpi.key.includes("ROI") ||
          kpi.key === "cashOnCash" ||
          kpi.key === "capRate"
        ) {
          resultText = `${resultValue.toFixed(2)} %`;
        } else if (kpi.key === "nightsSold") {
          resultText = resultValue.toFixed(0);
        } else {
          resultText = `${resultValue.toLocaleString("fr-CA")} $`;
        }
      } else {
        resultText = String(resultValue);
      }

      h.addKPIDetail(ctx, kpi.label, trace.formula, variables, resultText);
    }
  });
}

// ============================================================================
// ANNEXE C — DÉTAILS DES DÉPENSES
// ============================================================================

export function buildAnnexeC(
  ctx: PDFContext,
  h: PDFHelpers,
  inputs: ProjectInputs,
  kpis: KPIResults,
): void {
  ctx.pdf.addPage();
  ctx.currentPage++;
  ctx.yPosition = ctx.margin + 15;

  h.addSection(ctx, "ANNEXE C - DÉTAILS DES DÉPENSES");
  h.addSpace(ctx, 5);

  h.addSubsection(ctx, "Dépenses par catégorie");
  h.addSpace(ctx, 3);

  const categoryRows = Object.entries(kpis.expensesByCategory).map(
    ([category, amount]) => ({
      values: [category, `${(amount as number).toLocaleString("fr-CA")} $`],
    }),
  );
  categoryRows.push({
    values: ["TOTAL", `${kpis.totalExpenses.toLocaleString("fr-CA")} $`],
  });

  h.addTable(
    ctx,
    [
      { header: "Catégorie", width: 0.6, align: "left" },
      { header: "Montant annuel", width: 0.4, align: "right" },
    ],
    categoryRows,
  );

  h.addSpace(ctx, 10);
  h.addSubsection(ctx, "Détail des dépenses");
  h.addSpace(ctx, 3);

  if (inputs.expenses && inputs.expenses.length > 0) {
    const detailRows = inputs.expenses.map((expense) => {
      const category = expense.category || "Autre";
      const type = EXPENSE_TYPE_LABELS[expense.type] || expense.type;
      const amount = expense.amount.value;
      let inputText = "";
      let annualText = "";

      if (expense.type === "FIXED_ANNUAL") {
        inputText = `${amount.toLocaleString("fr-CA")} $`;
        annualText = inputText;
      } else if (expense.type === "FIXED_MONTHLY") {
        inputText = `${amount.toLocaleString("fr-CA")} $ / mois`;
        annualText = `${(amount * 12).toLocaleString("fr-CA")} $`;
      } else if (expense.type === "PERCENTAGE_REVENUE") {
        inputText = `${amount.toFixed(2)} %`;
        annualText = `${((kpis.annualRevenue * amount) / 100).toLocaleString("fr-CA")} $`;
      } else if (expense.type === "PERCENTAGE_PROPERTY_VALUE") {
        inputText = `${amount.toFixed(2)} %`;
        annualText = `${((inputs.financing.purchasePrice.value * amount) / 100).toLocaleString("fr-CA")} $`;
      }

      return { values: [expense.name, category, type, inputText, annualText] };
    });

    h.addTable(
      ctx,
      [
        { header: "Dépense", width: 0.25, align: "left" },
        { header: "Catégorie", width: 0.15, align: "left" },
        { header: "Type", width: 0.2, align: "left" },
        { header: "Valeur entrée", width: 0.2, align: "right" },
        { header: "Annuel", width: 0.2, align: "right" },
      ],
      detailRows,
    );
  }
}

// ============================================================================
// ANNEXE D — PROJECTIONS MULTI-ANNÉES
// ============================================================================

export async function buildAnnexeD(
  ctx: PDFContext,
  h: PDFHelpers,
  inputs: ProjectInputs,
): Promise<void> {
  const { calculateProjections } = await import("../projections");
  const { LIMITS } = await import("../constants");

  const projectionYears = Math.min(
    PDF_REPORT.MAX_PROJECTION_YEARS,
    LIMITS.DEFAULT_PROJECTION_YEARS,
  );
  const projection = calculateProjections(inputs, projectionYears);

  const noteProjectionLimit =
    projectionYears < LIMITS.DEFAULT_PROJECTION_YEARS
      ? ` (limité à ${projectionYears} ans pour le rapport)`
      : "";

  ctx.pdf.addPage();
  ctx.currentPage++;
  ctx.yPosition = ctx.margin + 15;

  h.addSection(ctx, "ANNEXE D - PROJECTIONS MULTI-ANNÉES");
  h.addSpace(ctx, PDF_SPACING.SUBSECTION_SPACING);
  h.addParagraph(
    ctx,
    `Projection sur ${projectionYears} ans avec hypothèses d'escalade et d'appréciation${noteProjectionLimit}.`,
  );
  h.addSpace(ctx, PDF_SPACING.TABLE_SPACING);

  // Vue d'ensemble
  h.addSubsection(ctx, "Vue d'ensemble");
  h.addTable(
    ctx,
    [
      { header: "Métrique", width: 0.6, align: "left" },
      { header: "Valeur", width: 0.4, align: "right" },
    ],
    [
      {
        values: [
          "TRI (Taux de rendement interne)",
          `${projection.irr.toFixed(2)} %`,
        ],
      },
      {
        values: [
          "Retour total sur investissement",
          `${projection.totalReturn.toLocaleString("fr-CA")} $`,
        ],
      },
      {
        values: [
          "Rendement annuel moyen",
          `${projection.averageAnnualReturn.toLocaleString("fr-CA")} $`,
        ],
      },
      { values: ["ROE moyen", `${projection.averageROE.toFixed(2)} %`] },
      { values: ["", ""] },
      {
        values: [
          "Période de récupération (cashflow)",
          projection.paybackPeriodCashflow
            ? `${projection.paybackPeriodCashflow} ans`
            : "N/A",
        ],
      },
      {
        values: [
          "Période de récupération (profit total)",
          projection.paybackPeriodTotal
            ? `${projection.paybackPeriodTotal} ans`
            : "N/A",
        ],
      },
      { values: ["", ""] },
      {
        values: [
          "Taux d'occupation break-even",
          `${projection.breakEvenOccupancy?.toFixed(1) || "N/A"} %`,
        ],
      },
      { values: ["DSCR minimum", `${projection.minDSCR.toFixed(2)}`] },
      { values: ["LTV maximum", `${projection.maxLTV.toFixed(2)} %`] },
    ],
  );

  h.addSpace(ctx, 10);

  // Scénarios de sortie
  h.addSubsection(ctx, "Scénarios de sortie (vente)");
  h.addSpace(ctx, 3);
  h.addTable(
    ctx,
    [
      { header: "Année", width: 0.15, align: "left" },
      { header: "Valeur", width: 0.2, align: "right" },
      { header: "Net après vente", width: 0.2, align: "right" },
      { header: "Profit net", width: 0.2, align: "right" },
      { header: "MOIC", width: 0.1, align: "right" },
      { header: "TRI", width: 0.15, align: "right" },
    ],
    projection.exitScenarios
      .slice(0, PDF_REPORT.MAX_EXIT_SCENARIOS)
      .map((exit) => ({
        values: [
          `Année ${exit.year}`,
          `${exit.propertyValue.toLocaleString("fr-CA")} $`,
          `${exit.netProceeds.toLocaleString("fr-CA")} $`,
          `${exit.netProfit.toLocaleString("fr-CA")} $`,
          `${exit.moic.toFixed(2)}x`,
          `${exit.irr.toFixed(2)} %`,
        ],
      })),
  );

  h.addSpace(ctx, 10);

  const yearTableColumns = [
    { header: "An", width: 0.08, align: "left" as const },
    { header: "Revenus", width: 0.14, align: "right" as const },
    { header: "Dépenses", width: 0.14, align: "right" as const },
    { header: "NOI", width: 0.14, align: "right" as const },
    { header: "Cashflow", width: 0.14, align: "right" as const },
    { header: "Équité", width: 0.14, align: "right" as const },
    { header: "DSCR", width: 0.1, align: "right" as const },
    { header: "ROI", width: 0.12, align: "right" as const },
  ];

  const formatYearRow = (year: (typeof projection.years)[0]) => ({
    values: [
      year.year.toString(),
      `${year.revenue.toLocaleString("fr-CA")}`,
      `${year.expenses.toLocaleString("fr-CA")}`,
      `${year.noi.toLocaleString("fr-CA")}`,
      `${year.cashflow.toLocaleString("fr-CA")}`,
      `${year.equity.toLocaleString("fr-CA")}`,
      `${year.dscr.toFixed(2)}`,
      `${year.roiTotal.toFixed(1)} %`,
    ],
  });

  const split = PDF_REPORT.YEAR_TABLE_SPLIT;
  const maxYrs = PDF_REPORT.MAX_PROJECTION_YEARS;

  // Années 1-{split}
  h.addSubsection(ctx, `Projection détaillée (années 1-${split})`);
  h.addSpace(ctx, 3);
  h.checkPageBreak(ctx, 80);
  h.addTable(
    ctx,
    yearTableColumns,
    projection.years
      .slice(0, Math.min(split, projection.years.length))
      .map(formatYearRow),
  );

  // Années {split+1}-{maxYrs}
  if (projection.years.length > split) {
    h.addSpace(ctx, 10);
    h.addSubsection(
      ctx,
      `Projection détaillée (années ${split + 1}-${Math.min(maxYrs, projection.years.length)})`,
    );
    h.addSpace(ctx, 3);
    h.checkPageBreak(ctx, 80);
    h.addTable(
      ctx,
      yearTableColumns,
      projection.years
        .slice(split, Math.min(maxYrs, projection.years.length))
        .map(formatYearRow),
    );
  }

  h.addSpace(ctx, 10);

  // Décomposition du profit
  h.addSubsection(ctx, "Décomposition du profit annuel");
  h.addSpace(ctx, 3);
  h.checkPageBreak(ctx, 80);
  h.addTable(
    ctx,
    [
      { header: "Année", width: 0.1, align: "left" },
      { header: "Cashflow", width: 0.18, align: "right" },
      { header: "Capital", width: 0.18, align: "right" },
      { header: "Plus-value", width: 0.18, align: "right" },
      { header: "Total an", width: 0.18, align: "right" },
      { header: "Cumulé", width: 0.18, align: "right" },
    ],
    projection.years
      .slice(0, Math.min(maxYrs, projection.years.length))
      .map((year) => ({
        values: [
          year.year.toString(),
          formatCashflowValue(year.cashflow),
          `${year.principalPaid.toLocaleString("fr-CA")}`,
          `${year.appreciation.toLocaleString("fr-CA")}`,
          `${year.totalProfit.toLocaleString("fr-CA")}`,
          `${year.cumulativeTotalProfit.toLocaleString("fr-CA")}`,
        ],
      })),
  );

  h.addSpace(ctx, PDF_SPACING.SUBSECTION_SPACING);
  h.addSmallText(
    ctx,
    "Le profit total annuel combine : Cashflow (liquidités), Capitalisation (capital remboursé), Plus-value (appréciation de la propriété).",
  );
  h.addSmallText(
    ctx,
    "Note : Les valeurs négatives de cashflow sont affichées entre parenthèses.",
  );
}
