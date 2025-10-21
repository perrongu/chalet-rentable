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
import { formatCurrency, formatCurrencySigned, formatPercent, formatNumber } from '../../lib/utils';
import { LIMITS, ADVICE_THRESHOLDS } from '../../lib/constants';
import {
  getDSCRAdvice,
  getLTVAdvice,
  getBreakEvenOccupancyAdvice,
  getMOICAdvice,
  getTRIAdvice,
  getMetricExplanation,
} from '../../lib/metricAdvice';

export function ProjectionAnalysis() {
  const { getCurrentInputs } = useProject();
  const inputs = getCurrentInputs();

  const [numberOfYears, setNumberOfYears] = useState<number>(LIMITS.DEFAULT_PROJECTION_YEARS);
  const [openModal, setOpenModal] = useState<'dscr' | 'ltv' | 'breakeven' | null>(null);
  const [openExitModal, setOpenExitModal] = useState<{ type: 'moic' | 'tri'; year: number } | null>(null);

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
              <span className={`font-bold text-${investmentQuality.color}-900`}>
                {investmentQuality.label}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-600" title="Taux de rendement interne">TRI</div>
              <div className={`text-xl font-bold ${projection.irr >= 10 ? 'text-green-700' : projection.irr >= 5 ? 'text-blue-700' : 'text-orange-600'}`}>
                {formatPercent(projection.irr)}
              </div>
            </div>
            <div>
              <div className="text-slate-600">Délai de récupération</div>
              <div className={`text-xl font-bold ${!projection.paybackPeriodCashflow ? 'text-red-700' : projection.paybackPeriodCashflow <= 5 ? 'text-green-700' : 'text-blue-700'}`}>
                {projection.paybackPeriodCashflow ? `${projection.paybackPeriodCashflow} ans` : 'Jamais'}
              </div>
            </div>
            <div>
              <div className="text-slate-600">Cashflow cumulé</div>
              <div className={`text-xl font-bold ${projection.years[projection.years.length - 1].cumulativeCashflow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrencySigned(projection.years[projection.years.length - 1].cumulativeCashflow)}
              </div>
            </div>
            <div>
              <div className="text-slate-600">Équité finale</div>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Durée de projection (années)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={LIMITS.MIN_PROJECTION_YEARS}
                  max={LIMITS.MAX_PROJECTION_YEARS}
                  value={numberOfYears}
                  onChange={(e) => handleYearsChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <Input
                  type="number"
                  min={LIMITS.MIN_PROJECTION_YEARS}
                  max={LIMITS.MAX_PROJECTION_YEARS}
                  value={numberOfYears}
                  onChange={(e) => handleYearsChange(Number(e.target.value))}
                  className="w-24 flex-shrink-0"
                />
                <span className="text-sm text-slate-600 flex-shrink-0">ans</span>
              </div>
            </div>

            {inputs.projectionSettings && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-300">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Escalade revenus</label>
                  <div className="text-lg font-semibold text-slate-900">
                    {formatPercent(inputs.projectionSettings.revenueEscalationRate.value)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Escalade dépenses</label>
                  <div className="text-lg font-semibold text-slate-900">
                    {formatPercent(inputs.projectionSettings.expenseEscalationRate.value)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">CAPEX annuel</label>
                  <div className="text-lg font-semibold text-slate-900">
                    {formatPercent(inputs.projectionSettings.capexRate.value)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Taux actualisation</label>
                  <div className="text-lg font-semibold text-slate-900">
                    {formatPercent(inputs.projectionSettings.discountRate.value)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Frais de vente</label>
                  <div className="text-lg font-semibold text-slate-900">
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
            <CardTitle className="text-sm font-medium text-slate-600">
              Délai de récupération (cashflow)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {projection.paybackPeriodCashflow !== null
                ? `${projection.paybackPeriodCashflow} ans`
                : 'Jamais'}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Quand cashflow cumulé &gt; 0
            </div>
          </CardContent>
        </Card>

        {/* Temps de retour profit total */}
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Délai de récupération (total)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {projection.paybackPeriodTotal !== null
                ? `${projection.paybackPeriodTotal} ans`
                : 'Jamais'}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Quand profit total &gt; investissement
            </div>
          </CardContent>
        </Card>

        {/* TRI (IRR) */}
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600" title="Taux de rendement interne">
              TRI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {formatPercent(projection.irr)}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Taux de rendement interne
            </div>
          </CardContent>
        </Card>

        {/* ROE moyen */}
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600" title="Return on Equity moyen">
              ROE moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {formatPercent(projection.averageROE)}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Rendement sur l'équité
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
                <label className="block text-sm text-slate-600">DSCR minimum</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenModal('dscr')}
                  className="h-6 px-2 text-xs"
                  title="Voir les détails et conseils"
                >
                  <span className="emoji-icon-sm">ⓘ</span>Détails
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
              <div className="text-xs text-slate-600 mt-1">
                Seuil bancaire : ≥ 1.25
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-slate-600">LTV maximum</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenModal('ltv')}
                  className="h-6 px-2 text-xs"
                  title="Voir les détails et conseils"
                >
                  <span className="emoji-icon-sm">ⓘ</span>Détails
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
              <div className="text-xs text-slate-600 mt-1">
                Seuil optimal : ≤ 75%
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-slate-600">Occupation seuil de rentabilité</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenModal('breakeven')}
                  className="h-6 px-2 text-xs"
                  title="Voir les détails et conseils"
                >
                  <span className="emoji-icon-sm">ⓘ</span>Détails
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
              <div className="text-xs text-slate-600 mt-1">
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
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="table-standard">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr>
                  <th className="text-left">Année</th>
                  <th className="text-right">Valeur propriété</th>
                  <th className="text-right">Prix vente net</th>
                  <th className="text-right">Solde prêt</th>
                  <th className="text-right">Produit net</th>
                  <th className="text-right">Profit net</th>
                  <th className="text-right" title="Multiple du capital investi">MOIC</th>
                  <th className="text-right" title="Taux de rendement interne">TRI</th>
                </tr>
              </thead>
              <tbody>
                {projection.exitScenarios.map((exit) => {
                  const needsMOICAdvice = exit.moic < ADVICE_THRESHOLDS.MOIC.GOOD;
                  const needsTRIAdvice = exit.irr < ADVICE_THRESHOLDS.TRI.GOOD;
                  
                  return (
                    <tr key={exit.year}>
                      <td className="font-medium">Année {exit.year}</td>
                      <td className="text-right">{formatCurrency(exit.propertyValue)}</td>
                      <td className="text-right">{formatCurrency(exit.salePrice)}</td>
                      <td className="text-right">{formatCurrency(exit.mortgageBalance)}</td>
                      <td className="text-right font-medium text-blue-700">
                        {formatCurrency(exit.netProceeds)}
                      </td>
                      <td
                        className={`text-right font-medium ${
                          exit.netProfit >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {formatCurrencySigned(exit.netProfit)}
                      </td>
                      <td className={`text-right ${exit.moic >= ADVICE_THRESHOLDS.MOIC.GOOD ? 'text-green-700' : exit.moic >= ADVICE_THRESHOLDS.MOIC.ACCEPTABLE ? 'text-orange-600' : 'text-red-700'}`}>
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-medium">{exit.moic.toFixed(2)}x</span>
                          {needsMOICAdvice && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOpenExitModal({ type: 'moic', year: exit.year })}
                              className="h-5 px-1 text-xs"
                              aria-label={`Voir les conseils pour améliorer le MOIC de l'année ${exit.year}`}
                              title="Voir comment améliorer ce MOIC"
                            >
                              <span className="emoji-icon-sm">ⓘ</span>
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className={`text-right ${exit.irr >= ADVICE_THRESHOLDS.TRI.GOOD ? 'text-green-700' : exit.irr >= ADVICE_THRESHOLDS.TRI.ACCEPTABLE ? 'text-orange-600' : exit.irr >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-medium">{formatPercent(exit.irr)}</span>
                          {needsTRIAdvice && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOpenExitModal({ type: 'tri', year: exit.year })}
                              className="h-5 px-1 text-xs"
                              aria-label={`Voir les conseils pour améliorer le TRI de l'année ${exit.year}`}
                              title="Voir comment améliorer ce TRI"
                            >
                              <span className="emoji-icon-sm">ⓘ</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-300">
            <p>
              <strong>Prix vente net</strong> : Après frais de vente (courtage, notaire)
            </p>
            <p>
              <strong>Produit net</strong> : Ce que vous récupérez (Prix vente − Solde prêt)
            </p>
            <p>
              <strong>Profit net</strong> : Produit net + Cashflows cumulés − Investissement total
            </p>
            <p>
              <strong>MOIC</strong> : Multiple du capital investi (Profit net ÷ Investissement). 
              Seuil optimal : <span className="text-green-700 font-medium">≥ {ADVICE_THRESHOLDS.MOIC.GOOD}x</span>
            </p>
            <p>
              <strong>TRI</strong> : Taux de rendement interne jusqu'à cette année. 
              Seuil optimal : <span className="text-green-700 font-medium">≥ {ADVICE_THRESHOLDS.TRI.GOOD} %</span>
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

      {/* Modales pour scénarios de sortie */}
      {openExitModal && (() => {
        const exit = projection.exitScenarios.find(e => e.year === openExitModal.year);
        if (!exit) return null;
        
        const modalConfig = openExitModal.type === 'moic' 
          ? {
              title: `MOIC - Année ${exit.year}`,
              explanation: getMetricExplanation('moic'),
              advice: getMOICAdvice(exit.moic, exit.year, inputs, projection),
            }
          : {
              title: `TRI (Taux de Rendement Interne) - Année ${exit.year}`,
              explanation: getMetricExplanation('tri'),
              advice: getTRIAdvice(exit.irr, exit.year, inputs, projection),
            };
        
        return (
          <MetricExplanationModal
            isOpen={true}
            onClose={() => setOpenExitModal(null)}
            title={modalConfig.title}
            explanation={modalConfig.explanation}
            advice={modalConfig.advice}
          />
        );
      })()}
    </div>
  );
}

