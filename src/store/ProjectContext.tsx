import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
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
import { ExpenseType, ExpenseCategory, PaymentFrequency } from '../types';
import { calculateKPIs } from '../lib/calculations';
import { generateUUID, debounce } from '../lib/utils';

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
      averageDailyRate: { 
        value: 215, 
        range: { min: 150, max: 300, default: 215, useRange: true },
        sourceInfo: { source: '', remarks: '' } 
      },
      occupancyRate: { 
        value: 75, 
        range: { min: 50, max: 90, default: 75, useRange: true },
        sourceInfo: { source: '', remarks: '' } 
      },
      daysPerYear: 365,
    },
    expenses: [
      {
        id: '1',
        name: 'Attestation CITQ',
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 875 },
        category: ExpenseCategory.SERVICES,
      },
      {
        id: '2',
        name: 'Compagnie de gestion',
        type: ExpenseType.PERCENTAGE_REVENUE,
        amount: { 
          value: 15,
          range: { min: 10, max: 20, default: 15, useRange: true }
        },
        category: ExpenseCategory.GESTION,
      },
      {
        id: '3',
        name: 'Déneigement et pelouse',
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 800 },
        category: ExpenseCategory.ENTRETIEN,
      },
      {
        id: '4',
        name: 'Câble / Internet / Netflix',
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 1200 },
        category: ExpenseCategory.UTILITIES,
      },
      {
        id: '5',
        name: 'Taxes municipales',
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 3000 },
        category: ExpenseCategory.TAXES,
      },
      {
        id: '6',
        name: 'Taxes scolaires',
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 180 },
        category: ExpenseCategory.TAXES,
      },
      {
        id: '7',
        name: 'Frais énergie',
        type: ExpenseType.FIXED_MONTHLY,
        amount: { 
          value: 200,
          range: { min: 150, max: 250, default: 200, useRange: true }
        },
        category: ExpenseCategory.UTILITIES,
      },
      {
        id: '8',
        name: 'Assurances habitation',
        type: ExpenseType.FIXED_ANNUAL,
        amount: { value: 3000 },
        category: ExpenseCategory.ASSURANCES,
      },
    ],
    financing: {
      purchasePrice: { 
        value: 550000,
        range: { min: 500000, max: 600000, default: 550000, useRange: true }
      },
      municipalAssessment: undefined, // Optionnel, utilise prix d'achat si non défini
      downPayment: { value: 27500 },
      interestRate: { 
        value: 5.5,
        range: { min: 4.5, max: 7.0, default: 5.5, useRange: true }
      },
      amortizationYears: { value: 30 },
      paymentFrequency: PaymentFrequency.MONTHLY,
      annualAppreciationRate: { 
        value: 2,
        range: { min: 0, max: 10, default: 2, useRange: true },
        sourceInfo: { source: '', remarks: '' }
      },
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
    id: generateUUID(),
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

function migrateInputWithSource(input: any): any {
  // Si c'est un nombre simple, le convertir en InputWithSource
  if (typeof input === 'number') {
    return { value: input };
  }
  
  // Si c'est déjà un objet avec value mais sans range
  if (typeof input === 'object' && input !== null && 'value' in input) {
    // Si pas de range, on garde tel quel
    return input;
  }
  
  return input;
}

function migrateExpenseCategory(category?: string): any {
  if (!category) return ExpenseCategory.AUTRE;
  
  // Mapper les anciennes catégories aux nouvelles
  const mapping: Record<string, any> = {
    'Exploitation': ExpenseCategory.SERVICES,
    'Détention': ExpenseCategory.AUTRE,
    'Entretien': ExpenseCategory.ENTRETIEN,
    'Services': ExpenseCategory.SERVICES,
    'Assurances': ExpenseCategory.ASSURANCES,
    'Taxes': ExpenseCategory.TAXES,
    'Utilités': ExpenseCategory.UTILITIES,
    'Gestion': ExpenseCategory.GESTION,
  };
  
  return mapping[category] || ExpenseCategory.AUTRE;
}

function loadProjectFromStorage(): Project {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const project = JSON.parse(stored);
      
      // Logging du versioning
      console.log(`[Migration] Chargement projet version: ${project.version || 'legacy'}`);
      const needsMigration = !project.version || project.version !== '1.0.0';
      
      if (needsMigration) {
        console.log('[Migration] Migration des données nécessaire');
      }
      
      // Migration des données
      if (project.baseInputs) {
        // Migrer les revenus
        if (project.baseInputs.revenue) {
          const oldAdr = project.baseInputs.revenue.averageDailyRate;
          const oldOcc = project.baseInputs.revenue.occupancyRate;
          
          project.baseInputs.revenue.averageDailyRate = migrateInputWithSource(oldAdr);
          project.baseInputs.revenue.occupancyRate = migrateInputWithSource(oldOcc);
          
          if (typeof oldAdr === 'number' || typeof oldOcc === 'number') {
            console.log('[Migration] Revenus migrés vers InputWithSource');
          }
        }
        
        // Migrer les dépenses
        if (project.baseInputs.expenses) {
          let expensesMigrated = 0;
          project.baseInputs.expenses = project.baseInputs.expenses.map((expense: any) => {
            const hadOldCategory = expense.category && !Object.values(ExpenseCategory).includes(expense.category);
            const hadOldAmount = typeof expense.amount === 'number';
            
            if (hadOldCategory || hadOldAmount) {
              expensesMigrated++;
            }
            
            return {
              ...expense,
              amount: migrateInputWithSource(expense.amount),
              category: migrateExpenseCategory(expense.category),
            };
          });
          
          if (expensesMigrated > 0) {
            console.log(`[Migration] ${expensesMigrated} dépenses migrées`);
          }
        }
        
        // Migrer le financement
        if (project.baseInputs.financing) {
          const f = project.baseInputs.financing;
          f.purchasePrice = migrateInputWithSource(f.purchasePrice);
          f.downPayment = migrateInputWithSource(f.downPayment);
          f.interestRate = migrateInputWithSource(f.interestRate);
          f.amortizationYears = migrateInputWithSource(f.amortizationYears);
          // Ajouter annualAppreciationRate s'il n'existe pas
          if (!f.annualAppreciationRate) {
            f.annualAppreciationRate = { 
              value: 2,
              range: { min: 0, max: 10, default: 2, useRange: true },
              sourceInfo: { source: '', remarks: '' }
            };
          } else {
            f.annualAppreciationRate = migrateInputWithSource(f.annualAppreciationRate);
          }
          // Initialiser municipalAssessment si non existant
          if (f.municipalAssessment !== undefined && f.municipalAssessment !== null) {
            f.municipalAssessment = migrateInputWithSource(f.municipalAssessment);
          } else {
            f.municipalAssessment = undefined;
          }
        }
        
        // Migrer les frais d'acquisition
        if (project.baseInputs.acquisitionFees) {
          const a = project.baseInputs.acquisitionFees;
          a.transferDuties = migrateInputWithSource(a.transferDuties);
          a.notaryFees = migrateInputWithSource(a.notaryFees);
          a.other = migrateInputWithSource(a.other);
        }
      }
      
      // Convertir les dates
      project.createdAt = new Date(project.createdAt);
      project.updatedAt = new Date(project.updatedAt);
      project.scenarios.forEach((s: Scenario) => {
        s.createdAt = new Date(s.createdAt);
        s.updatedAt = new Date(s.updatedAt);
      });
      
      // Assurer que la version est à jour
      if (!project.version) {
        project.version = '1.0.0';
        console.log('[Migration] Version définie à 1.0.0');
      }
      
      console.log('[Migration] Projet chargé avec succès');
      return project;
    }
  } catch (error) {
    console.error('[Migration] Erreur lors du chargement:', error);
    if (error instanceof SyntaxError) {
      console.error('[Migration] JSON invalide - reset nécessaire');
    }
  }
  console.log('[Migration] Création d\'un nouveau projet par défaut');
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

  // Autosave avec debounce
  const saveToStorage = useCallback((projectToSave: Project) => {
    try {
      const serialized = JSON.stringify(projectToSave);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      
      // Gestion des erreurs spécifiques
      if (error instanceof Error) {
        if (error.name === 'QuotaExceededError') {
          console.error('localStorage quota exceeded. Consider clearing old data.');
          // TODO: Ajouter notification utilisateur
        } else if (error.name === 'SecurityError') {
          console.error('localStorage access denied. Check browser settings.');
        }
      }
    }
  }, []);

  // Utiliser useRef pour le debounce afin de le créer une seule fois
  const debouncedSaveRef = useRef(debounce(saveToStorage, AUTOSAVE_DELAY));

  useEffect(() => {
    debouncedSaveRef.current(project);
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

