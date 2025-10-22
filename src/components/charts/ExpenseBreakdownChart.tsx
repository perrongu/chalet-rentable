import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../../lib/utils';
import { EXPENSE_COLORS } from '../../lib/chartConfig';

interface ExpenseBreakdownChartProps {
  expensesByCategory: Record<string, number>;
}

interface ExpenseDataPoint {
  category: string;
  amount: number;
}

export function ExpenseBreakdownChart({ expensesByCategory }: ExpenseBreakdownChartProps) {
  // Mémoïsation des données triées
  const data = useMemo<ExpenseDataPoint[]>(
    () => Object.entries(expensesByCategory)
      .map(([category, amount]) => ({
        category,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount),
    [expensesByCategory]
  );

  if (data.length === 0) {
    return (
      <div 
        className="h-64 flex items-center justify-center text-slate-500"
        role="status"
        aria-label="Aucune donnée de dépenses disponible"
      >
        Aucune dépense configurée
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={data} 
        layout="vertical" 
        margin={{ top: 10, right: 30, left: 10, bottom: 10 }} 
        barSize={32}
        barGap={8}
        accessibilityLayer
        role="img"
        aria-label="Graphique à barres horizontales montrant la répartition des dépenses par catégorie"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis 
          type="number" 
          tickFormatter={(value) => formatCurrency(value)}
          stroke="#64748b"
          style={{ fontSize: '0.75rem' }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <YAxis 
          type="category" 
          dataKey="category" 
          stroke="#64748b"
          width={100}
          style={{ fontSize: '0.875rem', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <Tooltip 
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
        />
        <Bar dataKey="amount" name="Montant" radius={[0, 6, 6, 0]}>
          {data.map((entry) => (
            <Cell 
              key={entry.category} 
              fill={EXPENSE_COLORS[entry.category as keyof typeof EXPENSE_COLORS] || EXPENSE_COLORS.Autre} 
              fillOpacity={0.9}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

