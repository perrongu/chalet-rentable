import { useState, useMemo } from "react";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { useProject } from "../../store/ProjectContext";
import { calculateKPIs, setValueByPath } from "../../lib/calculations";
import { extractValue } from "../../lib/inputMutator";
import type { KPIResults } from "../../types";

const METRIC_OPTIONS = [
  { value: "annualCashflow", label: "Cashflow annuel ($)" },
  { value: "dscr", label: "DSCR" },
  { value: "capRate", label: "Cap Rate (%)" },
  { value: "cashOnCash", label: "Cash-on-Cash (%)" },
  { value: "noi", label: "NOI ($)" },
];

const GRID_SIZE = 10;

interface MatrixCell {
  adr: number;
  occ: number;
  value: number;
}

function getColorForValue(value: number, min: number, max: number): string {
  if (max === min) return "bg-yellow-100";

  const ratio = (value - min) / (max - min);

  if (ratio <= 0.25) return "bg-red-200 text-red-900";
  if (ratio <= 0.4) return "bg-red-100 text-red-800";
  if (ratio <= 0.5) return "bg-amber-100 text-amber-800";
  if (ratio <= 0.6) return "bg-yellow-100 text-yellow-800";
  if (ratio <= 0.75) return "bg-emerald-100 text-emerald-800";
  return "bg-emerald-200 text-emerald-900";
}

function formatCellValue(value: number, metric: keyof KPIResults): string {
  if (metric === "annualCashflow" || metric === "noi") {
    return Math.round(value).toLocaleString("fr-CA");
  }
  if (metric === "dscr") {
    return value.toFixed(2);
  }
  return `${value.toFixed(1)}%`;
}

export function CrossSensitivityMatrix() {
  const { getCurrentInputs } = useProject();
  const inputs = getCurrentInputs();

  const currentADR = extractValue(inputs.revenue.averageDailyRate);
  const currentOcc = extractValue(inputs.revenue.occupancyRate);

  // Utiliser les ranges si définies, sinon +/- 30%
  const adrRange = inputs.revenue.averageDailyRate.range;
  const occRange = inputs.revenue.occupancyRate.range;
  const [validationError, setValidationError] = useState<string | null>(null);

  const [adrMin, setAdrMin] = useState(() =>
    adrRange?.useRange ? adrRange.min : Math.round(currentADR * 0.7),
  );
  const [adrMax, setAdrMax] = useState(() =>
    adrRange?.useRange ? adrRange.max : Math.round(currentADR * 1.3),
  );
  const [occMin, setOccMin] = useState(() =>
    occRange?.useRange
      ? occRange.min
      : Math.max(30, Math.round(currentOcc - 20)),
  );
  const [occMax, setOccMax] = useState(() =>
    occRange?.useRange
      ? occRange.max
      : Math.min(100, Math.round(currentOcc + 20)),
  );

  const [metric, setMetric] = useState<keyof KPIResults>("annualCashflow");
  const [results, setResults] = useState<{
    cells: MatrixCell[];
    adrValues: number[];
    occValues: number[];
    min: number;
    max: number;
  } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runAnalysis = async () => {
    setValidationError(null);

    if (
      !Number.isFinite(adrMin) ||
      !Number.isFinite(adrMax) ||
      adrMin >= adrMax ||
      !Number.isFinite(occMin) ||
      !Number.isFinite(occMax) ||
      occMin >= occMax
    ) {
      setValidationError(
        "Les valeurs minimales doivent être inférieures aux valeurs maximales.",
      );
      return;
    }
    if (adrMin <= 0) {
      setValidationError("L'ADR doit être supérieur à 0.");
      return;
    }
    if (occMin < 0 || occMax > 100) {
      setValidationError("Le taux d'occupation doit être entre 0% et 100%.");
      return;
    }

    setIsRunning(true);
    setResults(null);

    // Petite pause pour le spinner
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Toujours lire les inputs frais (éviter les closures stales)
    const freshInputs = getCurrentInputs();

    const adrValues: number[] = [];
    const occValues: number[] = [];

    for (let i = 0; i <= GRID_SIZE; i++) {
      adrValues.push(Math.round(adrMin + ((adrMax - adrMin) * i) / GRID_SIZE));
      occValues.push(
        Math.round((occMin + ((occMax - occMin) * i) / GRID_SIZE) * 10) / 10,
      );
    }

    const cells: MatrixCell[] = [];
    let min = Infinity;
    let max = -Infinity;

    for (const occ of occValues) {
      for (const adr of adrValues) {
        let modified = setValueByPath(
          freshInputs,
          "revenue.averageDailyRate",
          adr,
        );
        modified = setValueByPath(modified, "revenue.occupancyRate", occ);
        const kpis = calculateKPIs(modified);
        const value = kpis[metric] as number;

        cells.push({ adr, occ, value });
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }

    setResults({ cells, adrValues, occValues, min, max });
    setIsRunning(false);
  };

  // Trouver la cellule la plus proche du scénario actuel
  const currentCellKey = useMemo(() => {
    if (!results) return null;
    const closestADR = results.adrValues.reduce((prev, curr) =>
      Math.abs(curr - currentADR) < Math.abs(prev - currentADR) ? curr : prev,
    );
    const closestOcc = results.occValues.reduce((prev, curr) =>
      Math.abs(curr - currentOcc) < Math.abs(prev - currentOcc) ? curr : prev,
    );
    return `${closestADR}-${closestOcc}`;
  }, [results, currentADR, currentOcc]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3">
          Matrice ADR x Occupation
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-slate-700">
          Visualisez l'impact combiné du tarif moyen et du taux d'occupation sur
          vos indicateurs financiers. La cellule encadrée correspond à votre
          scénario actuel.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Select
          label="Métrique à afficher"
          value={metric}
          onChange={(e) => {
            setMetric(e.target.value as keyof KPIResults);
            setResults(null);
          }}
          options={METRIC_OPTIONS}
        />
        <Input
          type="number"
          label="ADR min ($)"
          value={adrMin}
          onChange={(e) => setAdrMin(Number(e.target.value))}
          min={0}
          step={10}
        />
        <Input
          type="number"
          label="ADR max ($)"
          value={adrMax}
          onChange={(e) => setAdrMax(Number(e.target.value))}
          min={0}
          step={10}
        />
        <Input
          type="number"
          label="Occ. min (%)"
          value={occMin}
          onChange={(e) => setOccMin(Number(e.target.value))}
          min={0}
          max={100}
          step={5}
        />
        <Input
          type="number"
          label="Occ. max (%)"
          value={occMax}
          onChange={(e) => setOccMax(Number(e.target.value))}
          min={0}
          max={100}
          step={5}
        />
      </div>

      {validationError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {validationError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={runAnalysis}
          disabled={isRunning}
          className="flex items-center justify-center space-x-2"
        >
          {isRunning && <Spinner size="sm" />}
          <span>{isRunning ? "Calcul en cours..." : "Générer la matrice"}</span>
        </Button>
        {results && (
          <Button
            variant="outline"
            onClick={() => setResults(null)}
            disabled={isRunning}
          >
            Effacer
          </Button>
        )}
      </div>

      {results && (
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-2 bg-slate-100 border border-slate-300 text-left">
                  Occ \ ADR
                </th>
                {results.adrValues.map((adr) => (
                  <th
                    key={adr}
                    className="p-2 bg-slate-100 border border-slate-300 text-center min-w-[70px]"
                  >
                    {adr} $
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.occValues
                .slice()
                .reverse()
                .map((occ) => (
                  <tr key={occ}>
                    <td className="p-2 bg-slate-100 border border-slate-300 font-medium whitespace-nowrap">
                      {occ.toFixed(0)} %
                    </td>
                    {results.adrValues.map((adr) => {
                      const cell = results.cells.find(
                        (c) => c.adr === adr && c.occ === occ,
                      );
                      const value = cell?.value ?? 0;
                      const cellKey = `${adr}-${occ}`;
                      const isCurrentCell = cellKey === currentCellKey;
                      const colorClass = getColorForValue(
                        value,
                        results.min,
                        results.max,
                      );

                      return (
                        <td
                          key={adr}
                          className={`p-2 border text-center font-mono ${colorClass} ${
                            isCurrentCell
                              ? "ring-2 ring-sky-500 ring-inset font-bold"
                              : "border-slate-200"
                          }`}
                          title={`ADR: ${adr}$, Occ: ${occ}%`}
                        >
                          {formatCellValue(value, metric)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-200 border border-slate-300 rounded" />
              <span>Faible</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-amber-100 border border-slate-300 rounded" />
              <span>Moyen</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-emerald-200 border border-slate-300 rounded" />
              <span>Élevé</span>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <div className="w-4 h-4 border-2 border-sky-500 rounded" />
              <span>
                Scénario actuel ({currentADR}$ / {currentOcc}%)
              </span>
            </div>
            {(metric === "annualCashflow" || metric === "noi") && (
              <span className="ml-auto text-slate-500">
                Valeurs en $ (arrondies)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
