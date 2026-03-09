import type { CalculationTrace, SourceInfo } from "../types";
import { round } from "./utils";

// ============================================================================
// CALCULS DE RATIOS ET ROI
// ============================================================================

export function calculateROI(
  profit: number,
  initialInvestment: number,
  label: string,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  // Éviter division par zéro
  if (initialInvestment <= 0) {
    return {
      value: 0,
      trace: {
        formula: `${label} ROI (%) = (${label} / Investissement initial) × 100`,
        variables: {
          [`${label} ($)`]: profit,
          "Investissement initial ($)": initialInvestment,
          Note: "Division par zéro évitée - investissement initial invalide",
        },
        result: 0,
        sources,
      },
    };
  }

  const roi = round((profit / initialInvestment) * 100, 2);

  return {
    value: roi,
    trace: {
      formula: `${label} ROI (%) = (${label} / Investissement initial) × 100`,
      variables: {
        [`${label} ($)`]: profit,
        "Investissement initial ($)": initialInvestment,
      },
      result: roi,
      sources,
    },
  };
}

export function calculateCashOnCash(
  annualCashflow: number,
  initialInvestment: number,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  // Éviter division par zéro
  if (initialInvestment <= 0) {
    return {
      value: 0,
      trace: {
        formula:
          "Cash-on-Cash (%) = (Cashflow annuel / Investissement initial) × 100",
        variables: {
          "Cashflow annuel ($)": annualCashflow,
          "Investissement initial ($)": initialInvestment,
          Note: "Division par zéro évitée - investissement initial invalide",
        },
        result: 0,
        sources,
      },
    };
  }

  const coc = round((annualCashflow / initialInvestment) * 100, 2);

  return {
    value: coc,
    trace: {
      formula:
        "Cash-on-Cash (%) = (Cashflow annuel / Investissement initial) × 100",
      variables: {
        "Cashflow annuel ($)": annualCashflow,
        "Investissement initial ($)": initialInvestment,
      },
      result: coc,
      sources,
    },
  };
}

export function calculateCapRate(
  annualRevenue: number,
  totalExpenses: number,
  purchasePrice: number,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  const noi = annualRevenue - totalExpenses; // Net Operating Income

  // Éviter division par zéro
  if (purchasePrice <= 0) {
    return {
      value: 0,
      trace: {
        formula:
          "Cap Rate (%) = (NOI / Prix d'achat) × 100\noù NOI = Revenus bruts - Dépenses (excluant service de la dette)",
        variables: {
          "Revenus annuels bruts ($)": annualRevenue,
          "Dépenses totales ($)": totalExpenses,
          "NOI ($)": round(noi),
          "Prix d'achat ($)": purchasePrice,
          Note: "Division par zéro évitée - prix d'achat invalide",
        },
        result: 0,
        sources,
      },
    };
  }

  const capRate = round((noi / purchasePrice) * 100, 2);

  return {
    value: capRate,
    trace: {
      formula:
        "Cap Rate (%) = (NOI / Prix d'achat) × 100\noù NOI = Revenus bruts - Dépenses (excluant service de la dette)",
      variables: {
        "Revenus annuels bruts ($)": annualRevenue,
        "Dépenses totales ($)": totalExpenses,
        "NOI ($)": round(noi),
        "Prix d'achat ($)": purchasePrice,
      },
      result: capRate,
      sources,
    },
  };
}

export function calculateDSCR(
  noi: number,
  annualDebtService: number,
  sources?: SourceInfo[],
): { value: number; trace: CalculationTrace } {
  // Éviter division par zéro
  if (annualDebtService <= 0) {
    return {
      value: 0,
      trace: {
        formula: "DSCR = NOI / Service de la dette annuel",
        variables: {
          "NOI ($)": noi,
          "Service de la dette annuel ($)": annualDebtService,
          Note: "Division par zéro évitée - service de dette invalide",
        },
        result: 0,
        sources,
      },
    };
  }

  const dscr = round(noi / annualDebtService, 2);

  return {
    value: dscr,
    trace: {
      formula: "DSCR = NOI / Service de la dette annuel",
      variables: {
        "NOI ($)": noi,
        "Service de la dette annuel ($)": annualDebtService,
      },
      result: dscr,
      sources,
    },
  };
}
