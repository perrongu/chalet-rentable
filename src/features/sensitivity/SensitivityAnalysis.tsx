import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useProject } from '../../store/ProjectContext';
import type { KPIResults, ParameterRange } from '../../types';
import { runSensitivityAnalysis1D, runSensitivityAnalysis2D } from '../../lib/sensitivity';
import { TornadoChart } from './TornadoChart';
import { HeatmapChart } from './HeatmapChart';

const availableParameters = [
  { path: 'revenue.averageDailyRate', label: 'Tarif moyen par nuitée' },
  { path: 'revenue.occupancyRate', label: 'Taux d\'occupation' },
  { path: 'financing.purchasePrice', label: 'Prix d\'achat' },
  { path: 'financing.downPayment', label: 'Mise de fonds' },
  { path: 'financing.interestRate', label: 'Taux d\'intérêt' },
  { path: 'financing.amortizationYears', label: 'Amortissement' },
];

const kpiOptions: Array<{ value: keyof KPIResults; label: string }> = [
  { value: 'annualCashflow', label: 'Cashflow annuel' },
  { value: 'cashOnCash', label: 'Cash-on-Cash' },
  { value: 'capRate', label: 'Cap Rate' },
  { value: 'annualRevenue', label: 'Revenus annuels' },
  { value: 'totalExpenses', label: 'Dépenses totales' },
];

export function SensitivityAnalysis() {
  const { getCurrentInputs } = useProject();

  // État pour analyse 1D
  const [objective1D, setObjective1D] = useState<keyof KPIResults>('annualCashflow');
  const [selectedParams, setSelectedParams] = useState<string[]>([]);
  const [paramRanges, setParamRanges] = useState<Record<string, { min: number; max: number }>>({});
  const [results1D, setResults1D] = useState<any>(null);

  // État pour analyse 2D
  const [objective2D, setObjective2D] = useState<keyof KPIResults>('annualCashflow');
  const [paramX, setParamX] = useState<string>('revenue.averageDailyRate');
  const [paramY, setParamY] = useState<string>('revenue.occupancyRate');
  const [rangeX, setRangeX] = useState({ min: 150, max: 250 });
  const [rangeY, setRangeY] = useState({ min: 40, max: 80 });
  const [results2D, setResults2D] = useState<any>(null);

  const toggleParameter = (path: string) => {
    if (selectedParams.includes(path)) {
      setSelectedParams(selectedParams.filter((p) => p !== path));
    } else {
      setSelectedParams([...selectedParams, path]);
      // Initialiser les plages avec des valeurs par défaut
      const currentValue = getParameterValue(path);
      setParamRanges({
        ...paramRanges,
        [path]: {
          min: currentValue * 0.8,
          max: currentValue * 1.2,
        },
      });
    }
  };

  const getParameterValue = (path: string): number => {
    const inputs = getCurrentInputs();
    const parts = path.split('.');
    let value: any = inputs;
    for (const part of parts) {
      value = value[part];
    }
    return typeof value === 'object' && 'value' in value ? value.value : value;
  };

  const runAnalysis1D = () => {
    const inputs = getCurrentInputs();
    const parameters: ParameterRange[] = selectedParams.map((path) => ({
      parameter: path,
      label: availableParameters.find((p) => p.path === path)?.label || path,
      min: paramRanges[path].min,
      base: getParameterValue(path),
      max: paramRanges[path].max,
      steps: 10,
    }));

    const result = runSensitivityAnalysis1D(inputs, parameters, objective1D);
    setResults1D(result);
  };

  const runAnalysis2D = () => {
    const inputs = getCurrentInputs();
    const parameterX: ParameterRange = {
      parameter: paramX,
      label: availableParameters.find((p) => p.path === paramX)?.label || paramX,
      min: rangeX.min,
      base: getParameterValue(paramX),
      max: rangeX.max,
      steps: 15,
    };

    const parameterY: ParameterRange = {
      parameter: paramY,
      label: availableParameters.find((p) => p.path === paramY)?.label || paramY,
      min: rangeY.min,
      base: getParameterValue(paramY),
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
                      onChange={(e) => setParamX(e.target.value)}
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
                      onChange={(e) => setParamY(e.target.value)}
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

