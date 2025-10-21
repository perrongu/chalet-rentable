/**
 * Palette de couleurs cohérente pour tous les graphiques du projet
 * Basée sur la sémantique des données avec tons pastel doux
 */

export const CHART_COLORS = {
  // Composantes du profit
  cashflow: '#7dd3fc',           // Bleu ciel (sky-300) - Liquidités
  capitalisation: '#fb923c',     // Orange pastel (orange-400) - Capital remboursé
  plusValue: '#34d399',          // Vert menthe (emerald-400) - Appréciation
  
  // Valeurs patrimoniales
  equity: '#10b981',             // Vert (emerald-500) - Équité nette
  propertyValue: '#a78bfa',      // Violet pastel (violet-400) - Valeur propriété
  mortgage: '#f87171',           // Rouge pastel (red-400) - Dette hypothécaire
  
  // États généraux
  positive: '#34d399',           // Vert menthe - Valeurs positives
  negative: '#f87171',           // Rouge pastel - Valeurs négatives
  neutral: '#94a3b8',            // Gris (slate-400) - Neutre
  nearZero: '#fef9c3',          // Jaune pâle (yellow-100) - Proche de zéro
  
  // Contextuels
  warning: '#fb923c',            // Orange pastel - Alerte/Critique
  info: '#7dd3fc',               // Bleu ciel - Information/Référence
  success: '#34d399',            // Vert menthe - Succès/Optimal
  danger: '#f87171',             // Rouge pastel - Danger/Risque
  
  // Gradients pour sensibilité
  gradient: {
    positiveLight: { r: 220, g: 252, b: 231 },  // Vert pâle emerald-100
    positiveDark: { r: 52, g: 211, b: 153 },    // Vert menthe emerald-400
    negativeLight: { r: 254, g: 226, b: 226 },  // Rouge pâle red-100
    negativeDark: { r: 248, g: 113, b: 113 },   // Rouge pastel red-400
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
 * Opacité réduite pour plus de douceur visuelle
 */
export const CHART_COLORS_WITH_OPACITY = {
  cashflow: {
    stroke: CHART_COLORS.cashflow,
    fill: CHART_COLORS.cashflow,
    fillOpacity: 0.4,
  },
  capitalisation: {
    stroke: CHART_COLORS.capitalisation,
    fill: CHART_COLORS.capitalisation,
    fillOpacity: 0.4,
  },
  plusValue: {
    stroke: CHART_COLORS.plusValue,
    fill: CHART_COLORS.plusValue,
    fillOpacity: 0.4,
  },
  equity: {
    stroke: CHART_COLORS.equity,
    fill: CHART_COLORS.equity,
    fillOpacity: 0.4,
  },
  propertyValue: {
    stroke: CHART_COLORS.propertyValue,
    fill: CHART_COLORS.propertyValue,
    fillOpacity: 0.25,
  },
  mortgage: {
    stroke: CHART_COLORS.mortgage,
    fill: CHART_COLORS.mortgage,
    fillOpacity: 0.3,
  },
} as const;

