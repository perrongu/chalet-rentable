import type { Project, ProjectInputs, Scenario } from "../types";
import { ExpenseType, ExpenseCategory, PaymentFrequency } from "../types";
import { generateUUID } from "../lib/utils";
import {
  DEFAULT_ANNUAL_RENOVATION_RATE,
  DEFAULT_ANNUAL_APPRECIATION_RATE,
  DATA_VERSION,
} from "../lib/constants";

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
        amount: { value: 15 },
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
        amount: { value: 250 },
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
      {
        id: "10",
        name: "Entretien spa/hot tub",
        type: ExpenseType.FIXED_ANNUAL,
        amount: {
          value: 2500,
          sourceInfo: {
            source: "",
            remarks: "Produits, nettoyage, remplacement filtres, hivernisation",
          },
        },
        category: ExpenseCategory.ENTRETIEN,
      },
      {
        id: "11",
        name: "Fournitures locataires",
        type: ExpenseType.FIXED_ANNUAL,
        amount: {
          value: 2000,
          sourceInfo: {
            source: "",
            remarks: "Consommables : savon, papier, café, bois de chauffage",
          },
        },
        category: ExpenseCategory.SERVICES,
      },
    ],
    financing: {
      purchasePrice: { value: 550000 },
      municipalAssessment: undefined,
      downPayment: { value: 27500 },
      interestRate: { value: 5.5 },
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
        sourceInfo: { source: "", remarks: "Réserve pour rénovations majeures" },
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
