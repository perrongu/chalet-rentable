import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Spinner } from '../../components/ui/Spinner';
import { useProject } from '../../store/ProjectContext';
import type {
  OptimizationConfig,
  OptimizationVariable,
  OptimizationConstraint,
  KPIResults,
  OptimizationResult,
} from '../../types';
import { OptimizationObjective, ConstraintOperator } from '../../types';
import { runOptimization } from '../../lib/optimizer';
import { formatCurrency, formatPercent, formatNumber, generateUUID } from '../../lib/utils';
import { AVAILABLE_PARAMETERS, KPI_OPTIONS, ERROR_MESSAGES } from '../../lib/constants';

export function Optimizer() {
  const { getCurrentInputs } = useProject();

  // Configuration d'optimisation
  const [objective, setObjective] = useState<string>(OptimizationObjective.MAXIMIZE);
  const [targetMetric, setTargetMetric] = useState<keyof KPIResults>('annualCashflow');
  const [variables, setVariables] = useState<OptimizationVariable[]>([]);
  const [constraints, setConstraints] = useState<OptimizationConstraint[]>([]);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const addVariable = () => {
    const newVar: OptimizationVariable = {
      parameter: AVAILABLE_PARAMETERS[0].path,
      label: AVAILABLE_PARAMETERS[0].label,
      min: 0,
      max: 1000,
      locked: false,
    };
    setVariables([...variables, newVar]);
  };

  const updateVariable = (index: number, updates: Partial<OptimizationVariable>) => {
    const newVars = [...variables];
    newVars[index] = { ...newVars[index], ...updates };
    
    // Mettre à jour le label si le paramètre change
    if (updates.parameter) {
      const param = AVAILABLE_PARAMETERS.find((p) => p.path === updates.parameter);
      if (param) {
        newVars[index].label = param.label;
      }
    }
    
    setVariables(newVars);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const addConstraint = () => {
    const newConstraint: OptimizationConstraint = {
      id: generateUUID(),
      metric: 'annualCashflow',
      operator: ConstraintOperator.GREATER_THAN,
      value: 0,
      label: 'Cashflow positif',
    };
    setConstraints([...constraints, newConstraint]);
  };

  const updateConstraint = (id: string, updates: Partial<OptimizationConstraint>) => {
    setConstraints(
      constraints.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const removeConstraint = (id: string) => {
    setConstraints(constraints.filter((c) => c.id !== id));
  };

  const runOptimizationAnalysis = async () => {
    setIsRunning(true);
    setResult(null);

    const config: OptimizationConfig = {
      id: generateUUID(),
      name: 'Optimisation',
      objective: objective as OptimizationObjective,
      targetMetric,
      variables,
      constraints,
      maxIterations: 10000,
      topK: 10,
    };

    try {
      // Simuler un délai pour les calculs
      await new Promise((resolve) => setTimeout(resolve, 100));
      const optimizationResult = runOptimization(getCurrentInputs(), config);
      setResult(optimizationResult);
    } catch (error) {
      console.error('Erreur lors de l\'optimisation:', error);
      alert(ERROR_MESSAGES.OPTIMIZATION_FAILED);
    } finally {
      setIsRunning(false);
    }
  };

  const formatValue = (metric: keyof KPIResults, value: number) => {
    if (metric.includes('cash') || metric.includes('revenue') || metric.includes('expense')) {
      return formatCurrency(value);
    } else if (metric.includes('Rate') || metric.includes('Cash')) {
      return formatPercent(value);
    }
    return formatNumber(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Optimisation</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="auto">
            <TabsList>
              <TabsTrigger value="auto">Automatique</TabsTrigger>
              <TabsTrigger value="manual">Manuel</TabsTrigger>
            </TabsList>

            {/* Mode automatique */}
            <TabsContent value="auto">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Objectif"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value as OptimizationObjective)}
                    options={[
                      { value: OptimizationObjective.MAXIMIZE, label: 'Maximiser' },
                      { value: OptimizationObjective.MINIMIZE, label: 'Minimiser' },
                    ]}
                  />
                  <Select
                    label="Métrique cible"
                    value={targetMetric}
                    onChange={(e) => setTargetMetric(e.target.value as keyof KPIResults)}
                    options={KPI_OPTIONS}
                  />
                </div>

                {/* Variables */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Variables à optimiser</h4>
                    <Button onClick={addVariable} size="sm">
                      + Ajouter
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {variables.map((variable, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <Select
                            label="Paramètre"
                            value={variable.parameter}
                            onChange={(e) => updateVariable(index, { parameter: e.target.value })}
                            options={AVAILABLE_PARAMETERS.map((p) => ({
                              value: p.path,
                              label: p.label,
                            }))}
                          />
                          <Input
                            type="number"
                            label="Minimum"
                            value={variable.min}
                            onChange={(e) => updateVariable(index, { min: Number(e.target.value) })}
                          />
                          <Input
                            type="number"
                            label="Maximum"
                            value={variable.max}
                            onChange={(e) => updateVariable(index, { max: Number(e.target.value) })}
                          />
                          <div className="flex items-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeVariable(index)}
                              className="w-full"
                            >
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {variables.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        Aucune variable. Cliquez sur "+ Ajouter" pour en créer une.
                      </p>
                    )}
                  </div>
                </div>

                {/* Contraintes */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Contraintes</h4>
                    <Button onClick={addConstraint} size="sm" variant="outline">
                      + Ajouter
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {constraints.map((constraint) => (
                      <div key={constraint.id} className="border rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <Select
                            label="Métrique"
                            value={constraint.metric}
                            onChange={(e) =>
                              updateConstraint(constraint.id, {
                                metric: e.target.value as keyof KPIResults,
                              })
                            }
                            options={KPI_OPTIONS}
                          />
                          <Select
                            label="Opérateur"
                            value={constraint.operator}
                            onChange={(e) =>
                              updateConstraint(constraint.id, {
                                operator: e.target.value as ConstraintOperator,
                              })
                            }
                            options={[
                              { value: ConstraintOperator.GREATER_THAN, label: '≥' },
                              { value: ConstraintOperator.LESS_THAN, label: '≤' },
                              { value: ConstraintOperator.EQUAL, label: '=' },
                            ]}
                          />
                          <Input
                            type="number"
                            label="Valeur"
                            value={constraint.value}
                            onChange={(e) =>
                              updateConstraint(constraint.id, { value: Number(e.target.value) })
                            }
                          />
                          <div className="flex items-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeConstraint(constraint.id)}
                              className="w-full"
                            >
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={runOptimizationAnalysis}
                  disabled={variables.length === 0 || isRunning}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  {isRunning && <Spinner size="sm" />}
                  <span>{isRunning ? 'Optimisation en cours...' : 'Lancer l\'optimisation'}</span>
                </Button>

                {/* Résultats */}
                {result && (
                  <div className="mt-6 space-y-4">
                    <h4 className="font-medium text-lg">
                      Résultats ({result.iterations} itérations en {result.duration}ms)
                    </h4>
                    <div className="space-y-3">
                      {result.solutions.map((solution, index: number) => (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 ${
                            solution.feasible ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h5 className="font-medium">
                                Solution #{solution.rank}
                                {!solution.feasible && (
                                  <span className="ml-2 text-xs bg-red-200 px-2 py-1 rounded">
                                    Non faisable
                                  </span>
                                )}
                              </h5>
                              <p className="text-sm text-gray-600">
                                {targetMetric}: {formatValue(targetMetric, solution.objectiveValue)}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {Object.entries(solution.values).map(([param, value]) => (
                              <div key={param} className="flex justify-between">
                                <span className="text-gray-600">
                                  {AVAILABLE_PARAMETERS.find((p) => p.path === param)?.label}:
                                </span>
                                <span className="font-medium">{formatNumber(value as number, 2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Mode manuel */}
            <TabsContent value="manual">
              <div className="text-center py-8 text-gray-500">
                Mode manuel avec sliders interactifs - À implémenter
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

