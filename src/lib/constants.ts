import type { KPIResults } from '../types';

// ============================================================================
// LABELS DES PARAMÈTRES
// ============================================================================

export const PARAMETER_LABELS: Record<string, string> = {
  'revenue.averageDailyRate': 'Tarif moyen par nuitée',
  'revenue.occupancyRate': 'Taux d\'occupation',
  'financing.purchasePrice': 'Prix d\'achat',
  'financing.downPayment': 'Mise de fonds',
  'financing.interestRate': 'Taux d\'intérêt',
  'financing.amortizationYears': 'Amortissement',
  'acquisitionFees.transferDuties': 'Droits de mutation',
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
  { value: 'totalAcquisitionFees', label: 'Frais d\'acquisition' },
  { value: 'initialInvestment', label: 'Investissement initial' },
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
];

// ============================================================================
// LIMITES ET VALEURS PAR DÉFAUT
// ============================================================================

export const LIMITS = {
  MAX_OPTIMIZATION_ITERATIONS: 50000,
  DEFAULT_OPTIMIZATION_ITERATIONS: 10000,
  MAX_SENSITIVITY_STEPS: 50,
  DEFAULT_SENSITIVITY_STEPS_1D: 10,
  DEFAULT_SENSITIVITY_STEPS_2D: 15,
  MAX_SENSITIVITY_2D_CELLS: 2500, // 50x50
  AUTOSAVE_DELAY_MS: 2000,
  DEFAULT_TOP_K_SOLUTIONS: 10,
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
  OPTIMIZATION_FAILED: 'Erreur lors de l\'optimisation. Vérifiez les paramètres et réessayez.',
  SENSITIVITY_1D_FAILED: 'Erreur lors de l\'analyse de sensibilité. Vérifiez les paramètres.',
  SENSITIVITY_2D_FAILED: 'Erreur lors de l\'analyse de sensibilité 2D. Vérifiez les paramètres.',
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
// VERSION
// ============================================================================

export const APP_VERSION = '1.0.0';
export const DATA_VERSION = '1.0.0';

