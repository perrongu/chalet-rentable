import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { ReactNode } from "react";
import type {
  Project,
  Scenario,
  ProjectInputs,
  InputWithSource,
  SensitivityAnalysis1D,
  SensitivityAnalysis2D,
} from "../types";
import { ExpenseType, ExpenseCategory, PaymentFrequency } from "../types";
import { calculateKPIs } from "../lib/calculations";
import { generateUUID, debounce, deepMerge, deepClone } from "../lib/utils";
import { validateProject } from "../lib/validation";
import {
  DEFAULT_ANNUAL_RENOVATION_RATE,
  DEFAULT_ANNUAL_APPRECIATION_RATE,
  DATA_VERSION,
  LIMITS,
} from "../lib/constants";

// ============================================================================
// INITIAL STATE
// ============================================================================

const STORAGE_KEY = "chalet-rentable-project";

export function createDefaultProject(): Project {
  const now = new Date();
  const baseInputs: ProjectInputs = {
    name: "Mon Projet",
    revenue: {
      averageDailyRate: {
        value: 280,
        sourceInfo: { source: "", remarks: "" },
      },
      occupancyRate: {
        value: 75,
        sourceInfo: { source: "", remarks: "" },
      },
      daysPerYear: 365,
    },
    expenses: [
      {
        id: "1",
        name: "Attestation CITQ",
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 875 },
        category: ExpenseCategory.SERVICES,
      },
      {
        id: "2",
        name: "Compagnie de gestion",
        type: ExpenseType.PERCENTAGE_REVENUE,
        amount: {
          value: 15,
        },
        category: ExpenseCategory.GESTION,
      },
      {
        id: "3",
        name: "Déneigement et pelouse",
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 800 },
        category: ExpenseCategory.ENTRETIEN,
      },
      {
        id: "4",
        name: "Câble / Internet / Netflix",
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 1200 },
        category: ExpenseCategory.UTILITIES,
      },
      {
        id: "5",
        name: "Taxes municipales",
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 1500 },
        category: ExpenseCategory.TAXES,
      },
      {
        id: "6",
        name: "Taxes scolaires",
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 180 },
        category: ExpenseCategory.TAXES,
      },
      {
        id: "7",
        name: "Frais énergie",
        type: ExpenseType.FIXED_MONTHLY,
        amount: {
          value: 250,
        },
        category: ExpenseCategory.UTILITIES,
      },
      {
        id: "8",
        name: "Assurances habitation",
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 3000 },
        category: ExpenseCategory.ASSURANCES,
      },
      {
        id: "9",
        name: "Rénovations annuelles",
        type: ExpenseType.PERCENTAGE_PROPERTY_VALUE,
        amount: {
          value: DEFAULT_ANNUAL_RENOVATION_RATE,
          sourceInfo: {
            source: "",
            remarks: "Entretien courant et préventif pour tenue impeccable",
          },
        },
        category: ExpenseCategory.ENTRETIEN,
      },
    ],
    financing: {
      purchasePrice: {
        value: 550000,
      },
      municipalAssessment: undefined, // Optionnel, utilise prix d'achat si non défini
      downPayment: { value: 27500 },
      interestRate: {
        value: 5.5,
      },
      amortizationYears: { value: 30 },
      paymentFrequency: PaymentFrequency.MONTHLY,
      annualAppreciationRate: {
        value: DEFAULT_ANNUAL_APPRECIATION_RATE,
        sourceInfo: { source: "", remarks: "" },
      },
    },
    acquisitionFees: {
      transferDuties: { value: 6666 },
      notaryFees: { value: 1500 },
      other: { value: 0 },
    },
    projectionSettings: {
      revenueEscalationRate: {
        value: 2.5,
        sourceInfo: { source: "", remarks: "Inflation typique" },
      },
      expenseEscalationRate: {
        value: 3.0,
        sourceInfo: { source: "", remarks: "Inflation + coûts croissants" },
      },
      capexRate: {
        value: 1.0,
        sourceInfo: {
          source: "",
          remarks: "Réserve pour rénovations majeures",
        },
      },
      discountRate: {
        value: 8.0,
        sourceInfo: { source: "", remarks: "Coût d'opportunité du capital" },
      },
      saleCostsRate: {
        value: 6.0,
        sourceInfo: { source: "", remarks: "Courtage + frais notaire" },
      },
    },
  };

  const baseScenario: Scenario = {
    id: "base",
    name: "Scénario de base",
    description: "Scénario avec les valeurs initiales",
    isBase: true,
    createdAt: now,
    updatedAt: now,
  };

  return {
    id: generateUUID(),
    name: "Nouveau Projet",
    description: "",
    baseInputs,
    scenarios: [baseScenario],
    activeScenarioId: "base",
    sensitivityAnalyses1D: [],
    sensitivityAnalyses2D: [],
    createdAt: now,
    updatedAt: now,
    version: DATA_VERSION,
  };
}

function migrateInputWithSource(input: unknown): InputWithSource<number> {
  if (typeof input === "number") {
    return { value: input };
  }
  if (typeof input === "object" && input !== null && "value" in input) {
    return input as InputWithSource<number>;
  }
  return { value: 0 };
}

function migrateExpenseCategory(category?: string): ExpenseCategory {
  if (!category) return ExpenseCategory.AUTRE;

  const mapping: Record<string, ExpenseCategory> = {
    Exploitation: ExpenseCategory.SERVICES,
    Détention: ExpenseCategory.AUTRE,
    Entretien: ExpenseCategory.ENTRETIEN,
    Services: ExpenseCategory.SERVICES,
    Assurances: ExpenseCategory.ASSURANCES,
    Taxes: ExpenseCategory.TAXES,
    Utilités: ExpenseCategory.UTILITIES,
    Gestion: ExpenseCategory.GESTION,
  };

  return mapping[category] || ExpenseCategory.AUTRE;
}

function migrateFinancing(f: Record<string, unknown>): Record<string, unknown> {
  return {
    ...f,
    purchasePrice: migrateInputWithSource(f.purchasePrice),
    downPayment: migrateInputWithSource(f.downPayment),
    interestRate: migrateInputWithSource(f.interestRate),
    amortizationYears: migrateInputWithSource(f.amortizationYears),
    annualAppreciationRate: f.annualAppreciationRate
      ? migrateInputWithSource(f.annualAppreciationRate)
      : {
          value: DEFAULT_ANNUAL_APPRECIATION_RATE,
          range: {
            min: 0,
            max: 10,
            default: DEFAULT_ANNUAL_APPRECIATION_RATE,
            useRange: true,
          },
          sourceInfo: { source: "", remarks: "" },
        },
    municipalAssessment:
      f.municipalAssessment !== undefined && f.municipalAssessment !== null
        ? migrateInputWithSource(f.municipalAssessment)
        : undefined,
  };
}

function migrateAcquisitionFees(
  a: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...a,
    transferDuties: migrateInputWithSource(a.transferDuties),
    notaryFees: migrateInputWithSource(a.notaryFees),
    other: migrateInputWithSource(a.other),
  };
}

function loadProjectFromStorage(): Project {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);

      // Validation du schéma avec Zod
      const validationResult = validateProject(parsed);

      // Si la validation échoue et qu'il n'y a pas de baseInputs, les données sont irrécupérables
      if (!validationResult.success && (!parsed || !parsed.baseInputs)) {
        return createDefaultProject();
      }

      const source = validationResult.success ? validationResult.data : parsed;

      // Migration immuable des données
      const migratedRevenue = source.baseInputs?.revenue
        ? {
            ...source.baseInputs.revenue,
            averageDailyRate: migrateInputWithSource(
              source.baseInputs.revenue.averageDailyRate,
            ),
            occupancyRate: migrateInputWithSource(
              source.baseInputs.revenue.occupancyRate,
            ),
          }
        : source.baseInputs?.revenue;

      const migratedExpenses = source.baseInputs?.expenses
        ? source.baseInputs.expenses.map(
            (expense: Record<string, unknown>) => ({
              ...expense,
              amount: migrateInputWithSource(expense.amount),
              category: migrateExpenseCategory(
                typeof expense.category === "string"
                  ? expense.category
                  : undefined,
              ),
            }),
          )
        : [];

      const migratedFinancing = source.baseInputs?.financing
        ? migrateFinancing(source.baseInputs.financing)
        : source.baseInputs?.financing;

      const migratedAcquisitionFees = source.baseInputs?.acquisitionFees
        ? migrateAcquisitionFees(source.baseInputs.acquisitionFees)
        : source.baseInputs?.acquisitionFees;

      const migratedBaseInputs = {
        ...source.baseInputs,
        revenue: migratedRevenue,
        expenses: migratedExpenses,
        financing: migratedFinancing,
        acquisitionFees: migratedAcquisitionFees,
      };

      // Assainissement immuable des scénarios
      const rawScenarios = source.scenarios || [];
      const hasBaseId = rawScenarios.some((s: Scenario) => s.id === "base");
      const oldFirstId = rawScenarios.length > 0 ? rawScenarios[0].id : null;

      const migratedScenarios = rawScenarios.map((s: Scenario, i: number) => ({
        ...s,
        id: i === 0 && !hasBaseId ? "base" : s.id,
        isBase: (i === 0 && !hasBaseId) || s.id === "base",
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      }));

      const activeScenarioId = migratedScenarios.some(
        (s: Scenario) => s.id === source.activeScenarioId,
      )
        ? source.activeScenarioId
        : !hasBaseId && source.activeScenarioId === oldFirstId
          ? "base"
          : "base";

      return {
        ...source,
        baseInputs: migratedBaseInputs,
        scenarios: migratedScenarios,
        activeScenarioId,
        createdAt: new Date(source.createdAt),
        updatedAt: new Date(source.updatedAt),
        version: source.version || DATA_VERSION,
      };
    }
  } catch {
    // Données corrompues ou invalides — reset silencieux
  }
  return createDefaultProject();
}

// ============================================================================
// ACTIONS
// ============================================================================

type ProjectAction =
  | { type: "LOAD_PROJECT"; payload: Project }
  | {
      type: "UPDATE_PROJECT_INFO";
      payload: { name?: string; description?: string };
    }
  | { type: "UPDATE_BASE_INPUTS"; payload: Partial<ProjectInputs> }
  | { type: "SET_ACTIVE_SCENARIO"; payload: string }
  | { type: "ADD_SCENARIO"; payload: Scenario }
  | {
      type: "UPDATE_SCENARIO";
      payload: { id: string; updates: Partial<Scenario> };
    }
  | { type: "DELETE_SCENARIO"; payload: string }
  | { type: "ADD_SENSITIVITY_1D"; payload: SensitivityAnalysis1D }
  | {
      type: "UPDATE_SENSITIVITY_1D";
      payload: { id: string; updates: Partial<SensitivityAnalysis1D> };
    }
  | { type: "DELETE_SENSITIVITY_1D"; payload: string }
  | { type: "ADD_SENSITIVITY_2D"; payload: SensitivityAnalysis2D }
  | { type: "DELETE_SENSITIVITY_2D"; payload: string }
  | { type: "RESET_PROJECT" }
  | { type: "MARK_AS_SAVED" };

// ============================================================================
// REDUCER
// ============================================================================

function projectReducer(state: Project, action: ProjectAction): Project {
  const now = new Date();

  switch (action.type) {
    case "LOAD_PROJECT":
      return action.payload;

    case "UPDATE_PROJECT_INFO":
      return {
        ...state,
        ...action.payload,
        updatedAt: now,
      };

    case "UPDATE_BASE_INPUTS":
      return {
        ...state,
        baseInputs: {
          ...state.baseInputs,
          ...action.payload,
        },
        updatedAt: now,
      };

    case "SET_ACTIVE_SCENARIO":
      return {
        ...state,
        activeScenarioId: action.payload,
        updatedAt: now,
      };

    case "ADD_SCENARIO":
      return {
        ...state,
        scenarios: [...state.scenarios, action.payload],
        updatedAt: now,
      };

    case "UPDATE_SCENARIO":
      return {
        ...state,
        scenarios: state.scenarios.map((s) =>
          s.id === action.payload.id
            ? { ...s, ...action.payload.updates, updatedAt: now }
            : s,
        ),
        updatedAt: now,
      };

    case "DELETE_SCENARIO":
      return {
        ...state,
        scenarios: state.scenarios.filter((s) => s.id !== action.payload),
        activeScenarioId:
          state.activeScenarioId === action.payload
            ? "base"
            : state.activeScenarioId,
        updatedAt: now,
      };

    case "ADD_SENSITIVITY_1D":
      return {
        ...state,
        sensitivityAnalyses1D: [...state.sensitivityAnalyses1D, action.payload],
        updatedAt: now,
      };

    case "UPDATE_SENSITIVITY_1D":
      return {
        ...state,
        sensitivityAnalyses1D: state.sensitivityAnalyses1D.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a,
        ),
        updatedAt: now,
      };

    case "DELETE_SENSITIVITY_1D":
      return {
        ...state,
        sensitivityAnalyses1D: state.sensitivityAnalyses1D.filter(
          (a) => a.id !== action.payload,
        ),
        updatedAt: now,
      };

    case "ADD_SENSITIVITY_2D":
      return {
        ...state,
        sensitivityAnalyses2D: [...state.sensitivityAnalyses2D, action.payload],
        updatedAt: now,
      };

    case "DELETE_SENSITIVITY_2D":
      return {
        ...state,
        sensitivityAnalyses2D: state.sensitivityAnalyses2D.filter(
          (a) => a.id !== action.payload,
        ),
        updatedAt: now,
      };

    case "RESET_PROJECT":
      return createDefaultProject();

    case "MARK_AS_SAVED":
      // Cette action ne modifie pas le state, elle est gérée dans le provider
      return state;

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface ProjectContextType {
  project: Project;
  dispatch: React.Dispatch<ProjectAction>;
  getCurrentInputs: () => ProjectInputs;
  getCurrentKPIs: () => ReturnType<typeof calculateKPIs>;
  hasUnsavedChanges: () => boolean;
  saveError: string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, dispatch] = useReducer(
    projectReducer,
    null,
    loadProjectFromStorage,
  );

  // Référence au dernier état sauvegardé (pour détecter les changements non sauvegardés)
  const lastSavedStateRef = useRef<string>(JSON.stringify(project));

  // Autosave avec debounce
  // Utiliser useRef pour persister la fonction de save
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const saveToStorageRef = useRef((projectToSave: Project) => {
    try {
      const serialized = JSON.stringify(projectToSave);
      localStorage.setItem(STORAGE_KEY, serialized);
      setSaveError(null);
    } catch (error) {
      if (error instanceof Error && error.name === "QuotaExceededError") {
        setSaveError(
          "Espace de stockage insuffisant. Veuillez exporter vos données et libérer de l'espace.",
        );
      } else if (error instanceof Error && error.name === "SecurityError") {
        setSaveError(
          "Accès au stockage local refusé. Vérifiez les paramètres de votre navigateur.",
        );
      } else {
        setSaveError("Erreur lors de la sauvegarde automatique.");
      }
    }
  });

  // Créer le debounce une seule fois
  const debouncedSave = useRef(
    debounce((project: Project) => {
      saveToStorageRef.current(project);
    }, LIMITS.AUTOSAVE_DELAY_MS),
  ).current;

  useEffect(() => {
    debouncedSave(project);
  }, [project, debouncedSave]);

  // Wrapper du dispatch pour gérer MARK_AS_SAVED
  const wrappedDispatch = useCallback(
    (action: ProjectAction) => {
      if (action.type === "MARK_AS_SAVED") {
        lastSavedStateRef.current = JSON.stringify(project);
      }
      dispatch(action);
    },
    [project],
  );

  // Fonction pour vérifier s'il y a des changements non sauvegardés
  const hasUnsavedChanges = useCallback((): boolean => {
    const currentState = JSON.stringify(project);
    return currentState !== lastSavedStateRef.current;
  }, [project]);

  // Fonction pour récupérer les inputs du scénario actif (mémorisée)
  const getCurrentInputs = useCallback((): ProjectInputs => {
    const activeScenario = project.scenarios.find(
      (s) => s.id === project.activeScenarioId,
    );

    if (!activeScenario || activeScenario.isBase) {
      // Toujours retourner un clone profond pour éviter toute mutation accidentelle cross-scenarios
      return deepClone(project.baseInputs);
    }

    // Merger les overrides avec les inputs de base (deep merge)
    return deepMerge(
      deepClone(project.baseInputs),
      activeScenario.overrides || {},
    ) as ProjectInputs;
  }, [project.scenarios, project.activeScenarioId, project.baseInputs]);

  // Fonction pour calculer les KPIs du scénario actif (mémorisée)
  const getCurrentKPIs = useCallback(() => {
    return calculateKPIs(getCurrentInputs());
  }, [getCurrentInputs]);

  return (
    <ProjectContext.Provider
      value={{
        project,
        dispatch: wrappedDispatch,
        getCurrentInputs,
        getCurrentKPIs,
        hasUnsavedChanges,
        saveError,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return context;
}
