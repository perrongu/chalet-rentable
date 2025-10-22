import { useMemo } from 'react';
import { formatCurrency, formatPercent } from '../lib/utils';
import { getPerformanceColor, PERFORMANCE_THRESHOLDS } from '../lib/chartConfig';

interface ExecutiveSummaryProps {
  cashflow: number;
  totalROI: number;
  capRate: number;
  initialInvestment: number;
}

type PerformanceColor = 'emerald' | 'sky' | 'violet' | 'orange' | 'red';

interface SummaryMetricProps {
  title: string;
  value: string;
  icon: string;
  color: PerformanceColor;
}

function SummaryMetric({ title, value, icon, color }: SummaryMetricProps) {
  const borderColorClasses = {
    emerald: 'border-l-emerald-500',
    sky: 'border-l-sky-500',
    violet: 'border-l-violet-400',
    orange: 'border-l-orange-500',
    red: 'border-l-red-500',
  };

  const iconBgClasses = {
    emerald: 'bg-emerald-100',
    sky: 'bg-sky-100',
    violet: 'bg-violet-100',
    orange: 'bg-orange-100',
    red: 'bg-red-100',
  };

  return (
    <div 
      className={`${borderColorClasses[color]} bg-white border-l-4 border-y border-r border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ease-in-out`}
      style={{ containerType: 'inline-size' }}
    >
      <div className="flex items-center gap-4">
        <div className={`${iconBgClasses[color]} w-12 h-12 rounded-xl shrink-0 flex items-center justify-center`}>
          <span className="text-2xl leading-none">{icon}</span>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <p className="text-[0.7rem] font-semibold text-slate-500 uppercase tracking-[0.05em] leading-tight">
            {title}
          </p>
          <p 
            className="font-bold text-slate-800 leading-none tracking-tight whitespace-nowrap"
            style={{ 
              fontSize: 'min(2rem, 15cqw)',
              containerType: 'normal'
            }}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ExecutiveSummary({ 
  cashflow, 
  totalROI, 
  capRate, 
  initialInvestment 
}: ExecutiveSummaryProps) {
  // Mémoïsation des couleurs basées sur la performance
  const cashflowColor = useMemo(
    () => getPerformanceColor(cashflow, PERFORMANCE_THRESHOLDS.cashflow) as PerformanceColor,
    [cashflow]
  );
  
  const roiColor = useMemo(
    () => getPerformanceColor(totalROI, PERFORMANCE_THRESHOLDS.roi) as PerformanceColor,
    [totalROI]
  );
  
  const capRateColor = useMemo(
    () => getPerformanceColor(capRate, PERFORMANCE_THRESHOLDS.capRate) as PerformanceColor,
    [capRate]
  );

  return (
    <div className="mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1.5">Vue d'ensemble</h2>
        <p className="text-[0.9rem] text-slate-500">Indicateurs clés de performance</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <SummaryMetric
          title="Cashflow annuel"
          value={formatCurrency(cashflow)}
          icon="💵"
          color={cashflowColor}
        />
        <SummaryMetric
          title="ROI total"
          value={formatPercent(totalROI)}
          icon="📈"
          color={roiColor}
        />
        <SummaryMetric
          title="Cap Rate"
          value={formatPercent(capRate)}
          icon="🏠"
          color={capRateColor}
        />
        <SummaryMetric
          title="Investissement initial"
          value={formatCurrency(initialInvestment)}
          icon="💼"
          color="violet"
        />
      </div>
    </div>
  );
}

