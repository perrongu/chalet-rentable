import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import type { KPIResults } from '../types';
import { formatCurrency, formatPercent, formatNumber } from '../lib/utils';

interface KPIDashboardProps {
  kpis: KPIResults;
  onInspect?: (metric: keyof KPIResults) => void;
}

interface MetricCardProps {
  title: string;
  value: string;
  color?: 'sky' | 'emerald' | 'orange' | 'red' | 'violet' | 'slate';
  icon?: string;
  onInspect?: () => void;
}

function MetricCard({ title, value, color = 'sky', icon, onInspect }: MetricCardProps) {
  const colorClasses = {
    sky: 'border-sky-100 bg-sky-50/50',
    emerald: 'border-emerald-100 bg-emerald-50/50',
    orange: 'border-orange-100 bg-orange-50/50',
    red: 'border-red-100 bg-red-50/50',
    violet: 'border-violet-100 bg-violet-50/50',
    slate: 'border-slate-100 bg-slate-50/50',
  };

  const textColorClasses = {
    sky: 'text-sky-700',
    emerald: 'text-emerald-700',
    orange: 'text-orange-700',
    red: 'text-red-700',
    violet: 'text-violet-700',
    slate: 'text-slate-700',
  };

  return (
    <Card 
      className={`${colorClasses[color]} border hover:shadow-soft transition-shadow`}
      role="article"
      aria-label={`Métrique ${title}: ${value}`}
      tabIndex={0}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {icon && (
            <Icon variant={color} size="sm">
              {icon}
            </Icon>
          )}
          <CardTitle className="text-xs font-medium text-slate-600 leading-tight">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
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
              className="h-7 px-2 text-xs"
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
  const cocColor = kpis.cashOnCash >= 8 ? 'emerald' : kpis.cashOnCash >= 5 ? 'orange' : 'red';
  const capRateColor = kpis.capRate >= 6 ? 'emerald' : kpis.capRate >= 4 ? 'orange' : 'red';
  const noiColor = kpis.noi >= 0 ? 'emerald' : 'red';
  const cashflowColor = kpis.annualCashflow >= 0 ? 'emerald' : 'red';
  const profitColor = kpis.totalAnnualProfit >= 0 ? 'emerald' : 'red';

  return (
    <div className="space-y-6">
      {/* 1. REVENUS BRUTS */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-slate-800">Revenus bruts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Nuitées vendues"
            value={formatNumber(kpis.nightsSold)}
            color="sky"
            icon="🌙"
            onInspect={() => onInspect?.('nightsSold')}
          />
          <MetricCard
            title="Revenus annuels bruts"
            value={formatCurrency(kpis.annualRevenue)}
            color="sky"
            icon="💰"
            onInspect={() => onInspect?.('annualRevenue')}
          />
        </div>
      </div>

      {/* 2. MOINS : DÉPENSES OPÉRATIONNELLES */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-slate-800">− Dépenses opérationnelles</h3>
        <div className="grid grid-cols-1 gap-4">
          <MetricCard
            title="Dépenses totales"
            value={formatCurrency(kpis.totalExpenses)}
            color="orange"
            icon="📊"
            onInspect={() => onInspect?.('totalExpenses')}
          />
        </div>
        {Object.keys(kpis.expensesByCategory).length > 0 && (
          <Card className="mt-3">
            <CardContent className="pt-6">
              <h4 className="text-sm font-medium mb-3 text-slate-700">Par catégorie</h4>
              <div className="space-y-2">
                {Object.entries(kpis.expensesByCategory).map(([category, amount]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span className="text-slate-600">{category}</span>
                    <span className="font-medium text-slate-900">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 3. ÉGALE : NOI */}
      <div className="border-t-2 border-slate-200 pt-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-800">= NOI (Net Operating Income)</h3>
        <div className="grid grid-cols-1 gap-4">
          <MetricCard
            title="Revenu net d'exploitation"
            value={formatCurrency(kpis.noi)}
            color={noiColor}
            icon="📈"
            onInspect={() => onInspect?.('noi')}
          />
        </div>
      </div>

      {/* 4. MOINS : SERVICE DE LA DETTE */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-slate-800">− Service de la dette</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Montant du prêt"
            value={formatCurrency(kpis.loanAmount)}
            color="violet"
            icon="🏦"
            onInspect={() => onInspect?.('loanAmount')}
          />
          <MetricCard
            title="Paiement périodique"
            value={formatCurrency(kpis.periodicPayment)}
            color="violet"
            icon="📅"
            onInspect={() => onInspect?.('periodicPayment')}
          />
          <MetricCard
            title="Service annuel de la dette"
            value={formatCurrency(kpis.annualDebtService)}
            color="violet"
            icon="💳"
            onInspect={() => onInspect?.('annualDebtService')}
          />
        </div>
      </div>

      {/* 5. ÉGALE : CASHFLOW ANNUEL */}
      <div className="border-t-2 border-slate-200 pt-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-800">= Cashflow annuel</h3>
        <div className="grid grid-cols-1 gap-4">
          <MetricCard
            title="Liquidités disponibles"
            value={formatCurrency(kpis.annualCashflow)}
            color={cashflowColor}
            icon="💵"
            onInspect={() => onInspect?.('annualCashflow')}
          />
        </div>
      </div>

      {/* 6. PLUS : AUTRES SOURCES DE PROFIT */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-slate-800">+ Gains non-liquides</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Capitalisation"
            value={formatCurrency(kpis.principalPaidFirstYear)}
            color="emerald"
            icon="🔄"
            onInspect={() => onInspect?.('principalPaidFirstYear')}
          />
          <MetricCard
            title="Plus-value"
            value={formatCurrency(kpis.propertyAppreciation)}
            color="emerald"
            icon="📊"
            onInspect={() => onInspect?.('propertyAppreciation')}
          />
        </div>
      </div>

      {/* 7. ÉGALE : PROFIT TOTAL ANNUEL */}
      <div className="border-t-2 border-slate-200 pt-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-800">= Profit total annuel</h3>
        <div className="grid grid-cols-1 gap-4">
          <MetricCard
            title="Enrichissement total"
            value={formatCurrency(kpis.totalAnnualProfit)}
            color={profitColor}
            icon="✨"
            onInspect={() => onInspect?.('totalAnnualProfit')}
          />
        </div>
      </div>

      {/* 8. ANALYSE DE RENTABILITÉ */}
      <div className="border-t-2 border-slate-200 pt-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-800">Analyse de rentabilité</h3>
        
        {/* Tableau ROI simplifié */}
        <Card className="border border-slate-200">
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Composante</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">Montant</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onInspect?.('annualCashflow')}
                        className="text-left text-slate-700 hover:text-slate-900 hover:underline focus:outline-none focus:underline"
                      >
                        Cashflow
                      </button>
                    </td>
                    <td className="text-right py-3 px-3 font-medium text-slate-900">{formatCurrency(kpis.annualCashflow)}</td>
                    <td className="text-right py-3 px-3 font-medium text-slate-900">{formatPercent(kpis.cashflowROI)}</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onInspect?.('principalPaidFirstYear')}
                        className="text-left text-slate-700 hover:text-slate-900 hover:underline focus:outline-none focus:underline"
                      >
                        Capitalisation
                      </button>
                    </td>
                    <td className="text-right py-3 px-3 font-medium text-slate-900">{formatCurrency(kpis.principalPaidFirstYear)}</td>
                    <td className="text-right py-3 px-3 font-medium text-slate-900">{formatPercent(kpis.capitalizationROI)}</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onInspect?.('propertyAppreciation')}
                        className="text-left text-slate-700 hover:text-slate-900 hover:underline focus:outline-none focus:underline"
                      >
                        Plus-value
                      </button>
                    </td>
                    <td className="text-right py-3 px-3 font-medium text-slate-900">{formatCurrency(kpis.propertyAppreciation)}</td>
                    <td className="text-right py-3 px-3 font-medium text-slate-900">{formatPercent(kpis.appreciationROI)}</td>
                  </tr>
                  <tr className="bg-emerald-50 border-t-2 border-slate-200">
                    <td className="py-3 px-3 font-bold">
                      <button
                        onClick={() => onInspect?.('totalAnnualProfit')}
                        className="text-left text-slate-800 hover:text-slate-900 hover:underline focus:outline-none focus:underline font-bold"
                      >
                        Total
                      </button>
                    </td>
                    <td className="text-right py-3 px-3 font-bold text-slate-900">
                      {formatCurrency(kpis.totalAnnualProfit)}
                    </td>
                    <td className="text-right py-3 px-3 font-bold text-slate-900">{formatPercent(kpis.totalROI)}</td>
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
      <div className="border-t-2 border-slate-200 pt-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-800">Investissement requis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Frais d'acquisition"
            value={formatCurrency(kpis.totalAcquisitionFees)}
            color="orange"
            icon="💼"
            onInspect={() => onInspect?.('totalAcquisitionFees')}
          />
          <MetricCard
            title="Investissement initial total"
            value={formatCurrency(kpis.initialInvestment)}
            color="orange"
            icon="🏠"
            onInspect={() => onInspect?.('initialInvestment')}
          />
        </div>
      </div>
    </div>
  );
}


