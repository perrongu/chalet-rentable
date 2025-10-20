/**
 * Palette de couleurs cohérente pour tous les graphiques du projet
 * Basée sur la sémantique des données
 */

export const CHART_COLORS = {
  // Composantes du profit
  cashflow: '#3b82f6',           // Bleu (blue-500) - Liquidités
  capitalisation: '#f59e0b',     // Orange (amber-500) - Capital remboursé
  plusValue: '#10b981',          // Vert (emerald-500) - Appréciation
  
  // Valeurs patrimoniales
  equity: '#059669',             // Vert foncé (emerald-600) - Équité nette
  propertyValue: '#8b5cf6',      // Violet (violet-500) - Valeur propriété
  mortgage: '#ef4444',           // Rouge (red-500) - Dette hypothécaire
  
  // États généraux
  positive: '#10b981',           // Vert - Valeurs positives
  negative: '#ef4444',           // Rouge - Valeurs négatives
  neutral: '#6b7280',            // Gris (gray-500) - Neutre
  nearZero: '#fef9c3',          // Jaune pâle (yellow-100) - Proche de zéro
  
  // Contextuels
  warning: '#f59e0b',            // Orange - Alerte/Critique
  info: '#3b82f6',               // Bleu - Information/Référence
  success: '#10b981',            // Vert - Succès/Optimal
  danger: '#ef4444',             // Rouge - Danger/Risque
  
  // Gradients pour sensibilité
  gradient: {
    positiveLight: { r: 220, g: 252, b: 220 },  // Vert pâle
    positiveDark: { r: 16, g: 185, b: 129 },    // Vert saturé
    negativeLight: { r: 239, g: 218, b: 218 },  // Rouge pâle
    negativeDark: { r: 239, g: 68, b: 68 },     // Rouge saturé
  },
} as const;

/**
 * Convertit une couleur hex en rgba avec opacité
 * @param hex - Couleur au format hex (ex: '#3b82f6')
 * @param opacity - Opacité entre 0 et 1 (ex: 0.1)
 * @returns Couleur au format rgba (ex: 'rgba(59, 130, 246, 0.1)')
 */
export function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Couleurs avec opacité pour les graphiques en aires (Area charts)
 */
export const CHART_COLORS_WITH_OPACITY = {
  cashflow: {
    stroke: CHART_COLORS.cashflow,
    fill: CHART_COLORS.cashflow,
    fillOpacity: 0.6,
  },
  capitalisation: {
    stroke: CHART_COLORS.capitalisation,
    fill: CHART_COLORS.capitalisation,
    fillOpacity: 0.6,
  },
  plusValue: {
    stroke: CHART_COLORS.plusValue,
    fill: CHART_COLORS.plusValue,
    fillOpacity: 0.6,
  },
  equity: {
    stroke: CHART_COLORS.equity,
    fill: CHART_COLORS.equity,
    fillOpacity: 0.6,
  },
  propertyValue: {
    stroke: CHART_COLORS.propertyValue,
    fill: CHART_COLORS.propertyValue,
    fillOpacity: 0.3,
  },
  mortgage: {
    stroke: CHART_COLORS.mortgage,
    fill: CHART_COLORS.mortgage,
    fillOpacity: 0.4,
  },
} as const;

