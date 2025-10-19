import type { ProjectInputs, KPIResults } from '../types';
import { calculateKPIs, setValueByPath } from './calculations';
import { deepClone } from './utils';
import { PARAMETER_LABELS } from './constants';

// ============================================================================
// TYPES
// ============================================================================

export interface MonteCarloConfig {
  objective: keyof KPIResults;
  iterations: number;
}

export interface MonteCarloResult {
  objective: keyof KPIResults;
  samples: number[];
  statistics: {
    mean: number;
    median: number; // P50
    stdDev: number;
    p10: number;
    p90: number;
    min: number;
    max: number;
  };
  parameters: Array<{
    path: string;
    label: string;
    min: number;
    max: number;
    default: number;
  }>;
  duration: number; // en ms
}

// ============================================================================
// GÉNÉRATION DE NOMBRES ALÉATOIRES SELON DISTRIBUTION NORMALE
// ============================================================================

// Cache pour la deuxième valeur de Box-Muller (optimisation)
let cachedZ: number | null = null;

/**
 * Box-Muller transform pour générer un nombre aléatoire
 * selon une distribution normale standard (moyenne=0, écart-type=1)
 * Optimisé avec cache pour utiliser les deux valeurs générées
 */
function boxMullerTransform(): number {
  // Si on a une valeur en cache, la retourner
  if (cachedZ !== null) {
    const z = cachedZ;
    cachedZ = null;
    return z;
  }
  
  // Générer deux nouvelles valeurs
  const u1 = Math.random();
  const u2 = Math.random();
  
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  
  // Mettre z1 en cache et retourner z0
  cachedZ = z1;
  return z0;
}

/**
 * Génère un nombre selon une distribution normale avec contraintes min/max
 * 
 * @param mean - Valeur moyenne (par défaut la valeur par défaut du paramètre)
 * @param min - Valeur minimale
 * @param max - Valeur maximale
 * @returns Valeur échantillonnée
 */
export function sampleNormalDistribution(mean: number, min: number, max: number): number {
  // Calculer l'écart-type basé sur la plage
  // On utilise (max - min) / 6 pour que ~99.7% des valeurs soient dans [min, max]
  // (règle des 3 sigma)
  const stdDev = (max - min) / 6;
  
  // Générer un nombre selon distribution normale
  const z = boxMullerTransform();
  let value = mean + z * stdDev;
  
  // Contraindre dans les limites (troncation)
  // Note: Une alternative serait de régénérer jusqu'à obtenir une valeur valide,
  // mais la troncation est plus efficace et acceptable pour ce cas d'usage
  value = Math.max(min, Math.min(max, value));
  
  return value;
}

// ============================================================================
// STATISTIQUES
// ============================================================================

function calculateStatistics(samples: number[]): MonteCarloResult['statistics'] {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  
  // Moyenne
  const mean = samples.reduce((sum, val) => sum + val, 0) / n;
  
  // Médiane (P50)
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  
  // Écart-type
  const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  // Percentiles
  const p10Index = Math.floor(n * 0.1);
  const p90Index = Math.floor(n * 0.9);
  
  const p10 = sorted[p10Index];
  const p90 = sorted[p90Index];
  
  const min = sorted[0];
  const max = sorted[n - 1];
  
  return {
    mean,
    median,
    stdDev,
    p10,
    p90,
    min,
    max,
  };
}

// ============================================================================
// MOTEUR MONTE CARLO
// ============================================================================

/**
 * Exécute une simulation Monte Carlo sur tous les paramètres avec useRange=true
 * 
 * @param baseInputs - Inputs du projet
 * @param config - Configuration de la simulation
 * @returns Résultats de la simulation avec statistiques
 */
export function runMonteCarloAnalysis(
  baseInputs: ProjectInputs,
  config: MonteCarloConfig
): MonteCarloResult {
  const startTime = Date.now();
  
  // Réinitialiser le cache de Box-Muller pour une nouvelle simulation
  cachedZ = null;
  
  // Récupérer tous les paramètres avec useRange=true
  const parameters: MonteCarloResult['parameters'] = [];
  
  // Fonction helper pour extraire les paramètres avec plage
  function extractRangeParameters(obj: unknown, path: string[] = []): void {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key in obj as Record<string, unknown>) {
      const value = (obj as Record<string, unknown>)[key];
      const currentPath = [...path, key];
      
      if (value && typeof value === 'object') {
        // Vérifier si c'est un InputWithSource avec range
        if ('range' in value && value.range && typeof value.range === 'object' && 'useRange' in value.range && value.range.useRange) {
          const pathString = currentPath.join('.');
          const range = value.range as { min: number; max: number; default: number; useRange: boolean };
          
          // Utiliser le label prédéfini ou fallback sur le path
          const label = PARAMETER_LABELS[pathString] || pathString;
          
          parameters.push({
            path: pathString,
            label,
            min: range.min,
            max: range.max,
            default: range.default,
          });
        } else if (!('value' in value)) {
          // Continuer la recherche en profondeur
          extractRangeParameters(value, currentPath);
        }
      }
    }
  }
  
  extractRangeParameters(baseInputs);
  
  // Gérer le cas particulier des expenses (array)
  baseInputs.expenses.forEach((expense, index) => {
    if (expense.amount.range?.useRange) {
      parameters.push({
        path: `expenses[${index}].amount`,
        label: expense.name,
        min: expense.amount.range.min,
        max: expense.amount.range.max,
        default: expense.amount.range.default,
      });
    }
  });
  
  // Exécuter les simulations
  const samples: number[] = [];
  
  for (let i = 0; i < config.iterations; i++) {
    // Créer une copie profonde des inputs de base (optimisé)
    let modifiedInputs = deepClone(baseInputs);
    
    // Pour chaque paramètre avec plage, échantillonner une valeur
    parameters.forEach((param) => {
      const sampledValue = sampleNormalDistribution(
        param.default,
        param.min,
        param.max
      );
      
      // Appliquer la valeur échantillonnée
      modifiedInputs = setValueByPath(modifiedInputs, param.path, sampledValue);
    });
    
    // Calculer les KPIs
    const kpis = calculateKPIs(modifiedInputs);
    const objectiveValue = kpis[config.objective] as number;
    
    samples.push(objectiveValue);
  }
  
  // Calculer les statistiques
  const statistics = calculateStatistics(samples);
  
  const duration = Date.now() - startTime;
  
  return {
    objective: config.objective,
    samples,
    statistics,
    parameters,
    duration,
  };
}

