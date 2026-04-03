import type { ProjectInputs, KPIResults } from "../types";
import { calculateKPIs, setValueByPath } from "./calculations";
import { extractValue } from "./inputMutator";

// ============================================================================
// TYPES
// ============================================================================

export type GoalSeekTarget = "dscr" | "annualCashflow" | "capRate";
export type GoalSeekVariable =
  | "financing.purchasePrice"
  | "revenue.averageDailyRate"
  | "revenue.occupancyRate";

export interface GoalSeekResult {
  solved: boolean;
  value: number;
  formula: string;
  verification: {
    targetKPI: string;
    targetValue: number;
    achievedValue: number;
  };
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
  let lo = lowerBound;
  let hi = upperBound;

  // Évaluer aux bornes pour vérifier que la solution existe
  const kpisLo = calculateKPIs(setValueByPath(inputs, solveFor, lo));
  const kpisHi = calculateKPIs(setValueByPath(inputs, solveFor, hi));
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
    const kpisMid = calculateKPIs(setValueByPath(inputs, solveFor, mid));
    const valMid = getTargetKPIValue(kpisMid, target);

    if (Math.abs(valMid - targetValue) < TOLERANCE) {
      return buildResult(inputs, target, targetValue, solveFor, mid);
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
  return buildResult(inputs, target, targetValue, solveFor, mid);
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
): GoalSeekResult {
  const verificationKPIs = calculateKPIs(
    setValueByPath(inputs, solveFor, solvedValue),
  );
  const achievedValue = getTargetKPIValue(verificationKPIs, target);

  const targetLabels: Record<GoalSeekTarget, string> = {
    dscr: "DSCR",
    annualCashflow: "Cashflow annuel",
    capRate: "Cap Rate",
  };

  const variableLabels: Record<GoalSeekVariable, string> = {
    "financing.purchasePrice": "Prix d'achat",
    "revenue.averageDailyRate": "Tarif moyen (ADR)",
    "revenue.occupancyRate": "Taux d'occupation",
  };

  const currentValue = extractValue(
    solveFor === "financing.purchasePrice"
      ? inputs.financing.purchasePrice
      : solveFor === "revenue.averageDailyRate"
        ? inputs.revenue.averageDailyRate
        : inputs.revenue.occupancyRate,
  );

  const formula =
    `Pour atteindre ${targetLabels[target]} = ${targetValue}, ` +
    `${variableLabels[solveFor]} doit passer de ${formatValue(currentValue, solveFor)} ` +
    `à ${formatValue(Math.round(solvedValue * 100) / 100, solveFor)}`;

  return {
    solved: Math.abs(achievedValue - targetValue) < TOLERANCE * 10,
    value: Math.round(solvedValue * 100) / 100,
    formula,
    verification: {
      targetKPI: targetLabels[target],
      targetValue,
      achievedValue: Math.round(achievedValue * 100) / 100,
    },
  };
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
