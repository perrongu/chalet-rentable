import { z } from "zod";
import { ExpenseType, ExpenseCategory, PaymentFrequency } from "../types";

// ============================================================================
// SCHÉMAS DE BASE
// ============================================================================

const SourceInfoSchema = z.object({
  source: z.string().max(500).optional(),
  remarks: z.string().max(2000).optional(),
});

const RangeValueSchema = z.object({
  min: z.number().finite(),
  max: z.number().finite(),
  default: z.number().finite(),
  useRange: z.boolean(),
});

const InputWithSourceSchema = z.object({
  value: z.number().finite(),
  range: RangeValueSchema.optional(),
  sourceInfo: SourceInfoSchema.optional(),
});

// ============================================================================
// SCHÉMAS D'INPUTS
// ============================================================================

const ExpenseLineSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  type: z.nativeEnum(ExpenseType),
  amount: InputWithSourceSchema,
  category: z.nativeEnum(ExpenseCategory).optional(),
});

const RevenueInputsSchema = z.object({
  averageDailyRate: InputWithSourceSchema,
  occupancyRate: InputWithSourceSchema,
  daysPerYear: z.number().finite().min(1).max(366).optional(),
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

const ProjectionSettingsSchema = z
  .object({
    revenueEscalationRate: InputWithSourceSchema,
    expenseEscalationRate: InputWithSourceSchema,
    capexRate: InputWithSourceSchema,
    discountRate: InputWithSourceSchema,
    saleCostsRate: InputWithSourceSchema,
  })
  .optional();

const ProjectInputsSchema = z.object({
  name: z.string().max(200),
  revenue: RevenueInputsSchema,
  expenses: z.array(ExpenseLineSchema).max(100),
  financing: FinancingInputsSchema,
  acquisitionFees: AcquisitionFeesSchema,
  projectionSettings: ProjectionSettingsSchema,
});

// ============================================================================
// SCHÉMAS DE SCÉNARIOS
// ============================================================================

const ScenarioSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  description: z.string().max(1000).optional(),
  isBase: z.boolean(),
  overrides: ProjectInputsSchema.partial().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ============================================================================
// SCHÉMAS D'ANALYSES
// ============================================================================

const ParameterRangeSchema = z.object({
  parameter: z.string().max(200),
  label: z.string().max(200),
  min: z.number().finite(),
  base: z.number().finite(),
  max: z.number().finite(),
  steps: z.number().finite().int().positive().optional(),
});

// Liste des KPIs valides pour l'objectif
const kpiKeys = z.enum([
  "nightsSold",
  "annualRevenue",
  "totalExpenses",
  "loanAmount",
  "periodicPayment",
  "annualDebtService",
  "transferDuties",
  "totalAcquisitionFees",
  "initialInvestment",
  "annualCashflow",
  "principalPaidFirstYear",
  "propertyAppreciation",
  "cashflowROI",
  "capitalizationROI",
  "appreciationROI",
  "totalROI",
  "cashOnCash",
  "capRate",
]);

const SensitivityImpactSchema = z.object({
  parameter: z.string().max(200),
  label: z.string().max(200),
  valueLow: z.number().finite(),
  valueHigh: z.number().finite(),
  impactLow: z.number().finite(),
  impactHigh: z.number().finite(),
  relativeImpact: z.number().finite(),
  criticalPoint: z
    .object({ paramValue: z.number().finite(), exists: z.boolean() })
    .optional(),
});

const SensitivityResults1DSchema = z
  .object({
    impacts: z.array(SensitivityImpactSchema).max(50),
    detailedResults: z
      .array(
        z.object({
          parameter: z.string().max(200),
          values: z
            .array(
              z.object({
                paramValue: z.number().finite(),
                objectiveValue: z.number().finite(),
              }),
            )
            .max(100),
        }),
      )
      .max(50),
    baseValue: z.number().finite(),
  })
  .optional();

const SensitivityResults2DSchema = z
  .object({
    xValues: z.array(z.number().finite()).max(100),
    yValues: z.array(z.number().finite()).max(100),
    grid: z.array(z.array(z.number().finite()).max(100)).max(100),
    baseValue: z.number().finite(),
  })
  .optional();

const SensitivityAnalysis1DSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  objective: kpiKeys,
  parameters: z.array(ParameterRangeSchema),
  results: SensitivityResults1DSchema,
  createdAt: z.coerce.date(),
});

const SensitivityAnalysis2DSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  objective: kpiKeys,
  parameterX: ParameterRangeSchema,
  parameterY: ParameterRangeSchema,
  results: SensitivityResults2DSchema,
  createdAt: z.coerce.date(),
});

// ============================================================================
// SCHÉMA PRINCIPAL DU PROJET
// ============================================================================

const ProjectSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  description: z.string().max(2000).optional(),
  baseInputs: ProjectInputsSchema,
  scenarios: z.array(ScenarioSchema).max(50),
  activeScenarioId: z.string().max(100),
  sensitivityAnalyses1D: z.array(SensitivityAnalysis1DSchema).max(50),
  sensitivityAnalyses2D: z.array(SensitivityAnalysis2DSchema).max(50),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  version: z.string().max(20),
});

// ============================================================================
// FONCTIONS DE VALIDATION
// ============================================================================

export function validateProject(
  data: unknown,
):
  | { success: true; data: z.infer<typeof ProjectSchema> }
  | { success: false; error: z.ZodError } {
  const result = ProjectSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

export function sanitizeProject(
  data: unknown,
): z.infer<typeof ProjectSchema> | null {
  try {
    return ProjectSchema.parse(data);
  } catch {
    return null;
  }
}
