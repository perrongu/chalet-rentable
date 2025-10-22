import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ProgressBar } from './ui/ProgressBar';
import type { KPIResults, ProjectInputs } from '../types';
import { formatCurrency, formatPercent, formatNumber } from '../lib/utils';
import { ExecutiveSummary } from './ExecutiveSummary';
import { KeyAssumptions } from './KeyAssumptions';
import { ExpenseBreakdownChart } from './charts/ExpenseBreakdownChart';
import { ROICompositionChart } from './charts/ROICompositionChart';
import { CashFlowWaterfallChart } from './charts/CashFlowWaterfallChart';

interface KPIDashboardProps {
  kpis: KPIResults;
  inputs: ProjectInputs;
  onInspect?: (metric: keyof KPIResults) => void;
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  badge?: React.ReactNode;
  color?: 'sky' | 'emerald' | 'orange' | 'red' | 'violet' | 'slate' | 'amber';
  icon?: string;
  onInspect?: () => void;
  variant?: 'default' | 'large' | 'total';
  className?: string;
}

function MetricCard({ title, value, subtitle, badge, color = 'sky', icon, onInspect, variant = 'default', className = '' }: MetricCardProps) {
  const borderColorClasses = {
    sky: 'border-l-sky-500',
    emerald: 'border-l-emerald-500',
    orange: 'border-l-orange-500',
    red: 'border-l-red-500',
    violet: 'border-l-violet-400',
    slate: 'border-l-slate-500',
    amber: 'border-l-amber-500',
  };

  const iconBgClasses = {
    sky: 'bg-sky-100',
    emerald: 'bg-emerald-100',
    orange: 'bg-orange-100',
    red: 'bg-red-100',
    violet: 'bg-violet-100',
    slate: 'bg-slate-100',
    amber: 'bg-amber-100',
  };

  const textColorClass = variant === 'total' ? 'text-slate-900' : 'text-slate-800';
  
  const totalBorder = variant === 'total' ? 'border-l-slate-700' : '';
  
  const getFontSize = () => {
    if (variant === 'total') return 'min(1.75rem, 13cqw)';
    if (variant === 'large') return 'min(2rem, 15cqw)';
    return 'min(1.25rem, 10cqw)';
  };

  return (
    <div 
      className={`${totalBorder || borderColorClasses[color]} ${className} bg-white border-l-4 border-y border-r border-slate-200 rounded-[14px] p-4 transition-all duration-300 ease-in-out ${variant === 'total' ? 'shadow-md' : 'shadow-[0_2px_6px_rgba(0,0,0,0.05)]'} hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5`}
      style={{ containerType: 'inline-size' }}
      role="article"
      aria-label={`Métrique ${title}: ${value}`}
      tabIndex={0}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={`${iconBgClasses[color]} w-10 h-10 rounded-lg shrink-0 flex items-center justify-center`}>
              <span className="text-xl leading-none">{icon}</span>
            </div>
          )}
          <p className={`text-[0.7rem] font-semibold ${variant === 'total' ? 'text-slate-800' : 'text-slate-600'} uppercase tracking-[0.05em] leading-tight`}>
            {title}
          </p>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      
      <div className="space-y-2">
        <p 
          className={`font-bold ${textColorClass} leading-none tracking-tight whitespace-nowrap`}
          style={{ 
            fontSize: getFontSize(),
            containerType: 'normal'
          }}
          aria-live="polite"
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-500 leading-tight">
            {subtitle}
          </p>
        )}
        {onInspect && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onInspect}
            className="h-7 px-2 text-xs mt-2"
            aria-label={`Voir les détails de ${title}`}
          >
            <span className="emoji-icon-sm">ⓘ</span>Détails
          </Button>
        )}
      </div>
    </div>
  );
}

function extractValue<T>(input: any): T {
  if (typeof input === 'object' && input !== null && 'value' in input) {
    if ('range' in input && input.range && input.range.useRange) {
      return input.range.default as T;
    }
    return input.value;
  }
  return input as T;
}

export function KPIDashboard({ kpis, inputs, onInspect }: KPIDashboardProps) {
  // DSCR Badge variant
  const getDSCRBadge = (dscr: number) => {
    if (dscr >= 1.25) return <Badge variant="success">Excellent</Badge>;
    if (dscr >= 1.1) return <Badge variant="warning">Acceptable</Badge>;
    return <Badge variant="danger">Risqué</Badge>;
  };

  // Ratios
  const noiToRevenueRatio = kpis.annualRevenue > 0 
    ? (kpis.noi / kpis.annualRevenue) * 100 
    : 0;
  
  const expenseToRevenueRatio = kpis.annualRevenue > 0
    ? (kpis.totalExpenses / kpis.annualRevenue) * 100
    : 0;
  
  const debtToRevenueRatio = kpis.annualRevenue > 0
    ? (kpis.annualDebtService / kpis.annualRevenue) * 100
    : 0;

  // Inputs
  const occupancyRate = extractValue<number>(inputs.revenue.occupancyRate);
  const averageDailyRate = extractValue<number>(inputs.revenue.averageDailyRate);
  const interestRate = extractValue<number>(inputs.financing.interestRate);
  const appreciationRate = extractValue<number>(inputs.financing.annualAppreciationRate);

  return (
    <div className="space-y-10 pb-8">
      {/* 1. EXECUTIVE SUMMARY */}
      <ExecutiveSummary
        cashflow={kpis.annualCashflow}
        totalROI={kpis.totalROI}
        capRate={kpis.capRate}
        initialInvestment={kpis.initialInvestment}
      />

      {/* 2. HYPOTHÈSES CLÉS */}
      <KeyAssumptions
        occupancyRate={occupancyRate}
        averageDailyRate={averageDailyRate}
        interestRate={interestRate}
        appreciationRate={appreciationRate}
      />

      {/* 3. FLUX FINANCIER EN CASCADE */}
      <section className="mt-10">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-slate-900 mb-1">Flux financier en cascade</h3>
          <p className="text-sm text-slate-500">Évolution du flux financier : revenus → NOI → cashflow net</p>
        </div>
        <Card className="shadow-[0_2px_6px_rgba(0,0,0,0.05)] rounded-[14px]">
          <CardContent className="pt-6">
            <div style={{ height: '340px' }}>
              <CashFlowWaterfallChart
                revenue={kpis.annualRevenue}
                expenses={kpis.totalExpenses}
                noi={kpis.noi}
                debtService={kpis.annualDebtService}
                cashflow={kpis.annualCashflow}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-blue-500 to-blue-600"></div>
                <span className="text-slate-600">Revenus bruts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm border-2 border-orange-500 border-dashed bg-orange-500/20"></div>
                <span className="text-slate-600">Réductions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-green-500 to-green-600"></div>
                <span className="text-slate-600">Résultats nets</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4. REVENUS LOCATIFS BRUTS */}
      <section className="mt-10">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Revenus locatifs bruts</h3>
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
            variant="total"
            onInspect={() => onInspect?.('annualRevenue')}
          />
        </div>
      </section>

      {/* 5. DÉPENSES OPÉRATIONNELLES */}
      <section className="mt-10">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Dépenses opérationnelles</h3>
        <div className="space-y-6">
          <MetricCard
            title="Dépenses totales"
            value={formatCurrency(kpis.totalExpenses)}
            subtitle={`${formatPercent(expenseToRevenueRatio)} des revenus`}
            color="orange"
            icon="📊"
            variant="total"
            onInspect={() => onInspect?.('totalExpenses')}
          />

          {/* Graphique de répartition en pleine largeur */}
          {Object.keys(kpis.expensesByCategory).length > 0 && (
            <div>
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-slate-800 mb-1">Répartition des dépenses</h4>
                <p className="text-sm text-slate-500">Détail des dépenses par catégorie</p>
              </div>
              <Card className="shadow-[0_2px_6px_rgba(0,0,0,0.05)] rounded-[14px]">
                <CardContent className="pt-6">
                  <div className="h-[320px] sm:h-[400px]">
                    <ExpenseBreakdownChart expensesByCategory={kpis.expensesByCategory} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* 6. NOI AVEC PROGRESS BAR ET BADGE EN LIGNE */}
      <section className="mt-10">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Revenu net d'exploitation (NOI)</h3>
        <div 
          className="border-l-emerald-500 bg-white border-l-4 border-y border-r border-slate-200 rounded-[14px] p-5 shadow-[0_2px_6px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300"
          style={{ containerType: 'inline-size' }}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 w-12 h-12 rounded-lg shrink-0 flex items-center justify-center">
                <span className="text-2xl leading-none">📈</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[0.7rem] font-semibold text-slate-600 uppercase tracking-[0.05em] leading-tight">
                    NOI
                  </p>
                  {noiToRevenueRatio >= 60 && (
                    <Badge variant="success">Excellente marge</Badge>
                  )}
                </div>
                <p 
                  className="font-bold text-slate-900 leading-none tracking-tight whitespace-nowrap"
                  style={{ 
                    fontSize: 'min(2rem, 15cqw)',
                    containerType: 'normal'
                  }}
                >
                  {formatCurrency(kpis.noi)}
                </p>
              </div>
            </div>
          </div>
          
          <ProgressBar 
            value={noiToRevenueRatio} 
            label="Part des revenus" 
            color="emerald"
          />
          
          {onInspect && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onInspect('noi')}
              className="h-7 px-2 text-xs mt-3"
            >
              <span className="emoji-icon-sm">ⓘ</span>Détails
            </Button>
          )}
        </div>
      </section>

      {/* 7. SERVICE DE LA DETTE ÉQUILIBRÉ */}
      <section className="mt-10">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Service de la dette</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ligne 1 */}
          <MetricCard
            title="Montant du prêt"
            value={formatCurrency(kpis.loanAmount)}
            color="violet"
            icon="🏦"
            onInspect={() => onInspect?.('loanAmount')}
            className="min-h-[140px] flex flex-col justify-center"
          />
          <MetricCard
            title="Service annuel"
            value={formatCurrency(kpis.annualDebtService)}
            subtitle={`${formatPercent(debtToRevenueRatio)} des revenus`}
            color="violet"
            icon="💳"
            variant="total"
            onInspect={() => onInspect?.('annualDebtService')}
            className="min-h-[140px]"
          />
          
          {/* Ligne 2 */}
          <MetricCard
            title="Paiement périodique"
            value={formatCurrency(kpis.periodicPayment)}
            color="violet"
            icon="📅"
            onInspect={() => onInspect?.('periodicPayment')}
            className="min-h-[140px] flex flex-col justify-center"
          />
          <MetricCard
            title="DSCR"
            value={kpis.dscr.toFixed(2)}
            badge={getDSCRBadge(kpis.dscr)}
            color={kpis.dscr >= 1.25 ? 'emerald' : kpis.dscr >= 1.1 ? 'amber' : 'red'}
            icon="🎯"
            onInspect={() => onInspect?.('dscr')}
            className="min-h-[140px] flex flex-col justify-center"
          />
        </div>
      </section>

      {/* 8. CRÉATION DE RICHESSE AVEC BARRES HORIZONTALES AMÉLIORÉES */}
      <section className="mt-10">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Création de richesse</h3>
        <div 
          className="border-l-emerald-500 bg-white border-l-4 border-y border-r border-slate-200 rounded-[14px] p-6 shadow-md hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="space-y-4">
            {/* Cashflow */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">💵</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-600">Cashflow</p>
                  <p className="text-xl font-bold text-slate-900 whitespace-nowrap">{formatCurrency(kpis.annualCashflow)}</p>
                </div>
              </div>
              <div className="h-1.5 bg-sky-100 rounded-full flex-1 max-w-[200px]">
                <div 
                  className="h-full bg-sky-500 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((kpis.annualCashflow / kpis.totalAnnualProfit) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Capitalisation */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">🔄</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-600">Capitalisation</p>
                  <p className="text-xl font-bold text-slate-900 whitespace-nowrap">{formatCurrency(kpis.principalPaidFirstYear)}</p>
                </div>
              </div>
              <div className="h-1.5 bg-emerald-100 rounded-full flex-1 max-w-[200px]">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((kpis.principalPaidFirstYear / kpis.totalAnnualProfit) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Plus-value */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">📊</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-600">Plus-value</p>
                  <p className="text-xl font-bold text-slate-900 whitespace-nowrap">{formatCurrency(kpis.propertyAppreciation)}</p>
                </div>
              </div>
              <div className="h-1.5 bg-violet-100 rounded-full flex-1 max-w-[200px]">
                <div 
                  className="h-full bg-violet-500 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((kpis.propertyAppreciation / kpis.totalAnnualProfit) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center gap-3 pt-2">
              <span className="text-3xl shrink-0">✨</span>
              <div>
                <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-black text-slate-900 whitespace-nowrap">{formatCurrency(kpis.totalAnnualProfit)}</p>
              </div>
            </div>
          </div>
          
          {onInspect && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onInspect('totalAnnualProfit')}
              className="h-7 px-2 text-xs mt-4"
            >
              <span className="emoji-icon-sm">ⓘ</span>Détails
            </Button>
          )}
        </div>
      </section>

      {/* 9. ANALYSE DE RENTABILITÉ - KPI AU-DESSUS */}
      <section className="mt-10">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Analyse de rentabilité</h3>
        
        {/* KPI au-dessus */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard
            title="ROI Total"
            value={formatPercent(kpis.totalROI)}
            subtitle="Rendement global"
            color={kpis.totalROI >= 15 ? 'emerald' : kpis.totalROI >= 10 ? 'sky' : 'orange'}
            icon="🎯"
            variant="total"
            onInspect={() => onInspect?.('totalROI')}
          />
          <MetricCard
            title="Cash-on-Cash"
            value={formatPercent(kpis.cashOnCash)}
            subtitle="Rendement liquidités"
            color={kpis.cashOnCash >= 8 ? 'emerald' : kpis.cashOnCash >= 5 ? 'sky' : 'orange'}
            onInspect={() => onInspect?.('cashOnCash')}
          />
          <MetricCard
            title="Cap Rate"
            value={formatPercent(kpis.capRate)}
            subtitle="Rendement NOI"
            color={kpis.capRate >= 6 ? 'emerald' : kpis.capRate >= 4 ? 'sky' : 'orange'}
            onInspect={() => onInspect?.('capRate')}
          />
        </div>

        {/* Graphique centré en-dessous */}
        <Card className="shadow-[0_2px_6px_rgba(0,0,0,0.05)] rounded-[14px]">
          <CardHeader>
            <CardTitle className="text-base text-center">Composition du rendement</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '280px', transform: 'scale(0.85)' }}>
              <ROICompositionChart
                cashflow={kpis.annualCashflow}
                cashflowROI={kpis.cashflowROI}
                principalPaid={kpis.principalPaidFirstYear}
                capitalizationROI={kpis.capitalizationROI}
                propertyAppreciation={kpis.propertyAppreciation}
                appreciationROI={kpis.appreciationROI}
              />
            </div>
            <p className="text-xs text-slate-500 text-center mt-2">
              Répartition du rendement annuel selon les sources de valeur
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 10. INVESTISSEMENT REQUIS AVEC SOUS-TEXTE AMÉLIORÉ */}
      <section className="mt-10">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Investissement requis</h3>
        <div 
          className="border-l-amber-500 bg-white border-l-4 border-y border-r border-slate-200 rounded-[14px] p-5 shadow-[0_2px_6px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex items-center"
          style={{ containerType: 'inline-size' }}
        >
          <div className="flex items-center gap-3 w-full">
            <div className="bg-amber-100 w-12 h-12 rounded-lg shrink-0 flex items-center justify-center">
              <span className="text-2xl leading-none">💼</span>
            </div>
            <div className="flex-1">
              <p className="text-[0.7rem] font-semibold text-slate-600 uppercase tracking-[0.05em] leading-tight mb-2">
                Investissement initial total
              </p>
              <p 
                className="font-bold text-slate-900 leading-none tracking-tight whitespace-nowrap mb-1"
                style={{ 
                  fontSize: 'min(1.75rem, 13cqw)',
                  containerType: 'normal'
                }}
              >
                {formatCurrency(kpis.initialInvestment)}
              </p>
              <p className="text-[0.85rem] text-slate-500 mt-1">
                dont frais d'acquisition : <span className="font-semibold text-slate-600">{formatCurrency(kpis.totalAcquisitionFees)}</span>
              </p>
              
              {onInspect && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onInspect('initialInvestment')}
                  className="h-7 px-2 text-xs mt-3"
                >
                  <span className="emoji-icon-sm">ⓘ</span>Détails
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

