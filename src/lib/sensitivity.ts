import type {
  ProjectInputs,
  KPIResults,
  ParameterRange,
  SensitivityAnalysis1D,
  SensitivityAnalysis2D,
} from '../types';
import { calculateKPIs, setValueByPath } from './calculations';

// ============================================================================
// ANALYSE DE SENSIBILITÉ 1D (TORNADO)
// ============================================================================

export function runSensitivityAnalysis1D(
  baseInputs: ProjectInputs,
  parameters: ParameterRange[],
  objective: keyof KPIResults
): SensitivityAnalysis1D['results'] {
  const impacts: NonNullable<SensitivityAnalysis1D['results']>['impacts'] = [];
  const detailedResults: NonNullable<SensitivityAnalysis1D['results']>['detailedResults'] = [];

  // Calcul de la valeur de base
  const baseKPIs = calculateKPIs(baseInputs);
  const baseValue = baseKPIs[objective] as number;

  parameters.forEach((param) => {
    const steps = param.steps || 10;
    const values: Array<{ paramValue: number; objectiveValue: number }> = [];

    // Générer les valeurs entre min et max
    for (let i = 0; i <= steps; i++) {
      const paramValue = param.min + ((param.max - param.min) * i) / steps;
      const modifiedInputs = setValueByPath(baseInputs, param.parameter, paramValue);
      const kpis = calculateKPIs(modifiedInputs);
      const objectiveValue = kpis[objective] as number;

      values.push({ paramValue, objectiveValue });
    }

    detailedResults.push({
      parameter: param.parameter,
      values,
    });

    // Calculer l'impact aux extrêmes
    const modifiedInputsMin = setValueByPath(baseInputs, param.parameter, param.min);
    const modifiedInputsMax = setValueByPath(baseInputs, param.parameter, param.max);

    const kpisMin = calculateKPIs(modifiedInputsMin);
    const kpisMax = calculateKPIs(modifiedInputsMax);

    const valueLow = kpisMin[objective] as number;
    const valueHigh = kpisMax[objective] as number;

    const impactLow = valueLow - baseValue;
    const impactHigh = valueHigh - baseValue;

    // Impact relatif = plus grande variation en valeur absolue
    const relativeImpact = Math.max(Math.abs(impactLow), Math.abs(impactHigh));

    impacts.push({
      parameter: param.parameter,
      label: param.label,
      impactLow,
      impactHigh,
      relativeImpact,
    });
  });

  // Trier par impact relatif décroissant
  impacts.sort((a: any, b: any) => b.relativeImpact - a.relativeImpact);

  return { impacts, detailedResults };
}

// ============================================================================
// ANALYSE DE SENSIBILITÉ 2D (HEATMAP)
// ============================================================================

export function runSensitivityAnalysis2D(
  baseInputs: ProjectInputs,
  parameterX: ParameterRange,
  parameterY: ParameterRange,
  objective: keyof KPIResults
): SensitivityAnalysis2D['results'] {
  const stepsX = parameterX.steps || 10;
  const stepsY = parameterY.steps || 10;

  const xValues: number[] = [];
  const yValues: number[] = [];
  const grid: number[][] = [];

  // Générer les valeurs pour X
  for (let i = 0; i <= stepsX; i++) {
    xValues.push(parameterX.min + ((parameterX.max - parameterX.min) * i) / stepsX);
  }

  // Générer les valeurs pour Y
  for (let i = 0; i <= stepsY; i++) {
    yValues.push(parameterY.min + ((parameterY.max - parameterY.min) * i) / stepsY);
  }

  // Calculer la grille
  for (let j = 0; j <= stepsY; j++) {
    const row: number[] = [];
    for (let i = 0; i <= stepsX; i++) {
      let modifiedInputs = setValueByPath(baseInputs, parameterX.parameter, xValues[i]);
      modifiedInputs = setValueByPath(modifiedInputs, parameterY.parameter, yValues[j]);

      const kpis = calculateKPIs(modifiedInputs);
      const value = kpis[objective] as number;
      row.push(value);
    }
    grid.push(row);
  }

  return {
    grid,
    xValues,
    yValues,
  };
}

// ============================================================================
// UTILITAIRE POUR CRÉER UN SCÉNARIO DEPUIS UN POINT
// ============================================================================

export function createScenarioFromPoint(
  baseInputs: ProjectInputs,
  parameters: Array<{ path: string; value: number }>
): ProjectInputs {
  let modifiedInputs = baseInputs;

  parameters.forEach((param) => {
    modifiedInputs = setValueByPath(modifiedInputs, param.path, param.value);
  });

  return modifiedInputs;
}

