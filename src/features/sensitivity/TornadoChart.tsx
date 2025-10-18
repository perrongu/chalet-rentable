import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SensitivityAnalysis1D } from '../../types';
import { formatCurrency, formatPercent } from '../../lib/utils';

interface TornadoChartProps {
  results: SensitivityAnalysis1D['results'];
  objective: string;
}

export function TornadoChart({ results, objective }: TornadoChartProps) {
  if (!results) return null;

  // Préparer les données pour le graphique tornado
  const chartData = results.impacts.map((impact) => ({
    label: impact.label,
    impactLow: impact.impactLow,
    impactHigh: impact.impactHigh,
  }));

  const formatValue = (value: number) => {
    if (objective.includes('cash') || objective.includes('revenue') || objective.includes('expense')) {
      return formatCurrency(value);
    }
    return formatPercent(value);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Diagramme Tornado - Impact des paramètres</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">Paramètre</th>
              <th className="text-right py-2 px-3">Impact Min</th>
              <th className="text-right py-2 px-3">Impact Max</th>
              <th className="text-right py-2 px-3">Impact Relatif</th>
            </tr>
          </thead>
          <tbody>
            {results.impacts.map((impact, i) => (
              <tr key={i} className="border-b">
                <td className="py-2 px-3">{impact.label}</td>
                <td className={`text-right py-2 px-3 ${impact.impactLow < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatValue(impact.impactLow)}
                </td>
                <td className={`text-right py-2 px-3 ${impact.impactHigh < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatValue(impact.impactHigh)}
                </td>
                <td className="text-right py-2 px-3 font-medium">
                  {formatValue(impact.relativeImpact)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="label" type="category" width={140} />
          <Tooltip formatter={formatValue} />
          <Legend />
          <Bar dataKey="impactLow" fill="#ef4444" name="Impact Min" />
          <Bar dataKey="impactHigh" fill="#10b981" name="Impact Max" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

