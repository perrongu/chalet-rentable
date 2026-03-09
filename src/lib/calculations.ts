import type {
  ProjectInputs,
  KPIResults,
  CalculationTrace,
  SourceInfo,
} from "../types";
import { ExpenseType, PaymentFrequency } from "../types";
import { TRANSFER_DUTIES_TIERS } from "./constants";
import { extractValue, extractSource } from "./inputMutator";
import {
  calculateROI,
  calculateCashOnCash,
  calculateCapRate,
  calculateDSCR,
} from "./kpiRatios";
import { round, getPaymentsPerYear } from "./utils";

// ============================================================================
// CALCULS DE REVENUS
// ============================================================================

function calculateNightsSold(
  occupancyRate: number,
  daysPerYear: number = 365,
): { value: number; trace: CalculationTrace } {
  const nights = round(daysPerYear * (occupancyRate / 100));

  return {
    value: nights,
    trace: {
      formula: "Nuitées vendues = Jours par an × (Taux d'occupation / 100)",
      variables: {
        "Jours par an": daysPerYear,
        "Taux d'occupation (%)": occupancyRate,
      },
      result: nights,
    },
  };
}

function calculateAnnualRevenue(
  averageDailyRate: number,
  nightsSold: number,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  const revenue = round(averageDailyRate * nightsSold);

  return {
    value: revenue,
    trace: {
      formula:
        "Revenus annuels bruts = Tarif moyen par nuitée × Nuitées vendues",
      variables: {
        "Tarif moyen par nuitée ($)": averageDailyRate,
        "Nuitées vendues": nightsSold,
      },
      result: revenue,
      sources,
    },
  };
}

// ============================================================================
// CALCULS DE DÉPENSES
// ============================================================================

function calculateExpenses(
  expenseLines: ProjectInputs["expenses"],
  annualRevenue: number,
  purchasePrice: number,
): {
  total: number;
  byCategory: Record<string, number>;
  traces: CalculationTrace[];
  sources: SourceInfo[];
} {
  let total = 0;
  const byCategory: Record<string, number> = {};
  const traces: CalculationTrace[] = [];
  const sources: SourceInfo[] = [];

  expenseLines.forEach((line) => {
    const amount = extractValue(line.amount);
    const sourceInfo = extractSource(line.amount);
    let annualAmount = 0;

    switch (line.type) {
      case ExpenseType.FIXED_ANNUAL:
        annualAmount = amount;
        traces.push({
          formula: `${line.name} = Montant annuel`,
          variables: {
            "Montant annuel ($)": amount,
          },
          result: annualAmount,
          sources: sourceInfo ? [sourceInfo] : undefined,
        });
        break;

      case ExpenseType.FIXED_MONTHLY:
        annualAmount = amount * 12;
        traces.push({
          formula: `${line.name} = Montant mensuel × 12`,
          variables: {
            "Montant mensuel ($)": amount,
          },
          result: annualAmount,
          sources: sourceInfo ? [sourceInfo] : undefined,
        });
        break;

      case ExpenseType.PERCENTAGE_REVENUE:
        annualAmount = (annualRevenue * amount) / 100;
        traces.push({
          formula: `${line.name} = Revenus annuels bruts × (Pourcentage / 100)`,
          variables: {
            "Revenus annuels bruts ($)": annualRevenue,
            "Pourcentage (%)": amount,
          },
          result: annualAmount,
          sources: sourceInfo ? [sourceInfo] : undefined,
        });
        break;

      case ExpenseType.PERCENTAGE_PROPERTY_VALUE:
        if (purchasePrice <= 0) {
          annualAmount = 0;
          traces.push({
            formula: `${line.name} = Valeur propriété × (Pourcentage / 100)`,
            variables: {
              "Valeur propriété ($)": purchasePrice,
              "Pourcentage (%)": amount,
              Avertissement: "Prix d'achat invalide - montant = 0",
            },
            result: 0,
            sources: sourceInfo ? [sourceInfo] : undefined,
          });
        } else {
          annualAmount = (purchasePrice * amount) / 100;
          traces.push({
            formula: `${line.name} = Valeur propriété × (Pourcentage / 100)`,
            variables: {
              "Valeur propriété ($)": purchasePrice,
              "Pourcentage (%)": amount,
            },
            result: annualAmount,
            sources: sourceInfo ? [sourceInfo] : undefined,
          });
        }
        break;
    }

    annualAmount = round(annualAmount);
    total += annualAmount;

    const category = line.category || "Autre";
    byCategory[category] = (byCategory[category] || 0) + annualAmount;

    if (sourceInfo) {
      sources.push(sourceInfo);
    }
  });

  return {
    total: round(total),
    byCategory,
    traces,
    sources,
  };
}

// ============================================================================
// CALCULS DE FINANCEMENT
// ============================================================================

function calculateLoanAmount(
  purchasePrice: number,
  downPayment: number,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  const loan = round(purchasePrice - downPayment);

  return {
    value: loan,
    trace: {
      formula: "Montant du prêt = Prix d'achat - Mise de fonds",
      variables: {
        "Prix d'achat ($)": purchasePrice,
        "Mise de fonds ($)": downPayment,
      },
      result: loan,
      sources,
    },
  };
}

function calculatePeriodicPayment(
  loanAmount: number,
  annualRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  const paymentsPerYear = getPaymentsPerYear(frequency);
  const totalPayments = amortizationYears * paymentsPerYear;
  const periodicRate = annualRate / 100 / paymentsPerYear;

  let payment = 0;
  if (periodicRate === 0) {
    // Cas sans intérêt
    payment = loanAmount / totalPayments;
  } else {
    // Formule standard d'annuité
    payment =
      (loanAmount * periodicRate * Math.pow(1 + periodicRate, totalPayments)) /
      (Math.pow(1 + periodicRate, totalPayments) - 1);
  }

  payment = round(payment);

  return {
    value: payment,
    trace: {
      formula:
        "Paiement périodique = (Prêt × r × (1+r)^n) / ((1+r)^n - 1)\noù r = taux périodique, n = nombre de paiements",
      variables: {
        "Montant du prêt ($)": loanAmount,
        "Taux annuel (%)": annualRate,
        "Taux périodique (%)": round(periodicRate * 100, 4),
        "Amortissement (années)": amortizationYears,
        "Paiements par an": paymentsPerYear,
        "Nombre total de paiements": totalPayments,
      },
      result: payment,
      sources,
    },
  };
}

function calculateAnnualDebtService(
  periodicPayment: number,
  frequency: PaymentFrequency,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  const paymentsPerYear = getPaymentsPerYear(frequency);
  const annual = round(periodicPayment * paymentsPerYear);

  return {
    value: annual,
    trace: {
      formula:
        "Service de la dette annuel = Paiement périodique × Paiements par an",
      variables: {
        "Paiement périodique ($)": periodicPayment,
        "Paiements par an": paymentsPerYear,
      },
      result: annual,
      sources,
    },
  };
}

// ============================================================================
// FRAIS D'ACQUISITION
// ============================================================================

function calculateTransferDuties(
  purchasePrice: number,
  municipalAssessment?: number,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  // Utiliser le maximum entre le prix d'achat et l'évaluation municipale
  // Si évaluation municipale n'est pas fournie, utiliser le prix d'achat
  const baseAmount =
    municipalAssessment !== undefined && municipalAssessment > 0
      ? Math.max(purchasePrice, municipalAssessment)
      : purchasePrice;

  let transferDuties = 0;
  const { TIER1_LIMIT, TIER2_LIMIT, TIER1_RATE, TIER2_RATE, TIER3_RATE } =
    TRANSFER_DUTIES_TIERS;

  // Barème progressif québécois:
  // 0.5% jusqu'à 52 800$
  // 1.0% de 52 800$ à 264 000$
  // 1.5% au-delà de 264 000$

  if (baseAmount <= TIER1_LIMIT) {
    transferDuties = baseAmount * TIER1_RATE;
  } else if (baseAmount <= TIER2_LIMIT) {
    transferDuties =
      TIER1_LIMIT * TIER1_RATE + (baseAmount - TIER1_LIMIT) * TIER2_RATE;
  } else {
    transferDuties =
      TIER1_LIMIT * TIER1_RATE +
      (TIER2_LIMIT - TIER1_LIMIT) * TIER2_RATE +
      (baseAmount - TIER2_LIMIT) * TIER3_RATE;
  }

  transferDuties = round(transferDuties);

  const variables: Record<string, number | string> = {
    "Prix d'achat ($)": purchasePrice,
  };

  if (municipalAssessment !== undefined && municipalAssessment > 0) {
    variables["Évaluation municipale ($)"] = municipalAssessment;
    variables["Montant de base ($)"] = baseAmount;
    variables["Note"] =
      baseAmount === purchasePrice
        ? "Prix d'achat ≥ Évaluation municipale"
        : "Évaluation municipale ≥ Prix d'achat";
  } else {
    variables["Note"] =
      "Évaluation municipale non fournie, utilisation du prix d'achat";
  }

  return {
    value: transferDuties,
    trace: {
      formula:
        "Droits de mutation (barème progressif QC):\n" +
        "- 0,5% jusqu'à 52 800$\n" +
        "- 1,0% de 52 800$ à 264 000$\n" +
        "- 1,5% au-delà de 264 000$",
      variables,
      result: transferDuties,
      sources,
    },
  };
}

function calculateTotalAcquisitionFees(
  transferDuties: number,
  notaryFees: number,
  other: number,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  const total = round(transferDuties + notaryFees + other);

  return {
    value: total,
    trace: {
      formula:
        "Frais d'acquisition = Droits de mutation + Frais notaire + Autres",
      variables: {
        "Droits de mutation ($)": transferDuties,
        "Frais notaire ($)": notaryFees,
        "Autres ($)": other,
      },
      result: total,
      sources,
    },
  };
}

function calculateInitialInvestment(
  downPayment: number,
  acquisitionFees: number,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  const initial = round(downPayment + acquisitionFees);

  return {
    value: initial,
    trace: {
      formula: "Investissement initial = Mise de fonds + Frais d'acquisition",
      variables: {
        "Mise de fonds ($)": downPayment,
        "Frais d'acquisition ($)": acquisitionFees,
      },
      result: initial,
      sources,
    },
  };
}

// ============================================================================
// MÉTRIQUES DE RENTABILITÉ
// ============================================================================

function calculateNOI(
  annualRevenue: number,
  totalExpenses: number,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  const noi = round(annualRevenue - totalExpenses);

  return {
    value: noi,
    trace: {
      formula:
        "NOI (Net Operating Income) = Revenus annuels bruts - Dépenses opérationnelles",
      variables: {
        "Revenus annuels bruts ($)": annualRevenue,
        "Dépenses opérationnelles ($)": totalExpenses,
      },
      result: noi,
      sources,
    },
  };
}

function calculateAnnualCashflow(
  annualRevenue: number,
  totalExpenses: number,
  annualDebtService: number,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  const cashflow = round(annualRevenue - totalExpenses - annualDebtService);

  return {
    value: cashflow,
    trace: {
      formula:
        "Cashflow annuel = Revenus bruts - Dépenses totales - Service de la dette",
      variables: {
        "Revenus annuels bruts ($)": annualRevenue,
        "Dépenses totales ($)": totalExpenses,
        "Service de la dette annuel ($)": annualDebtService,
      },
      result: cashflow,
      sources,
    },
  };
}

function calculatePrincipalPaidFirstYear(
  loanAmount: number,
  annualRate: number,
  frequency: PaymentFrequency,
  periodicPayment: number,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  const paymentsPerYear = getPaymentsPerYear(frequency);
  const periodicRate = annualRate / 100 / paymentsPerYear;

  let principalPaid = 0;
  let remainingBalance = loanAmount;

  // Calculer le capital remboursé pour chaque paiement de la première année
  for (let i = 0; i < paymentsPerYear; i++) {
    const interestPayment = remainingBalance * periodicRate;
    const principalPayment = periodicPayment - interestPayment;
    principalPaid += principalPayment;
    remainingBalance -= principalPayment;
  }

  principalPaid = round(principalPaid);

  return {
    value: principalPaid,
    trace: {
      formula:
        "Capitalisation = Somme du capital remboursé durant les paiements de la première année",
      variables: {
        "Montant du prêt ($)": loanAmount,
        "Taux annuel (%)": annualRate,
        "Paiement périodique ($)": periodicPayment,
        "Paiements par an": paymentsPerYear,
        "Capital remboursé ($)": principalPaid,
      },
      result: principalPaid,
      sources,
    },
  };
}

function calculatePropertyAppreciation(
  purchasePrice: number,
  appreciationRate: number,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  const appreciation = round(purchasePrice * (appreciationRate / 100));

  return {
    value: appreciation,
    trace: {
      formula: "Plus-value = Prix d'achat × (Taux d'appréciation / 100)",
      variables: {
        "Prix d'achat ($)": purchasePrice,
        "Taux d'appréciation annuel (%)": appreciationRate,
      },
      result: appreciation,
      sources,
    },
  };
}

// ============================================================================
// FONCTION PRINCIPALE DE CALCUL
// ============================================================================

export function calculateKPIs(inputs: ProjectInputs): KPIResults {
  // Extraction des valeurs
  const adr = extractValue(inputs.revenue.averageDailyRate);
  const occupancy = extractValue(inputs.revenue.occupancyRate);
  const daysPerYear = inputs.revenue.daysPerYear || 365;

  const purchasePrice = extractValue(inputs.financing.purchasePrice);
  const municipalAssessment = inputs.financing.municipalAssessment
    ? extractValue(inputs.financing.municipalAssessment)
    : undefined;
  const downPayment = extractValue(inputs.financing.downPayment);
  const interestRate = extractValue(inputs.financing.interestRate);
  const amortization = extractValue(inputs.financing.amortizationYears);
  const frequency = inputs.financing.paymentFrequency;
  const appreciationRate = extractValue(
    inputs.financing.annualAppreciationRate,
  );

  const notaryFees = extractValue(inputs.acquisitionFees.notaryFees);
  const otherFees = extractValue(inputs.acquisitionFees.other);

  // Collecte des sources
  const revenueSources = [
    extractSource(inputs.revenue.averageDailyRate),
    extractSource(inputs.revenue.occupancyRate),
  ].filter(Boolean) as SourceInfo[];

  const financingSources = [
    extractSource(inputs.financing.purchasePrice),
    extractSource(inputs.financing.downPayment),
    extractSource(inputs.financing.interestRate),
    extractSource(inputs.financing.amortizationYears),
  ].filter(Boolean) as SourceInfo[];

  const appreciationSources = [
    extractSource(inputs.financing.purchasePrice),
    extractSource(inputs.financing.annualAppreciationRate),
  ].filter(Boolean) as SourceInfo[];

  const transferDutiesSources = [
    extractSource(inputs.financing.purchasePrice),
    inputs.financing.municipalAssessment
      ? extractSource(inputs.financing.municipalAssessment)
      : undefined,
  ].filter(Boolean) as SourceInfo[];

  const feesSources = [
    extractSource(inputs.acquisitionFees.notaryFees),
    extractSource(inputs.acquisitionFees.other),
  ].filter(Boolean) as SourceInfo[];

  // Calculs en cascade
  const nightsSold = calculateNightsSold(occupancy, daysPerYear);
  const annualRevenue = calculateAnnualRevenue(
    adr,
    nightsSold.value,
    revenueSources,
  );
  const expenses = calculateExpenses(
    inputs.expenses,
    annualRevenue.value,
    purchasePrice,
  );
  const noi = calculateNOI(annualRevenue.value, expenses.total);
  const loanAmount = calculateLoanAmount(
    purchasePrice,
    downPayment,
    financingSources,
  );
  const periodicPayment = calculatePeriodicPayment(
    loanAmount.value,
    interestRate,
    amortization,
    frequency,
    financingSources,
  );
  const annualDebtService = calculateAnnualDebtService(
    periodicPayment.value,
    frequency,
    financingSources,
  );
  const transferDuties = calculateTransferDuties(
    purchasePrice,
    municipalAssessment,
    transferDutiesSources,
  );
  const totalAcquisitionFees = calculateTotalAcquisitionFees(
    transferDuties.value,
    notaryFees,
    otherFees,
    [...transferDutiesSources, ...feesSources],
  );
  const initialInvestment = calculateInitialInvestment(
    downPayment,
    totalAcquisitionFees.value,
    [...financingSources, ...feesSources],
  );
  const annualCashflow = calculateAnnualCashflow(
    annualRevenue.value,
    expenses.total,
    annualDebtService.value,
  );
  const principalPaidFirstYear = calculatePrincipalPaidFirstYear(
    loanAmount.value,
    interestRate,
    frequency,
    periodicPayment.value,
    financingSources,
  );
  const propertyAppreciation = calculatePropertyAppreciation(
    purchasePrice,
    appreciationRate,
    appreciationSources,
  );

  // Calculs des ROI
  const totalAnnualProfit =
    annualCashflow.value +
    principalPaidFirstYear.value +
    propertyAppreciation.value;
  const cashflowROI = calculateROI(
    annualCashflow.value,
    initialInvestment.value,
    "Cashflow",
  );
  const capitalizationROI = calculateROI(
    principalPaidFirstYear.value,
    initialInvestment.value,
    "Capitalisation",
  );
  const appreciationROI = calculateROI(
    propertyAppreciation.value,
    initialInvestment.value,
    "Plus-value",
  );
  const totalROI = calculateROI(
    totalAnnualProfit,
    initialInvestment.value,
    "Total",
  );

  const cashOnCash = calculateCashOnCash(
    annualCashflow.value,
    initialInvestment.value,
  );
  const capRate = calculateCapRate(
    annualRevenue.value,
    expenses.total,
    purchasePrice,
  );
  const dscr = calculateDSCR(noi.value, annualDebtService.value);

  // Construction du résultat
  return {
    nightsSold: nightsSold.value,
    annualRevenue: annualRevenue.value,
    totalExpenses: expenses.total,
    expensesByCategory: expenses.byCategory,
    noi: noi.value,
    loanAmount: loanAmount.value,
    periodicPayment: periodicPayment.value,
    annualDebtService: annualDebtService.value,
    transferDuties: transferDuties.value,
    totalAcquisitionFees: totalAcquisitionFees.value,
    initialInvestment: initialInvestment.value,
    annualCashflow: annualCashflow.value,
    principalPaidFirstYear: principalPaidFirstYear.value,
    propertyAppreciation: propertyAppreciation.value,
    totalAnnualProfit: totalAnnualProfit,
    cashflowROI: cashflowROI.value,
    capitalizationROI: capitalizationROI.value,
    appreciationROI: appreciationROI.value,
    totalROI: totalROI.value,
    cashOnCash: cashOnCash.value,
    capRate: capRate.value,
    dscr: dscr.value,
    traces: {
      nightsSold: nightsSold.trace,
      annualRevenue: annualRevenue.trace,
      totalExpenses: {
        formula: "Dépenses totales = Somme de toutes les lignes de dépenses",
        variables: Object.fromEntries(
          expenses.traces.map((t, i) => [`Ligne ${i + 1}`, t.result]),
        ),
        result: expenses.total,
        sources: expenses.sources.length > 0 ? expenses.sources : undefined,
      },
      noi: noi.trace,
      loanAmount: loanAmount.trace,
      periodicPayment: periodicPayment.trace,
      annualDebtService: annualDebtService.trace,
      transferDuties: transferDuties.trace,
      totalAcquisitionFees: totalAcquisitionFees.trace,
      initialInvestment: initialInvestment.trace,
      annualCashflow: annualCashflow.trace,
      principalPaidFirstYear: principalPaidFirstYear.trace,
      propertyAppreciation: propertyAppreciation.trace,
      totalAnnualProfit: {
        formula: "Profit total annuel = Cashflow + Capitalisation + Plus-value",
        variables: {
          "Cashflow annuel ($)": annualCashflow.value,
          "Capitalisation ($)": principalPaidFirstYear.value,
          "Plus-value ($)": propertyAppreciation.value,
        },
        result: totalAnnualProfit,
      },
      cashflowROI: cashflowROI.trace,
      capitalizationROI: capitalizationROI.trace,
      appreciationROI: appreciationROI.trace,
      totalROI: totalROI.trace,
      cashOnCash: cashOnCash.trace,
      capRate: capRate.trace,
      dscr: dscr.trace,
    },
  };
}

// Re-exports for backward compatibility
export { extractValue, setValueByPath } from "./inputMutator";
