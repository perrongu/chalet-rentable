// ============================================================================
// TYPES DE BASE
// ============================================================================

export interface SourceInfo {
  source?: string; // Source de l'information (URL, document, etc.)
  remarks?: string; // Remarques/notes additionnelles
}

export interface RangeValue {
  min: number;
  max: number;
  default: number;
  useRange: boolean; // Si true, utilise min/max pour sensibilité
}

export interface InputWithSource<T = number> {
  value: T;
  range?: RangeValue; // Optionnel: si présent et useRange=true, utilise default pour les calculs
  sourceInfo?: SourceInfo;
}

export type NumericInputWithSource = InputWithSource<number>;

// ============================================================================
// TYPES D'INPUTS
// ============================================================================

export const ExpenseType = {
  FIXED_ANNUAL: 'FIXED_ANNUAL', // Montant fixe annuel
  FIXED_MONTHLY: 'FIXED_MONTHLY', // Montant fixe mensuel
  PERCENTAGE_REVENUE: 'PERCENTAGE_REVENUE', // Pourcentage des revenus
} as const;

export type ExpenseType = typeof ExpenseType[keyof typeof ExpenseType];

export const ExpenseCategory = {
  ENTRETIEN: 'Entretien',
  SERVICES: 'Services',
  ASSURANCES: 'Assurances',
  TAXES: 'Taxes',
  UTILITIES: 'Utilités',
  GESTION: 'Gestion',
  AUTRE: 'Autre',
} as const;

export type ExpenseCategory = typeof ExpenseCategory[keyof typeof ExpenseCategory];

export interface ExpenseLine {
  id: string;
  name: string;
  type: ExpenseType;
  amount: InputWithSource<number>; // Montant ou pourcentage selon le type
  category?: ExpenseCategory; // Catégorie optionnelle prédéfinie
}

export const PaymentFrequency = {
  MONTHLY: 'MONTHLY',
  BI_WEEKLY: 'BI_WEEKLY',
  WEEKLY: 'WEEKLY',
  ANNUAL: 'ANNUAL',
} as const;

export type PaymentFrequency = typeof PaymentFrequency[keyof typeof PaymentFrequency];

export interface FinancingInputs {
  purchasePrice: InputWithSource<number>;
  municipalAssessment?: InputWithSource<number>; // Évaluation municipale (optionnelle, utilise prix d'achat si vide)
  downPayment: InputWithSource<number>; // Montant ou sera calculé depuis downPaymentPercent
  downPaymentPercent?: InputWithSource<number>; // Alternative en %
  interestRate: InputWithSource<number>; // Taux annuel en %
  amortizationYears: InputWithSource<number>;
  paymentFrequency: PaymentFrequency;
  annualAppreciationRate: InputWithSource<number>; // Taux d'appréciation annuel de la propriété en %
}

export interface AcquisitionFees {
  transferDuties: InputWithSource<number>; // Droits de mutation
  notaryFees: InputWithSource<number>;
  other: InputWithSource<number>;
}

export interface RevenueInputs {
  averageDailyRate: InputWithSource<number>; // ADR - Tarif moyen par nuitée
  occupancyRate: InputWithSource<number>; // Taux d'occupation en %
  daysPerYear?: number; // Par défaut 365
}

export interface ProjectInputs {
  name: string;
  revenue: RevenueInputs;
  expenses: ExpenseLine[];
  financing: FinancingInputs;
  acquisitionFees: AcquisitionFees;
}

// ============================================================================
// SCENARIOS
// ============================================================================

export type InputOverride = Partial<ProjectInputs>;

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  isBase: boolean; // Le scénario de base contient toutes les valeurs
  overrides?: InputOverride; // Seulement les différences vs base
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CALCULS & KPIs
// ============================================================================

export interface CalculationTrace {
  formula: string; // Formule en format lisible
  variables: Record<string, number | string>; // Valeurs des variables
  result: number;
  sources?: SourceInfo[]; // Sources des inputs utilisés
}

export interface KPIResults {
  // Revenus
  nightsSold: number;
  annualRevenue: number;

  // Dépenses
  totalExpenses: number;
  expensesByCategory: Record<string, number>;

  // NOI (Net Operating Income)
  noi: number; // Revenus - Dépenses opérationnelles

  // Financement
  loanAmount: number;
  periodicPayment: number;
  annualDebtService: number;

  // Investissement
  transferDuties: number; // Droits de mutation (calculés)
  totalAcquisitionFees: number;
  initialInvestment: number; // Mise de fonds + frais

  // Métriques de rentabilité
  annualCashflow: number;
  cashOnCash: number; // ROI en %
  capRate: number; // Cap rate en %
  
  // Rendement détaillé
  principalPaidFirstYear: number; // Capital remboursé la première année (capitalisation)
  propertyAppreciation: number; // Plus-value annuelle de la propriété
  totalAnnualProfit: number; // Profit total = Cashflow + Capitalisation + Plus-value
  cashflowROI: number; // ROI du cashflow en %
  capitalizationROI: number; // ROI de la capitalisation en %
  appreciationROI: number; // ROI de la plus-value en %
  totalROI: number; // ROI total en %

  // Traçabilité des calculs
  traces: Record<keyof Omit<KPIResults, 'traces' | 'expensesByCategory'>, CalculationTrace>;
}

// ============================================================================
// ANALYSES DE SENSIBILITÉ
// ============================================================================

export interface ParameterRange {
  parameter: string; // Chemin vers le paramètre (ex: "revenue.averageDailyRate")
  label: string; // Nom affiché
  min: number;
  base: number;
  max: number;
  steps?: number; // Nombre de points à calculer (par défaut: 10)
}

export interface SensitivityAnalysis1D {
  id: string;
  name: string;
  objective: keyof KPIResults; // KPI à analyser
  parameters: ParameterRange[];
  results?: {
    impacts: Array<{
      parameter: string;
      label: string;
      valueLow: number; // Valeur absolue de l'objectif au min
      valueHigh: number; // Valeur absolue de l'objectif au max
      impactLow: number; // Impact du min sur l'objectif (variation)
      impactHigh: number; // Impact du max sur l'objectif (variation)
      relativeImpact: number; // Impact relatif (pour tri)
      criticalPoint?: {
        paramValue: number; // Valeur du paramètre au point critique (objectif = 0)
        exists: boolean; // true si le point critique existe dans la plage
      };
    }>;
    detailedResults: Array<{
      parameter: string;
      values: Array<{
        paramValue: number;
        objectiveValue: number;
      }>;
    }>;
    baseValue: number; // Valeur de base de l'objectif
  };
  createdAt: Date;
}

export interface SensitivityAnalysis2D {
  id: string;
  name: string;
  objective: keyof KPIResults;
  parameterX: ParameterRange;
  parameterY: ParameterRange;
  results?: {
    grid: number[][]; // Grille des résultats [y][x]
    xValues: number[];
    yValues: number[];
  };
  createdAt: Date;
}

// ============================================================================
// PROJET COMPLET
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  baseInputs: ProjectInputs;
  scenarios: Scenario[];
  activeScenarioId: string;
  sensitivityAnalyses1D: SensitivityAnalysis1D[];
  sensitivityAnalyses2D: SensitivityAnalysis2D[];
  createdAt: Date;
  updatedAt: Date;
  version: string; // Version du format de données
}

// ============================================================================
// UTILITAIRES
// ============================================================================

export interface ExportOptions {
  includeCharts: boolean;
  includeTraces: boolean;
  includeSources: boolean;
  format: 'json' | 'xlsx' | 'csv' | 'pdf';
}

export interface ChartData {
  type: 'bar' | 'line' | 'tornado' | 'heatmap';
  title: string;
  data: any; // Structure dépend du type de graphique
}

