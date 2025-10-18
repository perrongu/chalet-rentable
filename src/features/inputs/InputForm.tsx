import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useProject } from '../../store/ProjectContext';
import type { ExpenseLine } from '../../types';
import { ExpenseType, PaymentFrequency } from '../../types';

export function InputForm() {
  const { dispatch, getCurrentInputs } = useProject();
  const inputs = getCurrentInputs();

  const updateRevenue = (field: string, value: number) => {
    const currentField = inputs.revenue[field as keyof typeof inputs.revenue];
    dispatch({
      type: 'UPDATE_BASE_INPUTS',
      payload: {
        revenue: {
          ...inputs.revenue,
          [field]: typeof currentField === 'object' ? { ...currentField, value } : value,
        },
      } as any,
    });
  };

  const updateFinancing = (field: string, value: number | PaymentFrequency) => {
    const currentField = inputs.financing[field as keyof typeof inputs.financing];
    dispatch({
      type: 'UPDATE_BASE_INPUTS',
      payload: {
        financing: {
          ...inputs.financing,
          [field]:
            field === 'paymentFrequency'
              ? value
              : typeof currentField === 'object' ? { ...currentField, value } : value,
        },
      } as any,
    });
  };

  const updateAcquisitionFees = (field: string, value: number) => {
    dispatch({
      type: 'UPDATE_BASE_INPUTS',
      payload: {
        acquisitionFees: {
          ...inputs.acquisitionFees,
          [field]: {
            ...inputs.acquisitionFees[field as keyof typeof inputs.acquisitionFees],
            value,
          },
        },
      },
    });
  };

  const addExpenseLine = () => {
    const newLine: ExpenseLine = {
      id: crypto.randomUUID(),
      name: 'Nouvelle dépense',
      type: ExpenseType.FIXED_ANNUAL,
      amount: { value: 0 },
      category: 'Autre',
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
    <div className="space-y-6">
      {/* Section Revenus */}
      <Card>
        <CardHeader>
          <CardTitle>Revenus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Tarif moyen par nuitée ($)"
              value={inputs.revenue.averageDailyRate.value}
              onChange={(e) => updateRevenue('averageDailyRate', Number(e.target.value))}
              min={0}
              step={10}
            />
            <Input
              type="number"
              label="Taux d'occupation (%)"
              value={inputs.revenue.occupancyRate.value}
              onChange={(e) => updateRevenue('occupancyRate', Number(e.target.value))}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section Dépenses */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Dépenses</CardTitle>
            <Button onClick={addExpenseLine} size="sm">
              + Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inputs.expenses.map((line) => (
              <div key={line.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <Input
                    label="Nom"
                    value={line.name}
                    onChange={(e) => updateExpenseLine(line.id, { name: e.target.value })}
                  />
                  <Select
                    label="Type"
                    value={line.type}
                    onChange={(e) =>
                      updateExpenseLine(line.id, { type: e.target.value as ExpenseType })
                    }
                    options={[
                      { value: ExpenseType.FIXED_ANNUAL, label: 'Annuel fixe' },
                      { value: ExpenseType.FIXED_MONTHLY, label: 'Mensuel fixe' },
                      { value: ExpenseType.PERCENTAGE_REVENUE, label: '% des revenus' },
                    ]}
                  />
                  <Input
                    type="number"
                    label={
                      line.type === ExpenseType.PERCENTAGE_REVENUE
                        ? 'Pourcentage (%)'
                        : 'Montant ($)'
                    }
                    value={line.amount.value}
                    onChange={(e) =>
                      updateExpenseLine(line.id, {
                        amount: { ...line.amount, value: Number(e.target.value) },
                      })
                    }
                    min={0}
                    step={line.type === ExpenseType.PERCENTAGE_REVENUE ? 0.1 : 10}
                  />
                  <Input
                    label="Catégorie"
                    value={line.category || ''}
                    onChange={(e) => updateExpenseLine(line.id, { category: e.target.value })}
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteExpenseLine(line.id)}
                >
                  Supprimer
                </Button>
              </div>
            ))}
            {inputs.expenses.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                Aucune dépense. Cliquez sur "+ Ajouter" pour en créer une.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section Financement */}
      <Card>
        <CardHeader>
          <CardTitle>Financement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Prix d'achat ($)"
              value={inputs.financing.purchasePrice.value}
              onChange={(e) => updateFinancing('purchasePrice', Number(e.target.value))}
              min={0}
              step={1000}
            />
            <Input
              type="number"
              label="Mise de fonds ($)"
              value={inputs.financing.downPayment.value}
              onChange={(e) => updateFinancing('downPayment', Number(e.target.value))}
              min={0}
              step={1000}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="number"
              label="Taux d'intérêt (%)"
              value={inputs.financing.interestRate.value}
              onChange={(e) => updateFinancing('interestRate', Number(e.target.value))}
              min={0}
              max={20}
              step={0.1}
            />
            <Input
              type="number"
              label="Amortissement (années)"
              value={inputs.financing.amortizationYears.value}
              onChange={(e) => updateFinancing('amortizationYears', Number(e.target.value))}
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
        <CardHeader>
          <CardTitle>Frais d'acquisition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="number"
              label="Droits de mutation ($)"
              value={inputs.acquisitionFees.transferDuties.value}
              onChange={(e) => updateAcquisitionFees('transferDuties', Number(e.target.value))}
              min={0}
              step={100}
            />
            <Input
              type="number"
              label="Frais de notaire ($)"
              value={inputs.acquisitionFees.notaryFees.value}
              onChange={(e) => updateAcquisitionFees('notaryFees', Number(e.target.value))}
              min={0}
              step={100}
            />
            <Input
              type="number"
              label="Autres frais ($)"
              value={inputs.acquisitionFees.other.value}
              onChange={(e) => updateAcquisitionFees('other', Number(e.target.value))}
              min={0}
              step={100}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

