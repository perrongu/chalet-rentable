import { useMemo } from 'react';
import type { MonteCarloResult } from '../../lib/montecarlo';
import type { KPIResults } from '../../types';
import { formatCurrency, formatPercent, formatNumber } from '../../lib/utils';
import { CURRENCY_METRICS, PERCENTAGE_METRICS } from '../../lib/constants';

interface MonteCarloChartProps {
  results: MonteCarloResult;
  objective: keyof KPIResults;
}

export function MonteCarloChart({ results, objective }: MonteCarloChartProps) {
  // Déterminer le format d'affichage basé sur la métrique
  const isCurrency = CURRENCY_METRICS.includes(objective);
  const isPercentage = PERCENTAGE_METRICS.includes(objective);
  
  const formatValue = (value: number): string => {
    if (isCurrency) return formatCurrency(value);
    if (isPercentage) return formatPercent(value);
    return formatNumber(value, 2);
  };
  
  // Créer l'histogramme (distribution en bins)
  const histogram = useMemo(() => {
    const { min, max } = results.statistics;
    
    // Edge case: tous les échantillons sont identiques
    if (max === min || Math.abs(max - min) < 1e-10) {
      return [{
        min,
        max,
        midpoint: min,
        count: results.samples.length,
      }];
    }
    
    const numBins = 20;
    const binSize = (max - min) / numBins;
    
    // Initialiser les bins
    const bins: Array<{ min: number; max: number; count: number; midpoint: number }> = [];
    for (let i = 0; i < numBins; i++) {
      const binMin = min + i * binSize;
      const binMax = min + (i + 1) * binSize;
      bins.push({
        min: binMin,
        max: binMax,
        midpoint: (binMin + binMax) / 2,
        count: 0,
      });
    }
    
    // Compter les échantillons dans chaque bin
    results.samples.forEach((sample) => {
      const binIndex = Math.min(
        Math.floor((sample - min) / binSize),
        numBins - 1
      );
      if (binIndex >= 0 && binIndex < numBins) {
        bins[binIndex].count++;
      }
    });
    
    return bins;
  }, [results]);
  
  // Trouver le max pour normaliser les barres
  const maxCount = Math.max(...histogram.map((b) => b.count));
  
  return (
    <div className="space-y-6">
      {/* Statistiques clés */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Médiane (P50)</div>
          <div className="text-xl font-bold text-blue-700">
            {formatValue(results.statistics.median)}
          </div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Moyenne</div>
          <div className="text-xl font-bold text-gray-700">
            {formatValue(results.statistics.mean)}
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">P90 (optimiste)</div>
          <div className="text-xl font-bold text-green-700">
            {formatValue(results.statistics.p90)}
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">P10 (pessimiste)</div>
          <div className="text-xl font-bold text-orange-700">
            {formatValue(results.statistics.p10)}
          </div>
        </div>
      </div>
      
      {/* Statistiques additionnelles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Écart-type:</span>
          <span className="font-medium">{formatValue(results.statistics.stdDev)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Minimum:</span>
          <span className="font-medium">{formatValue(results.statistics.min)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Maximum:</span>
          <span className="font-medium">{formatValue(results.statistics.max)}</span>
        </div>
      </div>
      
      {/* Histogramme */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Distribution des résultats ({results.samples.length.toLocaleString('fr-CA')} simulations)
        </h4>
        
        {histogram.length === 1 ? (
          // Cas spécial: tous les échantillons identiques
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            Tous les échantillons ont la même valeur: <strong>{formatValue(histogram[0].min)}</strong>
            <br />
            <span className="text-xs text-blue-600">
              Cela arrive quand aucun paramètre n'a de plage activée ou que les plages sont très étroites.
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            {histogram.map((bin, index) => {
              const heightPercent = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
              const isMedianBin = bin.min <= results.statistics.median && results.statistics.median < bin.max;
              
              return (
                <div key={index} className="flex items-center gap-2">
                  {/* Label de la plage */}
                  <div className="w-32 text-xs text-gray-600 text-right">
                    {formatValue(bin.min)}
                  </div>
                  
                  {/* Barre */}
                  <div className="flex-1 h-6 bg-gray-100 rounded relative overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isMedianBin
                          ? 'bg-blue-500'
                          : 'bg-blue-300'
                      }`}
                      style={{ width: `${heightPercent}%` }}
                      aria-label={`${bin.count} échantillons entre ${formatValue(bin.min)} et ${formatValue(bin.max)}`}
                    />
                    {isMedianBin && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-white">Médiane</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Compte */}
                  <div className="w-16 text-xs text-gray-600">
                    {bin.count} ({((bin.count / results.samples.length) * 100).toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Interprétation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Interprétation</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <strong>P10:</strong> Il y a 10% de chances que le résultat soit inférieur à {formatValue(results.statistics.p10)}
          </li>
          <li>
            <strong>Médiane (P50):</strong> Valeur la plus probable, 50% de chances d'être au-dessus ou en-dessous
          </li>
          <li>
            <strong>P90:</strong> Il y a 90% de chances que le résultat soit inférieur à {formatValue(results.statistics.p90)}
          </li>
          <li>
            <strong>Plage probable:</strong> Entre P10 et P90 se trouvent 80% des résultats possibles
          </li>
        </ul>
      </div>
      
      {/* Paramètres analysés */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Paramètres inclus dans la simulation ({results.parameters.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
          {results.parameters.map((param, index) => (
            <div key={index} className="flex justify-between">
              <span>{param.label}:</span>
              <span>
                {formatNumber(param.min, 0)} - {formatNumber(param.max, 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Durée d'exécution */}
      <div className="text-xs text-gray-500 text-center">
        Simulation complétée en {results.duration}ms
      </div>
    </div>
  );
}

