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

    // Réutiliser les valeurs déjà calculées (optimisation)
    const valueLow = values[0].objectiveValue;
    const valueHigh = values[values.length - 1].objectiveValue;

    const impactLow = valueLow - baseValue;
    const impactHigh = valueHigh - baseValue;

    // Impact relatif = plus grande variation en valeur absolue
    const relativeImpact = Math.max(Math.abs(impactLow), Math.abs(impactHigh));

    // Calcul du point critique : trouver où l'objectif = 0
    let criticalPoint: { paramValue: number; exists: boolean } | undefined;
    
    // Chercher un changement de signe dans les valeurs calculées
    for (let i = 0; i < values.length - 1; i++) {
      const current = values[i].objectiveValue;
      const next = values[i + 1].objectiveValue;
      
      // Si changement de signe entre deux points (strict, pas égal à 0)
      if ((current < 0 && next > 0) || (current > 0 && next < 0)) {
        const currentParam = values[i].paramValue;
        const nextParam = values[i + 1].paramValue;
        
        // Vérifier que la différence n'est pas quasi-nulle (éviter division par zéro)
        const denominator = next - current;
        if (Math.abs(denominator) > 1e-10) {
          // Interpolation linéaire : x = x1 + (0 - y1) * (x2 - x1) / (y2 - y1)
          const criticalParamValue = currentParam + 
            (0 - current) * (nextParam - currentParam) / denominator;
          
          criticalPoint = {
            paramValue: criticalParamValue,
            exists: true,
          };
          break;
        }
      }
    }
    
    // Si pas de changement de signe trouvé, le point critique n'existe pas dans la plage
    if (!criticalPoint) {
      criticalPoint = {
        paramValue: 0,
        exists: false,
      };
    }

    impacts.push({
      parameter: param.parameter,
      label: param.label,
      valueLow,
      valueHigh,
      impactLow,
      impactHigh,
      relativeImpact,
      criticalPoint,
    });
  });

  // Trier par impact relatif décroissant
  impacts.sort((a, b) => b.relativeImpact - a.relativeImpact);

  return { impacts, detailedResults, baseValue };
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
  // Limiter le nombre de steps pour éviter des calculs trop lourds
  const maxSteps = 50;
  const stepsX = Math.min(parameterX.steps || 10, maxSteps);
  const stepsY = Math.min(parameterY.steps || 10, maxSteps);
  
  // Vérifier que le nombre total de cellules n'est pas trop grand
  const totalCells = (stepsX + 1) * (stepsY + 1);
  if (totalCells > 2500) {
    console.warn(`Analyse 2D limitée: ${totalCells} cellules réduites à 2500 max`);
  }

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

