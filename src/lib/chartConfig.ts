/**
 * Configuration centralisée pour les graphiques et couleurs du dashboard
 */

// Palette de couleurs principale
export const COLORS = {
  // Revenus et flux positifs
  blue: {
    base: '#3b82f6',
    dark: '#2563eb',
    light: '#60a5fa',
  },
  // NOI et résultats
  green: {
    base: '#22c55e',
    dark: '#16a34a',
    darker: '#15803d',
    light: '#4ade80',
  },
  // Dépenses
  orange: {
    base: '#f97316',
    dark: '#ea580c',
    light: '#fb923c',
  },
  // Dette
  violet: {
    base: '#8b5cf6',
    dark: '#7c3aed',
    light: '#a78bfa',
  },
  // Erreurs et valeurs négatives
  red: {
    base: '#ef4444',
    dark: '#dc2626',
    light: '#f87171',
  },
  // Neutre
  slate: {
    base: '#64748b',
    dark: '#475569',
    light: '#94a3b8',
  },
} as const;

// Palette pour les graphiques de dépenses
export const EXPENSE_COLORS = {
  Entretien: '#fb923c',
  Services: '#fdba74',
  Assurances: '#fcd34d',
  Taxes: '#fde68a',
  Utilités: '#fef3c7',
  Gestion: '#f97316',
  Autre: '#d1d5db',
} as const;

// Fonction pour obtenir la couleur selon la performance
export function getPerformanceColor(value: number, thresholds: { excellent: number; good: number; fair: number }) {
  if (value >= thresholds.excellent) return 'emerald';
  if (value >= thresholds.good) return 'sky';
  if (value >= thresholds.fair) return 'orange';
  return 'red';
}

// Seuils de performance pour différentes métriques
export const PERFORMANCE_THRESHOLDS = {
  cashflow: { excellent: 10000, good: 5000, fair: 0 },
  roi: { excellent: 15, good: 10, fair: 5 },
  capRate: { excellent: 7, good: 5, fair: 3 },
  dscr: { excellent: 1.25, good: 1.1, fair: 1.0 },
} as const;

// Configuration des graphiques
export const CHART_CONFIG = {
  margin: {
    default: { top: 10, right: 15, left: 15, bottom: 5 },
    vertical: { top: 10, right: 30, left: 10, bottom: 10 },
  },
  barSize: {
    default: 32,
    large: 65,
  },
  fontSize: {
    axis: '0.75rem',
    label: '0.875rem',
    tick: '0.875rem',
  },
  animation: {
    duration: 500,
  },
} as const;

