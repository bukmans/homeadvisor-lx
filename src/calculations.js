import {
  BELLEGEN_AKT_PER_PERSON,
  TRANSFER_DUTY_RATE,
  TRANSCRIPTION_FEE_RATE,
  NOTARY_FEE_RATE,
  BANK_ARRANGEMENT_RATE,
  SUBSIDY_BASE_LOAN_CAP,
  SUBSIDY_CHILD_INCREMENT,
  SUBSIDY_ABSOLUTE_CAP,
  CAPITAL_GRANT_MAX,
  CAPITAL_GRANT_APARTMENT_BONUS,
  CAPITAL_GRANT_SEMI_BONUS,
  STATE_GUARANTEE_MAX,
  STATE_GUARANTEE_MAX_RATIO,
  INCOME_LIMIT_SINGLE,
  INCOME_LIMIT_COUPLE,
  VAT_SUPER_REDUCED_BASE,
  VAT_SAVING_RATE,
  RATES,
  SUBSIDY_BRACKETS,
  GRANT_BRACKETS,
} from './config'

// ─── MORTGAGE MATHS ──────────────────────────────────────────────────────────
export function calcMonthlyPayment(principal, annualRatePct, years) {
  if (annualRatePct <= 0 || principal <= 0) return principal / (years * 12)
  const r = annualRatePct / 100 / 12
  const n = years * 12
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

export function calcRemainingBalance(principal, annualRatePct, years, monthsPaid) {
  if (annualRatePct <= 0) return Math.max(0, principal - (principal / (years * 12)) * monthsPaid)
  const r = annualRatePct / 100 / 12
  const n = years * 12
  return principal * (Math.pow(1 + r, n) - Math.pow(1 + r, monthsPaid)) / (Math.pow(1 + r, n) - 1)
}

// ─── BENEFIT CALCULATIONS ────────────────────────────────────────────────────
export function getInterestSubsidyRate(monthlyNetIncome, children, isCouple) {
  const multiplier = isCouple ? 1.4 : 1.0
  const childCredit = children * 400
  const adjusted = (monthlyNetIncome - childCredit) / multiplier
  for (const [threshold, rate] of SUBSIDY_BRACKETS) {
    if (adjusted <= threshold) return rate
  }
  return 0.25
}

export function getCapitalGrant(monthlyNetIncome, children, isCouple, propertyType) {
  const multiplier = isCouple ? 1.35 : 1.0
  const adjusted = monthlyNetIncome / multiplier
  let base = 500
  for (const [threshold, grant] of GRANT_BRACKETS) {
    if (adjusted <= threshold) { base = grant; break }
  }
  base = Math.min(CAPITAL_GRANT_MAX, base + children * 150)
  if (propertyType === 'apartment' || propertyType === 'terraced') {
    base = Math.min(CAPITAL_GRANT_MAX, base * CAPITAL_GRANT_APARTMENT_BONUS)
  } else if (propertyType === 'semi') {
    base = Math.min(CAPITAL_GRANT_MAX, base * CAPITAL_GRANT_SEMI_BONUS)
  }
  return Math.round(base)
}

export function isStateGuaranteeEligible(annualNetIncome, isCouple) {
  return annualNetIncome <= (isCouple ? INCOME_LIMIT_COUPLE : INCOME_LIMIT_SINGLE)
}

// ─── FULL SIMULATION ─────────────────────────────────────────────────────────
export function runSimulation(profile) {
  const isCouple = profile.household !== 'single'
  const children = profile.household === 'family' ? (profile.children || 0) : 0
  const loanAmount = Math.max(0, profile.purchasePrice - profile.ownFunds)
  const annualNetIncome = profile.monthlyIncome * 12

  // --- Fees ---
  const registrationFees   = profile.purchasePrice * (TRANSFER_DUTY_RATE + TRANSCRIPTION_FEE_RATE)
  const notaryFees         = profile.purchasePrice * NOTARY_FEE_RATE
  const bankFees           = loanAmount * BANK_ARRANGEMENT_RATE
  const totalFees          = registrationFees + notaryFees + bankFees

  // --- Bëllegen Akt ---
  const bellegenPersons    = isCouple ? 2 : 1
  const bellegenTotal      = Math.min(bellegenPersons * BELLEGEN_AKT_PER_PERSON, registrationFees)
  const netRegistration    = Math.max(0, registrationFees - bellegenTotal)

  // --- Capital Grant ---
  const capitalGrant       = getCapitalGrant(profile.monthlyIncome, children, isCouple, profile.propertyType)

  // --- Interest Subsidy ---
  const subsidyRate        = getInterestSubsidyRate(profile.monthlyIncome, children, isCouple)
  const subsidisedBase     = Math.min(loanAmount, SUBSIDY_BASE_LOAN_CAP + children * SUBSIDY_CHILD_INCREMENT)
  const subsidisedCap      = Math.min(subsidisedBase, SUBSIDY_ABSOLUTE_CAP)
  const baseRate           = RATES[profile.rateType] || RATES.fixed
  const effectiveRate      = Math.max(0.5, baseRate - subsidyRate)

  // --- Payments ---
  const monthlyGross       = calcMonthlyPayment(loanAmount, baseRate, profile.loanTerm)
  const monthlyNet         = calcMonthlyPayment(loanAmount, effectiveRate, profile.loanTerm)
  const monthlySaving      = Math.max(0, monthlyGross - monthlyNet)
  const annualSaving       = monthlySaving * 12
  const lifetimeSaving     = monthlySaving * profile.loanTerm * 12
  const totalInterestGross = Math.max(0, monthlyGross * profile.loanTerm * 12 - loanAmount)
  const totalInterestNet   = Math.max(0, monthlyNet  * profile.loanTerm * 12 - loanAmount)

  // --- VAT ---
  const vatSaving          = profile.isNew ? VAT_SUPER_REDUCED_BASE * VAT_SAVING_RATE : 0

  // --- Energy ---
  const energyEligible     = profile.energyClass === 'A' || profile.energyClass === 'B'

  // --- State Guarantee ---
  const guaranteeEligible  = isStateGuaranteeEligible(annualNetIncome, isCouple)
  const maxGuarantee       = Math.min(STATE_GUARANTEE_MAX_RATIO * profile.purchasePrice, STATE_GUARANTEE_MAX)
  const guaranteeLimit     = isCouple ? INCOME_LIMIT_COUPLE : INCOME_LIMIT_SINGLE

  // --- Affordability ---
  const dtiGross           = ((monthlyGross + profile.monthlyDebts) / profile.monthlyIncome) * 100
  const dtiNet             = ((monthlyNet   + profile.monthlyDebts) / profile.monthlyIncome) * 100
  const disposable         = profile.monthlyIncome - monthlyNet - profile.monthlyDebts

  // --- Net Cost ---
  const netPurchaseCost    = profile.purchasePrice + totalFees - bellegenTotal - capitalGrant - vatSaving

  // --- One-time savings total ---
  const totalOneTimeSavings = bellegenTotal + capitalGrant + vatSaving

  // --- Scenario Comparison ---
  const scenarios = Object.entries(RATES).map(([type, rate]) => {
    const eff     = Math.max(0.5, rate - subsidyRate)
    const monthly = calcMonthlyPayment(loanAmount, eff, profile.loanTerm)
    const interest = Math.max(0, monthly * profile.loanTerm * 12 - loanAmount)
    return { type, label: formatRateLabel(type, rate), baseRate: rate, effectiveRate: eff, monthly, totalInterest: interest }
  })

  // --- Amortisation schedule (yearly) ---
  const amortisation = []
  for (let y = 1; y <= profile.loanTerm; y++) {
    const months = y * 12
    const remaining = calcRemainingBalance(loanAmount, effectiveRate, profile.loanTerm, months)
    amortisation.push({
      year: `Y${y}`,
      withoutAid:        Math.round(monthlyGross),
      withAid:           Math.round(monthlyNet),
      remainingBalance:  Math.round(Math.max(0, remaining)),
      cumulativeSavings: Math.round(monthlySaving * months),
    })
  }

  return {
    // inputs mirror
    isCouple, children, loanAmount, annualNetIncome,
    // fees
    registrationFees, notaryFees, bankFees, totalFees,
    // benefits
    bellegenTotal, bellegenPersons, netRegistration,
    capitalGrant, subsidyRate, subsidisedCap,
    vatSaving, energyEligible,
    guaranteeEligible, maxGuarantee, guaranteeLimit,
    // rates & payments
    baseRate, effectiveRate,
    monthlyGross, monthlyNet, monthlySaving, annualSaving, lifetimeSaving,
    totalInterestGross, totalInterestNet,
    // summary
    totalOneTimeSavings, netPurchaseCost,
    // affordability
    dtiGross, dtiNet, disposable,
    // tables
    scenarios, amortisation,
  }
}

function formatRateLabel(type, rate) {
  const labels = { fixed: `Fixed (${rate}%)`, variable: `Variable (${rate}%)`, adjustable: `Adjustable 5yr (${rate}%)` }
  return labels[type] || `${type} (${rate}%)`
}
