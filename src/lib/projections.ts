import type {
  ProjectInputs,
  ProjectionResult,
  YearProjection,
  ExitScenario,
  PaymentFrequency,
  ExpenseLine,
} from '../types';
import { ExpenseType } from '../types';
import { calculateKPIs } from './calculations';
import { DEFAULT_PROJECTION_SETTINGS } from './constants';

// ============================================================================
// UTILITAIRES
// ============================================================================

function round(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function extractValue(input: any): number {
  if (typeof input === 'object' && input !== null && 'value' in input) {
    if ('range' in input && input.range && input.range.useRange) {
      return input.range.default as number;
    }
    return input.value as number;
  }
  return input as number;
}

function getPaymentsPerYear(frequency: PaymentFrequency): number {
  switch (frequency) {
    case 'MONTHLY':
      return 12;
    case 'BI_WEEKLY':
      return 26;
    case 'WEEKLY':
      return 52;
    case 'ANNUAL':
      return 1;
    default:
      return 12;
  }
}

// ============================================================================
// CALCUL DU TRI (IRR - Internal Rate of Return)
// ============================================================================

/**
 * Calcule le TRI en utilisant la méthode de Newton-Raphson
 * @param cashflows Flux de trésorerie (négatif pour investissement initial, positif pour retours)
 * @param guess Estimation initiale (par défaut 0.1 = 10%)
 * @param maxIterations Nombre maximum d'itérations
 * @param tolerance Tolérance pour la convergence
 */
function calculateIRR(
  cashflows: number[],
  guess: number = 0.1,
  maxIterations: number = 100,
  tolerance: number = 0.000001
): number {
  let rate = guess;
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let npv = 0;
    let dnpv = 0; // Dérivée de NPV
    
    for (let i = 0; i < cashflows.length; i++) {
      npv += cashflows[i] / Math.pow(1 + rate, i);
      dnpv += (-i * cashflows[i]) / Math.pow(1 + rate, i + 1);
    }
    
    const newRate = rate - npv / dnpv;
    
    if (Math.abs(newRate - rate) < tolerance) {
      return round(newRate * 100, 2); // Retourner en pourcentage
    }
    
    rate = newRate;
  }
  
  // Si pas de convergence, retourner 0
  return 0;
}

// ============================================================================
// CALCUL DE LA SCHEDULE D'AMORTIZATION
// ============================================================================

interface AmortizationPayment {
  year: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

function generateAmortizationSchedule(
  loanAmount: number,
  annualRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency,
  projectionYears: number
): AmortizationPayment[] {
  const paymentsPerYear = getPaymentsPerYear(frequency);
  const totalPayments = amortizationYears * paymentsPerYear;
  const periodicRate = annualRate / 100 / paymentsPerYear;
  
  // Calcul du paiement périodique
  let periodicPayment = 0;
  if (periodicRate === 0) {
    periodicPayment = loanAmount / totalPayments;
  } else {
    periodicPayment =
      (loanAmount * periodicRate * Math.pow(1 + periodicRate, totalPayments)) /
      (Math.pow(1 + periodicRate, totalPayments) - 1);
  }
  
  const schedule: AmortizationPayment[] = [];
  let remainingBalance = loanAmount;
  
  for (let year = 1; year <= projectionYears; year++) {
    let yearlyPrincipal = 0;
    let yearlyInterest = 0;
    
    // Calculer tous les paiements de l'année
    for (let payment = 0; payment < paymentsPerYear; payment++) {
      if (remainingBalance <= 0) break;
      
      const interestPayment = remainingBalance * periodicRate;
      const principalPayment = Math.min(periodicPayment - interestPayment, remainingBalance);
      
      yearlyInterest += interestPayment;
      yearlyPrincipal += principalPayment;
      remainingBalance -= principalPayment;
    }
    
    schedule.push({
      year,
      payment: round(periodicPayment * paymentsPerYear),
      principal: round(yearlyPrincipal),
      interest: round(yearlyInterest),
      balance: round(Math.max(0, remainingBalance)),
    });
  }
  
  return schedule;
}

// ============================================================================
// CALCUL DES DÉPENSES POUR UNE ANNÉE SPÉCIFIQUE
// ============================================================================

/**
 * Calcule les dépenses totales pour une année donnée dans les projections.
 * Recalcule les dépenses basées sur la valeur de la propriété avec la valeur de l'année courante,
 * et applique l'escalade uniquement aux dépenses fixes.
 */
function calculateExpensesForProjectionYear(
  expenseLines: ExpenseLine[],
  annualRevenue: number,
  propertyValue: number,
  expenseFactor: number
): number {
  let total = 0;

  expenseLines.forEach((line) => {
    const amount = extractValue(line.amount);
    let annualAmount = 0;

    switch (line.type) {
      case ExpenseType.FIXED_ANNUAL:
        // Dépense fixe : appliquer l'escalade
        annualAmount = amount * expenseFactor;
        break;

      case ExpenseType.FIXED_MONTHLY:
        // Dépense mensuelle : appliquer l'escalade
        annualAmount = (amount * 12) * expenseFactor;
        break;

      case ExpenseType.PERCENTAGE_REVENUE:
        // Pourcentage des revenus : pas d'escalade (déjà dans les revenus)
        annualAmount = (annualRevenue * amount) / 100;
        break;

      case ExpenseType.PERCENTAGE_PROPERTY_VALUE:
        // Pourcentage de la valeur : recalculer avec la valeur de l'année courante
        // PAS d'escalade car déjà intégrée dans propertyValue
        annualAmount = (propertyValue * amount) / 100;
        break;
    }

    total += round(annualAmount);
  });

  return round(total);
}

// ============================================================================
// CALCUL DU BREAK-EVEN OCCUPANCY
// ============================================================================

function calculateBreakEvenOccupancy(inputs: ProjectInputs): number {
  const adr: number = extractValue(inputs.revenue.averageDailyRate);
  const daysPerYear = inputs.revenue.daysPerYear || 365;
  
  // Calculer les KPIs avec 0% d'occupation pour avoir les coûts fixes
  const baseKPIs = calculateKPIs(inputs);
  
  // Les coûts totaux annuels (dépenses + service de dette)
  const totalAnnualCosts = baseKPIs.totalExpenses + baseKPIs.annualDebtService;
  
  // Revenus nécessaires pour break-even
  const requiredRevenue = totalAnnualCosts;
  
  // Nuitées nécessaires
  const requiredNights = requiredRevenue / adr;
  
  // Taux d'occupation break-even
  const breakEvenRate = (requiredNights / daysPerYear) * 100;
  
  return round(Math.min(100, Math.max(0, breakEvenRate)), 2);
}

// ============================================================================
// CALCUL DES PROJECTIONS MULTI-ANNÉES
// ============================================================================

export function calculateProjections(
  inputs: ProjectInputs,
  numberOfYears: number
): ProjectionResult {
  // Extraire les paramètres de projection ou utiliser les valeurs par défaut
  const settings = inputs.projectionSettings;
  const revenueEscalation = settings
    ? extractValue(settings.revenueEscalationRate)
    : DEFAULT_PROJECTION_SETTINGS.REVENUE_ESCALATION_RATE;
  const expenseEscalation = settings
    ? extractValue(settings.expenseEscalationRate)
    : DEFAULT_PROJECTION_SETTINGS.EXPENSE_ESCALATION_RATE;
  const capexRate = settings
    ? extractValue(settings.capexRate)
    : DEFAULT_PROJECTION_SETTINGS.CAPEX_RATE;
  const discountRate = settings
    ? extractValue(settings.discountRate)
    : DEFAULT_PROJECTION_SETTINGS.DISCOUNT_RATE;
  const saleCostsRate = settings
    ? extractValue(settings.saleCostsRate)
    : DEFAULT_PROJECTION_SETTINGS.SALE_COSTS_RATE;
  
  // Extraire les paramètres de base
  const purchasePrice: number = extractValue(inputs.financing.purchasePrice);
  const interestRate: number = extractValue(inputs.financing.interestRate);
  const amortizationYears: number = extractValue(inputs.financing.amortizationYears);
  const appreciationRate: number = extractValue(inputs.financing.annualAppreciationRate);
  const frequency = inputs.financing.paymentFrequency;
  
  // Calculer les KPIs de l'année 1
  const year1KPIs = calculateKPIs(inputs);
  const initialInvestment = year1KPIs.initialInvestment;
  const loanAmount = year1KPIs.loanAmount;
  
  // Générer le schedule d'amortization
  const amortizationSchedule = generateAmortizationSchedule(
    loanAmount,
    interestRate,
    amortizationYears,
    frequency,
    numberOfYears
  );
  
  // Initialiser les variables cumulatives
  let cumulativeCashflow = 0;
  let cumulativePrincipalPaid = 0;
  let cumulativeAppreciation = 0;
  let cumulativeTotalProfit = 0;
  let cumulativeCapex = 0;
  
  const years: YearProjection[] = [];
  
  for (let year = 1; year <= numberOfYears; year++) {
    // Facteur d'escalade pour les revenus et dépenses
    const revenueFactor = Math.pow(1 + revenueEscalation / 100, year - 1);
    const expenseFactor = Math.pow(1 + expenseEscalation / 100, year - 1);
    
    // Valeur de la propriété avec appréciation
    const propertyValue = round(purchasePrice * Math.pow(1 + appreciationRate / 100, year));
    
    // Revenus ajustés
    const revenue = round(year1KPIs.annualRevenue * revenueFactor);
    
    // Dépenses recalculées pour cette année (tient compte des différents types)
    const expenses = calculateExpensesForProjectionYear(
      inputs.expenses,
      revenue,
      propertyValue,
      expenseFactor
    );
    
    // CAPEX (dépenses en capital)
    const capex = round(propertyValue * (capexRate / 100));
    cumulativeCapex += capex;
    
    // NOI (Net Operating Income)
    const noi = round(revenue - expenses);
    
    // Service de la dette (du schedule d'amortization)
    const amortPayment = amortizationSchedule[year - 1];
    const debtService = amortPayment.payment;
    const interestPaid = amortPayment.interest;
    const principalPaid = amortPayment.principal;
    const mortgageBalance = amortPayment.balance;
    
    // Cashflow (après CAPEX)
    const cashflow = round(noi - debtService - capex);
    cumulativeCashflow += cashflow;
    
    // Capitalisation cumulée
    cumulativePrincipalPaid += principalPaid;
    
    // Appréciation de l'année
    const yearAppreciation = round(
      year === 1
        ? propertyValue - purchasePrice
        : propertyValue - round(purchasePrice * Math.pow(1 + appreciationRate / 100, year - 1))
    );
    cumulativeAppreciation += yearAppreciation;
    
    // Équité
    const equity = round(propertyValue - mortgageBalance);
    
    // Métriques bancaires
    const dscr = debtService > 0 ? round(noi / debtService, 2) : 999;
    const ltv = propertyValue > 0 ? round((mortgageBalance / propertyValue) * 100, 2) : 0;
    
    // Profit total annuel
    const totalProfit = round(cashflow + principalPaid + yearAppreciation);
    cumulativeTotalProfit += totalProfit;
    
    // ROI
    const roiCashflow = initialInvestment > 0 ? round((cumulativeCashflow / initialInvestment) * 100, 2) : 0;
    const roiTotal = initialInvestment > 0 ? round((cumulativeTotalProfit / initialInvestment) * 100, 2) : 0;
    const roe = equity > 0 ? round((totalProfit / equity) * 100, 2) : 0;
    
    // NPV (valeur actuelle nette du cashflow de cette année)
    const npv = round(cashflow / Math.pow(1 + discountRate / 100, year));
    
    years.push({
      year,
      revenue,
      expenses,
      capex,
      noi,
      debtService,
      interestPaid,
      principalPaid,
      cashflow,
      cumulativeCashflow: round(cumulativeCashflow),
      cumulativePrincipalPaid: round(cumulativePrincipalPaid),
      mortgageBalance,
      propertyValue,
      equity,
      dscr,
      ltv,
      appreciation: yearAppreciation,
      cumulativeAppreciation: round(cumulativeAppreciation),
      totalProfit,
      cumulativeTotalProfit: round(cumulativeTotalProfit),
      roiCashflow,
      roiTotal,
      roe,
      npv,
    });
  }
  
  // Calculer les scénarios de sortie
  const exitYears = [5, 10, 15, 20, numberOfYears].filter(y => y <= numberOfYears);
  const exitScenarios: ExitScenario[] = exitYears.map(year => {
    const yearData = years[year - 1];
    const salePrice = round(yearData.propertyValue * (1 - saleCostsRate / 100));
    const netProceeds = round(salePrice - yearData.mortgageBalance);
    const totalInvested = round(initialInvestment + cumulativeCapex);
    const netProfit = round(netProceeds - totalInvested + yearData.cumulativeCashflow);
    const moic = totalInvested > 0 ? round(netProfit / totalInvested, 2) : 0;
    
    // Calculer l'IRR pour ce scénario de sortie
    const cashflows: number[] = [-initialInvestment];
    for (let y = 1; y <= year; y++) {
      const yearCashflow = years[y - 1].cashflow - years[y - 1].capex;
      if (y === year) {
        // Dernière année : ajouter le produit de la vente
        cashflows.push(yearCashflow + netProceeds);
      } else {
        cashflows.push(yearCashflow);
      }
    }
    const irr = calculateIRR(cashflows);
    
    return {
      year,
      propertyValue: yearData.propertyValue,
      salePrice,
      mortgageBalance: yearData.mortgageBalance,
      netProceeds,
      totalInvested,
      netProfit,
      moic,
      irr,
    };
  });
  
  // Calculer l'IRR global (sur toute la période)
  const cashflowsForIRR: number[] = [-initialInvestment];
  for (let i = 0; i < years.length; i++) {
    const yearCashflow = years[i].cashflow - years[i].capex;
    if (i === years.length - 1) {
      // Dernière année : ajouter la valeur de sortie
      const lastExitScenario = exitScenarios[exitScenarios.length - 1];
      cashflowsForIRR.push(yearCashflow + lastExitScenario.netProceeds);
    } else {
      cashflowsForIRR.push(yearCashflow);
    }
  }
  const globalIRR = calculateIRR(cashflowsForIRR);
  
  // Calculer les payback periods
  let paybackPeriodCashflow: number | null = null;
  let paybackPeriodTotal: number | null = null;
  
  for (let i = 0; i < years.length; i++) {
    if (paybackPeriodCashflow === null && years[i].cumulativeCashflow > 0) {
      paybackPeriodCashflow = years[i].year;
    }
    if (paybackPeriodTotal === null && years[i].cumulativeTotalProfit > initialInvestment) {
      paybackPeriodTotal = years[i].year;
    }
  }
  
  // Calculer les métriques agrégées
  const totalReturn = years[years.length - 1].cumulativeTotalProfit;
  const averageAnnualReturn = round(totalReturn / numberOfYears);
  const averageROE = round(
    years.reduce((sum, y) => sum + y.roe, 0) / numberOfYears,
    2
  );
  
  const minDSCR = Math.min(...years.map(y => y.dscr));
  const maxLTV = Math.max(...years.map(y => y.ltv));
  
  // Calculer le break-even occupancy
  const breakEvenOccupancy = calculateBreakEvenOccupancy(inputs);
  
  return {
    years,
    paybackPeriodCashflow,
    paybackPeriodTotal,
    irr: globalIRR,
    totalReturn,
    averageAnnualReturn,
    averageROE,
    exitScenarios,
    breakEvenOccupancy,
    minDSCR: round(minDSCR, 2),
    maxLTV: round(maxLTV, 2),
  };
}

