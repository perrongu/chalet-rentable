import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
  Project,
  Scenario,
  ProjectInputs,
  SensitivityAnalysis1D,
  SensitivityAnalysis2D,
  OptimizationConfig,
  OptimizationResult,
} from '../types';
import { ExpenseType, PaymentFrequency } from '../types';
import { calculateKPIs } from '../lib/calculations';

// ============================================================================
// INITIAL STATE
// ============================================================================

const STORAGE_KEY = 'chalet-rentable-project';
const AUTOSAVE_DELAY = 2000; // 2 secondes

function createDefaultProject(): Project {
  const now = new Date();
  const baseInputs: ProjectInputs = {
    name: 'Mon Projet',
    revenue: {
      averageDailyRate: { value: 215, sourceInfo: { source: '', remarks: '' } },
      occupancyRate: { value: 75, sourceInfo: { source: '', remarks: '' } },
      daysPerYear: 365,
    },
    expenses: [
      // Dépenses d'exploitation
      {
        id: '1',
        name: 'Attestation CITQ',
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 875 },
        category: 'Exploitation',
      },
      {
        id: '2',
        name: 'Compagnie de gestion',
        type: ExpenseType.PERCENTAGE_REVENUE,
        amount: { value: 15 },
        category: 'Exploitation',
      },
      {
        id: '3',
        name: 'Déneigement et pelouse',
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 800 },
        category: 'Exploitation',
      },
      {
        id: '4',
        name: 'Câble / Internet / Netflix',
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 1200 },
        category: 'Exploitation',
      },
      // Dépenses de détention
      {
        id: '5',
        name: 'Taxes municipales',
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 3000 },
        category: 'Détention',
      },
      {
        id: '6',
        name: 'Taxes scolaires',
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 180 },
        category: 'Détention',
      },
      {
        id: '7',
        name: 'Frais énergie',
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 2400 },
        category: 'Détention',
      },
      {
        id: '8',
        name: 'Assurances habitation',
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 3000 },
        category: 'Détention',
      },
    ],
    financing: {
      purchasePrice: { value: 550000 },
      downPayment: { value: 27500 },
      interestRate: { value: 5.5 },
      amortizationYears: { value: 30 },
      paymentFrequency: PaymentFrequency.MONTHLY,
    },
    acquisitionFees: {
      transferDuties: { value: 6666 },
      notaryFees: { value: 1500 },
      other: { value: 0 },
    },
  };

  const baseScenario: Scenario = {
    id: 'base',
    name: 'Scénario de base',
    description: 'Scénario avec les valeurs initiales',
    isBase: true,
    createdAt: now,
    updatedAt: now,
  };

  return {
    id: crypto.randomUUID(),
    name: 'Nouveau Projet',
    description: '',
    baseInputs,
    scenarios: [baseScenario],
    activeScenarioId: 'base',
    sensitivityAnalyses1D: [],
    sensitivityAnalyses2D: [],
    optimizations: {
      configs: [],
      results: {},
    },
    createdAt: now,
    updatedAt: now,
    version: '1.0.0',
  };
}

function loadProjectFromStorage(): Project {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const project = JSON.parse(stored);
      // Convertir les dates
      project.createdAt = new Date(project.createdAt);
      project.updatedAt = new Date(project.updatedAt);
      project.scenarios.forEach((s: Scenario) => {
        s.createdAt = new Date(s.createdAt);
        s.updatedAt = new Date(s.updatedAt);
      });
      return project;
    }
  } catch (error) {
    console.error('Error loading project from storage:', error);
  }
  return createDefaultProject();
}

// ============================================================================
// ACTIONS
// ============================================================================

type ProjectAction =
  | { type: 'LOAD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT_INFO'; payload: { name?: string; description?: string } }
  | { type: 'UPDATE_BASE_INPUTS'; payload: Partial<ProjectInputs> }
  | { type: 'SET_ACTIVE_SCENARIO'; payload: string }
  | { type: 'ADD_SCENARIO'; payload: Scenario }
  | { type: 'UPDATE_SCENARIO'; payload: { id: string; updates: Partial<Scenario> } }
  | { type: 'DELETE_SCENARIO'; payload: string }
  | { type: 'ADD_SENSITIVITY_1D'; payload: SensitivityAnalysis1D }
  | { type: 'UPDATE_SENSITIVITY_1D'; payload: { id: string; updates: Partial<SensitivityAnalysis1D> } }
  | { type: 'DELETE_SENSITIVITY_1D'; payload: string }
  | { type: 'ADD_SENSITIVITY_2D'; payload: SensitivityAnalysis2D }
  | { type: 'DELETE_SENSITIVITY_2D'; payload: string }
  | { type: 'ADD_OPTIMIZATION_CONFIG'; payload: OptimizationConfig }
  | { type: 'UPDATE_OPTIMIZATION_CONFIG'; payload: { id: string; updates: Partial<OptimizationConfig> } }
  | { type: 'DELETE_OPTIMIZATION_CONFIG'; payload: string }
  | { type: 'SET_OPTIMIZATION_RESULT'; payload: { configId: string; result: OptimizationResult } }
  | { type: 'RESET_PROJECT' };

// ============================================================================
// REDUCER
// ============================================================================

function projectReducer(state: Project, action: ProjectAction): Project {
  const now = new Date();

  switch (action.type) {
    case 'LOAD_PROJECT':
      return action.payload;

    case 'UPDATE_PROJECT_INFO':
      return {
        ...state,
        ...action.payload,
        updatedAt: now,
      };

    case 'UPDATE_BASE_INPUTS':
      return {
        ...state,
        baseInputs: {
          ...state.baseInputs,
          ...action.payload,
        },
        updatedAt: now,
      };

    case 'SET_ACTIVE_SCENARIO':
      return {
        ...state,
        activeScenarioId: action.payload,
        updatedAt: now,
      };

    case 'ADD_SCENARIO':
      return {
        ...state,
        scenarios: [...state.scenarios, action.payload],
        updatedAt: now,
      };

    case 'UPDATE_SCENARIO':
      return {
        ...state,
        scenarios: state.scenarios.map((s) =>
          s.id === action.payload.id
            ? { ...s, ...action.payload.updates, updatedAt: now }
            : s
        ),
        updatedAt: now,
      };

    case 'DELETE_SCENARIO':
      return {
        ...state,
        scenarios: state.scenarios.filter((s) => s.id !== action.payload),
        activeScenarioId:
          state.activeScenarioId === action.payload ? 'base' : state.activeScenarioId,
        updatedAt: now,
      };

    case 'ADD_SENSITIVITY_1D':
      return {
        ...state,
        sensitivityAnalyses1D: [...state.sensitivityAnalyses1D, action.payload],
        updatedAt: now,
      };

    case 'UPDATE_SENSITIVITY_1D':
      return {
        ...state,
        sensitivityAnalyses1D: state.sensitivityAnalyses1D.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
        ),
        updatedAt: now,
      };

    case 'DELETE_SENSITIVITY_1D':
      return {
        ...state,
        sensitivityAnalyses1D: state.sensitivityAnalyses1D.filter((a) => a.id !== action.payload),
        updatedAt: now,
      };

    case 'ADD_SENSITIVITY_2D':
      return {
        ...state,
        sensitivityAnalyses2D: [...state.sensitivityAnalyses2D, action.payload],
        updatedAt: now,
      };

    case 'DELETE_SENSITIVITY_2D':
      return {
        ...state,
        sensitivityAnalyses2D: state.sensitivityAnalyses2D.filter((a) => a.id !== action.payload),
        updatedAt: now,
      };

    case 'ADD_OPTIMIZATION_CONFIG':
      return {
        ...state,
        optimizations: {
          ...state.optimizations,
          configs: [...state.optimizations.configs, action.payload],
        },
        updatedAt: now,
      };

    case 'UPDATE_OPTIMIZATION_CONFIG':
      return {
        ...state,
        optimizations: {
          ...state.optimizations,
          configs: state.optimizations.configs.map((c) =>
            c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
          ),
        },
        updatedAt: now,
      };

    case 'DELETE_OPTIMIZATION_CONFIG':
      const { [action.payload]: _, ...remainingResults } = state.optimizations.results;
      return {
        ...state,
        optimizations: {
          configs: state.optimizations.configs.filter((c) => c.id !== action.payload),
          results: remainingResults,
        },
        updatedAt: now,
      };

    case 'SET_OPTIMIZATION_RESULT':
      return {
        ...state,
        optimizations: {
          ...state.optimizations,
          results: {
            ...state.optimizations.results,
            [action.payload.configId]: action.payload.result,
          },
        },
        updatedAt: now,
      };

    case 'RESET_PROJECT':
      return createDefaultProject();

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
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, dispatch] = useReducer(projectReducer, null, loadProjectFromStorage);

  // Autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timer);
  }, [project]);

  // Fonction pour récupérer les inputs du scénario actif
  const getCurrentInputs = (): ProjectInputs => {
    const activeScenario = project.scenarios.find((s) => s.id === project.activeScenarioId);

    if (!activeScenario || activeScenario.isBase) {
      return project.baseInputs;
    }

    // Merger les overrides avec les inputs de base
    return {
      ...project.baseInputs,
      ...activeScenario.overrides,
    } as ProjectInputs;
  };

  // Fonction pour calculer les KPIs du scénario actif
  const getCurrentKPIs = () => {
    return calculateKPIs(getCurrentInputs());
  };

  return (
    <ProjectContext.Provider value={{ project, dispatch, getCurrentInputs, getCurrentKPIs }}>
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
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
}

