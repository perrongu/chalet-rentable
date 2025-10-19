import type {
  ProjectInputs,
  KPIResults,
  CalculationTrace,
  InputWithSource,
  SourceInfo,
} from '../types';
import { ExpenseType, PaymentFrequency } from '../types';
import { TRANSFER_DUTIES_TIERS } from './constants';

// ============================================================================
// UTILITAIRES
// ============================================================================

function round(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function extractValue<T>(input: InputWithSource<T> | T): T {
  if (typeof input === 'object' && input !== null && 'value' in input) {
    // Si useRange est activé et qu'on a une range, utiliser la valeur par défaut
    if ('range' in input && input.range && input.range.useRange) {
      return input.range.default as T;
    }
    return input.value;
  }
  return input as T;
}

function extractSource<T>(input: InputWithSource<T> | T): SourceInfo | undefined {
  if (typeof input === 'object' && input !== null && 'value' in input && 'sourceInfo' in input) {
    return input.sourceInfo;
  }
  return undefined;
}

// ============================================================================
// CALCULS DE REVENUS
// ============================================================================

export function calculateNightsSold(
  occupancyRate: number,
  daysPerYear: number = 365
): { value: number; trace: CalculationTrace } {
  const nights = round(daysPerYear * (occupancyRate / 100));

  return {
    value: nights,
    trace: {
      formula: 'Nuitées vendues = Jours par an × (Taux d\'occupation / 100)',
      variables: {
        'Jours par an': daysPerYear,
        'Taux d\'occupation (%)': occupancyRate,
      },
      result: nights,
    },
  };
}

export function calculateAnnualRevenue(
  averageDailyRate: number,
  nightsSold: number,
  sources?: SourceInfo[]
): { value: number; trace: CalculationTrace } {
  const revenue = round(averageDailyRate * nightsSold);

  return {
    value: revenue,
    trace: {
      formula: 'Revenus annuels bruts = Tarif moyen par nuitée × Nuitées vendues',
      variables: {
        'Tarif moyen par nuitée ($)': averageDailyRate,
        'Nuitées vendues': nightsSold,
      },
      result: revenue,
      sources,
    },
  };
}

// ============================================================================
// CALCULS DE DÉPENSES
// ============================================================================

export function calculateExpenses(
  expenseLines: ProjectInputs['expenses'],
  annualRevenue: number
): {
  total: number;
  byCategory: Record<string, number>;
  traces: CalculationTrace[];
  sources: SourceInfo[];
} {
  let total = 0;
  const byCategory: Record<string, number> = {};
  const traces: CalculationTrace[] = [];
  const sources: SourceInfo[] = [];

  expenseLines.forEach((line) => {
    const amount = extractValue(line.amount);
    const sourceInfo = extractSource(line.amount);
    let annualAmount = 0;

    switch (line.type) {
      case ExpenseType.FIXED_ANNUAL:
        annualAmount = amount;
        traces.push({
          formula: `${line.name} = Montant annuel`,
          variables: {
            'Montant annuel ($)': amount,
          },
          result: annualAmount,
          sources: sourceInfo ? [sourceInfo] : undefined,
        });
        break;

      case ExpenseType.FIXED_MONTHLY:
        annualAmount = amount * 12;
        traces.push({
          formula: `${line.name} = Montant mensuel × 12`,
          variables: {
            'Montant mensuel ($)': amount,
          },
          result: annualAmount,
          sources: sourceInfo ? [sourceInfo] : undefined,
        });
        break;

      case ExpenseType.PERCENTAGE_REVENUE:
        annualAmount = (annualRevenue * amount) / 100;
        traces.push({
          formula: `${line.name} = Revenus annuels bruts × (Pourcentage / 100)`,
          variables: {
            'Revenus annuels bruts ($)': annualRevenue,
            'Pourcentage (%)': amount,
          },
          result: annualAmount,
          sources: sourceInfo ? [sourceInfo] : undefined,
        });
        break;
    }

    annualAmount = round(annualAmount);
    total += annualAmount;

    const category = line.category || 'Autre';
    byCategory[category] = (byCategory[category] || 0) + annualAmount;

    if (sourceInfo) {
      sources.push(sourceInfo);
    }
  });

  return {
    total: round(total),
    byCategory,
    traces,
    sources,
  };
}

// ============================================================================
// CALCULS DE FINANCEMENT
// ============================================================================

function getPaymentsPerYear(frequency: PaymentFrequency): number {
  switch (frequency) {
    case PaymentFrequency.MONTHLY:
      return 12;
    case PaymentFrequency.BI_WEEKLY:
      return 26;
    case PaymentFrequency.WEEKLY:
      return 52;
    case PaymentFrequency.ANNUAL:
      return 1;
    default:
      return 12;
  }
}

export function calculateLoanAmount(
  purchasePrice: number,
  downPayment: number,
  sources?: SourceInfo[]
): { value: number; trace: CalculationTrace } {
  const loan = round(purchasePrice - downPayment);

  return {
    value: loan,
    trace: {
      formula: 'Montant du prêt = Prix d\'achat - Mise de fonds',
      variables: {
        'Prix d\'achat ($)': purchasePrice,
        'Mise de fonds ($)': downPayment,
      },
      result: loan,
      sources,
    },
  };
}

export function calculatePeriodicPayment(
  loanAmount: number,
  annualRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency,
  sources?: SourceInfo[]
): { value: number; trace: CalculationTrace } {
  const paymentsPerYear = getPaymentsPerYear(frequency);
  const totalPayments = amortizationYears * paymentsPerYear;
  const periodicRate = annualRate / 100 / paymentsPerYear;

  let payment = 0;
  if (periodicRate === 0) {
    // Cas sans intérêt
    payment = loanAmount / totalPayments;
  } else {
    // Formule standard d'annuité
    payment =
      (loanAmount * periodicRate * Math.pow(1 + periodicRate, totalPayments)) /
      (Math.pow(1 + periodicRate, totalPayments) - 1);
  }

  payment = round(payment);

  return {
    value: payment,
    trace: {
      formula:
        'Paiement périodique = (Prêt × r × (1+r)^n) / ((1+r)^n - 1)\noù r = taux périodique, n = nombre de paiements',
      variables: {
        'Montant du prêt ($)': loanAmount,
        'Taux annuel (%)': annualRate,
        'Taux périodique (%)': round(periodicRate * 100, 4),
        'Amortissement (années)': amortizationYears,
        'Paiements par an': paymentsPerYear,
        'Nombre total de paiements': totalPayments,
      },
      result: payment,
      sources,
    },
  };
}

export function calculateAnnualDebtService(
  periodicPayment: number,
  frequency: PaymentFrequency,
  sources?: SourceInfo[]
): { value: number; trace: CalculationTrace } {
  const paymentsPerYear = getPaymentsPerYear(frequency);
  const annual = round(periodicPayment * paymentsPerYear);

  return {
    value: annual,
    trace: {
      formula: 'Service de la dette annuel = Paiement périodique × Paiements par an',
      variables: {
        'Paiement périodique ($)': periodicPayment,
        'Paiements par an': paymentsPerYear,
      },
      result: annual,
      sources,
    },
  };
}

// ============================================================================
// FRAIS D'ACQUISITION
// ============================================================================

export function calculateTransferDuties(
  purchasePrice: number,
  municipalAssessment?: number,
  sources?: SourceInfo[]
): { value: number; trace: CalculationTrace } {
  // Utiliser le maximum entre le prix d'achat et l'évaluation municipale
  // Si évaluation municipale n'est pas fournie, utiliser le prix d'achat
  const baseAmount = municipalAssessment !== undefined && municipalAssessment > 0
    ? Math.max(purchasePrice, municipalAssessment)
    : purchasePrice;

  let transferDuties = 0;
  const { TIER1_LIMIT, TIER2_LIMIT, TIER1_RATE, TIER2_RATE, TIER3_RATE } = TRANSFER_DUTIES_TIERS;
  
  // Barème progressif québécois:
  // 0.5% jusqu'à 52 800$
  // 1.0% de 52 800$ à 264 000$
  // 1.5% au-delà de 264 000$
  
  if (baseAmount <= TIER1_LIMIT) {
    transferDuties = baseAmount * TIER1_RATE;
  } else if (baseAmount <= TIER2_LIMIT) {
    transferDuties = (TIER1_LIMIT * TIER1_RATE) + ((baseAmount - TIER1_LIMIT) * TIER2_RATE);
  } else {
    transferDuties = (TIER1_LIMIT * TIER1_RATE) + ((TIER2_LIMIT - TIER1_LIMIT) * TIER2_RATE) + ((baseAmount - TIER2_LIMIT) * TIER3_RATE);
  }

  transferDuties = round(transferDuties);

  const variables: Record<string, number | string> = {
    'Prix d\'achat ($)': purchasePrice,
  };

  if (municipalAssessment !== undefined && municipalAssessment > 0) {
    variables['Évaluation municipale ($)'] = municipalAssessment;
    variables['Montant de base ($)'] = baseAmount;
    variables['Note'] = baseAmount === purchasePrice 
      ? 'Prix d\'achat ≥ Évaluation municipale' 
      : 'Évaluation municipale ≥ Prix d\'achat';
  } else {
    variables['Note'] = 'Évaluation municipale non fournie, utilisation du prix d\'achat';
  }

  return {
    value: transferDuties,
    trace: {
      formula: 'Droits de mutation (barème progressif QC):\n' +
               '- 0,5% jusqu\'à 52 800$\n' +
               '- 1,0% de 52 800$ à 264 000$\n' +
               '- 1,5% au-delà de 264 000$',
      variables,
      result: transferDuties,
      sources,
    },
  };
}

export function calculateTotalAcquisitionFees(
  transferDuties: number,
  notaryFees: number,
  other: number,
  sources?: SourceInfo[]
): { value: number; trace: CalculationTrace } {
  const total = round(transferDuties + notaryFees + other);

  return {
    value: total,
    trace: {
      formula: 'Frais d\'acquisition = Droits de mutation + Frais notaire + Autres',
      variables: {
        'Droits de mutation ($)': transferDuties,
        'Frais notaire ($)': notaryFees,
        'Autres ($)': other,
      },
      result: total,
      sources,
    },
  };
}

export function calculateInitialInvestment(
  downPayment: number,
  acquisitionFees: number,
  sources?: SourceInfo[]
): { value: number; trace: CalculationTrace } {
  const initial = round(downPayment + acquisitionFees);

  return {
    value: initial,
    trace: {
      formula: 'Investissement initial = Mise de fonds + Frais d\'acquisition',
      variables: {
        'Mise de fonds ($)': downPayment,
        'Frais d\'acquisition ($)': acquisitionFees,
      },
      result: initial,
      sources,
    },
  };
}

// ============================================================================
// MÉTRIQUES DE RENTABILITÉ
// ============================================================================

export function calculateAnnualCashflow(
  annualRevenue: number,
  totalExpenses: number,
  annualDebtService: number,
  sources?: SourceInfo[]
): { value: number; trace: CalculationTrace } {
  const cashflow = round(annualRevenue - totalExpenses - annualDebtService);

  return {
    value: cashflow,
    trace: {
      formula: 'Cashflow annuel = Revenus bruts - Dépenses totales - Service de la dette',
      variables: {
        'Revenus annuels bruts ($)': annualRevenue,
        'Dépenses totales ($)': totalExpenses,
        'Service de la dette annuel ($)': annualDebtService,
      },
      result: cashflow,
      sources,
    },
  };
}

export function calculatePrincipalPaidFirstYear(
  loanAmount: number,
  annualRate: number,
  frequency: PaymentFrequency,
  periodicPayment: number,
  sources?: SourceInfo[]
): { value: number; trace: CalculationTrace } {
  const paymentsPerYear = getPaymentsPerYear(frequency);
  const periodicRate = annualRate / 100 / paymentsPerYear;
  
  let principalPaid = 0;
  let remainingBalance = loanAmount;
  
  // Calculer le capital remboursé pour chaque paiement de la première année
  for (let i = 0; i < paymentsPerYear; i++) {
    const interestPayment = remainingBalance * periodicRate;
    const principalPayment = periodicPayment - interestPayment;
    principalPaid += principalPayment;
    remainingBalance -= principalPayment;
  }
  
  principalPaid = round(principalPaid);

  return {
    value: principalPaid,
    trace: {
      formula: 'Capitalisation = Somme du capital remboursé durant les paiements de la première année',
      variables: {
        'Montant du prêt ($)': loanAmount,
        'Taux annuel (%)': annualRate,
        'Paiement périodique ($)': periodicPayment,
        'Paiements par an': paymentsPerYear,
        'Capital remboursé ($)': principalPaid,
      },
      result: principalPaid,
      sources,
    },
  };
}

export function calculatePropertyAppreciation(
  purchasePrice: number,
  appreciationRate: number,
  sources?: SourceInfo[]
): { value: number; trace: CalculationTrace } {
  const appreciation = round(purchasePrice * (appreciationRate / 100));

  return {
    value: appreciation,
    trace: {
      formula: 'Plus-value = Prix d\'achat × (Taux d\'appréciation / 100)',
      variables: {
        'Prix d\'achat ($)': purchasePrice,
        'Taux d\'appréciation annuel (%)': appreciationRate,
      },
      result: appreciation,
      sources,
    },
  };
}

export function calculateROI(
  profit: number,
  initialInvestment: number,
  label: string,
  sources?: SourceInfo[]
): { value: number; trace: CalculationTrace } {
  // Éviter division par zéro
  if (initialInvestment <= 0) {
    return {
      value: 0,
      trace: {
        formula: `${label} ROI (%) = (${label} / Investissement initial) × 100`,
        variables: {
          [`${label} ($)`]: profit,
          'Investissement initial ($)': initialInvestment,
          'Note': 'Division par zéro évitée - investissement initial invalide',
        },
        result: 0,
        sources,
      },
    };
  }
  
  const roi = round((profit / initialInvestment) * 100, 2);

  return {
    value: roi,
    trace: {
      formula: `${label} ROI (%) = (${label} / Investissement initial) × 100`,
      variables: {
        [`${label} ($)`]: profit,
        'Investissement initial ($)': initialInvestment,
      },
      result: roi,
      sources,
    },
  };
}

export function calculateCashOnCash(
  annualCashflow: number,
  initialInvestment: number,
  sources?: SourceInfo[]
): { value: number; trace: CalculationTrace } {
  // Éviter division par zéro
  if (initialInvestment <= 0) {
    return {
      value: 0,
      trace: {
        formula: 'Cash-on-Cash (%) = (Cashflow annuel / Investissement initial) × 100',
        variables: {
          'Cashflow annuel ($)': annualCashflow,
          'Investissement initial ($)': initialInvestment,
          'Note': 'Division par zéro évitée - investissement initial invalide',
        },
        result: 0,
        sources,
      },
    };
  }
  
  const coc = round((annualCashflow / initialInvestment) * 100, 2);

  return {
    value: coc,
    trace: {
      formula: 'Cash-on-Cash (%) = (Cashflow annuel / Investissement initial) × 100',
      variables: {
        'Cashflow annuel ($)': annualCashflow,
        'Investissement initial ($)': initialInvestment,
      },
      result: coc,
      sources,
    },
  };
}

export function calculateCapRate(
  annualRevenue: number,
  totalExpenses: number,
  purchasePrice: number,
  sources?: SourceInfo[]
): { value: number; trace: CalculationTrace } {
  const noi = annualRevenue - totalExpenses; // Net Operating Income
  
  // Éviter division par zéro
  if (purchasePrice <= 0) {
    return {
      value: 0,
      trace: {
        formula:
          'Cap Rate (%) = (NOI / Prix d\'achat) × 100\noù NOI = Revenus bruts - Dépenses (excluant service de la dette)',
        variables: {
          'Revenus annuels bruts ($)': annualRevenue,
          'Dépenses totales ($)': totalExpenses,
          'NOI ($)': round(noi),
          'Prix d\'achat ($)': purchasePrice,
          'Note': 'Division par zéro évitée - prix d\'achat invalide',
        },
        result: 0,
        sources,
      },
    };
  }
  
  const capRate = round((noi / purchasePrice) * 100, 2);

  return {
    value: capRate,
    trace: {
      formula:
        'Cap Rate (%) = (NOI / Prix d\'achat) × 100\noù NOI = Revenus bruts - Dépenses (excluant service de la dette)',
      variables: {
        'Revenus annuels bruts ($)': annualRevenue,
        'Dépenses totales ($)': totalExpenses,
        'NOI ($)': round(noi),
        'Prix d\'achat ($)': purchasePrice,
      },
      result: capRate,
      sources,
    },
  };
}

// ============================================================================
// FONCTION PRINCIPALE DE CALCUL
// ============================================================================

export function calculateKPIs(inputs: ProjectInputs): KPIResults {
  // Extraction des valeurs
  const adr = extractValue(inputs.revenue.averageDailyRate);
  const occupancy = extractValue(inputs.revenue.occupancyRate);
  const daysPerYear = inputs.revenue.daysPerYear || 365;

  const purchasePrice = extractValue(inputs.financing.purchasePrice);
  const municipalAssessment = inputs.financing.municipalAssessment 
    ? extractValue(inputs.financing.municipalAssessment) 
    : undefined;
  const downPayment = extractValue(inputs.financing.downPayment);
  const interestRate = extractValue(inputs.financing.interestRate);
  const amortization = extractValue(inputs.financing.amortizationYears);
  const frequency = inputs.financing.paymentFrequency;
  const appreciationRate = extractValue(inputs.financing.annualAppreciationRate);

  const notaryFees = extractValue(inputs.acquisitionFees.notaryFees);
  const otherFees = extractValue(inputs.acquisitionFees.other);

  // Collecte des sources
  const revenueSources = [
    extractSource(inputs.revenue.averageDailyRate),
    extractSource(inputs.revenue.occupancyRate),
  ].filter(Boolean) as SourceInfo[];

  const financingSources = [
    extractSource(inputs.financing.purchasePrice),
    extractSource(inputs.financing.downPayment),
    extractSource(inputs.financing.interestRate),
    extractSource(inputs.financing.amortizationYears),
  ].filter(Boolean) as SourceInfo[];

  const appreciationSources = [
    extractSource(inputs.financing.purchasePrice),
    extractSource(inputs.financing.annualAppreciationRate),
  ].filter(Boolean) as SourceInfo[];

  const transferDutiesSources = [
    extractSource(inputs.financing.purchasePrice),
    inputs.financing.municipalAssessment ? extractSource(inputs.financing.municipalAssessment) : undefined,
  ].filter(Boolean) as SourceInfo[];

  const feesSources = [
    extractSource(inputs.acquisitionFees.notaryFees),
    extractSource(inputs.acquisitionFees.other),
  ].filter(Boolean) as SourceInfo[];

  // Calculs en cascade
  const nightsSold = calculateNightsSold(occupancy, daysPerYear);
  const annualRevenue = calculateAnnualRevenue(adr, nightsSold.value, revenueSources);
  const expenses = calculateExpenses(inputs.expenses, annualRevenue.value);
  const loanAmount = calculateLoanAmount(purchasePrice, downPayment, financingSources);
  const periodicPayment = calculatePeriodicPayment(
    loanAmount.value,
    interestRate,
    amortization,
    frequency,
    financingSources
  );
  const annualDebtService = calculateAnnualDebtService(
    periodicPayment.value,
    frequency,
    financingSources
  );
  const transferDuties = calculateTransferDuties(
    purchasePrice,
    municipalAssessment,
    transferDutiesSources
  );
  const totalAcquisitionFees = calculateTotalAcquisitionFees(
    transferDuties.value,
    notaryFees,
    otherFees,
    [...transferDutiesSources, ...feesSources]
  );
  const initialInvestment = calculateInitialInvestment(
    downPayment,
    totalAcquisitionFees.value,
    [...financingSources, ...feesSources]
  );
  const annualCashflow = calculateAnnualCashflow(
    annualRevenue.value,
    expenses.total,
    annualDebtService.value
  );
  const principalPaidFirstYear = calculatePrincipalPaidFirstYear(
    loanAmount.value,
    interestRate,
    frequency,
    periodicPayment.value,
    financingSources
  );
  const propertyAppreciation = calculatePropertyAppreciation(
    purchasePrice,
    appreciationRate,
    appreciationSources
  );
  
  // Calculs des ROI
  const cashflowROI = calculateROI(annualCashflow.value, initialInvestment.value, 'Cashflow');
  const capitalizationROI = calculateROI(principalPaidFirstYear.value, initialInvestment.value, 'Capitalisation');
  const appreciationROI = calculateROI(propertyAppreciation.value, initialInvestment.value, 'Plus-value');
  const totalProfit = annualCashflow.value + principalPaidFirstYear.value + propertyAppreciation.value;
  const totalROI = calculateROI(totalProfit, initialInvestment.value, 'Total');
  
  const cashOnCash = calculateCashOnCash(annualCashflow.value, initialInvestment.value);
  const capRate = calculateCapRate(annualRevenue.value, expenses.total, purchasePrice);

  // Construction du résultat
  return {
    nightsSold: nightsSold.value,
    annualRevenue: annualRevenue.value,
    totalExpenses: expenses.total,
    expensesByCategory: expenses.byCategory,
    loanAmount: loanAmount.value,
    periodicPayment: periodicPayment.value,
    annualDebtService: annualDebtService.value,
    transferDuties: transferDuties.value,
    totalAcquisitionFees: totalAcquisitionFees.value,
    initialInvestment: initialInvestment.value,
    annualCashflow: annualCashflow.value,
    principalPaidFirstYear: principalPaidFirstYear.value,
    propertyAppreciation: propertyAppreciation.value,
    cashflowROI: cashflowROI.value,
    capitalizationROI: capitalizationROI.value,
    appreciationROI: appreciationROI.value,
    totalROI: totalROI.value,
    cashOnCash: cashOnCash.value,
    capRate: capRate.value,
    traces: {
      nightsSold: nightsSold.trace,
      annualRevenue: annualRevenue.trace,
      totalExpenses: {
        formula: 'Dépenses totales = Somme de toutes les lignes de dépenses',
        variables: Object.fromEntries(
          expenses.traces.map((t, i) => [`Ligne ${i + 1}`, t.result])
        ),
        result: expenses.total,
        sources: expenses.sources.length > 0 ? expenses.sources : undefined,
      },
      loanAmount: loanAmount.trace,
      periodicPayment: periodicPayment.trace,
      annualDebtService: annualDebtService.trace,
      transferDuties: transferDuties.trace,
      totalAcquisitionFees: totalAcquisitionFees.trace,
      initialInvestment: initialInvestment.trace,
      annualCashflow: annualCashflow.trace,
      principalPaidFirstYear: principalPaidFirstYear.trace,
      propertyAppreciation: propertyAppreciation.trace,
      cashflowROI: cashflowROI.trace,
      capitalizationROI: capitalizationROI.trace,
      appreciationROI: appreciationROI.trace,
      totalROI: totalROI.trace,
      cashOnCash: cashOnCash.trace,
      capRate: capRate.trace,
    },
  };
}

// ============================================================================
// UTILITAIRE POUR RÉCUPÉRER UNE VALEUR PAR CHEMIN
// ============================================================================

// Parser un segment de path pour extraire le nom et l'index si c'est un tableau
function parsePathSegment(segment: string): { name: string; index: number | null } {
  const match = segment.match(/^(.+?)\[(\d+)\]$/);
  if (match) {
    return { name: match[1], index: parseInt(match[2], 10) };
  }
  return { name: segment, index: null };
}

export function getValueByPath(inputs: ProjectInputs, path: string): number {
  const parts = path.split('.');
  let current: any = inputs;

  for (const part of parts) {
    if (current === undefined || current === null) {
      return 0;
    }
    
    const { name, index } = parsePathSegment(part);
    current = current[name];
    
    if (index !== null) {
      if (Array.isArray(current) && index < current.length) {
        current = current[index];
      } else {
        return 0;
      }
    }
  }

  return extractValue(current);
}

export function setValueByPath(inputs: ProjectInputs, path: string, value: number): ProjectInputs {
  const parts = path.split('.');
  // Utiliser structuredClone si disponible, sinon fallback sur JSON
  const newInputs = typeof structuredClone !== 'undefined' 
    ? structuredClone(inputs) 
    : JSON.parse(JSON.stringify(inputs));
  let current: any = newInputs;

  for (let i = 0; i < parts.length - 1; i++) {
    const { name, index } = parsePathSegment(parts[i]);
    current = current[name];
    
    if (index !== null && Array.isArray(current)) {
      current = current[index];
    }
  }

  const lastPart = parts[parts.length - 1];
  const { name: lastName, index: lastIndex } = parsePathSegment(lastPart);
  
  if (lastIndex !== null) {
    // C'est un tableau
    if (Array.isArray(current[lastName]) && lastIndex < current[lastName].length) {
      if (typeof current[lastName][lastIndex] === 'object' && 'value' in current[lastName][lastIndex]) {
        // Si useRange est activé, modifier range.default au lieu de value
        if ('range' in current[lastName][lastIndex] && current[lastName][lastIndex].range?.useRange) {
          current[lastName][lastIndex].range.default = value;
        } else {
          current[lastName][lastIndex].value = value;
        }
      } else {
        current[lastName][lastIndex] = value;
      }
    }
  } else {
    // C'est un objet simple
    if (typeof current[lastName] === 'object' && 'value' in current[lastName]) {
      // Si useRange est activé, modifier range.default au lieu de value
      if ('range' in current[lastName] && current[lastName].range?.useRange) {
        current[lastName].range.default = value;
      } else {
        current[lastName].value = value;
      }
    } else {
      current[lastName] = value;
    }
  }

  return newInputs;
}

