import type { ProjectionResult } from '../../types';
import { formatCurrency, formatPercent, formatNumber } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

interface ProjectionTableProps {
  projection: ProjectionResult;
}

export function ProjectionTable({ projection }: ProjectionTableProps) {
  const { years } = projection;

  const handleExportCSV = () => {
    // Créer les en-têtes
    const headers = [
      'Année',
      'Revenus bruts',
      'Dépenses totales',
      'CAPEX',
      'NOI',
      'Service dette',
      'Cashflow',
      'Cashflow cumulé',
      'Capital remboursé',
      'Solde hypothécaire',
      'Valeur propriété',
      'Équité',
      'DSCR',
      'LTV (%)',
      'ROI cumulé (%)',
      'ROE (%)',
      'VAN',
    ];

    // Créer les lignes de données
    const rows = years.map(year => [
      year.year,
      year.revenue,
      year.expenses,
      year.capex,
      year.noi,
      year.debtService,
      year.cashflow,
      year.cumulativeCashflow,
      year.principalPaid,
      year.mortgageBalance,
      year.propertyValue,
      year.equity,
      year.dscr,
      year.ltv,
      year.roiTotal,
      year.roe,
      year.npv,
    ]);

    // Convertir en CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Télécharger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `projection_${years.length}_ans.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Projection détaillée par année</CardTitle>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-sm bg-sky-400 text-white rounded-xl hover:bg-sky-500 hover:shadow-soft transition-all duration-200 font-medium"
          >
            📥 Exporter CSV
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 text-left py-3 px-4 font-semibold text-slate-700">Année</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Revenus</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Dépenses</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">CAPEX</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">NOI</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Service dette</th>
                <th className="text-right py-3 px-4 font-semibold text-sky-700">Cashflow</th>
                <th className="text-right py-3 px-4 font-semibold text-sky-700">CF cumulé</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Capital payé</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Solde prêt</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Valeur</th>
                <th className="text-right py-3 px-4 font-semibold text-emerald-700">Équité</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">DSCR</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">LTV</th>
                <th className="text-right py-3 px-4 font-semibold text-violet-700">ROI</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">ROE</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">VAN</th>
              </tr>
            </thead>
            <tbody>
              {years.map((year, idx) => {
                const isPositiveCashflow = year.cashflow >= 0;
                const isGoodDSCR = year.dscr >= 1.25;
                const isGoodLTV = year.ltv <= 75;

                return (
                  <tr
                    key={year.year}
                    className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${
                      idx % 5 === 4 ? 'border-b-2 border-slate-200' : ''
                    }`}
                  >
                    <td className="sticky left-0 z-10 bg-white hover:bg-slate-50/50 py-3 px-4 font-medium text-slate-900">
                      {year.year}
                    </td>
                    <td className="text-right py-3 px-4 text-slate-700">{formatCurrency(year.revenue)}</td>
                    <td className="text-right py-3 px-4 text-slate-700">{formatCurrency(year.expenses)}</td>
                    <td className="text-right py-3 px-4 text-orange-500">{formatCurrency(year.capex)}</td>
                    <td className="text-right py-3 px-4 font-medium text-slate-900">{formatCurrency(year.noi)}</td>
                    <td className="text-right py-3 px-4 text-slate-700">{formatCurrency(year.debtService)}</td>
                    <td className={`text-right py-3 px-4 font-medium ${isPositiveCashflow ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isPositiveCashflow ? formatCurrency(year.cashflow) : `(${formatCurrency(Math.abs(year.cashflow))})`}
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${year.cumulativeCashflow >= 0 ? 'text-sky-600' : 'text-red-500'}`}>
                      {year.cumulativeCashflow >= 0 ? formatCurrency(year.cumulativeCashflow) : `(${formatCurrency(Math.abs(year.cumulativeCashflow))})`}
                    </td>
                    <td className="text-right py-3 px-4 text-slate-700">{formatCurrency(year.principalPaid)}</td>
                    <td className="text-right py-3 px-4 text-slate-700">{formatCurrency(year.mortgageBalance)}</td>
                    <td className="text-right py-3 px-4 text-slate-700">{formatCurrency(year.propertyValue)}</td>
                    <td className="text-right py-3 px-4 font-medium text-emerald-600">
                      {formatCurrency(year.equity)}
                    </td>
                    <td className={`text-right py-3 px-4 ${isGoodDSCR ? 'text-emerald-600' : 'text-red-500'}`}>
                      {formatNumber(year.dscr, 2)}
                    </td>
                    <td className={`text-right py-3 px-4 ${isGoodLTV ? 'text-emerald-600' : 'text-orange-500'}`}>
                      {formatPercent(year.ltv)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-violet-600">
                      {formatPercent(year.roiTotal)}
                    </td>
                    <td className="text-right py-3 px-4 text-slate-700">
                      {formatPercent(year.roe)}
                    </td>
                    <td className="text-right py-3 px-4 text-slate-700">{formatCurrency(year.npv)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Légende */}
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
          <p><strong>CAPEX</strong> : Dépenses en capital (rénovations majeures)</p>
          <p><strong>NOI</strong> : Net Operating Income (Revenus - Dépenses opérationnelles)</p>
          <p><strong>DSCR</strong> : Debt Service Coverage Ratio (NOI / Service dette) - Seuil bancaire : ≥ 1.25</p>
          <p><strong>LTV</strong> : Loan to Value (Solde prêt / Valeur) - Seuil optimal : ≤ 75%</p>
          <p><strong>ROI</strong> : Return on Investment (Profit cumulé / Investissement initial)</p>
          <p><strong>ROE</strong> : Return on Equity (Profit annuel / Équité actuelle)</p>
          <p><strong>VAN</strong> : Valeur Actuelle Nette du cashflow (discounted cash flow)</p>
        </div>
      </CardContent>
    </Card>
  );
}

