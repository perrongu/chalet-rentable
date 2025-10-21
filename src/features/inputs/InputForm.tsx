import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { RangeInput } from '../../components/ui/RangeInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useProject } from '../../store/ProjectContext';
import type { ExpenseLine, InputWithSource } from '../../types';
import { ExpenseType, ExpenseCategory, PaymentFrequency } from '../../types';
import { useMemo, useState } from 'react';
import { generateUUID, formatCurrency } from '../../lib/utils';

// Composant pour afficher un indicateur de modification
function OverrideIndicator({ baseValue, tooltip }: { baseValue: any; tooltip?: string }) {
  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return 'non défini';
    if (typeof val === 'object' && 'value' in val) return String(val.value);
    return String(val);
  };

  return (
    <span
      className="inline-flex items-center ml-2 text-xs text-orange-500 font-medium"
      title={tooltip || `Valeur du scénario de base : ${formatValue(baseValue)}`}
    >
      🔄
    </span>
  );
}

export function InputForm() {
  const { project, dispatch, getCurrentInputs, getCurrentKPIs } = useProject();
  const inputs = getCurrentInputs();
  const kpis = getCurrentKPIs();
  const [showMunicipalAssessmentInfo, setShowMunicipalAssessmentInfo] = useState(false);
  
  // Vérifier si on est dans le scénario de base
  const activeScenario = project.scenarios.find((s) => s.id === project.activeScenarioId);
  const isBaseScenario = activeScenario?.isBase || false;

  // Fonction pour obtenir la valeur de base
  const getBaseValue = (path: string[]): any => {
    let current = project.baseInputs as any;
    for (const key of path) {
      if (current[key] === undefined) return undefined;
      current = current[key];
    }
    return current;
  };

  // Fonction pour obtenir la valeur dans les overrides
  const getOverrideValue = (path: string[]): any => {
    if (!activeScenario?.overrides) return undefined;
    
    let current = activeScenario.overrides as any;
    for (const key of path) {
      if (current[key] === undefined) return undefined;
      current = current[key];
    }
    return current;
  };

  // Fonction pour comparer deux valeurs (incluant les objets InputWithSource)
  const areValuesEqual = (val1: any, val2: any): boolean => {
    if (val1 === val2) return true;
    if (val1 == null || val2 == null) return false;
    
    // Si les deux sont des objets
    if (typeof val1 === 'object' && typeof val2 === 'object') {
      // Comparer les objets InputWithSource
      if ('value' in val1 && 'value' in val2) {
        return JSON.stringify(val1) === JSON.stringify(val2);
      }
    }
    
    return false;
  };

  // Fonction pour vérifier si un champ est overridé et différent de la base
  const isFieldOverridden = (path: string[]): boolean => {
    if (isBaseScenario) return false;
    
    const overrideValue = getOverrideValue(path);
    if (overrideValue === undefined) return false;
    
    const baseValue = getBaseValue(path);
    
    // Comparer les valeurs - si elles sont égales, pas d'override effectif
    return !areValuesEqual(overrideValue, baseValue);
  };

  // Grouper les dépenses par catégorie
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, ExpenseLine[]> = {};
    inputs.expenses.forEach((expense) => {
      const category = expense.category || 'Autre';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(expense);
    });
    return grouped;
  }, [inputs.expenses]);

  const updateRevenue = (field: string, value: InputWithSource<number> | number) => {
    if (isBaseScenario) {
      const updatedRevenue = {
        ...inputs.revenue,
        [field]: value,
      };
      dispatch({
        type: 'UPDATE_BASE_INPUTS',
        payload: { revenue: updatedRevenue } as any,
      });
    } else {
      // Pour les scénarios, merger avec les overrides existants, pas avec les inputs actuels
      const currentOverrideRevenue = (activeScenario?.overrides as any)?.revenue || {};
      const updatedRevenue = {
        ...currentOverrideRevenue,
        [field]: value,
      };
      dispatch({
        type: 'UPDATE_SCENARIO',
        payload: {
          id: project.activeScenarioId,
          updates: {
            overrides: {
              ...activeScenario?.overrides,
              revenue: updatedRevenue,
            },
          },
        },
      });
    }
  };

  const updateFinancing = (field: string, value: InputWithSource<number> | number | PaymentFrequency) => {
    if (isBaseScenario) {
      const updatedFinancing = {
        ...inputs.financing,
        [field]: value,
      };
      dispatch({
        type: 'UPDATE_BASE_INPUTS',
        payload: { financing: updatedFinancing } as any,
      });
    } else {
      // Pour les scénarios, merger avec les overrides existants, pas avec les inputs actuels
      const currentOverrideFinancing = (activeScenario?.overrides as any)?.financing || {};
      const updatedFinancing = {
        ...currentOverrideFinancing,
        [field]: value,
      };
      dispatch({
        type: 'UPDATE_SCENARIO',
        payload: {
          id: project.activeScenarioId,
          updates: {
            overrides: {
              ...activeScenario?.overrides,
              financing: updatedFinancing,
            },
          },
        },
      });
    }
  };

  const updateAcquisitionFees = (field: string, value: InputWithSource<number>) => {
    if (isBaseScenario) {
      const updatedAcquisitionFees = {
        ...inputs.acquisitionFees,
        [field]: value,
      };
      dispatch({
        type: 'UPDATE_BASE_INPUTS',
        payload: { acquisitionFees: updatedAcquisitionFees },
      });
    } else {
      // Pour les scénarios, merger avec les overrides existants, pas avec les inputs actuels
      const currentOverrideAcquisitionFees = (activeScenario?.overrides as any)?.acquisitionFees || {};
      const updatedAcquisitionFees = {
        ...currentOverrideAcquisitionFees,
        [field]: value,
      };
      dispatch({
        type: 'UPDATE_SCENARIO',
        payload: {
          id: project.activeScenarioId,
          updates: {
            overrides: {
              ...activeScenario?.overrides,
              acquisitionFees: updatedAcquisitionFees,
            },
          },
        },
      });
    }
  };

  const updateProjectionSettings = (field: string, value: InputWithSource<number>) => {
    if (isBaseScenario) {
      const updatedProjectionSettings = {
        ...(inputs.projectionSettings || {}),
        [field]: value,
      };
      dispatch({
        type: 'UPDATE_BASE_INPUTS',
        payload: { projectionSettings: updatedProjectionSettings } as any,
      });
    } else {
      // Pour les scénarios, merger avec les overrides existants, pas avec les inputs actuels
      const currentOverrideProjectionSettings = (activeScenario?.overrides as any)?.projectionSettings || {};
      const updatedProjectionSettings = {
        ...currentOverrideProjectionSettings,
        [field]: value,
      };
      dispatch({
        type: 'UPDATE_SCENARIO',
        payload: {
          id: project.activeScenarioId,
          updates: {
            overrides: {
              ...activeScenario?.overrides,
              projectionSettings: updatedProjectionSettings,
            },
          },
        },
      });
    }
  };

  const addExpenseLine = (category?: ExpenseCategory) => {
    const newLine: ExpenseLine = {
      id: generateUUID(),
      name: 'Nouvelle dépense',
      type: ExpenseType.FIXED_ANNUAL,
      amount: { value: 0 },
      category: category || ExpenseCategory.AUTRE,
    };
    
    // Pour les expenses, on utilise les inputs actuels car c'est une liste complète
    const updatedExpenses = [...inputs.expenses, newLine];

    if (isBaseScenario) {
      dispatch({
        type: 'UPDATE_BASE_INPUTS',
        payload: { expenses: updatedExpenses },
      });
    } else {
      dispatch({
        type: 'UPDATE_SCENARIO',
        payload: {
          id: project.activeScenarioId,
          updates: {
            overrides: {
              ...activeScenario?.overrides,
              expenses: updatedExpenses,
            },
          },
        },
      });
    }
  };

  const updateExpenseLine = (id: string, updates: Partial<ExpenseLine>) => {
    const updatedExpenses = inputs.expenses.map((line) =>
      line.id === id ? { ...line, ...updates } : line
    );
    
    if (isBaseScenario) {
      dispatch({
        type: 'UPDATE_BASE_INPUTS',
        payload: { expenses: updatedExpenses },
      });
    } else {
      dispatch({
        type: 'UPDATE_SCENARIO',
        payload: {
          id: project.activeScenarioId,
          updates: {
            overrides: {
              ...activeScenario?.overrides,
              expenses: updatedExpenses,
            },
          },
        },
      });
    }
  };

  const deleteExpenseLine = (id: string, name: string) => {
    if (!window.confirm(`Confirmer la suppression de "${name}" ?`)) {
      return;
    }
    
    const updatedExpenses = inputs.expenses.filter((line) => line.id !== id);
    
    if (isBaseScenario) {
      dispatch({
        type: 'UPDATE_BASE_INPUTS',
        payload: { expenses: updatedExpenses },
      });
    } else {
      dispatch({
        type: 'UPDATE_SCENARIO',
        payload: {
          id: project.activeScenarioId,
          updates: {
            overrides: {
              ...activeScenario?.overrides,
              expenses: updatedExpenses,
            },
          },
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Revenus */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Revenus locatifs bruts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <RangeInput
                label={
                  <span>
                    Tarif moyen par nuitée ($)
                    {isFieldOverridden(['revenue', 'averageDailyRate']) && (
                      <OverrideIndicator baseValue={getBaseValue(['revenue', 'averageDailyRate'])} />
                    )}
                  </span>
                }
                value={inputs.revenue.averageDailyRate}
                onChange={(value) => updateRevenue('averageDailyRate', value)}
                min={0}
                step={10}
              />
            </div>
            <div>
              <RangeInput
                label={
                  <span>
                    Taux d'occupation (%)
                    {isFieldOverridden(['revenue', 'occupancyRate']) && (
                      <OverrideIndicator baseValue={getBaseValue(['revenue', 'occupancyRate'])} />
                    )}
                  </span>
                }
                value={inputs.revenue.occupancyRate}
                onChange={(value) => updateRevenue('occupancyRate', value)}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </div>
          <div className="text-sm text-slate-600 pt-1 border-t border-slate-300">
            Revenu annuel estimé:{' '}
            <span className="font-semibold text-slate-900">
              {kpis.annualRevenue.toLocaleString('fr-CA', {
                style: 'currency',
                currency: 'CAD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            {' '}({kpis.nightsSold.toFixed(0)} nuitées × {inputs.revenue.averageDailyRate.value} $)
          </div>
        </CardContent>
      </Card>

      {/* Section Dépenses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Dépenses locatives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(expensesByCategory).map(([category, expenses]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-1">
                {expenses.map((line) => (
                  <div
                    key={line.id}
                    className="py-2 px-2 hover:bg-slate-50 rounded-xl group space-y-2 transition-colors"
                  >
                    <div className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-4">
                        <Input
                          value={line.name}
                          onChange={(e) => updateExpenseLine(line.id, { name: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <Select
                          value={line.type}
                          onChange={(e) =>
                            updateExpenseLine(line.id, { type: e.target.value as ExpenseType })
                          }
                          options={[
                            { value: ExpenseType.FIXED_ANNUAL, label: 'Annuel' },
                            { value: ExpenseType.FIXED_MONTHLY, label: 'Mensuel' },
                            { value: ExpenseType.PERCENTAGE_REVENUE, label: '% revenus bruts' },
                            { value: ExpenseType.PERCENTAGE_PROPERTY_VALUE, label: '% valeur propriété' },
                          ]}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={line.category || ExpenseCategory.AUTRE}
                          onChange={(e) =>
                            updateExpenseLine(line.id, { category: e.target.value as ExpenseCategory })
                          }
                          options={Object.values(ExpenseCategory).map(cat => ({
                            value: cat,
                            label: cat,
                          }))}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <button
                          onClick={() => deleteExpenseLine(line.id, line.name)}
                          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          title="Supprimer"
                          aria-label={`Supprimer ${line.name}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="col-span-1"></div>
                    </div>
                    <div className="pl-2">
                      <RangeInput
                        label=""
                        value={line.amount}
                        onChange={(value) => updateExpenseLine(line.id, { amount: value })}
                        min={0}
                        step={line.type === ExpenseType.PERCENTAGE_REVENUE || line.type === ExpenseType.PERCENTAGE_PROPERTY_VALUE ? 0.1 : 10}
                        className="text-sm"
                      />
                      {line.type === ExpenseType.PERCENTAGE_REVENUE && (
                        <div className="text-xs text-slate-500 mt-1 ml-2">
                          ≈ {formatCurrency((kpis.annualRevenue * (line.amount.value || 0)) / 100)}/an
                        </div>
                      )}
                      {line.type === ExpenseType.PERCENTAGE_PROPERTY_VALUE && (
                        <div className="text-xs text-slate-500 mt-1 ml-2">
                          ≈ {formatCurrency(((inputs.financing.purchasePrice.value || 0) * (line.amount.value || 0)) / 100)}/an
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => addExpenseLine(category as ExpenseCategory)}
                className="text-sm text-sky-600 hover:text-sky-700 pl-2 py-1 transition-colors"
              >
                + Ajouter une dépense
              </button>
            </div>
          ))}
          {inputs.expenses.length === 0 && (
            <div className="text-center py-4">
              <p className="text-slate-500 text-sm mb-2">Aucune dépense configurée</p>
              <button
                onClick={() => addExpenseLine(ExpenseCategory.AUTRE)}
                className="text-sm text-sky-600 hover:text-sky-700 transition-colors"
              >
                + Ajouter une dépense
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Financement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Financement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <RangeInput
                label={
                  <span>
                    Prix d'achat ($)
                    {isFieldOverridden(['financing', 'purchasePrice']) && (
                      <OverrideIndicator baseValue={getBaseValue(['financing', 'purchasePrice'])} />
                    )}
                  </span>
                }
                value={inputs.financing.purchasePrice}
                onChange={(value) => updateFinancing('purchasePrice', value)}
                min={0}
                step={1000}
              />
            </div>
            <div className="relative">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Évaluation municipale ($)
                    {isFieldOverridden(['financing', 'municipalAssessment']) && (
                      <OverrideIndicator baseValue={getBaseValue(['financing', 'municipalAssessment'])} />
                    )}
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMunicipalAssessmentInfo(true)}
                    className="h-6 px-2 text-xs"
                    aria-label="Voir les détails sur l'évaluation municipale"
                  >
                    <span className="emoji-icon-sm">ⓘ</span>Détails
                  </Button>
                </div>
                <input
                  type="number"
                  value={inputs.financing.municipalAssessment?.value || ''}
                  onChange={(e) => {
                    const newValue = e.target.value === '' ? undefined : { value: Number(e.target.value) };
                    updateFinancing('municipalAssessment', newValue as any);
                  }}
                  min={0}
                  step={1000}
                  placeholder="Optionnel - prix d'achat par défaut"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all duration-200"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Laisser vide pour utiliser le prix d'achat
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <RangeInput
                label={
                  <span>
                    Mise de fonds ($)
                    {isFieldOverridden(['financing', 'downPayment']) && (
                      <OverrideIndicator baseValue={getBaseValue(['financing', 'downPayment'])} />
                    )}
                  </span>
                }
                value={inputs.financing.downPayment}
                onChange={(value) => updateFinancing('downPayment', value)}
                min={0}
                step={1000}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <RangeInput
                label={
                  <span>
                    Taux d'intérêt (%)
                    {isFieldOverridden(['financing', 'interestRate']) && (
                      <OverrideIndicator baseValue={getBaseValue(['financing', 'interestRate'])} />
                    )}
                  </span>
                }
                value={inputs.financing.interestRate}
                onChange={(value) => updateFinancing('interestRate', value)}
                min={0}
                max={20}
                step={0.1}
              />
            </div>
            <div>
              <RangeInput
                label={
                  <span>
                    Amortissement (années)
                    {isFieldOverridden(['financing', 'amortizationYears']) && (
                      <OverrideIndicator baseValue={getBaseValue(['financing', 'amortizationYears'])} />
                    )}
                  </span>
                }
                value={inputs.financing.amortizationYears}
                onChange={(value) => updateFinancing('amortizationYears', value)}
                min={1}
                max={50}
                step={1}
              />
            </div>
            <div>
              <Select
                label={
                  <span>
                    Fréquence de paiement
                    {isFieldOverridden(['financing', 'paymentFrequency']) && (
                      <OverrideIndicator baseValue={getBaseValue(['financing', 'paymentFrequency'])} />
                    )}
                  </span>
                }
                value={inputs.financing.paymentFrequency}
                onChange={(e) => updateFinancing('paymentFrequency', e.target.value as PaymentFrequency)}
                options={[
                  { value: PaymentFrequency.MONTHLY, label: 'Mensuel' },
                  { value: PaymentFrequency.BI_WEEKLY, label: 'Aux 2 semaines' },
                  { value: PaymentFrequency.WEEKLY, label: 'Hebdomadaire' },
                  { value: PaymentFrequency.ANNUAL, label: 'Annuel' },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <RangeInput
                label={
                  <span>
                    Taux d'appréciation annuel (%)
                    {isFieldOverridden(['financing', 'annualAppreciationRate']) && (
                      <OverrideIndicator baseValue={getBaseValue(['financing', 'annualAppreciationRate'])} />
                    )}
                  </span>
                }
                value={inputs.financing.annualAppreciationRate}
                onChange={(value) => updateFinancing('annualAppreciationRate', value)}
                min={0}
                max={20}
                step={0.1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Paramètres de projection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Paramètres de projection multi-années</CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Utilisés dans l'onglet "Projections" pour modéliser l'évolution de l'investissement
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <RangeInput
                label={
                  <span>
                    Escalade revenus annuelle (%)
                    {isFieldOverridden(['projectionSettings', 'revenueEscalationRate']) && (
                      <OverrideIndicator baseValue={getBaseValue(['projectionSettings', 'revenueEscalationRate'])} />
                    )}
                  </span>
                }
                value={inputs.projectionSettings?.revenueEscalationRate || { value: 2.5 }}
                onChange={(value) => updateProjectionSettings('revenueEscalationRate', value)}
                min={0}
                max={10}
                step={0.1}
              />
            </div>
            <div>
              <RangeInput
                label={
                  <span>
                    Escalade dépenses annuelle (%)
                    {isFieldOverridden(['projectionSettings', 'expenseEscalationRate']) && (
                      <OverrideIndicator baseValue={getBaseValue(['projectionSettings', 'expenseEscalationRate'])} />
                    )}
                  </span>
                }
                value={inputs.projectionSettings?.expenseEscalationRate || { value: 3.0 }}
                onChange={(value) => updateProjectionSettings('expenseEscalationRate', value)}
                min={0}
                max={10}
                step={0.1}
              />
            </div>
            <div>
              <RangeInput
                label={
                  <span>
                    CAPEX annuel (% valeur)
                    {isFieldOverridden(['projectionSettings', 'capexRate']) && (
                      <OverrideIndicator baseValue={getBaseValue(['projectionSettings', 'capexRate'])} />
                    )}
                  </span>
                }
                value={inputs.projectionSettings?.capexRate || { value: 1.0 }}
                onChange={(value) => updateProjectionSettings('capexRate', value)}
                min={0}
                max={5}
                step={0.1}
              />
            </div>
            <div>
              <RangeInput
                label={
                  <span>
                    Taux d'actualisation (%)
                    {isFieldOverridden(['projectionSettings', 'discountRate']) && (
                      <OverrideIndicator baseValue={getBaseValue(['projectionSettings', 'discountRate'])} />
                    )}
                  </span>
                }
                value={inputs.projectionSettings?.discountRate || { value: 5.0 }}
                onChange={(value) => updateProjectionSettings('discountRate', value)}
                min={0}
                max={15}
                step={0.1}
              />
            </div>
            <div>
              <RangeInput
                label={
                  <span>
                    Frais de vente (%)
                    {isFieldOverridden(['projectionSettings', 'saleCostsRate']) && (
                      <OverrideIndicator baseValue={getBaseValue(['projectionSettings', 'saleCostsRate'])} />
                    )}
                  </span>
                }
                value={inputs.projectionSettings?.saleCostsRate || { value: 6.0 }}
                onChange={(value) => updateProjectionSettings('saleCostsRate', value)}
                min={0}
                max={15}
                step={0.5}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Frais d'acquisition */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Frais d'acquisition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Droits de mutation ($)
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={kpis.transferDuties.toLocaleString('fr-CA', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-700 cursor-not-allowed"
                  title="Valeur calculée automatiquement"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Calculé selon le barème progressif QC
              </p>
            </div>
            <div>
              <RangeInput
                label={
                  <span>
                    Frais de notaire ($)
                    {isFieldOverridden(['acquisitionFees', 'notaryFees']) && (
                      <OverrideIndicator baseValue={getBaseValue(['acquisitionFees', 'notaryFees'])} />
                    )}
                  </span>
                }
                value={inputs.acquisitionFees.notaryFees}
                onChange={(value) => updateAcquisitionFees('notaryFees', value)}
                min={0}
                step={100}
              />
            </div>
            <div>
              <RangeInput
                label={
                  <span>
                    Autres frais ($)
                    {isFieldOverridden(['acquisitionFees', 'other']) && (
                      <OverrideIndicator baseValue={getBaseValue(['acquisitionFees', 'other'])} />
                    )}
                  </span>
                }
                value={inputs.acquisitionFees.other}
                onChange={(value) => updateAcquisitionFees('other', value)}
                min={0}
                step={100}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal d'information sur l'évaluation municipale */}
      {showMunicipalAssessmentInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-medium">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Évaluation municipale</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowMunicipalAssessmentInfo(false)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 text-slate-800">À quoi sert l'évaluation municipale ?</h4>
                <p className="text-sm text-slate-700">
                  L'évaluation municipale est utilisée pour calculer les <strong>droits de mutation</strong> (taxe de bienvenue) 
                  lors de l'achat d'une propriété au Québec.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2 text-slate-800">Comment est-elle utilisée ?</h4>
                <p className="text-sm text-slate-700 mb-2">
                  Les droits de mutation sont calculés sur la <strong>valeur la plus élevée</strong> entre :
                </p>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1 ml-2">
                  <li>Le prix d'achat de la propriété</li>
                  <li>L'évaluation municipale</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2 text-slate-800">Barème des droits de mutation (Québec)</h4>
                <div className="bg-slate-50 p-3 rounded-xl text-sm space-y-1 border border-slate-300">
                  <div>• 0,5% sur la tranche jusqu'à 52 800 $</div>
                  <div>• 1,0% sur la tranche de 52 800 $ à 264 000 $</div>
                  <div>• 1,5% sur la tranche au-delà de 264 000 $</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 text-slate-800">Exemple de calcul</h4>
                <div className="bg-sky-50 p-3 rounded-xl text-sm space-y-2 border border-sky-100">
                  <div>
                    <strong>Prix d'achat :</strong> 340 000 $<br />
                    <strong>Évaluation municipale :</strong> 600 000 $
                  </div>
                  <div>
                    <strong>Base de calcul :</strong> max(340 000 $, 600 000 $) = <span className="font-bold text-sky-700">600 000 $</span>
                  </div>
                  <div>
                    <strong>Droits de mutation :</strong><br />
                    52 800 $ × 0,5% = 264 $<br />
                    (264 000 $ - 52 800 $) × 1,0% = 2 112 $<br />
                    (600 000 $ - 264 000 $) × 1,5% = 5 040 $<br />
                    <strong className="text-sky-700">Total : 7 416 $</strong>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 text-slate-800">Que faire si je ne connais pas l'évaluation municipale ?</h4>
                <p className="text-sm text-slate-700">
                  Vous pouvez laisser ce champ vide. Dans ce cas, le calculateur utilisera automatiquement 
                  le <strong>prix d'achat</strong> comme base de calcul pour les droits de mutation.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

