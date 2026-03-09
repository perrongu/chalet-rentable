import type { MetricAdvice } from "../components/ui/MetricExplanationModal";
import type { ProjectInputs, ProjectionResult } from "../types";
import { formatCurrency, getPaymentsPerYear } from "./utils";
import { extractValue } from "./calculations";
import { ADVICE_THRESHOLDS } from "./constants";

export function getDSCRAdvice(
  minDSCR: number,
  inputs: ProjectInputs,
  projection?: ProjectionResult,
): MetricAdvice[] {
  const advice: MetricAdvice[] = [];

  // Si DSCR est bon, félicitations
  if (minDSCR >= 1.5) {
    advice.push({
      icon: "✅",
      action: "Excellent DSCR !",
      impact:
        "Ton ratio est solide. Les banques adorent voir un DSCR > 1.5. Tu as une belle marge de sécurité.",
      priority: "low",
    });
    return advice;
  }

  if (minDSCR >= 1.25) {
    advice.push({
      icon: "✓",
      action: "DSCR acceptable",
      impact:
        "Tu respectes le seuil bancaire standard. Pour plus de sécurité, vise 1.4+.",
      priority: "low",
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
  const paymentsPerYear = getPaymentsPerYear(inputs.financing.paymentFrequency);
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
      icon: "💰",
      action: "Augmenter la mise de fonds",
      impact: `Passe de ${formatCurrency(currentDownPayment)} à ${formatCurrency(newDownPayment)} (${newDownPaymentPercent.toFixed(1)}% du prix). Cela réduira ton service de dette et améliorera ton DSCR à ~${targetDSCR.toFixed(2)}.`,
      priority: "high",
    });
  }

  // Solution 2 : Augmenter les revenus
  const currentRevenue =
    projection?.years[0]?.revenue ||
    extractValue(inputs.revenue.averageDailyRate) *
      (extractValue(inputs.revenue.occupancyRate) / 100) *
      (inputs.revenue.daysPerYear || 365);
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
      icon: "📈",
      action: "Augmenter les revenus",
      impact: `Augmente ton ADR de ${formatCurrency(adrIncrease)} (de ${formatCurrency(currentADR)} à ${formatCurrency(newADR)}) ou améliore ton taux d'occupation. Cela augmenterait tes revenus de ${revenueIncreasePercent.toFixed(1)}% et ton DSCR à ~${targetDSCR.toFixed(2)}.`,
      priority: revenueIncreasePercent < 15 ? "high" : "medium",
    });
  }

  // Solution 3 : Réduire les dépenses
  const expenseReduction = revenueIncrease;
  const expenseReductionPercent = (expenseReduction / currentExpenses) * 100;

  if (expenseReduction > 0 && expenseReductionPercent < 40) {
    advice.push({
      icon: "✂️",
      action: "Réduire les dépenses opérationnelles",
      impact: `Réduis tes dépenses de ${formatCurrency(expenseReduction)} (${expenseReductionPercent.toFixed(1)}%). Examine tes frais de gestion, d'entretien et d'assurance pour trouver des économies.`,
      priority: expenseReductionPercent < 20 ? "medium" : "low",
    });
  }

  // Solution 4 : Négocier le taux d'intérêt
  const newRate = interestRate - 0.5;
  if (newRate > 0) {
    advice.push({
      icon: "🏦",
      action: "Négocier un meilleur taux d'intérêt",
      impact: `Un taux à ${newRate.toFixed(2)}% au lieu de ${interestRate.toFixed(2)}% réduirait ton service de dette. Magasine chez plusieurs prêteurs ou utilise un courtier.`,
      priority: "medium",
    });
  }

  return advice;
}

// ============================================================================
// CONSEILS POUR LTV (Loan-to-Value)
// ============================================================================

export function getLTVAdvice(
  maxLTV: number,
  inputs: ProjectInputs,
): MetricAdvice[] {
  const advice: MetricAdvice[] = [];

  // Si LTV est excellent
  if (maxLTV <= 65) {
    advice.push({
      icon: "🌟",
      action: "LTV excellent !",
      impact:
        "Tu as une forte équité dans la propriété. Cela te donne flexibilité et sécurité. Tu pourrais même refinancer facilement si nécessaire.",
      priority: "low",
    });
    return advice;
  }

  // Si LTV est bon
  if (maxLTV <= 75) {
    advice.push({
      icon: "✓",
      action: "LTV optimal",
      impact:
        "Tu es dans la zone idéale pour les banques. Bel équilibre entre levier et sécurité.",
      priority: "low",
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
      icon: "💰",
      action: "Augmenter la mise de fonds",
      impact: `Ajoute ${formatCurrency(additionalDownPayment)} à ta mise de fonds (total ${formatCurrency(targetDownPayment)} = ${targetDownPaymentPercent.toFixed(1)}%) pour atteindre ${targetLTV}% LTV optimal.`,
      priority: maxLTV > 85 ? "high" : "medium",
    });
  }

  // Solution 2 : Accélérer le remboursement du capital
  advice.push({
    icon: "🏃",
    action: "Accélérer le remboursement",
    impact:
      "Fais des paiements additionnels sur le capital quand tu as des cashflows positifs. Ton LTV diminuera plus rapidement et tu bâtiras de l'équité.",
    priority: "medium",
  });

  // Solution 3 : Refinancer après appréciation
  const appreciationRate = extractValue(
    inputs.financing.annualAppreciationRate,
  );
  if (appreciationRate > 0) {
    const yearsNeeded = Math.ceil(
      Math.log(maxLTV / targetLTV) / Math.log(1 + appreciationRate / 100),
    );

    advice.push({
      icon: "📊",
      action: "Profiter de l'appréciation",
      impact: `Avec ${appreciationRate.toFixed(1)}% d'appréciation annuelle, ton LTV devrait descendre à ${targetLTV}% naturellement en ~${yearsNeeded} ans grâce à la hausse de valeur et au remboursement du capital.`,
      priority: "low",
    });
  }

  // Avertissement si LTV très élevé
  if (maxLTV > 85) {
    advice.push({
      icon: "⚠️",
      action: "Attention au risque",
      impact:
        "Un LTV > 85% limite tes options de refinancement et augmente ton risque en cas de baisse du marché. Priorise la réduction de ta dette.",
      priority: "high",
    });
  }

  return advice;
}

// ============================================================================
// CONSEILS POUR BREAK-EVEN OCCUPANCY
// ============================================================================

export function getBreakEvenOccupancyAdvice(
  breakEvenOccupancy: number,
  inputs: ProjectInputs,
): MetricAdvice[] {
  const advice: MetricAdvice[] = [];

  const currentOccupancy = extractValue(inputs.revenue.occupancyRate);
  const safetyMargin = currentOccupancy - breakEvenOccupancy;

  // Si marge excellente
  if (safetyMargin >= 25) {
    advice.push({
      icon: "🎯",
      action: "Marge de sécurité excellente !",
      impact: `Tu as ${safetyMargin.toFixed(1)}% de marge. Même avec une baisse significative d'occupation, tu restes profitable.`,
      priority: "low",
    });
    return advice;
  }

  // Si marge acceptable
  if (safetyMargin >= 15) {
    advice.push({
      icon: "✓",
      action: "Bonne marge de sécurité",
      impact: `${safetyMargin.toFixed(1)}% de marge. C'est sain, mais surveille ton taux d'occupation.`,
      priority: "low",
    });
    return advice;
  }

  // Marge faible ou négative
  const currentADR = extractValue(inputs.revenue.averageDailyRate);
  const daysPerYear = inputs.revenue.daysPerYear || 365;

  // Solution 1 : Augmenter l'ADR
  const targetMargin = 20; // Viser 20% de marge
  const targetOccupancy = breakEvenOccupancy + targetMargin;
  const adrIncrease =
    ((targetOccupancy - currentOccupancy) / currentOccupancy) * currentADR;
  const newADR = currentADR + adrIncrease;

  if (adrIncrease > 0) {
    advice.push({
      icon: "💵",
      action: "Augmenter ton tarif moyen (ADR)",
      impact: `Augmente ton ADR de ${formatCurrency(Math.abs(adrIncrease))} (de ${formatCurrency(currentADR)} à ${formatCurrency(newADR)}) pour améliorer ta marge de sécurité sans changer l'occupation.`,
      priority: safetyMargin < 10 ? "high" : "medium",
    });
  }

  // Solution 2 : Réduire les dépenses
  const breakEvenRevenue =
    (breakEvenOccupancy / 100) * daysPerYear * currentADR;
  const currentRevenue = (currentOccupancy / 100) * daysPerYear * currentADR;
  const expenseReduction = (currentRevenue - breakEvenRevenue) * 0.2; // 20% des revenus excédentaires

  if (expenseReduction > 0) {
    advice.push({
      icon: "✂️",
      action: "Optimiser les dépenses",
      impact: `Réduis tes dépenses de ${formatCurrency(expenseReduction)}/an. Cela abaisserait ton break-even et augmenterait ta marge de sécurité.`,
      priority: "high",
    });
  }

  // Solution 3 : Améliorer le marketing
  advice.push({
    icon: "📱",
    action: "Investir dans le marketing",
    impact:
      "Améliore ton référencement Airbnb/VRBO, tes photos, et ta description. Un meilleur classement peut augmenter ton taux d'occupation de 5-15%.",
    priority: safetyMargin < 10 ? "high" : "medium",
  });

  // Solution 4 : Réduire le service de dette
  const currentDownPayment = extractValue(inputs.financing.downPayment);
  const purchasePrice = extractValue(inputs.financing.purchasePrice);
  const downPaymentIncrease = purchasePrice * 0.05; // Augmenter de 5%
  const newDownPayment = currentDownPayment + downPaymentIncrease;

  advice.push({
    icon: "💰",
    action: "Augmenter la mise de fonds",
    impact: `Passe à ${formatCurrency(newDownPayment)} de mise de fonds (${((newDownPayment / purchasePrice) * 100).toFixed(1)}%). Cela réduira ton service de dette et ton break-even.`,
    priority: "medium",
  });

  // Avertissement si marge négative
  if (safetyMargin < 0) {
    advice.push({
      icon: "🚨",
      action: "URGENT : Marge négative !",
      impact: `Ton taux d'occupation prévu (${currentOccupancy}%) est SOUS le break-even (${breakEvenOccupancy.toFixed(1)}%). Tu perdras de l'argent chaque mois. Révise tes hypothèses immédiatement !`,
      priority: "high",
    });
  }

  return advice;
}

// ============================================================================
// CONSEILS POUR MOIC (Multiple on Invested Capital)
// ============================================================================

export function getMOICAdvice(
  moic: number,
  year: number,
  inputs: ProjectInputs,
): MetricAdvice[] {
  const advice: MetricAdvice[] = [];

  // Si MOIC est excellent
  if (moic >= ADVICE_THRESHOLDS.MOIC.EXCELLENT) {
    advice.push({
      icon: "🚀",
      action: "MOIC excellent !",
      impact: `Un multiple de ${moic.toFixed(2)}x sur ${year} ans est exceptionnel. Tu génères ${((moic - 1) * 100).toFixed(0)}% de profit sur ton investissement total.`,
      priority: "low",
    });
    return advice;
  }

  // Si MOIC est bon
  if (moic >= ADVICE_THRESHOLDS.MOIC.GOOD) {
    advice.push({
      icon: "✅",
      action: "Bon MOIC",
      impact: `Un multiple de ${moic.toFixed(2)}x est solide. Tu doubles ton investissement sur ${year} ans.`,
      priority: "low",
    });
    return advice;
  }

  // Si MOIC est acceptable mais perfectible
  if (moic >= ADVICE_THRESHOLDS.MOIC.ACCEPTABLE) {
    advice.push({
      icon: "⚠️",
      action: "MOIC acceptable mais peut être amélioré",
      impact: `Avec ${moic.toFixed(2)}x, tu es profitable mais en-dessous du seuil optimal (${ADVICE_THRESHOLDS.MOIC.GOOD}x). Sur ${year} ans, ton profit est de ${((moic - 1) * 100).toFixed(0)}%.`,
      priority: "medium",
    });
  } else {
    // MOIC négatif - perte
    advice.push({
      icon: "🚨",
      action: "MOIC négatif - PERTE",
      impact: `Avec ${moic.toFixed(2)}x, tu perds de l'argent sur cet investissement. Une vente à l'année ${year} n'est pas rentable.`,
      priority: "high",
    });
  }

  // Solutions pour améliorer le MOIC
  const currentADR = extractValue(inputs.revenue.averageDailyRate);

  // Solution 1 : Augmenter les revenus
  const revenueIncreaseNeeded = ADVICE_THRESHOLDS.REVENUE_INCREASE_TARGET;
  const newADR = currentADR * (1 + revenueIncreaseNeeded / 100);

  advice.push({
    icon: "💵",
    action: "Augmenter tes revenus",
    impact: `Passe ton ADR de ${formatCurrency(currentADR)} à ${formatCurrency(newADR)} (+${revenueIncreaseNeeded}%). Cela améliorerait significativement ton MOIC en augmentant tes cashflows cumulés.`,
    priority: moic < ADVICE_THRESHOLDS.MOIC.ACCEPTABLE ? "high" : "medium",
  });

  // Solution 2 : Réduire les coûts initiaux
  const currentDownPayment = extractValue(inputs.financing.downPayment);

  if (moic < 1.5) {
    // Entre 1.0 et 2.0
    advice.push({
      icon: "💰",
      action: "Optimiser ton financement",
      impact: `Réduis ta mise de fonds initiale (actuellement ${formatCurrency(currentDownPayment)}) pour augmenter ton effet de levier. Attention : cela augmente aussi le risque et peut impacter ton DSCR.`,
      priority: "medium",
    });
  }

  // Solution 3 : Vendre plus tard
  if (year < 10 && moic < ADVICE_THRESHOLDS.MOIC.GOOD) {
    advice.push({
      icon: "⏳",
      action: "Conserver plus longtemps",
      impact: `À l'année ${year}, ton MOIC n'a pas atteint son potentiel. Garde la propriété plus longtemps pour accumuler plus de cashflows et bénéficier de l'appréciation.`,
      priority: "high",
    });
  }

  // Solution 4 : Réduire les dépenses
  advice.push({
    icon: "✂️",
    action: "Optimiser les dépenses",
    impact:
      "Réduis tes coûts opérationnels et CAPEX. Chaque dollar économisé améliore directement ton profit net et ton MOIC.",
    priority: "medium",
  });

  return advice;
}

// ============================================================================
// CONSEILS POUR TRI (Taux de Rendement Interne / IRR)
// ============================================================================

export function getTRIAdvice(
  irr: number,
  year: number,
  inputs: ProjectInputs,
): MetricAdvice[] {
  const advice: MetricAdvice[] = [];

  // Si TRI est excellent
  if (irr >= ADVICE_THRESHOLDS.TRI.EXCELLENT) {
    advice.push({
      icon: "🌟",
      action: "TRI exceptionnel !",
      impact: `Un TRI de ${irr.toFixed(1)}% est remarquable. Tu surpasses largement les indices boursiers et l'immobilier traditionnel.`,
      priority: "low",
    });
    return advice;
  }

  // Si TRI est bon
  if (irr >= ADVICE_THRESHOLDS.TRI.GOOD) {
    advice.push({
      icon: "✅",
      action: "Excellent TRI",
      impact: `${irr.toFixed(1)}% est un excellent rendement. Tu bats la plupart des investissements traditionnels.`,
      priority: "low",
    });
    return advice;
  }

  // Si TRI est acceptable
  if (irr >= ADVICE_THRESHOLDS.TRI.ACCEPTABLE) {
    advice.push({
      icon: "✓",
      action: "TRI acceptable",
      impact: `${irr.toFixed(1)}% est correct mais peut être amélioré. Vise ${ADVICE_THRESHOLDS.TRI.GOOD}%+ pour un investissement locatif court terme optimal.`,
      priority: "low",
    });
  } else if (irr >= 0) {
    // TRI faible
    advice.push({
      icon: "⚠️",
      action: "TRI sous-optimal",
      impact: `Avec ${irr.toFixed(1)}%, ton rendement annualisé est faible. Tu pourrais obtenir mieux avec des placements moins risqués.`,
      priority: "high",
    });
  } else {
    // TRI négatif
    advice.push({
      icon: "🚨",
      action: "TRI négatif - PERTE",
      impact: `Un TRI de ${irr.toFixed(1)}% signifie que tu perds de l'argent chaque année. Cet investissement n'est pas viable.`,
      priority: "high",
    });
  }

  // Solutions pour améliorer le TRI

  // Solution 1 : Améliorer les cashflows précoces
  if (irr < ADVICE_THRESHOLDS.TRI.GOOD) {
    advice.push({
      icon: "📈",
      action: "Maximiser les cashflows dès le début",
      impact:
        "Le TRI favorise les gains précoces. Augmente ton ADR et ton taux d'occupation rapidement. Minimise les rénovations post-achat.",
      priority: "high",
    });
  }

  // Solution 2 : Optimiser le moment de sortie
  if (year < 5 && irr < 12) {
    advice.push({
      icon: "⏰",
      action: "Attendre avant de vendre",
      impact: `Vendre à l'année ${year} est prématuré. Les premières années sont impactées par les coûts initiaux. Vendre entre 7-12 ans optimise souvent le TRI.`,
      priority: "high",
    });
  } else if (year > 15 && irr < 12) {
    advice.push({
      icon: "🎯",
      action: "Envisager une vente plus tôt",
      impact: `Après ${year} ans, les rendements diminuent. Une vente plus tôt (10-15 ans) pourrait optimiser ton TRI en évitant les CAPEX majeurs.`,
      priority: "medium",
    });
  }

  // Solution 3 : Réduire l'investissement initial
  const currentDownPayment = extractValue(inputs.financing.downPayment);
  const purchasePrice = extractValue(inputs.financing.purchasePrice);
  const downPaymentPercent = (currentDownPayment / purchasePrice) * 100;

  if (downPaymentPercent > 30 && irr < 15) {
    advice.push({
      icon: "💰",
      action: "Optimiser ton effet de levier",
      impact: `Ta mise de fonds de ${downPaymentPercent.toFixed(0)}% est élevée. Réduire à 25-30% améliorerait ton TRI en diminuant le capital immobilisé.`,
      priority: "medium",
    });
  }

  // Solution 4 : Augmenter les revenus
  const currentADR = extractValue(inputs.revenue.averageDailyRate);
  const revenueIncrease = ADVICE_THRESHOLDS.TRI_REVENUE_INCREASE_SUGGESTION;
  const newADR = currentADR * (1 + revenueIncrease / 100);

  advice.push({
    icon: "💵",
    action: "Augmenter le tarif journalier",
    impact: `Passe de ${formatCurrency(currentADR)} à ${formatCurrency(newADR)} (+${revenueIncrease}%). Des revenus plus élevés dès le début boostent significativement le TRI.`,
    priority: irr < ADVICE_THRESHOLDS.TRI.ACCEPTABLE ? "high" : "medium",
  });

  // Solution 5 : Négocier le financement
  const interestRate = extractValue(inputs.financing.interestRate);
  if (interestRate > 4.5 && irr < ADVICE_THRESHOLDS.TRI.GOOD) {
    const betterRate = interestRate - 0.5;
    advice.push({
      icon: "🏦",
      action: "Négocier un meilleur taux",
      impact: `Ton taux actuel (${interestRate.toFixed(2)}%) pèse sur ton TRI. Un taux à ${betterRate.toFixed(2)}% libérerait plus de cashflow et améliorerait ton rendement.`,
      priority: "medium",
    });
  }

  return advice;
}

// ============================================================================
// FONCTION UTILITAIRE POUR OBTENIR LES EXPLICATIONS
// ============================================================================

export function getMetricExplanation(
  metric: "dscr" | "ltv" | "breakeven" | "moic" | "tri",
): string {
  switch (metric) {
    case "dscr":
      return "Le DSCR (Debt Service Coverage Ratio) mesure ta capacité à payer ton service de dette. Il compare ton revenu net d'exploitation (NOI) à tes paiements hypothécaires annuels. Les banques exigent généralement un minimum de 1.25, ce qui signifie que ton NOI doit être au moins 25% supérieur à ton service de dette.";

    case "ltv":
      return "Le LTV (Loan-to-Value) est le ratio entre ton prêt hypothécaire et la valeur de la propriété. Un LTV élevé signifie moins d'équité et plus de risque. Les banques préfèrent voir un LTV ≤ 75% pour les immeubles locatifs, car cela garantit que tu as suffisamment d'équité en cas de baisse du marché.";

    case "breakeven":
      return "Le taux d'occupation break-even est le niveau minimum d'occupation nécessaire pour couvrir tes dépenses et ton service de dette (cashflow = 0). La différence entre ton occupation prévue et ton break-even est ta marge de sécurité. Plus cette marge est grande, plus tu peux absorber des périodes creuses.";

    case "moic":
      return "Le MOIC (Multiple on Invested Capital) mesure combien de fois tu récupères ton investissement initial. Un MOIC de 2.0x signifie que tu doubles ton argent. Il se calcule en divisant le profit net par l'investissement total (mise de fonds + CAPEX). C'est une métrique clé pour évaluer le retour absolu d'un investissement immobilier.";

    case "tri":
      return "Le TRI (Taux de Rendement Interne) ou IRR mesure le rendement annualisé de ton investissement en tenant compte de tous les cashflows et du timing. Un TRI de 15% signifie que ton argent croît de 15% par an en moyenne. Le TRI favorise les gains précoces et pénalise les sorties tardives. C'est LA métrique pour comparer différents investissements.";
  }
}
