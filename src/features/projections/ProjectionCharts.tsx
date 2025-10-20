import type { ProjectionResult } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  ComposedChart,
  BarChart,
  AreaChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ProjectionChartsProps {
  projection: ProjectionResult;
}

export function ProjectionCharts({ projection }: ProjectionChartsProps) {
  const { years } = projection;

  // Données pour le graphique cashflow
  const cashflowData = years.map(y => ({
    année: y.year,
    'Cashflow annuel': y.cashflow,
    'Cashflow cumulé': y.cumulativeCashflow,
  }));

  // Données pour le graphique équité
  const equityData = years.map(y => ({
    année: y.year,
    'Valeur propriété': y.propertyValue,
    'Solde hypothécaire': y.mortgageBalance,
    'Équité': y.equity,
  }));

  // Données pour le graphique décomposition profit
  const profitData = years.map(y => ({
    année: y.year,
    'Cashflow': Math.max(0, y.cashflow),
    'Capitalisation': y.principalPaid,
    'Plus-value': y.appreciation,
  }));

  return (
    <div className="space-y-6">
      {/* Graphique 1: Cashflow */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution du cashflow</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={cashflowData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="année"
                label={{ value: 'Année', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                label={{ value: 'Montant ($)', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value) => formatCurrency(value).replace(/\s/g, '')}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                labelFormatter={(label) => `Année ${label}`}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px', padding: '8px' }}
              />
              <Legend />
              <Bar
                dataKey="Cashflow annuel"
                fill="#3b82f6"
                name="Cashflow annuel"
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="Cashflow cumulé"
                stroke="#10b981"
                strokeWidth={3}
                name="Cashflow cumulé"
                dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Graphique 2: Équité et valeur */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution de l'équité et de la valeur</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={equityData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="année"
                label={{ value: 'Année', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                label={{ value: 'Montant ($)', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value) => formatCurrency(value).replace(/\s/g, '')}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                labelFormatter={(label) => `Année ${label}`}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px', padding: '8px' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="Valeur propriété"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
                name="Valeur propriété"
              />
              <Area
                type="monotone"
                dataKey="Solde hypothécaire"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.4}
                name="Solde hypothécaire"
              />
              <Area
                type="monotone"
                dataKey="Équité"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="Équité"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-2 text-xs text-gray-600 text-center">
            L'équité représente la valeur nette : Valeur de la propriété moins le solde hypothécaire
          </div>
        </CardContent>
      </Card>

      {/* Graphique 3: Décomposition du profit */}
      <Card>
        <CardHeader>
          <CardTitle>Décomposition du profit annuel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={profitData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="année"
                label={{ value: 'Année', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                label={{ value: 'Montant ($)', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value) => formatCurrency(value).replace(/\s/g, '')}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                labelFormatter={(label) => `Année ${label}`}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px', padding: '8px' }}
              />
              <Legend />
              <Bar
                dataKey="Cashflow"
                stackId="profit"
                fill="#3b82f6"
                name="Cashflow (liquidités)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="Capitalisation"
                stackId="profit"
                fill="#f59e0b"
                name="Capitalisation (capital remboursé)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="Plus-value"
                stackId="profit"
                fill="#10b981"
                name="Plus-value (appréciation)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 text-xs text-gray-600 text-center">
            Le profit total combine : Cashflow (liquidités), Capitalisation (capital remboursé), Plus-value (appréciation)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

