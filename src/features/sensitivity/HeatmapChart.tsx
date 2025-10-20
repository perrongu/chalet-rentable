import type { SensitivityAnalysis2D, KPIResults } from '../../types';
import { formatCurrency, formatPercent, formatNumber } from '../../lib/utils';
import { CURRENCY_METRICS, PERCENTAGE_METRICS } from '../../lib/constants';
import { CHART_COLORS } from '../../lib/colors';

interface HeatmapChartProps {
  results: SensitivityAnalysis2D['results'];
  objective: keyof KPIResults;
  labelX: string;
  labelY: string;
  paramPathX: string;
  paramPathY: string;
}

export function HeatmapChart({ results, objective, labelX, labelY, paramPathX, paramPathY }: HeatmapChartProps) {
  if (!results) return null;

  const { grid, xValues, yValues } = results;

  // Validation : grille vide
  if (!grid || grid.length === 0 || grid[0].length === 0) {
    return <div className="text-sm text-gray-500">Aucune donnée à afficher</div>;
  }

  // Trouver min/max pour déterminer l'intensité maximale
  const allValues = grid.flat();
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  
  // Échelle centrée sur 0 (éviter division par zéro si toutes les valeurs sont 0)
  const maxAbsValue = Math.max(Math.abs(minValue), Math.abs(maxValue)) || 1;
  
  // Seuil pour considérer une valeur comme "proche de 0" (1% de la valeur absolue max)
  const ZERO_THRESHOLD = 0.01;
  const isNearZero = (val: number) => Math.abs(val) < maxAbsValue * ZERO_THRESHOLD;

  // Couleurs de base pour le gradient (utiliser les couleurs de la palette)
  const COLOR_RED_LIGHT = CHART_COLORS.gradient.negativeLight;
  const COLOR_RED_DARK = CHART_COLORS.gradient.negativeDark;
  const COLOR_GREEN_LIGHT = CHART_COLORS.gradient.positiveLight;
  const COLOR_GREEN_DARK = CHART_COLORS.gradient.positiveDark;
  const COLOR_NEAR_ZERO = CHART_COLORS.nearZero;

  const getColor = (value: number) => {
    if (isNearZero(value)) {
      return COLOR_NEAR_ZERO;
    }
    
    if (value < 0) {
      // Valeurs négatives : gradient de rouge pâle (proche de 0) à rouge foncé (loin de 0)
      const intensity = Math.abs(value) / maxAbsValue;
      const r = COLOR_RED_DARK.r;
      const g = Math.floor(COLOR_RED_LIGHT.g - intensity * (COLOR_RED_LIGHT.g - COLOR_RED_DARK.g));
      const b = Math.floor(COLOR_RED_LIGHT.b - intensity * (COLOR_RED_LIGHT.b - COLOR_RED_DARK.b));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Valeurs positives : gradient de vert pâle (proche de 0) à vert foncé (loin de 0)
      const intensity = value / maxAbsValue;
      const r = Math.floor(COLOR_GREEN_LIGHT.r - intensity * (COLOR_GREEN_LIGHT.r - COLOR_GREEN_DARK.r));
      const g = Math.floor(COLOR_GREEN_LIGHT.g - intensity * (COLOR_GREEN_LIGHT.g - COLOR_GREEN_DARK.g));
      const b = Math.floor(COLOR_GREEN_LIGHT.b - intensity * (COLOR_GREEN_LIGHT.b - COLOR_GREEN_DARK.b));
      return `rgb(${r}, ${g}, ${b})`;
    }
  };
  
  // Détecter si une cellule est sur la frontière (changement de signe avec voisins)
  const isOnBoundary = (i: number, j: number): boolean => {
    const value = grid[j][i];
    
    // Vérifier les 4 voisins (haut, bas, gauche, droite)
    const neighbors = [
      j > 0 ? grid[j - 1][i] : null,                    // haut
      j < grid.length - 1 ? grid[j + 1][i] : null,      // bas
      i > 0 ? grid[j][i - 1] : null,                    // gauche
      i < grid[j].length - 1 ? grid[j][i + 1] : null,   // droite
    ];
    
    // Si la valeur actuelle et au moins un voisin ont des signes opposés
    return neighbors.some(neighbor => {
      if (neighbor === null) return false;
      return (value < 0 && neighbor > 0) || (value > 0 && neighbor < 0);
    });
  };

  // Déterminer le format selon le type de métrique
  const isCurrency = CURRENCY_METRICS.includes(objective);
  const isPercentage = PERCENTAGE_METRICS.includes(objective);

  const formatValue = (value: number) => {
    if (isCurrency) {
      return formatCurrency(value);
    }
    if (isPercentage) {
      return formatPercent(value);
    }
    return formatNumber(value, 0);
  };
  
  // Formater les valeurs des paramètres dans les en-têtes
  const formatParamValue = (value: number, paramPath: string) => {
    if (paramPath.includes('occupancyRate') || 
        paramPath.includes('interestRate') || 
        paramPath.includes('appreciationRate')) {
      return formatPercent(value);
    }
    if (paramPath.includes('Years') || paramPath.includes('amortization')) {
      return `${value.toFixed(1)} ans`;
    }
    // Par défaut, montants monétaires
    return formatCurrency(value);
  };
  
  // Symbole visuel pour accessibilité
  const getValueSymbol = (value: number): string => {
    if (isNearZero(value)) return '≈';
    return value > 0 ? '+' : '−'; // Utiliser le vrai signe moins (U+2212), pas le tiret
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Heatmap - {labelX} vs {labelY}</h3>
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="border-collapse text-[10px]">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-100 px-1 py-0.5 text-[10px] sticky left-0 z-10">
                  {labelY} \ {labelX}
                </th>
                {xValues.map((x, i) => (
                  <th key={i} className="border border-gray-300 bg-gray-100 px-1 py-0.5 text-[10px] min-w-[60px]">
                    {formatParamValue(x, paramPathX)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yValues.map((y, j) => (
                <tr key={j}>
                  <td className="border border-gray-300 bg-gray-100 px-1 py-0.5 text-[10px] font-medium sticky left-0 z-10">
                    {formatParamValue(y, paramPathY)}
                  </td>
                  {grid[j].map((value, i) => {
                    const onBoundary = isOnBoundary(i, j);
                    const cellColor = getColor(value);
                    const textColor = isNearZero(value)
                      ? 'text-gray-700' 
                      : value < 0 
                        ? 'text-white' 
                        : 'text-gray-900';
                    const symbol = getValueSymbol(value);
                    
                    return (
                      <td
                        key={i}
                        className={`border px-1 py-0.5 text-[10px] text-center font-medium ${textColor} ${
                          onBoundary ? 'border-2' : ''
                        }`}
                        style={{ 
                          backgroundColor: cellColor,
                          borderColor: onBoundary ? CHART_COLORS.warning : undefined
                        }}
                        title={`${symbol} ${formatValue(value)}`}
                      >
                        <span className="opacity-60 mr-0.5">{symbol}</span>
                        {formatValue(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs bg-gray-50 p-3 rounded-lg border border-gray-200">
        <span className="font-semibold">Légende:</span>
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-4 rounded border border-gray-300"
            style={{ backgroundColor: CHART_COLORS.negative }}
          ></div>
          <span>Négatif: {formatValue(minValue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-4 rounded border border-gray-300" 
            style={{ backgroundColor: CHART_COLORS.nearZero }}
          ></div>
          <span>Proche de 0</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-4 rounded border border-gray-300"
            style={{ backgroundColor: CHART_COLORS.positive }}
          ></div>
          <span>Positif: {formatValue(maxValue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-4 border-2 bg-white rounded"
            style={{ borderColor: CHART_COLORS.warning }}
          ></div>
          <span>Frontière (transition pos/nég)</span>
        </div>
      </div>
    </div>
  );
}

