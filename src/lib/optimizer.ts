import type {
  ProjectInputs,
  KPIResults,
  OptimizationConfig,
  OptimizationSolution,
  OptimizationResult,
} from '../types';
import { OptimizationObjective, ConstraintOperator } from '../types';
import { calculateKPIs, setValueByPath } from './calculations';

// ============================================================================
// VÉRIFICATION DES CONTRAINTES
// ============================================================================

function checkConstraints(
  kpis: KPIResults,
  config: OptimizationConfig
): boolean {
  return config.constraints.every((constraint) => {
    const value = kpis[constraint.metric] as number;
    const target = constraint.value;

    switch (constraint.operator) {
      case ConstraintOperator.GREATER_THAN:
        return value >= target;
      case ConstraintOperator.LESS_THAN:
        return value <= target;
      case ConstraintOperator.EQUAL:
        return Math.abs(value - target) < 0.01; // Tolérance pour égalité
      default:
        return true;
    }
  });
}

// ============================================================================
// GRID SEARCH INTELLIGENT
// ============================================================================

export function runOptimization(
  baseInputs: ProjectInputs,
  config: OptimizationConfig
): OptimizationResult {
  const startTime = Date.now();
  const solutions: OptimizationSolution[] = [];
  const maxIterations = config.maxIterations || 10000;
  const topK = config.topK || 10;

  // Filtrer les variables non verrouillées
  const activeVariables = config.variables.filter((v) => !v.locked);

  if (activeVariables.length === 0) {
    // Aucune variable à optimiser, retourner la solution de base
    const kpis = calculateKPIs(baseInputs);
    const objectiveValue = kpis[config.targetMetric] as number;
    const feasible = checkConstraints(kpis, config);

    return {
      configId: config.id,
      solutions: [
        {
          rank: 1,
          values: {},
          kpis,
          objectiveValue,
          feasible,
        },
      ],
      iterations: 1,
      duration: Date.now() - startTime,
      completedAt: new Date(),
    };
  }

  // Calculer le nombre de points par variable pour respecter maxIterations
  const pointsPerVariable = Math.max(
    2,
    Math.floor(Math.pow(maxIterations, 1 / activeVariables.length))
  );

  // Générer les grilles de valeurs pour chaque variable
  const grids = activeVariables.map((variable) => {
    const points: number[] = [];
    const step = variable.step || (variable.max - variable.min) / (pointsPerVariable - 1);
    const numPoints = Math.floor((variable.max - variable.min) / step) + 1;

    for (let i = 0; i < numPoints && i < pointsPerVariable; i++) {
      const value = Math.min(variable.min + step * i, variable.max);
      points.push(value);
    }

    // S'assurer que le max est inclus
    if (points[points.length - 1] !== variable.max) {
      points.push(variable.max);
    }

    return points;
  });

  // Générer toutes les combinaisons (produit cartésien)
  function* generateCombinations(
    grids: number[][],
    current: number[] = []
  ): Generator<number[]> {
    if (current.length === grids.length) {
      yield current;
      return;
    }

    const gridIndex = current.length;
    for (const value of grids[gridIndex]) {
      yield* generateCombinations(grids, [...current, value]);
    }
  }

  let iterations = 0;
  for (const combination of generateCombinations(grids)) {
    if (iterations >= maxIterations) break;

    // Appliquer les valeurs
    let modifiedInputs = baseInputs;
    const values: Record<string, number> = {};

    activeVariables.forEach((variable, index) => {
      const value = combination[index];
      modifiedInputs = setValueByPath(modifiedInputs, variable.parameter, value);
      values[variable.parameter] = value;
    });

    // Calculer les KPIs
    const kpis = calculateKPIs(modifiedInputs);
    const objectiveValue = kpis[config.targetMetric] as number;
    const feasible = checkConstraints(kpis, config);

    solutions.push({
      rank: 0, // Sera mis à jour après le tri
      values,
      kpis,
      objectiveValue,
      feasible,
    });

    iterations++;
  }

  // Trier les solutions
  // 1. Solutions faisables d'abord
  // 2. Par objectif (max ou min)
  solutions.sort((a, b) => {
    // Prioriser les solutions faisables
    if (a.feasible && !b.feasible) return -1;
    if (!a.feasible && b.feasible) return 1;

    // Ensuite par objectif
    if (config.objective === OptimizationObjective.MAXIMIZE) {
      return b.objectiveValue - a.objectiveValue;
    } else {
      return a.objectiveValue - b.objectiveValue;
    }
  });

  // Assigner les rangs
  solutions.forEach((sol, index) => {
    sol.rank = index + 1;
  });

  // Retourner seulement le top-K
  const topSolutions = solutions.slice(0, topK);

  return {
    configId: config.id,
    solutions: topSolutions,
    iterations,
    duration: Date.now() - startTime,
    completedAt: new Date(),
  };
}

// ============================================================================
// EXPLORATION MANUELLE GUIDÉE
// ============================================================================

export interface ManualExplorationState {
  currentValues: Record<string, number>;
  kpis: KPIResults;
  history: Array<{
    values: Record<string, number>;
    kpis: KPIResults;
    timestamp: Date;
  }>;
}

export function initializeManualExploration(
  baseInputs: ProjectInputs,
  variables: OptimizationConfig['variables']
): ManualExplorationState {
  const currentValues: Record<string, number> = {};

  variables.forEach((variable) => {
    // Utiliser la valeur actuelle comme point de départ
    const path = variable.parameter.split('.');
    let value: any = baseInputs;
    for (const part of path) {
      value = value[part];
    }
    currentValues[variable.parameter] =
      typeof value === 'object' && 'value' in value ? value.value : value;
  });

  const kpis = calculateKPIs(baseInputs);

  return {
    currentValues,
    kpis,
    history: [
      {
        values: { ...currentValues },
        kpis,
        timestamp: new Date(),
      },
    ],
  };
}

export function updateManualExploration(
  baseInputs: ProjectInputs,
  state: ManualExplorationState,
  parameter: string,
  newValue: number
): ManualExplorationState {
  const newValues = { ...state.currentValues, [parameter]: newValue };

  let modifiedInputs = baseInputs;
  Object.entries(newValues).forEach(([path, value]) => {
    modifiedInputs = setValueByPath(modifiedInputs, path, value);
  });

  const kpis = calculateKPIs(modifiedInputs);

  return {
    currentValues: newValues,
    kpis,
    history: [
      ...state.history,
      {
        values: { ...newValues },
        kpis,
        timestamp: new Date(),
      },
    ],
  };
}

// ============================================================================
// UTILITAIRES
// ============================================================================

export function createScenarioFromSolution(
  baseInputs: ProjectInputs,
  solution: OptimizationSolution
): ProjectInputs {
  let modifiedInputs = baseInputs;

  Object.entries(solution.values).forEach(([path, value]) => {
    modifiedInputs = setValueByPath(modifiedInputs, path, value);
  });

  return modifiedInputs;
}

