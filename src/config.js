// ─── API CONFIGURATION ────────────────────────────────────────────────────────
// Set these in your .env file (local) or Vercel/Netlify environment variables
// NEVER commit your actual API key to GitHub

export const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY || ''
export const CLAUDE_MODEL   = 'claude-sonnet-4-20250514'

// EmailJS configuration — get free credentials at https://emailjs.com
export const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || 'YOUR_SERVICE_ID'
export const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID'
export const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'YOUR_PUBLIC_KEY'

// ─── LUXEMBOURG HOUSING CONSTANTS (2026) ──────────────────────────────────────
export const BELLEGEN_AKT_PER_PERSON     = 40000   // € per individual purchaser
export const TRANSFER_DUTY_RATE          = 0.06    // 6% registration fee
export const TRANSCRIPTION_FEE_RATE      = 0.01    // 1% transcription fee
export const NOTARY_FEE_RATE             = 0.006   // ~0.6% average notary fees
export const BANK_ARRANGEMENT_RATE       = 0.0035  // ~0.35% bank fees

export const INTEREST_SUBSIDY_MIN        = 0.25    // %
export const INTEREST_SUBSIDY_MAX        = 3.50    // %
export const SUBSIDY_BASE_LOAN_CAP       = 200000  // € base
export const SUBSIDY_CHILD_INCREMENT     = 20000   // € per dependent child
export const SUBSIDY_ABSOLUTE_CAP        = 280000  // € maximum subsidised amount

export const CAPITAL_GRANT_MIN           = 500     // €
export const CAPITAL_GRANT_MAX           = 10000   // €
export const CAPITAL_GRANT_APARTMENT_BONUS = 1.40  // +40% for apartment/terraced
export const CAPITAL_GRANT_SEMI_BONUS    = 1.15    // +15% for semi-detached

export const STATE_GUARANTEE_MAX         = 303862  // € (2025 index)
export const STATE_GUARANTEE_MAX_RATIO   = 0.40    // 40% of project cost
export const INCOME_LIMIT_SINGLE         = 101874  // € annual net (2025 index)
export const INCOME_LIMIT_COUPLE         = 141049  // € annual net (2025 index)

export const VAT_SUPER_REDUCED_BASE      = 50000   // € base for 3% VAT on new builds
export const VAT_SAVING_RATE             = 0.17    // 17% saving (3% vs 20%)

// ─── MORTGAGE MARKET RATES (April 2026 — BCL data) ───────────────────────────
export const RATES = {
  fixed:      3.77,  // 30-year fixed
  variable:   3.01,  // ECB-linked variable
  adjustable: 3.35,  // 5-year adjustable / revisable
}

// ─── INCOME BRACKETS FOR INTEREST SUBSIDY ────────────────────────────────────
// [maxAdjustedIncome, subsidyRate] — income adjusted for household size
export const SUBSIDY_BRACKETS = [
  [2500, 3.50],
  [3500, 2.50],
  [4500, 1.50],
  [5500, 0.75],
  [Infinity, 0.25],
]

// ─── CAPITAL GRANT BRACKETS ──────────────────────────────────────────────────
// [maxAdjustedIncome, baseGrant]
export const GRANT_BRACKETS = [
  [2000,  10000],
  [2800,   8000],
  [3500,   6000],
  [4500,   4000],
  [6000,   2000],
  [8000,   1000],
  [Infinity, 500],
]
