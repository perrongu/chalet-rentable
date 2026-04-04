import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Card, CardContent } from "../../components/ui/Card";
import { useProject } from "../../store/ProjectContext";
import {
  goalSeek,
  type GoalSeekTarget,
  type GoalSeekVariable,
  type GoalSeekResult,
} from "../../lib/goalSeek";
import { formatCurrency } from "../../lib/utils";

const TARGET_OPTIONS = [
  { value: "dscr", label: "DSCR" },
  { value: "annualCashflow", label: "Cashflow annuel ($)" },
  { value: "capRate", label: "Cap Rate (%)" },
];

const VARIABLE_OPTIONS = [
  { value: "financing.purchasePrice", label: "Prix d'achat" },
  { value: "revenue.averageDailyRate", label: "Tarif moyen (ADR)" },
  { value: "revenue.occupancyRate", label: "Taux d'occupation" },
];

const DEFAULT_TARGET_VALUES: Record<GoalSeekTarget, number> = {
  dscr: 1.2,
  annualCashflow: 0,
  capRate: 6,
};

export function GoalSeek() {
  const { getCurrentInputs } = useProject();
  const [target, setTarget] = useState<GoalSeekTarget>("dscr");
  const [targetValue, setTargetValue] = useState<number>(
    DEFAULT_TARGET_VALUES.dscr,
  );
  const [solveFor, setSolveFor] = useState<GoalSeekVariable>(
    "financing.purchasePrice",
  );
  const [result, setResult] = useState<GoalSeekResult | null>(null);

  const handleTargetChange = (newTarget: GoalSeekTarget) => {
    setTarget(newTarget);
    setTargetValue(DEFAULT_TARGET_VALUES[newTarget]);
    setResult(null);
  };

  const runGoalSeek = () => {
    if (!Number.isFinite(targetValue)) {
      setResult({
        solved: false,
        value: 0,
        formula: "",
        verification: { targetKPI: target, targetValue, achievedValue: 0 },
        error: "Veuillez entrer une valeur cible numérique valide.",
      });
      return;
    }
    const inputs = getCurrentInputs();
    const gsResult = goalSeek(target, targetValue, solveFor, inputs);
    setResult(gsResult);
  };

  const formatResultValue = (value: number): string => {
    if (solveFor === "revenue.occupancyRate") {
      return `${value.toFixed(1)} %`;
    }
    return formatCurrency(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3">
          Recherche d'objectif
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-slate-700">
          Trouvez la valeur d'un paramètre pour atteindre un objectif financier
          cible. Par exemple : « Quel prix d'achat maximum pour un DSCR de 1.2 ?
          »
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Objectif cible"
          value={target}
          onChange={(e) => handleTargetChange(e.target.value as GoalSeekTarget)}
          options={TARGET_OPTIONS}
        />
        <Input
          type="number"
          label={
            target === "dscr"
              ? "Valeur cible (ratio)"
              : target === "annualCashflow"
                ? "Valeur cible ($)"
                : "Valeur cible (%)"
          }
          value={targetValue}
          onChange={(e) => setTargetValue(Number(e.target.value))}
          step={
            target === "dscr" ? 0.1 : target === "annualCashflow" ? 1000 : 0.5
          }
        />
        <Select
          label="Variable à résoudre"
          value={solveFor}
          onChange={(e) => {
            setSolveFor(e.target.value as GoalSeekVariable);
            setResult(null);
          }}
          options={VARIABLE_OPTIONS}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={runGoalSeek}>Calculer</Button>
        {result && (
          <Button variant="outline" onClick={() => setResult(null)}>
            Effacer
          </Button>
        )}
      </div>

      {result && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            {result.solved ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Résolu</Badge>
                  <span className="text-lg font-bold text-slate-900">
                    {formatResultValue(result.value)}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{result.formula}</p>
                <div className="bg-slate-50 rounded-xl p-3 text-sm border border-slate-200">
                  <span className="font-medium">Vérification :</span>{" "}
                  {result.verification.targetKPI} ={" "}
                  <span className="font-semibold">
                    {result.verification.achievedValue.toFixed(2)}
                  </span>{" "}
                  (cible : {result.verification.targetValue})
                </div>
                {result.details && result.details.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 text-sm border border-slate-200 space-y-1">
                    <span className="font-medium">Détails du calcul :</span>
                    {result.details.map((detail, i) => (
                      <div
                        key={`${detail.label}-${i}`}
                        className="flex justify-between text-slate-700"
                      >
                        <span>{detail.label}</span>
                        <span className="font-semibold">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="danger">Non résolu</Badge>
                <span className="text-sm text-slate-700">
                  {result.error ||
                    "Aucune solution trouvée dans l'intervalle de recherche."}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
