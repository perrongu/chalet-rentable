import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useProject } from '../../store/ProjectContext';
import type { KPIResults, ParameterRange, ProjectInputs } from '../../types';
import { runSensitivityAnalysis1D, runSensitivityAnalysis2D } from '../../lib/sensitivity';
import { TornadoChart } from './TornadoChart';
import { HeatmapChart } from './HeatmapChart';

// Labels pour les paramètres connus
const parameterLabels: Record<string, string> = {
  'revenue.averageDailyRate': 'Tarif moyen par nuitée',
  'revenue.occupancyRate': 'Taux d\'occupation',
  'financing.purchasePrice': 'Prix d\'achat',
  'financing.downPayment': 'Mise de fonds',
  'financing.interestRate': 'Taux d\'intérêt',
  'financing.amortizationYears': 'Amortissement',
  'acquisitionFees.notaryFees': 'Frais de notaire',
  'acquisitionFees.other': 'Autres frais d\'acquisition',
};

const kpiOptions: Array<{ value: keyof KPIResults; label: string }> = [
  { value: 'annualCashflow', label: 'Cashflow annuel' },
  { value: 'cashOnCash', label: 'Cash-on-Cash' },
  { value: 'capRate', label: 'Cap Rate' },
  { value: 'annualRevenue', label: 'Revenus annuels' },
  { value: 'totalExpenses', label: 'Dépenses totales' },
];

// Fonction pour récupérer les paramètres disponibles avec plages
function getAvailableParameters(inputs: ProjectInputs): Array<{ path: string; label: string; min: number; max: number; default: number }> {
  const parameters: Array<{ path: string; label: string; min: number; max: number; default: number }> = [];

  // Vérifier les revenus
  if (inputs.revenue.averageDailyRate.range?.useRange) {
    const r = inputs.revenue.averageDailyRate.range;
    parameters.push({
      path: 'revenue.averageDailyRate',
      label: parameterLabels['revenue.averageDailyRate'],
      min: r.min,
      max: r.max,
      default: r.default,
    });
  }
  
  if (inputs.revenue.occupancyRate.range?.useRange) {
    const r = inputs.revenue.occupancyRate.range;
    parameters.push({
      path: 'revenue.occupancyRate',
      label: parameterLabels['revenue.occupancyRate'],
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
      label: parameterLabels['financing.purchasePrice'],
      min: r.min,
      max: r.max,
      default: r.default,
    });
  }
  
  if (inputs.financing.downPayment.range?.useRange) {
    const r = inputs.financing.downPayment.range;
    parameters.push({
      path: 'financing.downPayment',
      label: parameterLabels['financing.downPayment'],
      min: r.min,
      max: r.max,
      default: r.default,
    });
  }
  
  if (inputs.financing.interestRate.range?.useRange) {
    const r = inputs.financing.interestRate.range;
    parameters.push({
      path: 'financing.interestRate',
      label: parameterLabels['financing.interestRate'],
      min: r.min,
      max: r.max,
      default: r.default,
    });
  }
  
  if (inputs.financing.amortizationYears.range?.useRange) {
    const r = inputs.financing.amortizationYears.range;
    parameters.push({
      path: 'financing.amortizationYears',
      label: parameterLabels['financing.amortizationYears'],
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
      label: parameterLabels['acquisitionFees.notaryFees'],
      min: r.min,
      max: r.max,
      default: r.default,
    });
  }
  
  if (inputs.acquisitionFees.other.range?.useRange) {
    const r = inputs.acquisitionFees.other.range;
    parameters.push({
      path: 'acquisitionFees.other',
      label: parameterLabels['acquisitionFees.other'],
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
  const [results1D, setResults1D] = useState<any>(null);

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
  const [results2D, setResults2D] = useState<any>(null);

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

  const runAnalysis1D = () => {
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

  const runAnalysis2D = () => {
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
            </TabsList>

            {/* Analyse 1D */}
            <TabsContent value="1d">
              <div className="space-y-4">
                <Select
                  label="Objectif à analyser"
                  value={objective1D}
                  onChange={(e) => setObjective1D(e.target.value as keyof KPIResults)}
                  options={kpiOptions}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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

                <Button onClick={runAnalysis1D} disabled={selectedParams.length === 0}>
                  Lancer l'analyse
                </Button>

                {results1D && (
                  <div className="mt-6">
                    <TornadoChart results={results1D} objective={objective1D} />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Analyse 2D */}
            <TabsContent value="2d">
              <div className="space-y-4">
                <Select
                  label="Objectif à analyser"
                  value={objective2D}
                  onChange={(e) => setObjective2D(e.target.value as keyof KPIResults)}
                  options={kpiOptions}
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

                <Button onClick={runAnalysis2D}>Lancer l'analyse</Button>

                {results2D && (
                  <div className="mt-6">
                    <HeatmapChart
                      results={results2D}
                      objective={objective2D}
                      labelX={availableParameters.find((p) => p.path === paramX)?.label || paramX}
                      labelY={availableParameters.find((p) => p.path === paramY)?.label || paramY}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

