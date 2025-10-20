import { useState, useMemo } from 'react';
import type { ProjectionResult } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { CHART_COLORS, CHART_COLORS_WITH_OPACITY } from '../../lib/colors';
import {
  BarChart,
  Bar,
  AreaChart,
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
  const [viewMode, setViewMode] = useState<'annual' | 'cumulative'>('annual');

  // Calculer les données avec mémorisation pour optimiser les performances
  const profitData = useMemo(() => {
    let cumulativeCashflow = 0;
    let cumulativeCapitalisation = 0;
    let cumulativePlusValue = 0;

    return years.map(y => {
      cumulativeCashflow += Math.max(0, y.cashflow);
      cumulativeCapitalisation += y.principalPaid;
      cumulativePlusValue += y.appreciation;

      return {
        année: y.year,
        // Données annuelles
        'Cashflow': Math.max(0, y.cashflow),
        'Capitalisation': y.principalPaid,
        'Plus-value': y.appreciation,
        // Données cumulatives
        'Cashflow cumulé': cumulativeCashflow,
        'Capitalisation cumulée': cumulativeCapitalisation,
        'Plus-value cumulée': cumulativePlusValue,
      };
    });
  }, [years]);

  // Données pour le graphique équité
  const equityData = useMemo(() => years.map(y => ({
    année: y.year,
    'Valeur propriété': y.propertyValue,
    'Solde hypothécaire': y.mortgageBalance,
    'Équité': y.equity,
  })), [years]);

  // Configuration commune pour les deux graphiques
  const chartMargin = { top: 20, right: 30, left: 70, bottom: 30 };
  const tooltipStyle = { backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px', padding: '8px' };

  return (
    <div className="space-y-6">
      {/* Graphique 1: Profit total (fusionné cashflow + décomposition) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {viewMode === 'annual' 
                ? 'Décomposition du profit annuel ($) : cashflow, capitalisation et plus-value par année'
                : 'Évolution cumulée du profit ($) : cashflow, capitalisation et plus-value par année'
              }
            </CardTitle>
            <div className="flex gap-2" role="group" aria-label="Mode d'affichage du graphique">
              <button
                onClick={() => setViewMode('annual')}
                aria-pressed={viewMode === 'annual'}
                aria-label="Afficher les valeurs annuelles"
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{
                  backgroundColor: viewMode === 'annual' ? CHART_COLORS.info : '#e5e7eb',
                  color: viewMode === 'annual' ? 'white' : '#374151',
                }}
              >
                Annuel
              </button>
              <button
                onClick={() => setViewMode('cumulative')}
                aria-pressed={viewMode === 'cumulative'}
                aria-label="Afficher les valeurs cumulatives"
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{
                  backgroundColor: viewMode === 'cumulative' ? CHART_COLORS.info : '#e5e7eb',
                  color: viewMode === 'cumulative' ? 'white' : '#374151',
                }}
              >
                Cumulatif
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={profitData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="année" />
              <YAxis
                tickFormatter={(value) => formatCurrency(value).replace(/\s/g, '')}
                width={65}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                labelFormatter={(label) => `Année ${label}`}
                contentStyle={tooltipStyle}
              />
              <Legend />
              {viewMode === 'annual' ? (
                <>
                  <Bar
                    dataKey="Cashflow"
                    stackId="profit"
                    fill={CHART_COLORS.cashflow}
                    name="Cashflow (liquidités)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="Capitalisation"
                    stackId="profit"
                    fill={CHART_COLORS.capitalisation}
                    name="Capitalisation (capital remboursé)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="Plus-value"
                    stackId="profit"
                    fill={CHART_COLORS.plusValue}
                    name="Plus-value (appréciation)"
                    radius={[4, 4, 0, 0]}
                  />
                </>
              ) : (
                <>
                  <Bar
                    dataKey="Cashflow cumulé"
                    stackId="profit-cumul"
                    fill={CHART_COLORS.cashflow}
                    name="Cashflow cumulé"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="Capitalisation cumulée"
                    stackId="profit-cumul"
                    fill={CHART_COLORS.capitalisation}
                    name="Capitalisation cumulée"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="Plus-value cumulée"
                    stackId="profit-cumul"
                    fill={CHART_COLORS.plusValue}
                    name="Plus-value cumulée"
                    radius={[4, 4, 0, 0]}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 text-xs text-gray-600 text-center">
            {viewMode === 'annual' 
              ? 'Le profit total combine : Cashflow (liquidités), Capitalisation (capital remboursé), Plus-value (appréciation)'
              : 'Accumulation du profit au fil des années : Cashflow, Capitalisation et Plus-value'
            }
          </div>
        </CardContent>
      </Card>

      {/* Graphique 2: Équité et valeur */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution de la valeur, du solde hypothécaire et de l'équité ($) par année</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={equityData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="année" />
              <YAxis
                tickFormatter={(value) => formatCurrency(value).replace(/\s/g, '')}
                width={65}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                labelFormatter={(label) => `Année ${label}`}
                contentStyle={tooltipStyle}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="Valeur propriété"
                stroke={CHART_COLORS_WITH_OPACITY.propertyValue.stroke}
                fill={CHART_COLORS_WITH_OPACITY.propertyValue.fill}
                fillOpacity={CHART_COLORS_WITH_OPACITY.propertyValue.fillOpacity}
                name="Valeur propriété"
              />
              <Area
                type="monotone"
                dataKey="Solde hypothécaire"
                stroke={CHART_COLORS_WITH_OPACITY.mortgage.stroke}
                fill={CHART_COLORS_WITH_OPACITY.mortgage.fill}
                fillOpacity={CHART_COLORS_WITH_OPACITY.mortgage.fillOpacity}
                name="Solde hypothécaire"
              />
              <Area
                type="monotone"
                dataKey="Équité"
                stroke={CHART_COLORS_WITH_OPACITY.equity.stroke}
                fill={CHART_COLORS_WITH_OPACITY.equity.fill}
                fillOpacity={CHART_COLORS_WITH_OPACITY.equity.fillOpacity}
                name="Équité"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-2 text-xs text-gray-600 text-center">
            L'équité représente la valeur nette : Valeur de la propriété moins le solde hypothécaire
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

