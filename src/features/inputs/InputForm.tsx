import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { RangeInput } from '../../components/ui/RangeInput';
import { Select } from '../../components/ui/Select';
import { useProject } from '../../store/ProjectContext';
import type { ExpenseLine, InputWithSource } from '../../types';
import { ExpenseType, ExpenseCategory, PaymentFrequency } from '../../types';
import { useMemo } from 'react';
import { generateUUID } from '../../lib/utils';

export function InputForm() {
  const { dispatch, getCurrentInputs, getCurrentKPIs } = useProject();
  const inputs = getCurrentInputs();
  const kpis = getCurrentKPIs();

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
    dispatch({
      type: 'UPDATE_BASE_INPUTS',
      payload: {
        revenue: {
          ...inputs.revenue,
          [field]: value,
        },
      } as any,
    });
  };

  const updateFinancing = (field: string, value: InputWithSource<number> | number | PaymentFrequency) => {
    dispatch({
      type: 'UPDATE_BASE_INPUTS',
      payload: {
        financing: {
          ...inputs.financing,
          [field]: value,
        },
      } as any,
    });
  };

  const updateAcquisitionFees = (field: string, value: InputWithSource<number>) => {
    dispatch({
      type: 'UPDATE_BASE_INPUTS',
      payload: {
        acquisitionFees: {
          ...inputs.acquisitionFees,
          [field]: value,
        },
      },
    });
  };

  const addExpenseLine = (category?: ExpenseCategory) => {
    const newLine: ExpenseLine = {
      id: generateUUID(),
      name: 'Nouvelle dépense',
      type: ExpenseType.FIXED_ANNUAL,
      amount: { value: 0 },
      category: category || ExpenseCategory.AUTRE,
    };

    dispatch({
      type: 'UPDATE_BASE_INPUTS',
      payload: {
        expenses: [...inputs.expenses, newLine],
      },
    });
  };

  const updateExpenseLine = (id: string, updates: Partial<ExpenseLine>) => {
    dispatch({
      type: 'UPDATE_BASE_INPUTS',
      payload: {
        expenses: inputs.expenses.map((line) =>
          line.id === id ? { ...line, ...updates } : line
        ),
      },
    });
  };

  const deleteExpenseLine = (id: string) => {
    dispatch({
      type: 'UPDATE_BASE_INPUTS',
      payload: {
        expenses: inputs.expenses.filter((line) => line.id !== id),
      },
    });
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
            <RangeInput
              label="Tarif moyen par nuitée ($)"
              value={inputs.revenue.averageDailyRate}
              onChange={(value) => updateRevenue('averageDailyRate', value)}
              min={0}
              step={10}
            />
            <RangeInput
              label="Taux d'occupation (%)"
              value={inputs.revenue.occupancyRate}
              onChange={(value) => updateRevenue('occupancyRate', value)}
              min={0}
              max={100}
              step={1}
            />
          </div>
          <div className="text-sm text-gray-600 pt-1 border-t">
            Revenu annuel estimé:{' '}
            <span className="font-semibold text-gray-900">
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
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-1">
                {expenses.map((line) => (
                  <div
                    key={line.id}
                    className="py-2 px-2 hover:bg-gray-50 rounded group space-y-2"
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
                          onClick={() => deleteExpenseLine(line.id)}
                          className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Supprimer"
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
                        step={line.type === ExpenseType.PERCENTAGE_REVENUE ? 0.1 : 10}
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => addExpenseLine(category as ExpenseCategory)}
                className="text-sm text-blue-600 hover:text-blue-700 pl-2 py-1"
              >
                + Ajouter une dépense
              </button>
            </div>
          ))}
          {inputs.expenses.length === 0 && (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-2">Aucune dépense configurée</p>
              <button
                onClick={() => addExpenseLine(ExpenseCategory.AUTRE)}
                className="text-sm text-blue-600 hover:text-blue-700"
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
            <RangeInput
              label="Prix d'achat ($)"
              value={inputs.financing.purchasePrice}
              onChange={(value) => updateFinancing('purchasePrice', value)}
              min={0}
              step={1000}
            />
            <RangeInput
              label="Mise de fonds ($)"
              value={inputs.financing.downPayment}
              onChange={(value) => updateFinancing('downPayment', value)}
              min={0}
              step={1000}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <RangeInput
              label="Taux d'intérêt (%)"
              value={inputs.financing.interestRate}
              onChange={(value) => updateFinancing('interestRate', value)}
              min={0}
              max={20}
              step={0.1}
            />
            <RangeInput
              label="Amortissement (années)"
              value={inputs.financing.amortizationYears}
              onChange={(value) => updateFinancing('amortizationYears', value)}
              min={1}
              max={50}
              step={1}
            />
            <Select
              label="Fréquence de paiement"
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
        </CardContent>
      </Card>

      {/* Section Frais d'acquisition */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Frais d'acquisition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <RangeInput
              label="Droits de mutation ($)"
              value={inputs.acquisitionFees.transferDuties}
              onChange={(value) => updateAcquisitionFees('transferDuties', value)}
              min={0}
              step={100}
            />
            <RangeInput
              label="Frais de notaire ($)"
              value={inputs.acquisitionFees.notaryFees}
              onChange={(value) => updateAcquisitionFees('notaryFees', value)}
              min={0}
              step={100}
            />
            <RangeInput
              label="Autres frais ($)"
              value={inputs.acquisitionFees.other}
              onChange={(value) => updateAcquisitionFees('other', value)}
              min={0}
              step={100}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

