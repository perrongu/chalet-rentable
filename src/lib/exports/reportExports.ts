import type { Project, ProjectInputs, KPIResults } from "../../types";
import type { PDFContext } from "../pdfHelpers";
import { formatDateShort } from "../utils";
import { KPI_THRESHOLDS, PDF_SPACING } from "../constants";
import {
  formatCashflowValue,
  buildAnnexeA,
  buildAnnexeB,
  buildAnnexeC,
  buildAnnexeD,
} from "./reportAnnexes";

// Type for dynamically imported pdfHelpers
type PDFHelpers = Awaited<typeof import("../pdfHelpers")>;

// ============================================================================
// UTILITAIRES PDF
// ============================================================================

function getKPIColor(
  metric: "cashOnCash" | "capRate",
  value: number,
): "success" | "warning" | "danger" {
  const thresholds = KPI_THRESHOLDS[metric];
  if (value >= thresholds.good) return "success";
  if (value >= thresholds.medium) return "warning";
  return "danger";
}

// ============================================================================
// SECTION BUILDERS (private)
// ============================================================================

function buildCoverPage(
  ctx: PDFContext,
  h: PDFHelpers,
  project: Project,
  scenarioName: string,
): void {
  h.addSpace(ctx, PDF_SPACING.COVER_PAGE_TOP_MARGIN);
  h.addTitle(ctx, "ANALYSE DE RENTABILITÉ", true);
  h.addSpace(ctx, PDF_SPACING.SUBSECTION_SPACING);

  ctx.pdf.setFontSize(14);
  ctx.pdf.setFont("helvetica", "normal");
  ctx.pdf.setTextColor(100, 100, 100);
  const projectNameWidth = ctx.pdf.getTextWidth(project.name);
  ctx.pdf.text(
    project.name,
    (ctx.pageWidth - projectNameWidth) / 2,
    ctx.yPosition,
  );
  ctx.yPosition += PDF_SPACING.HEADER_BOTTOM_SPACING;

  ctx.pdf.setFontSize(12);
  const scenarioText = `Scénario : ${scenarioName}`;
  const scenarioWidth = ctx.pdf.getTextWidth(scenarioText);
  ctx.pdf.text(
    scenarioText,
    (ctx.pageWidth - scenarioWidth) / 2,
    ctx.yPosition,
  );
  ctx.yPosition += 10;

  const dateText = `Généré le ${formatDateShort(new Date())}`;
  const dateWidth = ctx.pdf.getTextWidth(dateText);
  ctx.pdf.text(dateText, (ctx.pageWidth - dateWidth) / 2, ctx.yPosition);
  ctx.yPosition += 30;

  if (project.description) {
    h.addParagraph(ctx, project.description);
  }
}

function buildExecutiveSummary(
  ctx: PDFContext,
  h: PDFHelpers,
  kpis: KPIResults,
): void {
  ctx.pdf.addPage();
  ctx.currentPage++;
  ctx.yPosition = ctx.margin + 15;

  h.addSection(ctx, "SOMMAIRE EXÉCUTIF");
  h.addSpace(ctx, 5);

  const roiColor: "success" | "warning" | "danger" =
    kpis.totalROI >= 10 ? "success" : kpis.totalROI >= 5 ? "warning" : "danger";
  const cashflowColor: "success" | "danger" =
    kpis.annualCashflow >= 0 ? "success" : "danger";

  h.addMetricGrid(ctx, [
    {
      label: "Cash-on-Cash",
      value: `${kpis.cashOnCash.toFixed(2)} %`,
      color: getKPIColor("cashOnCash", kpis.cashOnCash),
    },
    {
      label: "Cap Rate",
      value: `${kpis.capRate.toFixed(2)} %`,
      color: getKPIColor("capRate", kpis.capRate),
    },
    {
      label: "ROI Total",
      value: `${kpis.totalROI.toFixed(2)} %`,
      color: roiColor,
    },
    {
      label: "Cashflow annuel",
      value: formatCashflowValue(kpis.annualCashflow),
      color: cashflowColor,
    },
  ]);
  h.addSpace(ctx, PDF_SPACING.SECTION_SPACING);

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
          "Revenus annuels bruts",
          `${kpis.annualRevenue.toLocaleString("fr-CA")} $`,
        ],
      },
      { values: ["Nuitées vendues", `${kpis.nightsSold}`] },
      {
        values: [
          "Dépenses totales",
          `${kpis.totalExpenses.toLocaleString("fr-CA")} $`,
        ],
      },
      {
        values: [
          "NOI (Net Operating Income)",
          `${kpis.noi.toLocaleString("fr-CA")} $`,
        ],
        bold: true,
      },
      {
        values: [
          "Service de la dette",
          `${kpis.annualDebtService.toLocaleString("fr-CA")} $`,
        ],
      },
      {
        values: [
          "Cashflow annuel",
          `${kpis.annualCashflow.toLocaleString("fr-CA")} $`,
        ],
        bold: true,
        background: true,
      },
      { values: ["", ""] },
      {
        values: [
          "Capitalisation (an 1)",
          `${kpis.principalPaidFirstYear.toLocaleString("fr-CA")} $`,
        ],
      },
      {
        values: [
          "Plus-value (an 1)",
          `${kpis.propertyAppreciation.toLocaleString("fr-CA")} $`,
        ],
      },
      {
        values: [
          "Profit total annuel",
          `${kpis.totalAnnualProfit.toLocaleString("fr-CA")} $`,
        ],
        bold: true,
        background: true,
      },
    ],
  );

  h.addSpace(ctx, 10);
  h.addSubsection(ctx, "Investissement requis");
  h.addTable(
    ctx,
    [
      { header: "Composante", width: 0.6, align: "left" },
      { header: "Montant", width: 0.4, align: "right" },
    ],
    [
      {
        values: [
          "Mise de fonds",
          `${(kpis.initialInvestment - kpis.totalAcquisitionFees).toLocaleString("fr-CA")} $`,
        ],
      },
      {
        values: [
          "Frais d'acquisition",
          `${kpis.totalAcquisitionFees.toLocaleString("fr-CA")} $`,
        ],
      },
      {
        values: [
          "Investissement initial total",
          `${kpis.initialInvestment.toLocaleString("fr-CA")} $`,
        ],
        bold: true,
        background: true,
      },
    ],
  );

  h.addSpace(ctx, 10);
  h.addSubsection(ctx, "Décomposition du ROI");
  h.addTable(
    ctx,
    [
      { header: "Source", width: 0.4, align: "left" },
      { header: "Montant annuel", width: 0.3, align: "right" },
      { header: "ROI", width: 0.3, align: "right" },
    ],
    [
      {
        values: [
          "Cashflow",
          `${kpis.annualCashflow.toLocaleString("fr-CA")} $`,
          `${kpis.cashflowROI.toFixed(2)} %`,
        ],
      },
      {
        values: [
          "Capitalisation",
          `${kpis.principalPaidFirstYear.toLocaleString("fr-CA")} $`,
          `${kpis.capitalizationROI.toFixed(2)} %`,
        ],
      },
      {
        values: [
          "Plus-value",
          `${kpis.propertyAppreciation.toLocaleString("fr-CA")} $`,
          `${kpis.appreciationROI.toFixed(2)} %`,
        ],
      },
      {
        values: [
          "Total",
          `${kpis.totalAnnualProfit.toLocaleString("fr-CA")} $`,
          `${kpis.totalROI.toFixed(2)} %`,
        ],
        bold: true,
        background: true,
      },
    ],
  );
}

// ============================================================================
// EXPORT PDF PROFESSIONNEL (orchestrateur)
// ============================================================================

export async function exportProfessionalReportToPDF(
  project: Project,
  inputs: ProjectInputs,
  kpis: KPIResults,
  scenarioName: string,
  filename: string = "rapport-rentabilite.pdf",
): Promise<void> {
  try {
    const h = await import("../pdfHelpers");

    const ctx = h.createPDFContext(project.name);

    ctx.pdf.setProperties({
      title: `Analyse de rentabilité - ${project.name}`,
      subject: "Rapport d'analyse financière - Location court terme",
      author: "Chalet Rentable",
      creator: "Application Chalet Rentable",
      keywords:
        "immobilier, rentabilité, analyse financière, location court terme",
    });

    buildCoverPage(ctx, h, project, scenarioName);
    buildExecutiveSummary(ctx, h, kpis);
    buildAnnexeA(ctx, h, inputs, kpis);
    buildAnnexeB(ctx, h, kpis);
    buildAnnexeC(ctx, h, inputs, kpis);
    await buildAnnexeD(ctx, h, inputs);

    h.finalizeAllPages(ctx);
    ctx.pdf.save(filename);
  } catch {
    throw new Error(
      "Échec de la génération du rapport PDF. Veuillez réessayer.",
    );
  }
}
