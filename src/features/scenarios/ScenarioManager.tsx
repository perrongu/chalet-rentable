import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useProject, createDefaultProject } from '../../store/ProjectContext';
import type { Scenario } from '../../types';
import { calculateKPIs } from '../../lib/calculations';
import { formatCurrency, formatPercent, generateUUID, formatDateShort, deepMerge, deepClone } from '../../lib/utils';
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
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [editingScenarioName, setEditingScenarioName] = useState('');

  const createScenario = () => {
    if (!newScenarioName.trim()) return;

    // Utiliser les valeurs d'usine d'un nouveau projet comme overrides
    const defaults = createDefaultProject().baseInputs;
    const newScenario: Scenario = {
      id: generateUUID(),
      name: newScenarioName,
      description: '',
      isBase: false,
      overrides: deepClone(defaults),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dispatch({ type: 'ADD_SCENARIO', payload: newScenario });
    setNewScenarioName('');
    setShowNewScenarioForm(false);
  };

  const duplicateScenario = (scenario: Scenario) => {
    // Résoudre les inputs du scénario source au moment T
    const resolved = scenario.isBase
      ? project.baseInputs
      : deepMerge(project.baseInputs, scenario.overrides || {} as any);

    const newScenario: Scenario = {
      id: generateUUID(),
      name: `${scenario.name} (copie)`,
      description: scenario.description || '',
      isBase: false,
      overrides: deepClone(resolved), // snapshot indépendant
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

  const startRenaming = (scenario: Scenario) => {
    setEditingScenarioId(scenario.id);
    setEditingScenarioName(scenario.name);
  };

  const saveRename = () => {
    if (!editingScenarioName.trim() || !editingScenarioId) return;

    dispatch({
      type: 'UPDATE_SCENARIO',
      payload: {
        id: editingScenarioId,
        updates: { name: editingScenarioName.trim() },
      },
    });
    setEditingScenarioId(null);
    setEditingScenarioName('');
  };

  const cancelRename = () => {
    setEditingScenarioId(null);
    setEditingScenarioName('');
  };

  // Données pour la comparaison
  const comparisonData = project.scenarios.map((scenario) => {
    const inputs = scenario.isBase
      ? project.baseInputs
      : deepMerge(project.baseInputs, scenario.overrides || {} as any);
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
                  className={`border rounded-2xl p-4 transition-all ${
                    isActive ? 'border-sky-400 bg-sky-50 shadow-soft' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {editingScenarioId === scenario.id ? (
                        <div className="flex items-center space-x-2 mb-2">
                          <Input
                            value={editingScenarioName}
                            onChange={(e) => setEditingScenarioName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') saveRename();
                              if (e.key === 'Escape') cancelRename();
                            }}
                            className="max-w-xs"
                            autoFocus
                          />
                          <Button size="sm" onClick={saveRename}>
                            Valider
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelRename}>
                            Annuler
                          </Button>
                        </div>
                      ) : (
                        <h4 className="font-medium text-slate-800">
                          {scenario.name}
                          {scenario.isBase && (
                            <span className="ml-2 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                              Base
                            </span>
                          )}
                          {isActive && (
                            <span className="ml-2 text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full">
                              Actif
                            </span>
                          )}
                        </h4>
                      )}
                      {scenario.description && (
                        <p className="text-sm text-slate-600 mt-1">{scenario.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Créé le {formatDateShort(scenario.createdAt)}
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
                        onClick={() => startRenaming(scenario)}
                      >
                        Renommer
                      </Button>
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
            <div className="mt-4 border border-sky-200 rounded-2xl p-4 bg-sky-50">
              <h4 className="font-medium mb-3 text-slate-800">Nouveau scénario</h4>
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
              <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Métrique</th>
                    {project.scenarios.map((s) => (
                      <th key={s.id} className="text-right py-3 px-4 font-semibold text-slate-700">
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-700">Revenus annuels bruts</td>
                    {comparisonData.map((d, i) => (
                      <td key={i} className="text-right py-3 px-4 font-medium text-slate-900">
                        {formatCurrency(d.revenus)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-700">Dépenses totales</td>
                    {comparisonData.map((d, i) => (
                      <td key={i} className="text-right py-3 px-4 font-medium text-slate-900">
                        {formatCurrency(d.dépenses)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-700">Cashflow annuel</td>
                    {comparisonData.map((d, i) => (
                      <td
                        key={i}
                        className={`text-right py-3 px-4 font-medium ${
                          d.cashflow >= 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {formatCurrency(d.cashflow)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-700">Cash-on-Cash</td>
                    {comparisonData.map((d, i) => (
                      <td key={i} className="text-right py-3 px-4 font-medium text-slate-900">
                        {formatPercent(d.coc)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-700">Cap Rate</td>
                    {comparisonData.map((d, i) => (
                      <td key={i} className="text-right py-3 px-4 font-medium text-slate-900">
                        {formatPercent(d.capRate)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Graphique Cashflow */}
            <div className="mb-6">
              <h4 className="font-medium mb-3 text-slate-800">Cashflow annuel par scénario</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="cashflow" fill="#7dd3fc" name="Cashflow annuel" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique Cash-on-Cash vs Cap Rate */}
            <div>
              <h4 className="font-medium mb-3 text-slate-800">Métriques de rentabilité</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatPercent(value)} />
                  <Legend />
                  <Bar dataKey="coc" fill="#34d399" name="Cash-on-Cash (%)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="capRate" fill="#fb923c" name="Cap Rate (%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

