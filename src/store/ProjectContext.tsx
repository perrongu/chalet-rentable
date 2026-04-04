import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  useState,
  useMemo,
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
import { ExpenseCategory } from "../types";
import { calculateKPIs } from "../lib/calculations";
import { debounce, deepMerge, deepClone } from "../lib/utils";
import type { DebouncedFunction } from "../lib/utils";
import { validateProject } from "../lib/validation";
import {
  DEFAULT_ANNUAL_APPRECIATION_RATE,
  DATA_VERSION,
  LIMITS,
} from "../lib/constants";
import { createDefaultProject } from "./defaultProject";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

// ============================================================================
// INITIAL STATE
// ============================================================================

const STORAGE_KEY = "chalet-rentable-project";

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

      // Si la validation échoue, les données sont potentiellement corrompues — reset
      if (!validationResult.success) {
        return createDefaultProject();
      }

      // Zod-validated data, cast pour compatibilité avec les fonctions de migration legacy
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const source = validationResult.data as any;

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
  saveStatus: SaveStatus;
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

  // Ref stable vers le project courant (pour beforeunload qui ne doit pas dépendre du state)
  const projectRef = useRef(project);
  projectRef.current = project;

  // État de sauvegarde pour feedback visuel
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fonction de sauvegarde vers localStorage avec gestion d'état
  const saveToStorage = useCallback(
    (projectToSave: Project) => {
      setSaveStatus("saving");
      try {
        const serialized = JSON.stringify(projectToSave);
        localStorage.setItem(STORAGE_KEY, serialized);
        setSaveError(null);
        setSaveStatus("saved");

        // Revenir à 'idle' après 3 secondes
        if (saveStatusTimerRef.current !== null) {
          clearTimeout(saveStatusTimerRef.current);
        }
        saveStatusTimerRef.current = setTimeout(() => {
          setSaveStatus("idle");
        }, 3000);
      } catch (error) {
        setSaveStatus("error");
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
    },
    [], // setSaveStatus et setSaveError sont des setters React stables
  );

  // Ref stable vers saveToStorage pour le debounce
  const saveToStorageRef = useRef(saveToStorage);
  saveToStorageRef.current = saveToStorage;

  // Debounce créé une seule fois via useMemo — appelle toujours saveToStorageRef.current
  const debouncedSave = useMemo<DebouncedFunction<[Project]>>(
    () =>
      debounce((p: Project) => {
        saveToStorageRef.current(p);
      }, LIMITS.AUTOSAVE_DELAY_MS),
    [], // Stable: ne dépend que de saveToStorageRef (ref) et LIMITS (constante)
  );

  useEffect(() => {
    debouncedSave(project);
  }, [project, debouncedSave]);

  // Annuler le debounce à la destruction du composant
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // beforeunload + pagehide : flush le debounce pour sauvegarder immédiatement
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Flush pour sauvegarder les changements en attente vers localStorage
      debouncedSave.flush();

      // Avertir seulement s'il reste des changements non enregistrés dans un fichier
      // (lastSavedStateRef est mis à jour par MARK_AS_SAVED lors d'un save explicite)
      const currentState = JSON.stringify(projectRef.current);
      if (currentState !== lastSavedStateRef.current) {
        e.preventDefault();
      }
    };

    const handlePageHide = () => {
      debouncedSave.flush();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [debouncedSave]);

  // Nettoyage du timer de saveStatus à la destruction
  useEffect(() => {
    return () => {
      if (saveStatusTimerRef.current !== null) {
        clearTimeout(saveStatusTimerRef.current);
      }
    };
  }, []);

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
      return deepClone(project.baseInputs);
    }

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
        saveStatus,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

// eslint-disable-next-line react-refresh/only-export-components
export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return context;
}
