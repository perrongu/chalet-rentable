import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useProject } from '../../store/ProjectContext';
import type { Scenario } from '../../types';
import { calculateKPIs } from '../../lib/calculations';
import { formatCurrency, formatPercent } from '../../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function ScenarioManager() {
  const { project, dispatch } = useProject();
  const [showNewScenarioForm, setShowNewScenarioForm] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  const createScenario = () => {
    if (!newScenarioName.trim()) return;

    const newScenario: Scenario = {
      id: crypto.randomUUID(),
      name: newScenarioName,
      description: '',
      isBase: false,
      overrides: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dispatch({ type: 'ADD_SCENARIO', payload: newScenario });
    setNewScenarioName('');
    setShowNewScenarioForm(false);
  };

  const duplicateScenario = (scenario: Scenario) => {
    const newScenario: Scenario = {
      ...scenario,
      id: crypto.randomUUID(),
      name: `${scenario.name} (copie)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dispatch({ type: 'ADD_SCENARIO', payload: newScenario });
  };

  const deleteScenario = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce scénario ?')) {
      dispatch({ type: 'DELETE_SCENARIO', payload: id });
    }
  };

  const setActiveScenario = (id: string) => {
    dispatch({ type: 'SET_ACTIVE_SCENARIO', payload: id });
  };

  // Données pour la comparaison
  const comparisonData = project.scenarios.map((scenario) => {
    const inputs = scenario.isBase
      ? project.baseInputs
      : { ...project.baseInputs, ...scenario.overrides };
    const kpis = calculateKPIs(inputs);

    return {
      name: scenario.name,
      revenus: kpis.annualRevenue,
      dépenses: kpis.totalExpenses,
      cashflow: kpis.annualCashflow,
      coc: kpis.cashOnCash,
      capRate: kpis.capRate,
    };
  });

  return (
    <div className="space-y-6">
      {/* Liste des scénarios */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Scénarios</CardTitle>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowComparison(!showComparison)}
              >
                {showComparison ? 'Masquer' : 'Comparer'}
              </Button>
              <Button onClick={() => setShowNewScenarioForm(true)}>
                + Nouveau scénario
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {project.scenarios.map((scenario) => {
              const isActive = project.activeScenarioId === scenario.id;
              return (
                <div
                  key={scenario.id}
                  className={`border rounded-lg p-4 ${
                    isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">
                        {scenario.name}
                        {scenario.isBase && (
                          <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                            Base
                          </span>
                        )}
                        {isActive && (
                          <span className="ml-2 text-xs bg-blue-200 px-2 py-1 rounded">
                            Actif
                          </span>
                        )}
                      </h4>
                      {scenario.description && (
                        <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Créé le {scenario.createdAt.toLocaleDateString('fr-CA')}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {!isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveScenario(scenario.id)}
                        >
                          Activer
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateScenario(scenario)}
                      >
                        Dupliquer
                      </Button>
                      {!scenario.isBase && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteScenario(scenario.id)}
                        >
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulaire nouveau scénario */}
          {showNewScenarioForm && (
            <div className="mt-4 border border-blue-300 rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium mb-3">Nouveau scénario</h4>
              <div className="flex space-x-2">
                <Input
                  placeholder="Nom du scénario"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createScenario()}
                />
                <Button onClick={createScenario}>Créer</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewScenarioForm(false);
                    setNewScenarioName('');
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparaison */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle>Comparaison des scénarios</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Tableau de comparaison */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Métrique</th>
                    {project.scenarios.map((s) => (
                      <th key={s.id} className="text-right py-2 px-3">
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3">Revenus annuels</td>
                    {comparisonData.map((d, i) => (
                      <td key={i} className="text-right py-2 px-3 font-medium">
                        {formatCurrency(d.revenus)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Dépenses totales</td>
                    {comparisonData.map((d, i) => (
                      <td key={i} className="text-right py-2 px-3 font-medium">
                        {formatCurrency(d.dépenses)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Cashflow annuel</td>
                    {comparisonData.map((d, i) => (
                      <td
                        key={i}
                        className={`text-right py-2 px-3 font-medium ${
                          d.cashflow >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(d.cashflow)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Cash-on-Cash</td>
                    {comparisonData.map((d, i) => (
                      <td key={i} className="text-right py-2 px-3 font-medium">
                        {formatPercent(d.coc)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Cap Rate</td>
                    {comparisonData.map((d, i) => (
                      <td key={i} className="text-right py-2 px-3 font-medium">
                        {formatPercent(d.capRate)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Graphique Cashflow */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">Cashflow annuel par scénario</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="cashflow" fill="#3b82f6" name="Cashflow annuel" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique Cash-on-Cash vs Cap Rate */}
            <div>
              <h4 className="font-medium mb-3">Métriques de rentabilité</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatPercent(value)} />
                  <Legend />
                  <Bar dataKey="coc" fill="#10b981" name="Cash-on-Cash (%)" />
                  <Bar dataKey="capRate" fill="#f59e0b" name="Cap Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

