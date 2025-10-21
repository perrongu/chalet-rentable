import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Spinner } from '../../components/ui/Spinner';
import { useProject } from '../../store/ProjectContext';
import type { KPIResults, ParameterRange, ProjectInputs, SensitivityAnalysis1D, SensitivityAnalysis2D } from '../../types';
import { runSensitivityAnalysis1D, runSensitivityAnalysis2D } from '../../lib/sensitivity';
import { runMonteCarloAnalysis, type MonteCarloResult } from '../../lib/montecarlo';
import { TornadoChart } from './TornadoChart';
import { HeatmapChart } from './HeatmapChart';
import { MonteCarloChart } from './MonteCarloChart';
import { PARAMETER_LABELS, KPI_OPTIONS, ERROR_MESSAGES, LIMITS } from '../../lib/constants';

// Fonction pour récupérer les paramètres disponibles avec plages
function getAvailableParameters(inputs: ProjectInputs): Array<{ path: string; label: string; min: number; max: number; default: number }> {
  const parameters: Array<{ path: string; label: string; min: number; max: number; default: number }> = [];

  // Vérifier les revenus
  if (inputs.revenue.averageDailyRate.range?.useRange) {
    const r = inputs.revenue.averageDailyRate.range;
    parameters.push({
      path: 'revenue.averageDailyRate',
      label: PARAMETER_LABELS['revenue.averageDailyRate'],
      min: r.min,
      max: r.max,
      default: r.default,
    });
  }
  
  if (inputs.revenue.occupancyRate.range?.useRange) {
    const r = inputs.revenue.occupancyRate.range;
    parameters.push({
      path: 'revenue.occupancyRate',
      label: PARAMETER_LABELS['revenue.occupancyRate'],
      min: r.min,
      max: r.max,
      default: r.default,
    });
  }

  // Vérifier le financement
  if (inputs.financing.purchasePrice.range?.useRange) {
    const r = inputs.financing.purchasePrice.range;
    parameters.push({
      path: 'financing.purchasePrice',
      label: PARAMETER_LABELS['financing.purchasePrice'],
      min: r.min,
      max: r.max,
      default: r.default,
    });
  }
  
  if (inputs.financing.downPayment.range?.useRange) {
    const r = inputs.financing.downPayment.range;
    parameters.push({
      path: 'financing.downPayment',
      label: PARAMETER_LABELS['financing.downPayment'],
      min: r.min,
      max: r.max,
      default: r.default,
    });
  }
  
  if (inputs.financing.interestRate.range?.useRange) {
    const r = inputs.financing.interestRate.range;
    parameters.push({
      path: 'financing.interestRate',
      label: PARAMETER_LABELS['financing.interestRate'],
      min: r.min,
      max: r.max,
      default: r.default,
    });
  }
  
  if (inputs.financing.amortizationYears.range?.useRange) {
    const r = inputs.financing.amortizationYears.range;
    parameters.push({
      path: 'financing.amortizationYears',
      label: PARAMETER_LABELS['financing.amortizationYears'],
      min: r.min,
      max: r.max,
      default: r.default,
    });
  }

  // Vérifier les frais d'acquisition
  if (inputs.acquisitionFees.notaryFees.range?.useRange) {
    const r = inputs.acquisitionFees.notaryFees.range;
    parameters.push({
      path: 'acquisitionFees.notaryFees',
      label: PARAMETER_LABELS['acquisitionFees.notaryFees'],
      min: r.min,
      max: r.max,
      default: r.default,
    });
  }
  
  if (inputs.acquisitionFees.other.range?.useRange) {
    const r = inputs.acquisitionFees.other.range;
    parameters.push({
      path: 'acquisitionFees.other',
      label: PARAMETER_LABELS['acquisitionFees.other'],
      min: r.min,
      max: r.max,
      default: r.default,
    });
  }

  // Vérifier les dépenses
  inputs.expenses.forEach((expense, index) => {
    if (expense.amount.range?.useRange) {
      const r = expense.amount.range;
      parameters.push({
        path: `expenses[${index}].amount`,
        label: expense.name,
        min: r.min,
        max: r.max,
        default: r.default,
      });
    }
  });

  return parameters;
}

export function SensitivityAnalysis() {
  const { getCurrentInputs } = useProject();
  const inputs = getCurrentInputs();
  
  // Récupérer dynamiquement les paramètres disponibles
  const availableParameters = useMemo(() => getAvailableParameters(inputs), [inputs]);

  // État pour analyse 1D
  const [objective1D, setObjective1D] = useState<keyof KPIResults>('annualCashflow');
  const [selectedParams, setSelectedParams] = useState<string[]>([]);
  const [paramRanges, setParamRanges] = useState<Record<string, { min: number; max: number }>>({});
  const [results1D, setResults1D] = useState<SensitivityAnalysis1D['results'] | null>(null);
  const [isRunning1D, setIsRunning1D] = useState(false);

  // État pour analyse 2D - initialiser avec les premiers paramètres disponibles
  const [objective2D, setObjective2D] = useState<keyof KPIResults>('annualCashflow');
  const [paramX, setParamX] = useState<string>(() => availableParameters[0]?.path || '');
  const [paramY, setParamY] = useState<string>(() => availableParameters[1]?.path || availableParameters[0]?.path || '');
  const [rangeX, setRangeX] = useState(() => ({
    min: availableParameters[0]?.min || 0,
    max: availableParameters[0]?.max || 100,
  }));
  const [rangeY, setRangeY] = useState(() => ({
    min: availableParameters[1]?.min || availableParameters[0]?.min || 0,
    max: availableParameters[1]?.max || availableParameters[0]?.max || 100,
  }));
  const [results2D, setResults2D] = useState<SensitivityAnalysis2D['results'] | null>(null);
  const [isRunning2D, setIsRunning2D] = useState(false);

  // État pour analyse Monte Carlo
  const [objectiveMC, setObjectiveMC] = useState<keyof KPIResults>('annualCashflow');
  const [iterations, setIterations] = useState<number>(LIMITS.DEFAULT_MONTE_CARLO_ITERATIONS);
  const [resultsMC, setResultsMC] = useState<MonteCarloResult | null>(null);
  const [isRunningMC, setIsRunningMC] = useState(false);

  const toggleParameter = (path: string) => {
    if (selectedParams.includes(path)) {
      setSelectedParams(selectedParams.filter((p) => p !== path));
    } else {
      setSelectedParams([...selectedParams, path]);
      // Initialiser les plages avec les valeurs prédéfinies du paramètre
      const param = availableParameters.find(p => p.path === path);
      if (param) {
        setParamRanges({
          ...paramRanges,
          [path]: {
            min: param.min,
            max: param.max,
          },
        });
      }
    }
  };

  const runAnalysis1D = async () => {
    setIsRunning1D(true);
    setResults1D(null);
    
    try {
      // Petite pause pour permettre l'affichage du spinner
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const parameters: ParameterRange[] = selectedParams.map((path) => {
        const param = availableParameters.find((p) => p.path === path);
        return {
          parameter: path,
          label: param?.label || path,
          min: paramRanges[path].min,
          base: param?.default || 0,
          max: paramRanges[path].max,
          steps: 10,
        };
      });

      const result = runSensitivityAnalysis1D(inputs, parameters, objective1D);
      setResults1D(result);
    } catch (error) {
      console.error('Erreur lors de l\'analyse 1D:', error);
      alert(ERROR_MESSAGES.SENSITIVITY_1D_FAILED);
    } finally {
      setIsRunning1D(false);
    }
  };

  const updateParamX = (newPath: string) => {
    setParamX(newPath);
    const param = availableParameters.find(p => p.path === newPath);
    if (param) {
      setRangeX({ min: param.min, max: param.max });
    }
  };

  const updateParamY = (newPath: string) => {
    setParamY(newPath);
    const param = availableParameters.find(p => p.path === newPath);
    if (param) {
      setRangeY({ min: param.min, max: param.max });
    }
  };

  const runAnalysis2D = async () => {
    setIsRunning2D(true);
    setResults2D(null);
    
    try {
      // Petite pause pour permettre l'affichage du spinner
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const paramX_data = availableParameters.find((p) => p.path === paramX);
      const paramY_data = availableParameters.find((p) => p.path === paramY);
      
      const parameterX: ParameterRange = {
        parameter: paramX,
        label: paramX_data?.label || paramX,
        min: rangeX.min,
        base: paramX_data?.default || 0,
        max: rangeX.max,
        steps: 15,
      };

      const parameterY: ParameterRange = {
        parameter: paramY,
        label: paramY_data?.label || paramY,
        min: rangeY.min,
        base: paramY_data?.default || 0,
        max: rangeY.max,
        steps: 15,
      };

      const result = runSensitivityAnalysis2D(inputs, parameterX, parameterY, objective2D);
      setResults2D(result);
    } catch (error) {
      console.error('Erreur lors de l\'analyse 2D:', error);
      alert(ERROR_MESSAGES.SENSITIVITY_2D_FAILED);
    } finally {
      setIsRunning2D(false);
    }
  };

  const runAnalysisMC = async () => {
    setIsRunningMC(true);
    setResultsMC(null);
    
    try {
      // Vérifier qu'il y a au moins un paramètre avec useRange=true
      if (availableParameters.length === 0) {
        alert(ERROR_MESSAGES.MONTE_CARLO_NO_RANGES);
        setIsRunningMC(false);
        return;
      }
      
      // Petite pause pour permettre l'affichage du spinner
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result = runMonteCarloAnalysis(inputs, {
        objective: objectiveMC,
        iterations: Math.max(
          LIMITS.MIN_MONTE_CARLO_ITERATIONS,
          Math.min(iterations, LIMITS.MAX_MONTE_CARLO_ITERATIONS)
        ),
      });
      
      setResultsMC(result);
    } catch (error) {
      console.error('Erreur lors de la simulation Monte Carlo:', error);
      alert(ERROR_MESSAGES.MONTE_CARLO_FAILED);
    } finally {
      setIsRunningMC(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analyse de sensibilité</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="1d">
            <TabsList>
              <TabsTrigger value="1d">Analyse 1D (Tornado)</TabsTrigger>
              <TabsTrigger value="2d">Analyse 2D (Heatmap)</TabsTrigger>
              <TabsTrigger value="montecarlo">Monte Carlo</TabsTrigger>
            </TabsList>

            {/* Analyse 1D */}
            <TabsContent value="1d" className="bg-slate-50">
              <div className="space-y-6">
                <Select
                  label="Objectif à analyser"
                  value={objective1D}
                  onChange={(e) => setObjective1D(e.target.value as keyof KPIResults)}
                  options={KPI_OPTIONS}
                />

                <div>
                  <label className="block text-base font-medium text-slate-700 mb-2">
                    Sélectionner les paramètres
                  </label>
                  <div className="space-y-2">
                    {availableParameters.map((param) => (
                      <div key={param.path} className="border rounded-lg p-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedParams.includes(param.path)}
                            onChange={() => toggleParameter(param.path)}
                            className="mr-2"
                          />
                          <span className="font-medium">{param.label}</span>
                        </label>
                        {selectedParams.includes(param.path) && (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              label="Minimum"
                              value={paramRanges[param.path]?.min || 0}
                              onChange={(e) =>
                                setParamRanges({
                                  ...paramRanges,
                                  [param.path]: {
                                    ...paramRanges[param.path],
                                    min: Number(e.target.value),
                                  },
                                })
                              }
                            />
                            <Input
                              type="number"
                              label="Maximum"
                              value={paramRanges[param.path]?.max || 0}
                              onChange={(e) =>
                                setParamRanges({
                                  ...paramRanges,
                                  [param.path]: {
                                    ...paramRanges[param.path],
                                    max: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button 
                    onClick={runAnalysis1D} 
                    disabled={selectedParams.length === 0 || isRunning1D}
                    className="flex items-center justify-center space-x-2"
                  >
                    {isRunning1D && <Spinner size="sm" />}
                    <span>{isRunning1D ? 'Analyse en cours...' : 'Lancer l\'analyse'}</span>
                  </Button>
                  
                  {results1D && (
                    <Button 
                      variant="outline"
                      onClick={() => setResults1D(null)} 
                      disabled={isRunning1D}
                    >
                      Effacer les résultats
                    </Button>
                  )}
                </div>

                {results1D && (
                  <div className="mt-6">
                    <TornadoChart results={results1D} objective={objective1D} />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Analyse 2D */}
            <TabsContent value="2d" className="bg-slate-50">
              <div className="space-y-6">
                <Select
                  label="Objectif à analyser"
                  value={objective2D}
                  onChange={(e) => setObjective2D(e.target.value as keyof KPIResults)}
                  options={KPI_OPTIONS}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Select
                      label="Paramètre X (horizontal)"
                      value={paramX}
                      onChange={(e) => updateParamX(e.target.value)}
                      options={availableParameters.map((p) => ({
                        value: p.path,
                        label: p.label,
                      }))}
                    />
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input
                        type="number"
                        label="Min"
                        value={rangeX.min}
                        onChange={(e) =>
                          setRangeX({ ...rangeX, min: Number(e.target.value) })
                        }
                      />
                      <Input
                        type="number"
                        label="Max"
                        value={rangeX.max}
                        onChange={(e) =>
                          setRangeX({ ...rangeX, max: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Select
                      label="Paramètre Y (vertical)"
                      value={paramY}
                      onChange={(e) => updateParamY(e.target.value)}
                      options={availableParameters.map((p) => ({
                        value: p.path,
                        label: p.label,
                      }))}
                    />
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input
                        type="number"
                        label="Min"
                        value={rangeY.min}
                        onChange={(e) =>
                          setRangeY({ ...rangeY, min: Number(e.target.value) })
                        }
                      />
                      <Input
                        type="number"
                        label="Max"
                        value={rangeY.max}
                        onChange={(e) =>
                          setRangeY({ ...rangeY, max: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button 
                    onClick={runAnalysis2D}
                    disabled={isRunning2D}
                    className="flex items-center justify-center space-x-2"
                  >
                    {isRunning2D && <Spinner size="sm" />}
                    <span>{isRunning2D ? 'Analyse en cours...' : 'Lancer l\'analyse'}</span>
                  </Button>
                  
                  {results2D && (
                    <Button 
                      variant="outline"
                      onClick={() => setResults2D(null)} 
                      disabled={isRunning2D}
                    >
                      Effacer les résultats
                    </Button>
                  )}
                </div>

                {results2D && (
                  <div className="mt-6">
                    <HeatmapChart
                      results={results2D}
                      objective={objective2D}
                      labelX={availableParameters.find((p) => p.path === paramX)?.label || paramX}
                      labelY={availableParameters.find((p) => p.path === paramY)?.label || paramY}
                      paramPathX={paramX}
                      paramPathY={paramY}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Analyse Monte Carlo */}
            <TabsContent value="montecarlo" className="bg-slate-50">
              <div className="space-y-6">
                {availableParameters.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                    Aucun paramètre avec plage définie (useRange=true). Pour utiliser la simulation Monte Carlo, 
                    activez les plages pour au moins un paramètre dans l'onglet "Paramètres".
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-3">Simulation Monte Carlo</h3>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-slate-700">
                        <strong>Description:</strong> Analyse stochastique qui échantillonne aléatoirement 
                        tous les paramètres avec plages selon une distribution normale, puis calcule des milliers 
                        de scénarios possibles pour estimer la distribution probabiliste du résultat.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select
                        label="Objectif à analyser"
                        value={objectiveMC}
                        onChange={(e) => setObjectiveMC(e.target.value as keyof KPIResults)}
                        options={KPI_OPTIONS}
                      />
                      
                      <Input
                        type="number"
                        label={`Nombre d'itérations (${LIMITS.MIN_MONTE_CARLO_ITERATIONS}-${LIMITS.MAX_MONTE_CARLO_ITERATIONS})`}
                        value={iterations}
                        onChange={(e) => setIterations(Number(e.target.value))}
                        min={LIMITS.MIN_MONTE_CARLO_ITERATIONS}
                        max={LIMITS.MAX_MONTE_CARLO_ITERATIONS}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Button 
                        onClick={runAnalysisMC}
                        disabled={isRunningMC}
                        className="flex items-center justify-center space-x-2"
                      >
                        {isRunningMC && <Spinner size="sm" />}
                        <span>{isRunningMC ? 'Simulation en cours...' : 'Lancer la simulation'}</span>
                      </Button>
                      
                      {resultsMC && (
                        <Button 
                          variant="outline"
                          onClick={() => setResultsMC(null)} 
                          disabled={isRunningMC}
                        >
                          Effacer les résultats
                        </Button>
                      )}
                    </div>

                    {resultsMC && (
                      <div className="mt-6">
                        <MonteCarloChart results={resultsMC} objective={objectiveMC} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

