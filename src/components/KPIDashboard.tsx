import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import type { KPIResults } from '../types';
import { formatCurrency, formatPercent, formatNumber } from '../lib/utils';

interface KPIDashboardProps {
  kpis: KPIResults;
  onInspect?: (metric: keyof KPIResults) => void;
}

interface MetricCardProps {
  title: string;
  value: string;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  onInspect?: () => void;
}

function MetricCard({ title, value, color = 'blue', onInspect }: MetricCardProps) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    orange: 'border-orange-200 bg-orange-50',
    red: 'border-red-200 bg-red-50',
    purple: 'border-purple-200 bg-purple-50',
  };

  const textColorClasses = {
    blue: 'text-blue-900',
    green: 'text-green-900',
    orange: 'text-orange-900',
    red: 'text-red-900',
    purple: 'text-purple-900',
  };

  return (
    <Card 
      className={`${colorClasses[color]} border-2`}
      role="article"
      aria-label={`Métrique ${title}: ${value}`}
      tabIndex={0}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-gray-600 leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div 
            className={`text-sm md:text-base lg:text-lg xl:text-xl font-bold ${textColorClasses[color]} leading-tight`}
            aria-live="polite"
          >
            {value}
          </div>
          {onInspect && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onInspect}
              className="h-6 px-2 text-xs"
              aria-label={`Voir les détails de ${title}`}
            >
              🔍 Détails
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function KPIDashboard({ kpis, onInspect }: KPIDashboardProps) {
  const cocColor = kpis.cashOnCash >= 8 ? 'green' : kpis.cashOnCash >= 5 ? 'orange' : 'red';
  const capRateColor = kpis.capRate >= 6 ? 'green' : kpis.capRate >= 4 ? 'orange' : 'red';
  const noiColor = kpis.noi >= 0 ? 'green' : 'red';
  const cashflowColor = kpis.annualCashflow >= 0 ? 'green' : 'red';
  const profitColor = kpis.totalAnnualProfit >= 0 ? 'green' : 'red';

  return (
    <div className="space-y-6">
      {/* 1. REVENUS BRUTS */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Revenus bruts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Nuitées vendues"
            value={formatNumber(kpis.nightsSold)}
            color="blue"
            onInspect={() => onInspect?.('nightsSold')}
          />
          <MetricCard
            title="Revenus annuels bruts"
            value={formatCurrency(kpis.annualRevenue)}
            color="blue"
            onInspect={() => onInspect?.('annualRevenue')}
          />
        </div>
      </div>

      {/* 2. MOINS : DÉPENSES OPÉRATIONNELLES */}
      <div>
        <h3 className="text-lg font-semibold mb-3">− Dépenses opérationnelles</h3>
        <div className="grid grid-cols-1 gap-4">
          <MetricCard
            title="Dépenses totales"
            value={formatCurrency(kpis.totalExpenses)}
            color="orange"
            onInspect={() => onInspect?.('totalExpenses')}
          />
        </div>
        {Object.keys(kpis.expensesByCategory).length > 0 && (
          <Card className="mt-3">
            <CardContent className="pt-6">
              <h4 className="text-sm font-medium mb-3">Par catégorie</h4>
              <div className="space-y-2">
                {Object.entries(kpis.expensesByCategory).map(([category, amount]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span className="text-gray-600">{category}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 3. ÉGALE : NOI */}
      <div className="border-t-2 border-gray-200 pt-6">
        <h3 className="text-lg font-semibold mb-3">= NOI (Net Operating Income)</h3>
        <div className="grid grid-cols-1 gap-4">
          <MetricCard
            title="Revenu net d'exploitation"
            value={formatCurrency(kpis.noi)}
            color={noiColor}
            onInspect={() => onInspect?.('noi')}
          />
        </div>
      </div>

      {/* 4. MOINS : SERVICE DE LA DETTE */}
      <div>
        <h3 className="text-lg font-semibold mb-3">− Service de la dette</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Montant du prêt"
            value={formatCurrency(kpis.loanAmount)}
            color="purple"
            onInspect={() => onInspect?.('loanAmount')}
          />
          <MetricCard
            title="Paiement périodique"
            value={formatCurrency(kpis.periodicPayment)}
            color="purple"
            onInspect={() => onInspect?.('periodicPayment')}
          />
          <MetricCard
            title="Service annuel de la dette"
            value={formatCurrency(kpis.annualDebtService)}
            color="purple"
            onInspect={() => onInspect?.('annualDebtService')}
          />
        </div>
      </div>

      {/* 5. ÉGALE : CASHFLOW ANNUEL */}
      <div className="border-t-2 border-gray-200 pt-6">
        <h3 className="text-lg font-semibold mb-3">= Cashflow annuel</h3>
        <div className="grid grid-cols-1 gap-4">
          <MetricCard
            title="Liquidités disponibles"
            value={formatCurrency(kpis.annualCashflow)}
            color={cashflowColor}
            onInspect={() => onInspect?.('annualCashflow')}
          />
        </div>
      </div>

      {/* 6. PLUS : AUTRES SOURCES DE PROFIT */}
      <div>
        <h3 className="text-lg font-semibold mb-3">+ Gains non-liquides</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Capitalisation"
            value={formatCurrency(kpis.principalPaidFirstYear)}
            color="green"
            onInspect={() => onInspect?.('principalPaidFirstYear')}
          />
          <MetricCard
            title="Plus-value"
            value={formatCurrency(kpis.propertyAppreciation)}
            color="green"
            onInspect={() => onInspect?.('propertyAppreciation')}
          />
        </div>
      </div>

      {/* 7. ÉGALE : PROFIT TOTAL ANNUEL */}
      <div className="border-t-2 border-gray-200 pt-6">
        <h3 className="text-lg font-semibold mb-3">= Profit total annuel</h3>
        <div className="grid grid-cols-1 gap-4">
          <MetricCard
            title="Enrichissement total"
            value={formatCurrency(kpis.totalAnnualProfit)}
            color={profitColor}
            onInspect={() => onInspect?.('totalAnnualProfit')}
          />
        </div>
      </div>

      {/* 8. ANALYSE DE RENTABILITÉ */}
      <div className="border-t-2 border-gray-200 pt-6">
        <h3 className="text-lg font-semibold mb-3">Analyse de rentabilité</h3>
        
        {/* Tableau ROI simplifié */}
        <Card className="border-2 border-gray-200">
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Composante</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700">Montant</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onInspect?.('annualCashflow')}
                        className="text-left hover:underline focus:outline-none focus:underline"
                      >
                        Cashflow
                      </button>
                    </td>
                    <td className="text-right py-3 px-3 font-medium">{formatCurrency(kpis.annualCashflow)}</td>
                    <td className="text-right py-3 px-3 font-medium">{formatPercent(kpis.cashflowROI)}</td>
                  </tr>
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onInspect?.('principalPaidFirstYear')}
                        className="text-left hover:underline focus:outline-none focus:underline"
                      >
                        Capitalisation
                      </button>
                    </td>
                    <td className="text-right py-3 px-3 font-medium">{formatCurrency(kpis.principalPaidFirstYear)}</td>
                    <td className="text-right py-3 px-3 font-medium">{formatPercent(kpis.capitalizationROI)}</td>
                  </tr>
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onInspect?.('propertyAppreciation')}
                        className="text-left hover:underline focus:outline-none focus:underline"
                      >
                        Plus-value
                      </button>
                    </td>
                    <td className="text-right py-3 px-3 font-medium">{formatCurrency(kpis.propertyAppreciation)}</td>
                    <td className="text-right py-3 px-3 font-medium">{formatPercent(kpis.appreciationROI)}</td>
                  </tr>
                  <tr className="bg-yellow-100 border-t-2 border-gray-300">
                    <td className="py-3 px-3 font-bold">
                      <button
                        onClick={() => onInspect?.('totalAnnualProfit')}
                        className="text-left hover:underline focus:outline-none focus:underline font-bold"
                      >
                        Total
                      </button>
                    </td>
                    <td className="text-right py-3 px-3 font-bold">
                      {formatCurrency(kpis.totalAnnualProfit)}
                    </td>
                    <td className="text-right py-3 px-3 font-bold">{formatPercent(kpis.totalROI)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* Métriques clés */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <MetricCard
            title="Cash-on-Cash"
            value={formatPercent(kpis.cashOnCash)}
            color={cocColor}
            onInspect={() => onInspect?.('cashOnCash')}
          />
          <MetricCard
            title="Cap Rate"
            value={formatPercent(kpis.capRate)}
            color={capRateColor}
            onInspect={() => onInspect?.('capRate')}
          />
        </div>
      </div>

      {/* 9. INVESTISSEMENT REQUIS */}
      <div className="border-t-2 border-gray-200 pt-6">
        <h3 className="text-lg font-semibold mb-3">Investissement requis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Frais d'acquisition"
            value={formatCurrency(kpis.totalAcquisitionFees)}
            color="orange"
            onInspect={() => onInspect?.('totalAcquisitionFees')}
          />
          <MetricCard
            title="Investissement initial total"
            value={formatCurrency(kpis.initialInvestment)}
            color="orange"
            onInspect={() => onInspect?.('initialInvestment')}
          />
        </div>
      </div>
    </div>
  );
}


