import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { formatCurrency } from '../../lib/utils';
import { COLORS } from '../../lib/chartConfig';

interface CashFlowWaterfallChartProps {
  revenue: number;
  expenses: number;
  noi: number;
  debtService: number;
  cashflow: number;
}

interface WaterfallDataPoint {
  name: string;
  displayValue: number;
  base: number;
  value: number;
  cumulative: number;
  isTotal: boolean;
  isNegative?: boolean;
  color: string;
}

export function CashFlowWaterfallChart({
  revenue,
  expenses,
  noi,
  debtService,
  cashflow,
}: CashFlowWaterfallChartProps) {
  // Mémoïsation des données pour éviter recalculs inutiles
  const data = useMemo<WaterfallDataPoint[]>(() => [
    {
      name: 'Revenus',
      displayValue: revenue,
      base: 0,
      value: revenue,
      cumulative: revenue,
      isTotal: true,
      color: COLORS.blue.base,
    },
    {
      name: 'Dépenses',
      displayValue: -expenses,
      base: noi,
      value: expenses,
      cumulative: noi,
      isTotal: false,
      isNegative: true,
      color: COLORS.orange.base,
    },
    {
      name: 'NOI',
      displayValue: noi,
      base: 0,
      value: noi,
      cumulative: noi,
      isTotal: true,
      color: COLORS.green.base,
    },
    {
      name: 'Dette',
      displayValue: -debtService,
      base: cashflow,
      value: debtService,
      cumulative: cashflow,
      isTotal: false,
      isNegative: true,
      color: COLORS.violet.base,
    },
    {
      name: 'Cashflow',
      displayValue: cashflow,
      base: 0,
      value: Math.abs(cashflow),
      cumulative: cashflow,
      isTotal: true,
      color: cashflow >= 0 ? COLORS.green.dark : COLORS.red.base,
    },
  ], [revenue, expenses, noi, debtService, cashflow]);

  // Mémoïsation du domaine Y
  const yDomain = useMemo(() => {
    const maxValue = Math.max(revenue, noi, Math.abs(cashflow));
    const minValue = Math.min(0, cashflow);
    return [minValue - maxValue * 0.1, maxValue * 1.15];
  }, [revenue, noi, cashflow]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const item = payload[0].payload as WaterfallDataPoint;
    if (!item || typeof item.displayValue !== 'number') return null;

    return (
      <div 
        className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg"
        role="tooltip"
        aria-live="polite"
      >
        <p className="font-semibold text-slate-900 mb-1">{item.name}</p>
        <p className="text-sm text-slate-600">
          <span className="font-medium">
            {item.isTotal ? 'Total' : item.isNegative ? 'Réduction' : 'Montant'}:
          </span>{' '}
          {formatCurrency(Math.abs(item.displayValue))}
        </p>
        {!item.isTotal && (
          <p className="text-xs text-slate-500 mt-1">
            → Cumulatif: {formatCurrency(item.cumulative)}
          </p>
        )}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={data} 
        margin={{ top: 10, right: 15, left: 15, bottom: 5 }} 
        barSize={65}
        accessibilityLayer
        role="img"
        aria-label="Graphique en cascade montrant l'évolution du flux financier depuis les revenus jusqu'au cashflow net"
      >
        <defs>
          {/* Dégradés pour un effet plus moderne */}
          <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.blue.base} stopOpacity={0.95} />
            <stop offset="100%" stopColor={COLORS.blue.dark} stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.green.base} stopOpacity={0.95} />
            <stop offset="100%" stopColor={COLORS.green.dark} stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id="darkGreenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.green.dark} stopOpacity={0.95} />
            <stop offset="100%" stopColor={COLORS.green.darker} stopOpacity={0.9} />
          </linearGradient>
        </defs>
        
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} strokeOpacity={0.5} />
        <XAxis 
          dataKey="name" 
          stroke="#64748b" 
          style={{ fontSize: '0.875rem', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          tickFormatter={(value) => formatCurrency(value)}
          stroke="#64748b"
          domain={yDomain}
          style={{ fontSize: '0.75rem' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
        <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />
        
        {/* Barres de base (invisibles) pour positionner les barres */}
        <Bar dataKey="base" stackId="waterfall" fill="transparent" />
        
        {/* Barres principales avec effet cascade */}
        <Bar dataKey="value" stackId="waterfall" radius={[8, 8, 8, 8]}>
          {data.map((entry, index) => {
            let fillColor = entry.color;
            
            // Utiliser les dégradés pour les totaux
            if (entry.name === 'Revenus') fillColor = 'url(#blueGradient)';
            if (entry.name === 'NOI') fillColor = 'url(#greenGradient)';
            if (entry.name === 'Cashflow' && entry.displayValue >= 0) fillColor = 'url(#darkGreenGradient)';
            
            return (
              <Cell 
                key={`cell-${index}`} 
                fill={fillColor}
                stroke={entry.isNegative ? entry.color : 'none'}
                strokeWidth={entry.isNegative ? 2 : 0}
                strokeDasharray={entry.isNegative ? '4 2' : '0'}
                opacity={entry.isNegative ? 0.75 : 1}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

