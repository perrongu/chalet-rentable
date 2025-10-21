import type { SensitivityAnalysis1D, KPIResults } from '../../types';
import { formatCurrency, formatPercent, formatNumber } from '../../lib/utils';
import { CURRENCY_METRICS, PERCENTAGE_METRICS } from '../../lib/constants';
import { CHART_COLORS, hexToRgba } from '../../lib/colors';

interface TornadoChartProps {
  results: SensitivityAnalysis1D['results'];
  objective: keyof KPIResults;
}

export function TornadoChart({ results, objective }: TornadoChartProps) {
  if (!results || !results.impacts || results.impacts.length === 0) return null;

  // Déterminer le format selon le type de métrique
  const isCurrency = CURRENCY_METRICS.includes(objective);
  const isPercentage = PERCENTAGE_METRICS.includes(objective);

  const formatValue = (value: number) => {
    if (isCurrency) {
      return formatCurrency(value);
    }
    if (isPercentage) {
      return formatPercent(value);
    }
    return formatNumber(value, 0);
  };

  const formatParamValue = (value: number, paramPath: string) => {
    // Formater la valeur du paramètre selon son type
    if (paramPath.includes('occupancyRate') || 
        paramPath.includes('interestRate') || 
        paramPath.includes('appreciationRate')) {
    return formatPercent(value);
    }
    if (paramPath.includes('Years') || paramPath.includes('amortization')) {
      return `${value.toFixed(1)} ans`;
    }
    // Par défaut, les montants monétaires
    return formatCurrency(value);
  };

  // Préparer les données pour le graphique
  const chartData = results.impacts.map((impact) => ({
    label: impact.label,
    valueLow: impact.valueLow,
    valueHigh: impact.valueHigh,
    parameter: impact.parameter,
    criticalPoint: impact.criticalPoint,
  }));

  // Trouver les limites globales pour l'échelle
  const allValues = results.impacts.flatMap(i => [i.valueLow, i.valueHigh, results.baseValue]);
  const globalMin = Math.min(...allValues);
  const globalMax = Math.max(...allValues);
  
  // Gérer le cas où toutes les valeurs sont identiques (éviter division par zéro)
  const range = globalMax - globalMin;
  const padding = range > 0 ? range * 0.1 : 1; // Si range = 0, padding arbitraire de 1

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800">Analyse de sensibilité - Plages de valeurs</h3>
      
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
        <p className="text-sm text-sky-900">
          <span className="font-medium">Valeur de base (référence) :</span> {formatValue(results.baseValue)}
        </p>
        <p className="text-xs text-sky-700 mt-1">
          Le graphique montre l'étendue des valeurs possibles de l'objectif pour chaque paramètre.
          La ligne verticale noire indique la valeur actuelle (référence).
        </p>
      </div>

      {/* Tableau détaillé */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-200">
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Paramètre</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-700">Valeur au Min</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-700">Valeur au Max</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-700">Point critique</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-700">Amplitude</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {results.impacts.map((impact, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-medium text-slate-800">{impact.label}</td>
                <td className={`text-right py-3 px-4 font-medium ${impact.valueLow < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {formatValue(impact.valueLow)}
                </td>
                <td className={`text-right py-3 px-4 font-medium ${impact.valueHigh < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {formatValue(impact.valueHigh)}
                </td>
                <td className="text-right py-3 px-4">
                  {impact.criticalPoint?.exists ? (
                    <span 
                      className="inline-flex items-center px-2 py-1 rounded font-medium border text-xs"
                      style={{
                        backgroundColor: hexToRgba(CHART_COLORS.warning, 0.1),
                        color: CHART_COLORS.warning,
                        borderColor: hexToRgba(CHART_COLORS.warning, 0.25)
                      }}
                    >
                      {formatParamValue(impact.criticalPoint.paramValue, impact.parameter)}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">Aucun</span>
                  )}
                </td>
                <td className="text-right py-3 px-4 font-semibold text-slate-700">
                  {formatValue(Math.abs(impact.valueHigh - impact.valueLow))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Graphique personnalisé */}
      <div className="mt-6">
        <div className="space-y-3">
          {chartData.map((data, idx) => {
            const impact = results.impacts[idx];
            const crossesZero = (data.valueLow < 0 && data.valueHigh > 0) || (data.valueLow > 0 && data.valueHigh < 0);
            
            // Calculer les positions en pourcentage pour la visualisation
            const totalRange = globalMax - globalMin + 2 * padding;
            const basePosition = ((results.baseValue - globalMin + padding) / totalRange) * 100;
            const lowPosition = ((data.valueLow - globalMin + padding) / totalRange) * 100;
            const highPosition = ((data.valueHigh - globalMin + padding) / totalRange) * 100;
            
            const barStart = Math.min(lowPosition, highPosition);
            const barWidth = Math.abs(highPosition - lowPosition);
            
            // Position du point critique si existe
            let criticalPosition: number | null = null;
            if (impact.criticalPoint?.exists) {
              // Le point critique est à 0, donc on calcule sa position
              criticalPosition = ((0 - globalMin + padding) / totalRange) * 100;
            }
            
            return (
              <div key={idx} className="relative border-b border-slate-100 pb-4 last:border-b-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  {/* Label */}
                  <div className="w-full sm:w-44 text-sm font-medium text-slate-700" title={data.label}>
                    {data.label}
                  </div>
                  
                  {/* Barre de visualisation */}
                  <div className="flex-1 w-full relative h-12 bg-slate-50 rounded-xl border border-slate-200">
                    {/* Ligne de référence (valeur de base) */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-black z-20"
                      style={{ left: `${basePosition}%` }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-800 whitespace-nowrap bg-white px-1 rounded">
                        Base
                      </div>
                    </div>
                    
                    {/* Ligne du point critique (objectif = 0) */}
                    {criticalPosition !== null && crossesZero && (
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 z-30"
                        style={{ 
                          left: `${criticalPosition}%`,
                          backgroundColor: CHART_COLORS.warning 
                        }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap bg-white px-1 rounded border"
                          style={{ 
                            color: CHART_COLORS.warning,
                            borderColor: CHART_COLORS.warning
                          }}
                        >
                          Zéro
                        </div>
                      </div>
                    )}
                    
                    {/* Barre colorée */}
                    {crossesZero ? (
                      // Si la barre traverse zéro, diviser en deux parties
                      <>
                        {/* Partie négative (rouge) */}
                        {criticalPosition && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-7 rounded-l shadow-sm border-2"
                            style={{
                              left: `${Math.min(barStart, criticalPosition)}%`,
                              width: `${Math.abs(criticalPosition - barStart)}%`,
                              background: `linear-gradient(to right, ${CHART_COLORS.negative}, ${CHART_COLORS.negative})`,
                              borderColor: CHART_COLORS.negative,
                            }}
                          />
                        )}
                        {/* Partie positive (verte) */}
                        {criticalPosition && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-7 rounded-r shadow-sm border-2 border-dashed"
                            style={{
                              left: `${criticalPosition}%`,
                              width: `${Math.abs((barStart + barWidth) - criticalPosition)}%`,
                              background: `linear-gradient(to right, ${CHART_COLORS.positive}, ${CHART_COLORS.positive})`,
                              borderColor: CHART_COLORS.positive,
                            }}
                          />
                        )}
                      </>
                    ) : (
                      // Sinon, une seule couleur avec bordure pour accessibilité
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-7 rounded shadow-sm border-2"
                        style={{
                          left: `${barStart}%`,
                          width: `${barWidth}%`,
                          background: data.valueLow < 0 
                            ? `linear-gradient(to right, ${CHART_COLORS.negative}, ${CHART_COLORS.negative})`
                            : `linear-gradient(to right, ${CHART_COLORS.positive}, ${CHART_COLORS.positive})`,
                          borderColor: data.valueLow < 0 ? CHART_COLORS.negative : CHART_COLORS.positive,
                          borderStyle: data.valueLow < 0 ? 'solid' : 'dashed',
                        }}
                      />
                    )}
                    
                    {/* Marqueurs aux extrémités */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-1 h-9 bg-slate-800 rounded z-10"
                      style={{ left: `${lowPosition}%` }}
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-1 h-9 bg-slate-800 rounded z-10"
                      style={{ left: `${highPosition}%` }}
                    />
                  </div>
                  
                  {/* Valeurs */}
                  <div className="w-full sm:w-52 flex justify-between text-xs font-medium">
                    <span className={`${data.valueLow < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {formatValue(data.valueLow)}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className={`${data.valueHigh < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {formatValue(data.valueHigh)}
                    </span>
                  </div>
                </div>
                
                {/* Afficher le point critique si existe */}
                {impact.criticalPoint?.exists && (
                  <div className="mt-2 sm:ml-48 flex items-center gap-2 text-xs">
                    <span 
                      className="inline-flex items-center px-2 py-1 rounded-md border font-medium"
                      style={{
                        backgroundColor: hexToRgba(CHART_COLORS.warning, 0.1),
                        color: CHART_COLORS.warning,
                        borderColor: hexToRgba(CHART_COLORS.warning, 0.25)
                      }}
                    >
                      ⚠ Point critique : {formatParamValue(impact.criticalPoint.paramValue, impact.parameter)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Légende */}
      <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-4 rounded shadow-sm border-2 border-dashed"
            style={{ 
              backgroundColor: CHART_COLORS.positive,
              borderColor: CHART_COLORS.positive 
            }}
          ></div>
          <span className="font-medium">Valeurs positives</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-4 rounded shadow-sm border-2"
            style={{ 
              backgroundColor: CHART_COLORS.negative,
              borderColor: CHART_COLORS.negative 
            }}
          ></div>
          <span className="font-medium">Valeurs négatives</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-black"></div>
          <span className="font-medium">Valeur de base</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-0.5 h-4"
            style={{ backgroundColor: CHART_COLORS.warning }}
          ></div>
          <span className="font-medium">Point critique (objectif = 0)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-slate-800 rounded"></div>
          <span className="font-medium">Limites de la plage</span>
        </div>
      </div>
    </div>
  );
}
