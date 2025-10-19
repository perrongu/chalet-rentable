import { z } from 'zod';
import { ExpenseType, ExpenseCategory, PaymentFrequency } from '../types';

// ============================================================================
// SCHÉMAS DE BASE
// ============================================================================

const SourceInfoSchema = z.object({
  source: z.string().optional(),
  remarks: z.string().optional(),
});

const RangeValueSchema = z.object({
  min: z.number(),
  max: z.number(),
  default: z.number(),
  useRange: z.boolean(),
});

const InputWithSourceSchema = z.object({
  value: z.number(),
  range: RangeValueSchema.optional(),
  sourceInfo: SourceInfoSchema.optional(),
});

// ============================================================================
// SCHÉMAS D'INPUTS
// ============================================================================

const ExpenseLineSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(ExpenseType),
  amount: InputWithSourceSchema,
  category: z.nativeEnum(ExpenseCategory).optional(),
});

const RevenueInputsSchema = z.object({
  averageDailyRate: InputWithSourceSchema,
  occupancyRate: InputWithSourceSchema,
  daysPerYear: z.number().optional(),
});

const FinancingInputsSchema = z.object({
  purchasePrice: InputWithSourceSchema,
  municipalAssessment: InputWithSourceSchema.optional(),
  downPayment: InputWithSourceSchema,
  downPaymentPercent: InputWithSourceSchema.optional(),
  interestRate: InputWithSourceSchema,
  amortizationYears: InputWithSourceSchema,
  paymentFrequency: z.nativeEnum(PaymentFrequency),
  annualAppreciationRate: InputWithSourceSchema,
});

const AcquisitionFeesSchema = z.object({
  transferDuties: InputWithSourceSchema,
  notaryFees: InputWithSourceSchema,
  other: InputWithSourceSchema,
});

const ProjectInputsSchema = z.object({
  name: z.string(),
  revenue: RevenueInputsSchema,
  expenses: z.array(ExpenseLineSchema),
  financing: FinancingInputsSchema,
  acquisitionFees: AcquisitionFeesSchema,
});

// ============================================================================
// SCHÉMAS DE SCÉNARIOS
// ============================================================================

const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  isBase: z.boolean(),
  overrides: z.any().optional(), // Partial<ProjectInputs> - complexe à valider
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ============================================================================
// SCHÉMAS D'ANALYSES
// ============================================================================

const ParameterRangeSchema = z.object({
  parameter: z.string(),
  label: z.string(),
  min: z.number(),
  base: z.number(),
  max: z.number(),
  steps: z.number().optional(),
});

// Liste des KPIs valides pour l'objectif
const kpiKeys = z.enum([
  'nightsSold',
  'annualRevenue',
  'totalExpenses',
  'loanAmount',
  'periodicPayment',
  'annualDebtService',
  'transferDuties',
  'totalAcquisitionFees',
  'initialInvestment',
  'annualCashflow',
  'principalPaidFirstYear',
  'propertyAppreciation',
  'cashflowROI',
  'capitalizationROI',
  'appreciationROI',
  'totalROI',
  'cashOnCash',
  'capRate',
]);

const SensitivityAnalysis1DSchema = z.object({
  id: z.string(),
  name: z.string(),
  objective: kpiKeys,
  parameters: z.array(ParameterRangeSchema),
  results: z.any().optional(),
  createdAt: z.coerce.date(),
});

const SensitivityAnalysis2DSchema = z.object({
  id: z.string(),
  name: z.string(),
  objective: kpiKeys,
  parameterX: ParameterRangeSchema,
  parameterY: ParameterRangeSchema,
  results: z.any().optional(),
  createdAt: z.coerce.date(),
});

// ============================================================================
// SCHÉMA PRINCIPAL DU PROJET
// ============================================================================

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  baseInputs: ProjectInputsSchema,
  scenarios: z.array(ScenarioSchema),
  activeScenarioId: z.string(),
  sensitivityAnalyses1D: z.array(SensitivityAnalysis1DSchema),
  sensitivityAnalyses2D: z.array(SensitivityAnalysis2DSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  version: z.string(),
});

// ============================================================================
// FONCTIONS DE VALIDATION
// ============================================================================

export function validateProject(data: unknown): { success: true; data: z.infer<typeof ProjectSchema> } | { success: false; error: z.ZodError } {
  const result = ProjectSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

export function sanitizeProject(data: unknown): z.infer<typeof ProjectSchema> | null {
  try {
    return ProjectSchema.parse(data);
  } catch (error) {
    console.error('Validation du projet échouée:', error);
    return null;
  }
}

