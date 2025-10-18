import type { SensitivityAnalysis2D } from '../../types';
import { formatCurrency, formatPercent, formatNumber } from '../../lib/utils';

interface HeatmapChartProps {
  results: SensitivityAnalysis2D['results'];
  objective: string;
  labelX: string;
  labelY: string;
}

export function HeatmapChart({ results, objective, labelX, labelY }: HeatmapChartProps) {
  if (!results) return null;

  const { grid, xValues, yValues } = results;

  // Trouver min/max pour la colorisation
  const allValues = grid.flat();
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);

  const getColor = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue);
    
    // Gradient de rouge (bas) à vert (haut)
    if (normalized < 0.33) {
      return `rgb(239, ${Math.floor(68 + normalized * 3 * 119)}, 68)`;
    } else if (normalized < 0.67) {
      return `rgb(${Math.floor(245 - (normalized - 0.33) * 3 * 161)}, 158, ${Math.floor(11 + (normalized - 0.33) * 3 * 100)})`;
    } else {
      return `rgb(16, ${Math.floor(185 - (normalized - 0.67) * 3 * 50)}, ${Math.floor(129 - (normalized - 0.67) * 3 * 50)})`;
    }
  };

  const formatValue = (value: number) => {
    if (objective.includes('cash') || objective.includes('revenue') || objective.includes('expense')) {
      return formatCurrency(value);
    } else if (objective.includes('Rate') || objective.includes('Cash')) {
      return formatPercent(value);
    }
    return formatNumber(value);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Heatmap - {labelX} vs {labelY}</h3>
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-100 p-2 text-xs">
                  {labelY} \ {labelX}
                </th>
                {xValues.map((x, i) => (
                  <th key={i} className="border border-gray-300 bg-gray-100 p-2 text-xs">
                    {formatNumber(x, 1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yValues.map((y, j) => (
                <tr key={j}>
                  <td className="border border-gray-300 bg-gray-100 p-2 text-xs font-medium">
                    {formatNumber(y, 1)}
                  </td>
                  {grid[j].map((value, i) => (
                    <td
                      key={i}
                      className="border border-gray-300 p-2 text-xs text-center font-medium text-white"
                      style={{ backgroundColor: getColor(value) }}
                      title={formatValue(value)}
                    >
                      {formatValue(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center space-x-4 text-sm">
        <span>Légende:</span>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500"></div>
          <span>Faible: {formatValue(minValue)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-600"></div>
          <span>Élevé: {formatValue(maxValue)}</span>
        </div>
      </div>
    </div>
  );
}

