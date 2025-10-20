import type { KPIResults } from '../types';

// ============================================================================
// LABELS DES PARAMÈTRES
// ============================================================================

export const PARAMETER_LABELS: Record<string, string> = {
  'revenue.averageDailyRate': 'Tarif moyen par nuitée',
  'revenue.occupancyRate': 'Taux d\'occupation',
  'financing.purchasePrice': 'Prix d\'achat',
  'financing.municipalAssessment': 'Évaluation municipale',
  'financing.downPayment': 'Mise de fonds',
  'financing.interestRate': 'Taux d\'intérêt',
  'financing.amortizationYears': 'Amortissement',
  'financing.annualAppreciationRate': 'Taux d\'appréciation annuel',
  'acquisitionFees.notaryFees': 'Frais de notaire',
  'acquisitionFees.other': 'Autres frais d\'acquisition',
};

// ============================================================================
// OPTIONS KPI
// ============================================================================

export const KPI_OPTIONS: Array<{ value: keyof KPIResults; label: string }> = [
  { value: 'annualCashflow', label: 'Cashflow annuel' },
  { value: 'cashOnCash', label: 'Cash-on-Cash' },
  { value: 'capRate', label: 'Cap Rate' },
  { value: 'annualRevenue', label: 'Revenus annuels bruts' },
  { value: 'totalExpenses', label: 'Dépenses totales' },
  { value: 'nightsSold', label: 'Nuitées vendues' },
  { value: 'loanAmount', label: 'Montant du prêt' },
  { value: 'periodicPayment', label: 'Paiement périodique' },
  { value: 'annualDebtService', label: 'Service de la dette annuel' },
  { value: 'transferDuties', label: 'Droits de mutation' },
  { value: 'totalAcquisitionFees', label: 'Frais d\'acquisition' },
  { value: 'initialInvestment', label: 'Investissement initial' },
  { value: 'principalPaidFirstYear', label: 'Capitalisation (capital remboursé 1ère année)' },
  { value: 'propertyAppreciation', label: 'Plus-value (appréciation annuelle)' },
  { value: 'cashflowROI', label: 'ROI Cashflow' },
  { value: 'capitalizationROI', label: 'ROI Capitalisation' },
  { value: 'appreciationROI', label: 'ROI Plus-value' },
  { value: 'totalROI', label: 'ROI Total' },
];

// ============================================================================
// TYPES DE MÉTRIQUES PAR FORMAT
// ============================================================================

// KPIs en format monétaire ($)
export const CURRENCY_METRICS: Array<keyof KPIResults> = [
  'annualRevenue',
  'totalExpenses',
  'annualCashflow',
  'loanAmount',
  'periodicPayment',
  'annualDebtService',
  'transferDuties',
  'totalAcquisitionFees',
  'initialInvestment',
  'principalPaidFirstYear',
  'propertyAppreciation',
];

// KPIs en format pourcentage (%)
export const PERCENTAGE_METRICS: Array<keyof KPIResults> = [
  'cashOnCash',
  'capRate',
  'cashflowROI',
  'capitalizationROI',
  'appreciationROI',
  'totalROI',
];

// ============================================================================
// PARAMÈTRES DISPONIBLES POUR OPTIMISATION/SENSIBILITÉ
// ============================================================================

export const AVAILABLE_PARAMETERS = [
  { path: 'revenue.averageDailyRate', label: 'Tarif moyen par nuitée' },
  { path: 'revenue.occupancyRate', label: 'Taux d\'occupation' },
  { path: 'financing.purchasePrice', label: 'Prix d\'achat' },
  { path: 'financing.downPayment', label: 'Mise de fonds' },
  { path: 'financing.interestRate', label: 'Taux d\'intérêt' },
  { path: 'financing.amortizationYears', label: 'Amortissement' },
  { path: 'financing.annualAppreciationRate', label: 'Taux d\'appréciation annuel' },
];

// ============================================================================
// LIMITES ET VALEURS PAR DÉFAUT
// ============================================================================

export const LIMITS = {
  MAX_SENSITIVITY_STEPS: 50,
  DEFAULT_SENSITIVITY_STEPS_1D: 10,
  DEFAULT_SENSITIVITY_STEPS_2D: 15,
  MAX_SENSITIVITY_2D_CELLS: 2500, // 50x50
  AUTOSAVE_DELAY_MS: 2000,
  DEFAULT_MONTE_CARLO_ITERATIONS: 5000,
  MIN_MONTE_CARLO_ITERATIONS: 100,
  MAX_MONTE_CARLO_ITERATIONS: 50000,
  // Projections
  DEFAULT_PROJECTION_YEARS: 10,
  MIN_PROJECTION_YEARS: 1,
  MAX_PROJECTION_YEARS: 30,
  MAX_EXIT_SCENARIOS: 20, // Limiter pour la performance
} as const;

// ============================================================================
// SEUILS DE COULEUR POUR LES KPIs
// ============================================================================

export const KPI_THRESHOLDS = {
  cashOnCash: {
    good: 8, // >= 8% = vert
    medium: 5, // >= 5% = orange
    // < 5% = rouge
  },
  capRate: {
    good: 6, // >= 6% = vert
    medium: 4, // >= 4% = orange
    // < 4% = rouge
  },
} as const;

// ============================================================================
// SEUILS POUR LES CONSEILS D'AMÉLIORATION
// ============================================================================

export const ADVICE_THRESHOLDS = {
  MOIC: {
    EXCELLENT: 3.0,
    GOOD: 2.0,
    ACCEPTABLE: 1.0,
  },
  TRI: {
    EXCELLENT: 20,
    GOOD: 15,
    ACCEPTABLE: 8,
  },
  REVENUE_INCREASE_TARGET: 15, // % d'augmentation suggérée pour MOIC
  TRI_REVENUE_INCREASE_SUGGESTION: 10, // % d'augmentation suggérée pour TRI
} as const;

// ============================================================================
// FORMATS DE FICHIERS
// ============================================================================

export const FILE_TYPES = {
  PROJECT_JSON: {
    description: 'Projet Chalet JSON',
    accept: { 'application/json': ['.json'] },
  },
} as const;

// ============================================================================
// MESSAGES D'ERREUR
// ============================================================================

export const ERROR_MESSAGES = {
  SENSITIVITY_1D_FAILED: 'Erreur lors de l\'analyse de sensibilité. Vérifiez les paramètres.',
  SENSITIVITY_2D_FAILED: 'Erreur lors de l\'analyse de sensibilité 2D. Vérifiez les paramètres.',
  MONTE_CARLO_FAILED: 'Erreur lors de la simulation Monte Carlo. Vérifiez les paramètres.',
  MONTE_CARLO_NO_RANGES: 'Aucun paramètre avec plage définie (useRange=true). Activez des plages dans les paramètres.',
  SAVE_FAILED: 'Erreur lors de la sauvegarde du projet',
  LOAD_FAILED: 'Erreur lors du chargement du projet',
  STORAGE_QUOTA_EXCEEDED: 'Espace de stockage local dépassé. Veuillez libérer de l\'espace.',
  STORAGE_ACCESS_DENIED: 'Accès au stockage local refusé. Vérifiez les paramètres du navigateur.',
} as const;

// ============================================================================
// MESSAGES DE SUCCÈS
// ============================================================================

export const SUCCESS_MESSAGES = {
  PROJECT_SAVED: 'Projet sauvegardé avec succès',
  PROJECT_LOADED: 'Projet chargé avec succès',
  SCENARIO_CREATED: 'Scénario créé avec succès',
  SCENARIO_DELETED: 'Scénario supprimé avec succès',
} as const;

// ============================================================================
// BARÈME DES DROITS DE MUTATION (QUÉBEC)
// ============================================================================

export const TRANSFER_DUTIES_TIERS = {
  TIER1_LIMIT: 52800, // Premier palier
  TIER2_LIMIT: 264000, // Deuxième palier
  TIER1_RATE: 0.005, // 0.5%
  TIER2_RATE: 0.01, // 1.0%
  TIER3_RATE: 0.015, // 1.5%
} as const;

// ============================================================================
// PARAMÈTRES DE PROJECTION PAR DÉFAUT
// ============================================================================

export const DEFAULT_PROJECTION_SETTINGS = {
  REVENUE_ESCALATION_RATE: 2.5, // 2.5% inflation annuelle des revenus
  EXPENSE_ESCALATION_RATE: 3.0, // 3.0% inflation annuelle des dépenses
  CAPEX_RATE: 1.0, // 1% de la valeur de la propriété en CAPEX annuel
  DISCOUNT_RATE: 5.0, // 5% taux d'actualisation pour NPV
  SALE_COSTS_RATE: 6.0, // 6% frais de vente (courtage, notaire, etc.)
} as const;

// Taux de rénovations annuelles par défaut
export const DEFAULT_ANNUAL_RENOVATION_RATE = 1.0; // 1% pour tenue impeccable

// ============================================================================
// VERSION
// ============================================================================

export const APP_VERSION = '1.0.0';
export const DATA_VERSION = '1.0.0';

