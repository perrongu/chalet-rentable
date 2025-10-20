import type { MetricAdvice } from '../components/ui/MetricExplanationModal';
import type { ProjectInputs, ProjectionResult } from '../types';
import { formatCurrency } from './utils';

// ============================================================================
// CONSEILS POUR DSCR (Debt Service Coverage Ratio)
// ============================================================================

function extractValue(input: any): number {
  if (typeof input === 'object' && input !== null && 'value' in input) {
    if ('range' in input && input.range && input.range.useRange) {
      return input.range.default as number;
    }
    return input.value as number;
  }
  return input as number;
}

export function getDSCRAdvice(
  minDSCR: number,
  inputs: ProjectInputs,
  projection?: ProjectionResult
): MetricAdvice[] {
  const advice: MetricAdvice[] = [];
  
  // Si DSCR est bon, félicitations
  if (minDSCR >= 1.5) {
    advice.push({
      icon: '✅',
      action: 'Excellent DSCR !',
      impact: 'Ton ratio est solide. Les banques adorent voir un DSCR > 1.5. Tu as une belle marge de sécurité.',
      priority: 'low',
    });
    return advice;
  }
  
  if (minDSCR >= 1.25) {
    advice.push({
      icon: '✓',
      action: 'DSCR acceptable',
      impact: 'Tu respectes le seuil bancaire standard. Pour plus de sécurité, vise 1.4+.',
      priority: 'low',
    });
    return advice;
  }

  // DSCR problématique - calculer les solutions
  const purchasePrice = extractValue(inputs.financing.purchasePrice);
  const currentDownPayment = extractValue(inputs.financing.downPayment);
  const interestRate = extractValue(inputs.financing.interestRate);
  const amortizationYears = extractValue(inputs.financing.amortizationYears);
  const loanAmount = purchasePrice - currentDownPayment;
  
  // Solution 1 : Augmenter la mise de fonds
  const targetDSCR = 1.25;
  const currentNOI = projection?.years[0]?.noi || 0;
  const maxDebtService = currentNOI / targetDSCR;
  
  // Calculer le montant de prêt maximum pour atteindre DSCR 1.25
  const paymentsPerYear = 12; // Simplifié
  const periodicRate = interestRate / 100 / paymentsPerYear;
  const totalPayments = amortizationYears * paymentsPerYear;
  
  let maxLoanAmount = 0;
  if (periodicRate === 0) {
    maxLoanAmount = (maxDebtService / paymentsPerYear) * totalPayments;
  } else {
    maxLoanAmount =
      maxDebtService /
      ((periodicRate * Math.pow(1 + periodicRate, totalPayments)) /
        (Math.pow(1 + periodicRate, totalPayments) - 1) /
        paymentsPerYear);
  }
  
  const additionalDownPaymentNeeded = Math.max(0, loanAmount - maxLoanAmount);
  
  if (additionalDownPaymentNeeded > 0) {
    const newDownPayment = currentDownPayment + additionalDownPaymentNeeded;
    const newDownPaymentPercent = (newDownPayment / purchasePrice) * 100;
    
    advice.push({
      icon: '💰',
      action: 'Augmenter la mise de fonds',
      impact: `Passe de ${formatCurrency(currentDownPayment)} à ${formatCurrency(newDownPayment)} (${newDownPaymentPercent.toFixed(1)}% du prix). Cela réduira ton service de dette et améliorera ton DSCR à ~${targetDSCR.toFixed(2)}.`,
      priority: 'high',
    });
  }
  
  // Solution 2 : Augmenter les revenus
  const currentRevenue = projection?.years[0]?.revenue || extractValue(inputs.revenue.averageDailyRate) * 
    (extractValue(inputs.revenue.occupancyRate) / 100) * (inputs.revenue.daysPerYear || 365);
  const currentExpenses = projection?.years[0]?.expenses || 0;
  const currentDebtService = projection?.years[0]?.debtService || 0;
  
  const targetNOI = currentDebtService * targetDSCR;
  const revenueIncrease = targetNOI - currentNOI;
  const revenueIncreasePercent = (revenueIncrease / currentRevenue) * 100;
  
  if (revenueIncrease > 0 && revenueIncreasePercent < 50) {
    const currentADR = extractValue(inputs.revenue.averageDailyRate);
    const newADR = currentADR * (1 + revenueIncreasePercent / 100);
    const adrIncrease = newADR - currentADR;
    
    advice.push({
      icon: '📈',
      action: 'Augmenter les revenus',
      impact: `Augmente ton ADR de ${formatCurrency(adrIncrease)} (de ${formatCurrency(currentADR)} à ${formatCurrency(newADR)}) ou améliore ton taux d'occupation. Cela augmenterait tes revenus de ${revenueIncreasePercent.toFixed(1)}% et ton DSCR à ~${targetDSCR.toFixed(2)}.`,
      priority: revenueIncreasePercent < 15 ? 'high' : 'medium',
    });
  }
  
  // Solution 3 : Réduire les dépenses
  const expenseReduction = revenueIncrease;
  const expenseReductionPercent = (expenseReduction / currentExpenses) * 100;
  
  if (expenseReduction > 0 && expenseReductionPercent < 40) {
    advice.push({
      icon: '✂️',
      action: 'Réduire les dépenses opérationnelles',
      impact: `Réduis tes dépenses de ${formatCurrency(expenseReduction)} (${expenseReductionPercent.toFixed(1)}%). Examine tes frais de gestion, d'entretien et d'assurance pour trouver des économies.`,
      priority: expenseReductionPercent < 20 ? 'medium' : 'low',
    });
  }
  
  // Solution 4 : Négocier le taux d'intérêt
  const newRate = interestRate - 0.5;
  if (newRate > 0) {
    advice.push({
      icon: '🏦',
      action: 'Négocier un meilleur taux d\'intérêt',
      impact: `Un taux à ${newRate.toFixed(2)}% au lieu de ${interestRate.toFixed(2)}% réduirait ton service de dette. Magasine chez plusieurs prêteurs ou utilise un courtier.`,
      priority: 'medium',
    });
  }

  return advice;
}

// ============================================================================
// CONSEILS POUR LTV (Loan-to-Value)
// ============================================================================

export function getLTVAdvice(
  maxLTV: number,
  inputs: ProjectInputs
): MetricAdvice[] {
  const advice: MetricAdvice[] = [];
  
  // Si LTV est excellent
  if (maxLTV <= 65) {
    advice.push({
      icon: '🌟',
      action: 'LTV excellent !',
      impact: 'Tu as une forte équité dans la propriété. Cela te donne flexibilité et sécurité. Tu pourrais même refinancer facilement si nécessaire.',
      priority: 'low',
    });
    return advice;
  }
  
  // Si LTV est bon
  if (maxLTV <= 75) {
    advice.push({
      icon: '✓',
      action: 'LTV optimal',
      impact: 'Tu es dans la zone idéale pour les banques. Bel équilibre entre levier et sécurité.',
      priority: 'low',
    });
    return advice;
  }
  
  // LTV problématique
  const purchasePrice = extractValue(inputs.financing.purchasePrice);
  const currentDownPayment = extractValue(inputs.financing.downPayment);
  
  // Solution 1 : Augmenter la mise de fonds pour atteindre 75% LTV
  const targetLTV = 75;
  const targetLoanAmount = purchasePrice * (targetLTV / 100);
  const targetDownPayment = purchasePrice - targetLoanAmount;
  const additionalDownPayment = targetDownPayment - currentDownPayment;
  const targetDownPaymentPercent = (targetDownPayment / purchasePrice) * 100;
  
  if (additionalDownPayment > 0) {
    advice.push({
      icon: '💰',
      action: 'Augmenter la mise de fonds',
      impact: `Ajoute ${formatCurrency(additionalDownPayment)} à ta mise de fonds (total ${formatCurrency(targetDownPayment)} = ${targetDownPaymentPercent.toFixed(1)}%) pour atteindre ${targetLTV}% LTV optimal.`,
      priority: maxLTV > 85 ? 'high' : 'medium',
    });
  }
  
  // Solution 2 : Accélérer le remboursement du capital
  advice.push({
    icon: '🏃',
    action: 'Accélérer le remboursement',
    impact: 'Fais des paiements additionnels sur le capital quand tu as des cashflows positifs. Ton LTV diminuera plus rapidement et tu bâtiras de l\'équité.',
    priority: 'medium',
  });
  
  // Solution 3 : Refinancer après appréciation
  const appreciationRate = extractValue(inputs.financing.annualAppreciationRate);
  if (appreciationRate > 0) {
    const yearsNeeded = Math.ceil(Math.log((maxLTV / targetLTV)) / Math.log(1 + appreciationRate / 100));
    
    advice.push({
      icon: '📊',
      action: 'Profiter de l\'appréciation',
      impact: `Avec ${appreciationRate.toFixed(1)}% d'appréciation annuelle, ton LTV devrait descendre à ${targetLTV}% naturellement en ~${yearsNeeded} ans grâce à la hausse de valeur et au remboursement du capital.`,
      priority: 'low',
    });
  }
  
  // Avertissement si LTV très élevé
  if (maxLTV > 85) {
    advice.push({
      icon: '⚠️',
      action: 'Attention au risque',
      impact: 'Un LTV > 85% limite tes options de refinancement et augmente ton risque en cas de baisse du marché. Priorise la réduction de ta dette.',
      priority: 'high',
    });
  }

  return advice;
}

// ============================================================================
// CONSEILS POUR BREAK-EVEN OCCUPANCY
// ============================================================================

export function getBreakEvenOccupancyAdvice(
  breakEvenOccupancy: number,
  inputs: ProjectInputs
): MetricAdvice[] {
  const advice: MetricAdvice[] = [];
  
  const currentOccupancy = extractValue(inputs.revenue.occupancyRate);
  const safetyMargin = currentOccupancy - breakEvenOccupancy;
  
  // Si marge excellente
  if (safetyMargin >= 25) {
    advice.push({
      icon: '🎯',
      action: 'Marge de sécurité excellente !',
      impact: `Tu as ${safetyMargin.toFixed(1)}% de marge. Même avec une baisse significative d'occupation, tu restes profitable.`,
      priority: 'low',
    });
    return advice;
  }
  
  // Si marge acceptable
  if (safetyMargin >= 15) {
    advice.push({
      icon: '✓',
      action: 'Bonne marge de sécurité',
      impact: `${safetyMargin.toFixed(1)}% de marge. C'est sain, mais surveille ton taux d'occupation.`,
      priority: 'low',
    });
    return advice;
  }
  
  // Marge faible ou négative
  const currentADR = extractValue(inputs.revenue.averageDailyRate);
  const daysPerYear = inputs.revenue.daysPerYear || 365;
  
  // Solution 1 : Augmenter l'ADR
  const targetMargin = 20; // Viser 20% de marge
  const targetOccupancy = breakEvenOccupancy + targetMargin;
  const adrIncrease = ((targetOccupancy - currentOccupancy) / currentOccupancy) * currentADR;
  const newADR = currentADR + adrIncrease;
  
  if (adrIncrease > 0) {
    advice.push({
      icon: '💵',
      action: 'Augmenter ton tarif moyen (ADR)',
      impact: `Augmente ton ADR de ${formatCurrency(Math.abs(adrIncrease))} (de ${formatCurrency(currentADR)} à ${formatCurrency(newADR)}) pour améliorer ta marge de sécurité sans changer l'occupation.`,
      priority: safetyMargin < 10 ? 'high' : 'medium',
    });
  }
  
  // Solution 2 : Réduire les dépenses
  const breakEvenRevenue = breakEvenOccupancy / 100 * daysPerYear * currentADR;
  const currentRevenue = currentOccupancy / 100 * daysPerYear * currentADR;
  const expenseReduction = (currentRevenue - breakEvenRevenue) * 0.2; // 20% des revenus excédentaires
  
  if (expenseReduction > 0) {
    advice.push({
      icon: '✂️',
      action: 'Optimiser les dépenses',
      impact: `Réduis tes dépenses de ${formatCurrency(expenseReduction)}/an. Cela abaisserait ton break-even et augmenterait ta marge de sécurité.`,
      priority: 'high',
    });
  }
  
  // Solution 3 : Améliorer le marketing
  advice.push({
    icon: '📱',
    action: 'Investir dans le marketing',
    impact: 'Améliore ton référencement Airbnb/VRBO, tes photos, et ta description. Un meilleur classement peut augmenter ton taux d\'occupation de 5-15%.',
    priority: safetyMargin < 10 ? 'high' : 'medium',
  });
  
  // Solution 4 : Réduire le service de dette
  const currentDownPayment = extractValue(inputs.financing.downPayment);
  const purchasePrice = extractValue(inputs.financing.purchasePrice);
  const downPaymentIncrease = purchasePrice * 0.05; // Augmenter de 5%
  const newDownPayment = currentDownPayment + downPaymentIncrease;
  
  advice.push({
    icon: '💰',
    action: 'Augmenter la mise de fonds',
    impact: `Passe à ${formatCurrency(newDownPayment)} de mise de fonds (${((newDownPayment / purchasePrice) * 100).toFixed(1)}%). Cela réduira ton service de dette et ton break-even.`,
    priority: 'medium',
  });
  
  // Avertissement si marge négative
  if (safetyMargin < 0) {
    advice.push({
      icon: '🚨',
      action: 'URGENT : Marge négative !',
      impact: `Ton taux d'occupation prévu (${currentOccupancy}%) est SOUS le break-even (${breakEvenOccupancy.toFixed(1)}%). Tu perdras de l'argent chaque mois. Révise tes hypothèses immédiatement !`,
      priority: 'high',
    });
  }

  return advice;
}

// ============================================================================
// FONCTION UTILITAIRE POUR OBTENIR LES EXPLICATIONS
// ============================================================================

export function getMetricExplanation(metric: 'dscr' | 'ltv' | 'breakeven'): string {
  switch (metric) {
    case 'dscr':
      return 'Le DSCR (Debt Service Coverage Ratio) mesure ta capacité à payer ton service de dette. Il compare ton revenu net d\'exploitation (NOI) à tes paiements hypothécaires annuels. Les banques exigent généralement un minimum de 1.25, ce qui signifie que ton NOI doit être au moins 25% supérieur à ton service de dette.';
    
    case 'ltv':
      return 'Le LTV (Loan-to-Value) est le ratio entre ton prêt hypothécaire et la valeur de la propriété. Un LTV élevé signifie moins d\'équité et plus de risque. Les banques préfèrent voir un LTV ≤ 75% pour les immeubles locatifs, car cela garantit que tu as suffisamment d\'équité en cas de baisse du marché.';
    
    case 'breakeven':
      return 'Le taux d\'occupation break-even est le niveau minimum d\'occupation nécessaire pour couvrir tes dépenses et ton service de dette (cashflow = 0). La différence entre ton occupation prévue et ton break-even est ta marge de sécurité. Plus cette marge est grande, plus tu peux absorber des périodes creuses.';
  }
}

