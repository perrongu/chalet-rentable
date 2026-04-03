import type { ProjectInputs, KPIResults } from "../types";
import { calculateKPIs, setValueByPath } from "./calculations";
import { extractValue } from "./inputMutator";
import { round } from "./utils";

// ============================================================================
// TYPES
// ============================================================================

export type GoalSeekTarget = "dscr" | "annualCashflow" | "capRate";
export type GoalSeekVariable =
  | "financing.purchasePrice"
  | "revenue.averageDailyRate"
  | "revenue.occupancyRate";

export interface GoalSeekDetail {
  label: string;
  value: string;
}

export interface GoalSeekResult {
  solved: boolean;
  value: number;
  formula: string;
  verification: {
    targetKPI: string;
    targetValue: number;
    achievedValue: number;
  };
  details?: GoalSeekDetail[];
  error?: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MAX_ITERATIONS = 50;
const TOLERANCE = 0.01;
const BISECTION_LOWER_BOUND_PRICE = 1000;
const BISECTION_UPPER_BOUND_PRICE = 10_000_000;
const BISECTION_LOWER_BOUND_ADR = 1;
const BISECTION_UPPER_BOUND_ADR = 5000;
const BISECTION_LOWER_BOUND_OCC = 1;
const BISECTION_UPPER_BOUND_OCC = 100;

const TARGET_LABELS: Record<GoalSeekTarget, string> = {
  dscr: "DSCR",
  annualCashflow: "Cashflow annuel",
  capRate: "Cap Rate",
};

const VARIABLE_LABELS: Record<GoalSeekVariable, string> = {
  "financing.purchasePrice": "Prix d'achat",
  "revenue.averageDailyRate": "Tarif moyen (ADR)",
  "revenue.occupancyRate": "Taux d'occupation",
};

// ============================================================================
// EXTRACTION DE KPI CIBLE
// ============================================================================

function getTargetKPIValue(kpis: KPIResults, target: GoalSeekTarget): number {
  const value = kpis[target];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return value;
}

// ============================================================================
// APPLICATION DE VALEUR TEST (avec co-variation mise de fonds)
// ============================================================================

/**
 * Applique une valeur test aux inputs en co-variant les champs dépendants.
 * Quand on fait varier le prix d'achat, la mise de fonds doit maintenir
 * le même pourcentage pour que le calcul reste cohérent.
 */
function applyTestValue(
  inputs: ProjectInputs,
  solveFor: GoalSeekVariable,
  testValue: number,
  downPaymentPercent: number,
): ProjectInputs {
  const withValue = setValueByPath(inputs, solveFor, testValue);

  if (solveFor === "financing.purchasePrice") {
    return setValueByPath(
      withValue,
      "financing.downPayment",
      round(testValue * downPaymentPercent),
    );
  }

  return withValue;
}

// ============================================================================
// RÉSOLUTION PAR BISECTION
// ============================================================================

function solveByBisection(
  inputs: ProjectInputs,
  target: GoalSeekTarget,
  targetValue: number,
  solveFor: GoalSeekVariable,
  lowerBound: number,
  upperBound: number,
): GoalSeekResult {
  // Calculer le % de mise de fonds pour co-variation
  const currentPrice = extractValue(inputs.financing.purchasePrice);
  const currentDown = extractValue(inputs.financing.downPayment);
  const rawPercent = currentPrice > 0 ? currentDown / currentPrice : 0;
  const downPaymentPercent = Number.isFinite(rawPercent) ? rawPercent : 0;

  let lo = lowerBound;
  let hi = upperBound;

  // Évaluer aux bornes pour vérifier que la solution existe
  const kpisLo = calculateKPIs(
    applyTestValue(inputs, solveFor, lo, downPaymentPercent),
  );
  const kpisHi = calculateKPIs(
    applyTestValue(inputs, solveFor, hi, downPaymentPercent),
  );
  const valLo = getTargetKPIValue(kpisLo, target);
  const valHi = getTargetKPIValue(kpisHi, target);

  // Vérifier que la cible est dans l'intervalle
  const targetInRange =
    targetValue >= Math.min(valLo, valHi) &&
    targetValue <= Math.max(valLo, valHi);

  if (!targetInRange) {
    return {
      solved: false,
      value: 0,
      formula: "",
      verification: { targetKPI: target, targetValue, achievedValue: 0 },
      error: `Objectif ${targetValue} hors de l'intervalle atteignable [${valLo.toFixed(2)}, ${valHi.toFixed(2)}]`,
    };
  }

  // Déterminer la direction (croissant ou décroissant)
  const increasing = valHi > valLo;

  let mid = (lo + hi) / 2;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    mid = (lo + hi) / 2;
    const kpisMid = calculateKPIs(
      applyTestValue(inputs, solveFor, mid, downPaymentPercent),
    );
    const valMid = getTargetKPIValue(kpisMid, target);

    if (Math.abs(valMid - targetValue) < TOLERANCE) {
      return buildResult(
        inputs,
        target,
        targetValue,
        solveFor,
        mid,
        downPaymentPercent,
      );
    }

    if (increasing) {
      if (valMid < targetValue) {
        lo = mid;
      } else {
        hi = mid;
      }
    } else {
      if (valMid > targetValue) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
  }

  // Retourner la meilleure approximation
  return buildResult(
    inputs,
    target,
    targetValue,
    solveFor,
    mid,
    downPaymentPercent,
  );
}

// ============================================================================
// CONSTRUCTION DU RÉSULTAT
// ============================================================================

function buildResult(
  inputs: ProjectInputs,
  target: GoalSeekTarget,
  targetValue: number,
  solveFor: GoalSeekVariable,
  solvedValue: number,
  downPaymentPercent: number,
): GoalSeekResult {
  const testInputs = applyTestValue(
    inputs,
    solveFor,
    solvedValue,
    downPaymentPercent,
  );
  const verificationKPIs = calculateKPIs(testInputs);
  const achievedValue = getTargetKPIValue(verificationKPIs, target);

  const currentValue = extractValue(
    solveFor === "financing.purchasePrice"
      ? inputs.financing.purchasePrice
      : solveFor === "revenue.averageDailyRate"
        ? inputs.revenue.averageDailyRate
        : inputs.revenue.occupancyRate,
  );

  const formula =
    `Pour atteindre ${TARGET_LABELS[target]} = ${targetValue}, ` +
    `${VARIABLE_LABELS[solveFor]} doit passer de ${formatValue(currentValue, solveFor)} ` +
    `à ${formatValue(round(solvedValue, 2), solveFor)}`;

  // Construire les détails intermédiaires
  const details = buildDetails(
    verificationKPIs,
    solveFor,
    target,
    solvedValue,
    downPaymentPercent,
  );

  return {
    solved: Math.abs(achievedValue - targetValue) < TOLERANCE * 10,
    value: round(solvedValue, 2),
    formula,
    verification: {
      targetKPI: TARGET_LABELS[target],
      targetValue,
      achievedValue: round(achievedValue, 2),
    },
    details,
  };
}

function buildDetails(
  kpis: KPIResults,
  solveFor: GoalSeekVariable,
  target: GoalSeekTarget,
  solvedValue: number,
  downPaymentPercent: number,
): GoalSeekDetail[] {
  const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-CA")} $`;
  const pct = (n: number) => `${round(n, 1)} %`;

  const kpiValue =
    target === "annualCashflow"
      ? fmt(kpis[target])
      : target === "capRate"
        ? pct(kpis[target])
        : String(round(kpis[target], 2));

  switch (solveFor) {
    case "financing.purchasePrice": {
      const downPayment = round(solvedValue * downPaymentPercent);
      const loan = round(solvedValue - downPayment);
      return [
        { label: "Prix d'achat", value: fmt(solvedValue) },
        {
          label: "Mise de fonds",
          value: `${fmt(downPayment)} (${pct(downPaymentPercent * 100)})`,
        },
        { label: "Emprunt", value: fmt(loan) },
        {
          label: "Service de dette annuel",
          value: fmt(kpis.annualDebtService),
        },
        { label: TARGET_LABELS[target], value: kpiValue },
      ];
    }
    case "revenue.averageDailyRate":
      return [
        { label: "Tarif moyen (ADR)", value: fmt(solvedValue) },
        { label: "Revenus annuels", value: fmt(kpis.annualRevenue) },
        { label: "NOI", value: fmt(kpis.noi) },
        { label: TARGET_LABELS[target], value: kpiValue },
      ];
    case "revenue.occupancyRate":
      return [
        { label: "Taux d'occupation", value: pct(solvedValue) },
        {
          label: "Nuitées vendues",
          value: `${Math.round(kpis.nightsSold)}`,
        },
        { label: "Revenus annuels", value: fmt(kpis.annualRevenue) },
        { label: "NOI", value: fmt(kpis.noi) },
        { label: TARGET_LABELS[target], value: kpiValue },
      ];
    default: {
      const _exhaustive: never = solveFor;
      return _exhaustive;
    }
  }
}

function formatValue(value: number, solveFor: GoalSeekVariable): string {
  if (solveFor === "revenue.occupancyRate") {
    return `${value.toFixed(1)}%`;
  }
  return `${Math.round(value).toLocaleString("fr-CA")} $`;
}

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

export function goalSeek(
  target: GoalSeekTarget,
  targetValue: number,
  solveFor: GoalSeekVariable,
  inputs: ProjectInputs,
): GoalSeekResult {
  if (!Number.isFinite(targetValue)) {
    return {
      solved: false,
      value: 0,
      formula: "",
      verification: { targetKPI: target, targetValue, achievedValue: 0 },
      error: "Valeur cible invalide.",
    };
  }

  // Bornes domaine par type d'objectif
  const TARGET_BOUNDS: Record<GoalSeekTarget, { min: number; max: number }> = {
    dscr: { min: 0, max: 10 },
    annualCashflow: { min: -1_000_000, max: 5_000_000 },
    capRate: { min: 0, max: 50 },
  };
  const bounds = TARGET_BOUNDS[target];
  if (targetValue < bounds.min || targetValue > bounds.max) {
    return {
      solved: false,
      value: 0,
      formula: "",
      verification: { targetKPI: target, targetValue, achievedValue: 0 },
      error: `Valeur cible hors limites (${bounds.min} à ${bounds.max}).`,
    };
  }

  switch (solveFor) {
    case "financing.purchasePrice":
      return solveByBisection(
        inputs,
        target,
        targetValue,
        solveFor,
        BISECTION_LOWER_BOUND_PRICE,
        BISECTION_UPPER_BOUND_PRICE,
      );

    case "revenue.averageDailyRate":
      return solveByBisection(
        inputs,
        target,
        targetValue,
        solveFor,
        BISECTION_LOWER_BOUND_ADR,
        BISECTION_UPPER_BOUND_ADR,
      );

    case "revenue.occupancyRate":
      return solveByBisection(
        inputs,
        target,
        targetValue,
        solveFor,
        BISECTION_LOWER_BOUND_OCC,
        BISECTION_UPPER_BOUND_OCC,
      );
  }
}
