import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { MetricExplanationModal } from '../../components/ui/MetricExplanationModal';
import { useProject } from '../../store/ProjectContext';
import { calculateProjections } from '../../lib/projections';
import { ProjectionTable } from './ProjectionTable';
import { ProjectionCharts } from './ProjectionCharts';
import { formatCurrency, formatPercent, formatNumber } from '../../lib/utils';
import { LIMITS } from '../../lib/constants';
import {
  getDSCRAdvice,
  getLTVAdvice,
  getBreakEvenOccupancyAdvice,
  getMetricExplanation,
} from '../../lib/metricAdvice';

export function ProjectionAnalysis() {
  const { getCurrentInputs } = useProject();
  const inputs = getCurrentInputs();

  const [numberOfYears, setNumberOfYears] = useState<number>(LIMITS.DEFAULT_PROJECTION_YEARS);
  const [openModal, setOpenModal] = useState<'dscr' | 'ltv' | 'breakeven' | null>(null);

  // Calculer les projections
  const projection = useMemo(() => {
    const years = Math.max(
      LIMITS.MIN_PROJECTION_YEARS,
      Math.min(numberOfYears, LIMITS.MAX_PROJECTION_YEARS)
    );
    return calculateProjections(inputs, years);
  }, [inputs, numberOfYears]);

  const handleYearsChange = (value: number) => {
    const clamped = Math.max(
      LIMITS.MIN_PROJECTION_YEARS,
      Math.min(value, LIMITS.MAX_PROJECTION_YEARS)
    );
    setNumberOfYears(clamped);
  };

  // Évaluation de la qualité de l'investissement
  const getInvestmentQuality = () => {
    const hasGoodDSCR = projection.minDSCR >= 1.25;
    const hasGoodLTV = projection.maxLTV <= 75;
    const hasPositiveIRR = projection.irr > 0;
    const hasReasonablePayback = (projection.paybackPeriodCashflow || 999) <= 7;
    
    const score = [hasGoodDSCR, hasGoodLTV, hasPositiveIRR, hasReasonablePayback].filter(Boolean).length;
    
    if (score >= 3) return { label: 'Excellent', color: 'green', icon: '✓' };
    if (score === 2) return { label: 'Bon', color: 'blue', icon: '○' };
    if (score === 1) return { label: 'Moyen', color: 'orange', icon: '△' };
    return { label: 'Risqué', color: 'red', icon: '✕' };
  };

  const investmentQuality = getInvestmentQuality();

  return (
    <div className="space-y-6">
      {/* Résumé exécutif */}
      <Card className={`border-2 border-${investmentQuality.color}-200 bg-${investmentQuality.color}-50`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Résumé exécutif - Projection {numberOfYears} ans</CardTitle>
            <div className={`flex items-center gap-2 px-3 py-1 bg-${investmentQuality.color}-100 rounded-full`}>
              <span className="text-lg">{investmentQuality.icon}</span>
              <span className={`font-bold text-${investmentQuality.color}-800`}>
                {investmentQuality.label}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">TRI global</div>
              <div className={`text-xl font-bold ${projection.irr >= 10 ? 'text-green-700' : projection.irr >= 5 ? 'text-blue-700' : 'text-orange-600'}`}>
                {formatPercent(projection.irr)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Payback cashflow</div>
              <div className={`text-xl font-bold ${!projection.paybackPeriodCashflow ? 'text-red-700' : projection.paybackPeriodCashflow <= 5 ? 'text-green-700' : 'text-blue-700'}`}>
                {projection.paybackPeriodCashflow ? `${projection.paybackPeriodCashflow} ans` : 'Jamais'}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Cashflow cumulé</div>
              <div className={`text-xl font-bold ${projection.years[projection.years.length - 1].cumulativeCashflow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(projection.years[projection.years.length - 1].cumulativeCashflow)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Équité finale</div>
              <div className="text-xl font-bold text-green-700">
                {formatCurrency(projection.years[projection.years.length - 1].equity)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contrôles */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres de projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre d'années à projeter
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={LIMITS.MIN_PROJECTION_YEARS}
                  max={LIMITS.MAX_PROJECTION_YEARS}
                  value={numberOfYears}
                  onChange={(e) => handleYearsChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <Input
                  type="number"
                  min={LIMITS.MIN_PROJECTION_YEARS}
                  max={LIMITS.MAX_PROJECTION_YEARS}
                  value={numberOfYears}
                  onChange={(e) => handleYearsChange(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-600">ans</span>
              </div>
            </div>

            {inputs.projectionSettings && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Escalade revenus</label>
                  <div className="text-lg font-semibold">
                    {formatPercent(inputs.projectionSettings.revenueEscalationRate.value)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Escalade dépenses</label>
                  <div className="text-lg font-semibold">
                    {formatPercent(inputs.projectionSettings.expenseEscalationRate.value)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">CAPEX annuel</label>
                  <div className="text-lg font-semibold">
                    {formatPercent(inputs.projectionSettings.capexRate.value)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Taux actualisation</label>
                  <div className="text-lg font-semibold">
                    {formatPercent(inputs.projectionSettings.discountRate.value)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Frais de vente</label>
                  <div className="text-lg font-semibold">
                    {formatPercent(inputs.projectionSettings.saleCostsRate.value)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métriques clés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Temps de retour cashflow */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Temps retour cashflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {projection.paybackPeriodCashflow !== null
                ? `${projection.paybackPeriodCashflow} ans`
                : 'Jamais'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Quand cashflow cumulé &gt; 0
            </div>
          </CardContent>
        </Card>

        {/* Temps de retour profit total */}
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Temps retour investissement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {projection.paybackPeriodTotal !== null
                ? `${projection.paybackPeriodTotal} ans`
                : 'Jamais'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Quand profit total &gt; investissement
            </div>
          </CardContent>
        </Card>

        {/* TRI (IRR) */}
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              TRI (IRR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {formatPercent(projection.irr)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Taux de rendement interne
            </div>
          </CardContent>
        </Card>

        {/* ROE moyen */}
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              ROE moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {formatPercent(projection.averageROE)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Return on Equity moyen
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métriques bancaires et risques */}
      <Card>
        <CardHeader>
          <CardTitle>Métriques bancaires et risques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-gray-600">DSCR minimum</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenModal('dscr')}
                  className="h-6 px-2 text-xs"
                  title="Voir les détails et conseils"
                >
                  ⓘ Détails
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`text-2xl font-bold ${
                    projection.minDSCR >= 1.25 ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {formatNumber(projection.minDSCR, 2)}
                </div>
                {projection.minDSCR < 1.25 && (
                  <span className="text-lg" title="DSCR insuffisant pour financement bancaire standard">
                    ⚠️
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Seuil bancaire : ≥ 1.25
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-gray-600">LTV maximum</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenModal('ltv')}
                  className="h-6 px-2 text-xs"
                  title="Voir les détails et conseils"
                >
                  ⓘ Détails
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`text-2xl font-bold ${
                    projection.maxLTV <= 75 ? 'text-green-700' : projection.maxLTV <= 85 ? 'text-orange-600' : 'text-red-700'
                  }`}
                >
                  {formatPercent(projection.maxLTV)}
                </div>
                {projection.maxLTV > 75 && (
                  <span className="text-lg" title="LTV élevé - risque de financement">
                    {projection.maxLTV > 85 ? '🔴' : '⚠️'}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Seuil optimal : ≤ 75%
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-gray-600">Occupation break-even</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenModal('breakeven')}
                  className="h-6 px-2 text-xs"
                  title="Voir les détails et conseils"
                >
                  ⓘ Détails
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-2xl font-bold ${
                  (projection.breakEvenOccupancy || 0) <= 50 ? 'text-green-700' : 
                  (projection.breakEvenOccupancy || 0) <= 70 ? 'text-blue-700' : 'text-orange-600'
                }`}>
                  {formatPercent(projection.breakEvenOccupancy || 0)}
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Occupation min pour cashflow = 0
              </div>
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                <strong>Marge de sécurité :</strong> {inputs.revenue.occupancyRate.value}% (prévu) - {formatPercent(projection.breakEvenOccupancy || 0)} (BE) = 
                <strong> {(inputs.revenue.occupancyRate.value - (projection.breakEvenOccupancy || 0)).toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scénarios de sortie */}
      <Card>
        <CardHeader>
          <CardTitle>Scénarios de sortie (vente)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-3">Année</th>
                  <th className="text-right py-2 px-3">Valeur propriété</th>
                  <th className="text-right py-2 px-3">Prix vente net</th>
                  <th className="text-right py-2 px-3">Solde prêt</th>
                  <th className="text-right py-2 px-3">Produit net</th>
                  <th className="text-right py-2 px-3">Profit net</th>
                  <th className="text-right py-2 px-3">MOIC</th>
                  <th className="text-right py-2 px-3">TRI</th>
                </tr>
              </thead>
              <tbody>
                {projection.exitScenarios.map((exit) => (
                  <tr key={exit.year} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium">Année {exit.year}</td>
                    <td className="text-right py-3 px-3">{formatCurrency(exit.propertyValue)}</td>
                    <td className="text-right py-3 px-3">{formatCurrency(exit.salePrice)}</td>
                    <td className="text-right py-3 px-3">{formatCurrency(exit.mortgageBalance)}</td>
                    <td className="text-right py-3 px-3 font-medium text-blue-700">
                      {formatCurrency(exit.netProceeds)}
                    </td>
                    <td
                      className={`text-right py-3 px-3 font-medium ${
                        exit.netProfit >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {exit.netProfit >= 0 ? formatCurrency(exit.netProfit) : `(${formatCurrency(Math.abs(exit.netProfit))})`}
                    </td>
                    <td className={`text-right py-3 px-3 font-medium ${exit.moic >= 1 ? 'text-green-700' : 'text-red-700'}`}>
                      {exit.moic.toFixed(2)}x
                    </td>
                    <td className={`text-right py-3 px-3 font-medium ${exit.irr >= 5 ? 'text-purple-700' : exit.irr >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      {formatPercent(exit.irr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded text-xs space-y-1">
            <p>
              <strong>Prix vente net</strong> : Après frais de vente (courtage, notaire)
            </p>
            <p>
              <strong>Produit net</strong> : Ce que vous récupérez (Prix vente - Solde prêt)
            </p>
            <p>
              <strong>Profit net</strong> : Produit net + Cashflows cumulés - Investissement total
            </p>
            <p>
              <strong>MOIC</strong> : Multiple on Invested Capital (Profit net / Investissement)
            </p>
            <p>
              <strong>TRI</strong> : Taux de rendement interne jusqu'à cette année
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Graphiques et tableau */}
      <Tabs defaultValue="graphiques">
        <TabsList>
          <TabsTrigger value="graphiques">Graphiques</TabsTrigger>
          <TabsTrigger value="tableau">Tableau détaillé</TabsTrigger>
        </TabsList>

        <TabsContent value="graphiques">
          <ProjectionCharts projection={projection} />
        </TabsContent>

        <TabsContent value="tableau">
          <ProjectionTable projection={projection} />
        </TabsContent>
      </Tabs>

      {/* Modals d'explication */}
      <MetricExplanationModal
        isOpen={openModal === 'dscr'}
        onClose={() => setOpenModal(null)}
        title="DSCR - Debt Service Coverage Ratio"
        explanation={getMetricExplanation('dscr')}
        advice={getDSCRAdvice(projection.minDSCR, inputs, projection)}
      />

      <MetricExplanationModal
        isOpen={openModal === 'ltv'}
        onClose={() => setOpenModal(null)}
        title="LTV - Loan-to-Value"
        explanation={getMetricExplanation('ltv')}
        advice={getLTVAdvice(projection.maxLTV, inputs)}
      />

      <MetricExplanationModal
        isOpen={openModal === 'breakeven'}
        onClose={() => setOpenModal(null)}
        title="Occupation Break-Even"
        explanation={getMetricExplanation('breakeven')}
        advice={getBreakEvenOccupancyAdvice(projection.breakEvenOccupancy || 0, inputs)}
      />
    </div>
  );
}

