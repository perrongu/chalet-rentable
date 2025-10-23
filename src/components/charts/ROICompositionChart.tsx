import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { CHART_COLORS } from '../../lib/colors';

interface ROICompositionChartProps {
  cashflow: number;
  cashflowROI: number;
  principalPaid: number;
  capitalizationROI: number;
  propertyAppreciation: number;
  appreciationROI: number;
}

interface ROIDataPoint {
  [key: string]: string | number;
  name: string;
  value: number;
  roi: number;
  color: string;
}

const ROI_COLORS = {
  cashflow: CHART_COLORS.cashflow,
  capitalization: CHART_COLORS.capitalisation,
  appreciation: CHART_COLORS.plusValue,
} as const;

export function ROICompositionChart({
  cashflow,
  cashflowROI,
  principalPaid,
  capitalizationROI,
  propertyAppreciation,
  appreciationROI,
}: ROICompositionChartProps) {
  // Mémoïsation des données filtrées
  const data = useMemo<ROIDataPoint[]>(() => 
    [
      {
        name: 'Cashflow',
        value: Math.max(0, cashflow),
        roi: cashflowROI,
        color: ROI_COLORS.cashflow,
      },
      {
        name: 'Capitalisation',
        value: Math.max(0, principalPaid),
        roi: capitalizationROI,
        color: ROI_COLORS.capitalization,
      },
      {
        name: 'Plus-value',
        value: Math.max(0, propertyAppreciation),
        roi: appreciationROI,
        color: ROI_COLORS.appreciation,
      },
    ].filter(item => item.value > 0),
    [cashflow, cashflowROI, principalPaid, capitalizationROI, propertyAppreciation, appreciationROI]
  );

  if (data.length === 0) {
    return (
      <div 
        className="h-80 flex items-center justify-center text-slate-500"
        role="status"
        aria-label="Aucune donnée de rentabilité disponible"
      >
        Aucune donnée de rentabilité positive
      </div>
    );
  }

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Ne pas afficher les labels pour les petits segments

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const item = payload[0].payload as ROIDataPoint;
    if (!item || typeof item.value !== 'number') return null;

    return (
      <div 
        className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg"
        role="tooltip"
        aria-live="polite"
      >
        <p className="font-semibold text-slate-900 mb-1">{item.name}</p>
        <p className="text-sm text-slate-600">
          Montant: {formatCurrency(item.value)}
        </p>
        <p className="text-sm text-slate-600">
          ROI: {formatPercent(item.roi)}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart 
        accessibilityLayer 
        role="img"
        aria-label="Graphique circulaire montrant la composition du ROI par source"
      >
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} opacity={0.9} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={40}
          iconType="circle"
          iconSize={10}
          wrapperStyle={{
            fontSize: '0.875rem',
            paddingTop: '1rem',
          }}
          formatter={(value, entry: any) => {
            const item = data.find(d => d.name === entry.payload.name);
            return <span style={{ color: '#475569', fontWeight: 500 }}>{`${value} (${formatPercent(item?.roi || 0)})`}</span>;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

