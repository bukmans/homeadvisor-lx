import { CLAUDE_MODEL, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from './config'

// ─── CLAUDE API ───────────────────────────────────────────────────────────────
const ANTHROPIC_URL = '/api/claude'

export async function callClaude({ system, messages, maxTokens = 500 }) {
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${response.status}`)
  }
  const data = await response.json()
  return data.content?.[0]?.text || ''
}

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────
export const ADVISOR_SYSTEM_PROMPT = `You are HomeAdvisor LX, a warm and professional Luxembourg home purchase AI advisor. Your role is to gather information through natural conversation and then extract structured data.

GOAL: Collect these details through friendly dialogue:
- Household type: single / couple / family-with-children
- Number of dependent children (if family)
- Total monthly NET household income in euros
- Existing monthly debt obligations in euros (loans, leases, etc.)
- Target purchase price in euros
- Property type: apartment / terraced / semi / detached
- Whether it's a new build or existing property
- Own funds / down payment available in euros
- Preferred loan term in years (typically 15-30)
- Energy class of the property (A through G) if known

CONVERSATION RULES:
- Be warm, concise, and professional — like a knowledgeable friend
- Ask at most 2 questions per response
- Accept approximate figures — don't be overly precise
- If the user gives a range, take the midpoint
- Acknowledge what they share before asking the next question
- Responses must stay under 130 words

EXTRACTION: When you have enough to run a meaningful analysis (at minimum: income, purchase price, household type), append this JSON block at the very end of your message — on its own line, with no surrounding text:
{"EXTRACTED":{"household":"couple","children":0,"monthlyIncome":8500,"monthlyDebts":400,"purchasePrice":750000,"propertyType":"apartment","isNew":false,"ownFunds":100000,"loanTerm":25,"energyClass":"C","complete":true}}

If you don't have enough yet, append:
{"EXTRACTED":{"complete":false}}

When complete:true, end your message with exactly: "✓ I have everything I need. Click **View My Benefits** below to see your personalised analysis."
`

export async function sendAdvisorMessage(conversationHistory) {
  return callClaude({
    system: ADVISOR_SYSTEM_PROMPT,
    messages: conversationHistory,
    maxTokens: 400,
  })
}

// ─── NARRATIVE GENERATION ─────────────────────────────────────────────────────
export async function generateNarrative(profile, results) {
  const ch = results.children
  const system = `You are a Luxembourg housing finance expert writing a concise personalised advisory note. Write in clear, warm, direct language. No markdown, no bullet points, no headers — flowing prose only. Exactly 3 paragraphs: (1) overall position assessment, (2) key benefits and what they mean practically, (3) two specific actionable recommendations. Total: 160-190 words.`

  const userMsg = `Generate an advisory note for this buyer:

Household: ${profile.household === 'family' ? `Family with ${ch} child${ch !== 1 ? 'ren' : ''}` : profile.household === 'couple' ? 'Couple' : 'Single person'}
Monthly net income: €${profile.monthlyIncome.toLocaleString()}
Purchase price: €${profile.purchasePrice.toLocaleString()} (${profile.propertyType}, ${profile.isNew ? 'new build' : 'existing'})
Loan: €${results.loanAmount.toLocaleString()} over ${profile.loanTerm} years

Key numbers:
- Bëllegen Akt saving: €${Math.round(results.bellegenTotal).toLocaleString()}
- Capital grant: €${Math.round(results.capitalGrant).toLocaleString()}
- Interest subsidy: ${results.subsidyRate}% → rate drops from ${results.baseRate.toFixed(2)}% to ${results.effectiveRate.toFixed(2)}%
- Monthly payment: €${Math.round(results.monthlyGross).toLocaleString()} → €${Math.round(results.monthlyNet).toLocaleString()} (saving €${Math.round(results.monthlySaving).toLocaleString()}/month)
- DTI after aid: ${results.dtiNet.toFixed(1)}%
- Total one-time benefits: €${Math.round(results.totalOneTimeSavings).toLocaleString()}
- Lifetime interest saving: €${Math.round(results.lifetimeSaving).toLocaleString()}
- State guarantee eligible: ${results.guaranteeEligible ? 'Yes' : 'No'}
- Disposable income after housing + debts: €${Math.round(results.disposable).toLocaleString()}/month`

  return callClaude({ system, messages: [{ role: 'user', content: userMsg }], maxTokens: 350 })
}

// ─── EMAIL DELIVERY ───────────────────────────────────────────────────────────
export async function sendReportByEmail({ toEmail, profile, results, narrative }) {
  // Dynamic import so EmailJS doesn't block initial load
  const emailjs = await import('@emailjs/browser')
  await emailjs.init(EMAILJS_PUBLIC_KEY)

  const ch = results.children
  const fmt = (n) => '€' + Math.round(n).toLocaleString('fr-LU')

  const templateParams = {
    to_email:       toEmail,
    to_name:        toEmail.split('@')[0],
    household:      profile.household === 'family' ? `Family (${ch} child${ch !== 1 ? 'ren' : ''})` : profile.household === 'couple' ? 'Couple' : 'Single',
    income:         fmt(profile.monthlyIncome),
    purchase_price: fmt(profile.purchasePrice),
    loan_amount:    fmt(results.loanAmount),
    loan_term:      `${profile.loanTerm} years`,
    bellegen_akt:   fmt(results.bellegenTotal),
    capital_grant:  fmt(results.capitalGrant),
    subsidy_rate:   `${results.subsidyRate}%`,
    monthly_gross:  fmt(results.monthlyGross),
    monthly_net:    fmt(results.monthlyNet),
    monthly_saving: fmt(results.monthlySaving),
    effective_rate: `${results.effectiveRate.toFixed(2)}%`,
    dti_after_aid:  `${results.dtiNet.toFixed(1)}%`,
    total_savings:  fmt(results.totalOneTimeSavings),
    lifetime_saving:fmt(results.lifetimeSaving),
    net_cost:       fmt(results.netPurchaseCost),
    ai_narrative:   narrative || 'See attached report for full analysis.',
    generated_date: new Date().toLocaleDateString('en-LU', { day: 'numeric', month: 'long', year: 'numeric' }),
  }

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
}

// ─── REPORT HTML BUILDER ──────────────────────────────────────────────────────
export function buildReportHTML(profile, results, narrative) {
  const fmt  = (n) => '€' + Math.round(n).toLocaleString('fr-LU')
  const pct  = (n) => n.toFixed(2) + '%'
  const ch   = results.children
  const date = new Date().toLocaleDateString('en-LU', { day: 'numeric', month: 'long', year: 'numeric' })

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>HomeAdvisor LX — Your Luxembourg Home Purchase Analysis</title>
<style>
  body { font-family: Georgia, serif; background: #FAF8F3; color: #1A1E2E; max-width: 820px; margin: 0 auto; padding: 48px 40px; }
  h1 { font-size: 28px; color: #0B1F3A; letter-spacing: -0.02em; }
  .gold { color: #C9A84C; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #C9A84C; padding-bottom: 20px; margin-bottom: 28px; }
  .header-right { text-align: right; font-family: sans-serif; font-size: 12px; color: #718096; line-height: 1.7; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 24px; }
  .section { margin-bottom: 24px; padding-top: 20px; border-top: 1px solid #DDD5BB; }
  .label { font-family: sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #718096; margin-bottom: 10px; font-weight: 700; }
  .content { font-family: sans-serif; font-size: 13px; color: #4A5568; line-height: 1.9; }
  .benefit-row { display: flex; justify-content: space-between; font-family: sans-serif; font-size: 13px; padding: 7px 0; border-bottom: 1px solid #EEE8D5; }
  .benefit-label { color: #4A5568; }
  .benefit-value { font-weight: 700; color: #0E8A74; }
  .summary-box { background: #0B1F3A; border-radius: 10px; padding: 24px; margin: 24px 0; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
  .summary-item { text-align: center; }
  .summary-value { font-size: 22px; font-weight: 700; color: #E4C06E; font-family: sans-serif; }
  .summary-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.5); font-family: sans-serif; margin-top: 5px; }
  .narrative { background: #F0FAF7; border: 1px solid #B2DFD5; border-left: 4px solid #0E8A74; border-radius: 8px; padding: 20px 22px; font-family: sans-serif; font-size: 13px; color: #2D4A45; line-height: 1.8; font-style: italic; }
  .scenario-table { width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px; margin-top: 10px; }
  .scenario-table th { background: #F5E9C8; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6B4F10; border-bottom: 2px solid #DDD5BB; }
  .scenario-table td { padding: 8px 12px; border-bottom: 1px solid #EEE8D5; color: #4A5568; }
  .highlight { font-weight: 700; color: #0E8A74; }
  .footer { margin-top: 40px; font-size: 10px; font-family: sans-serif; color: #999; line-height: 1.8; border-top: 1px solid #DDD5BB; padding-top: 16px; }
  @media print { body { padding: 20px; } .summary-box { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>HomeAdvisor <span class="gold">LX</span></h1>
    <div style="font-family:sans-serif; font-size:12px; color:#718096;">Luxembourg Home Purchase Analysis &middot; AI-Powered by Claude</div>
  </div>
  <div class="header-right">
    <strong>Generated:</strong> ${date}<br>
    Reference: LX-${Date.now().toString(36).toUpperCase()}
  </div>
</div>

<div class="grid">
  <div>
    <div class="label">Household Profile</div>
    <div class="content">
      <strong>Type:</strong> ${profile.household === 'family' ? `Family — ${ch} child${ch !== 1 ? 'ren' : ''}` : profile.household === 'couple' ? 'Couple' : 'Single person'}<br>
      <strong>Net Monthly Income:</strong> ${fmt(profile.monthlyIncome)}<br>
      <strong>Monthly Debt Obligations:</strong> ${fmt(profile.monthlyDebts)}<br>
      <strong>Annual Net Income:</strong> ${fmt(results.annualNetIncome)}<br>
    </div>
  </div>
  <div>
    <div class="label">Property Details</div>
    <div class="content">
      <strong>Purchase Price:</strong> ${fmt(profile.purchasePrice)}<br>
      <strong>Property Type:</strong> ${profile.propertyType.charAt(0).toUpperCase() + profile.propertyType.slice(1)}<br>
      <strong>Build Status:</strong> ${profile.isNew ? 'New Build / VEFA' : 'Existing Property'}<br>
      <strong>Energy Class:</strong> ${profile.energyClass}<br>
    </div>
  </div>
</div>

<div class="grid">
  <div>
    <div class="label">Mortgage Details</div>
    <div class="content">
      <strong>Own Funds:</strong> ${fmt(profile.ownFunds)}<br>
      <strong>Loan Amount:</strong> ${fmt(results.loanAmount)}<br>
      <strong>Loan Term:</strong> ${profile.loanTerm} years<br>
      <strong>Rate Type:</strong> ${profile.rateType.charAt(0).toUpperCase() + profile.rateType.slice(1)}<br>
      <strong>Base Rate:</strong> ${pct(results.baseRate)}<br>
      <strong>Effective Rate (after subsidy):</strong> ${pct(results.effectiveRate)}<br>
    </div>
  </div>
  <div>
    <div class="label">Affordability</div>
    <div class="content">
      <strong>Monthly Payment (gross):</strong> ${fmt(results.monthlyGross)}<br>
      <strong>Monthly Payment (net):</strong> ${fmt(results.monthlyNet)}<br>
      <strong>Monthly Saving:</strong> ${fmt(results.monthlySaving)}<br>
      <strong>DTI Before Aid:</strong> ${results.dtiGross.toFixed(1)}%<br>
      <strong>DTI After Aid:</strong> ${results.dtiNet.toFixed(1)}%<br>
      <strong>Disposable Income:</strong> ${fmt(results.disposable)}/month<br>
    </div>
  </div>
</div>

<div class="section">
  <div class="label">Government Benefits — Eligibility & Amounts</div>
  <div class="benefit-row"><span class="benefit-label">🏷 Bëllegen Akt Credit (${results.bellegenPersons === 2 ? '2 persons × €40,000' : '1 person × €40,000'})</span><span class="benefit-value">${fmt(results.bellegenTotal)}</span></div>
  <div class="benefit-row"><span class="benefit-label">💰 Capital Grant (Prime d'Accession)</span><span class="benefit-value">${fmt(results.capitalGrant)}</span></div>
  <div class="benefit-row"><span class="benefit-label">📉 Interest Subsidy (${results.subsidyRate}% applied to ${fmt(results.subsidisedCap)})</span><span class="benefit-value">${fmt(results.monthlySaving)}/month</span></div>
  <div class="benefit-row"><span class="benefit-label">🔒 State Loan Guarantee</span><span class="benefit-value">${results.guaranteeEligible ? 'Eligible — up to ' + fmt(results.maxGuarantee) : 'Not eligible (income above threshold)'}</span></div>
  ${profile.isNew ? `<div class="benefit-row"><span class="benefit-label">⚡ Super-Reduced 3% VAT (New Build)</span><span class="benefit-value">${fmt(results.vatSaving)}</span></div>` : ''}
  <div class="benefit-row"><span class="benefit-label">🌱 Klimabonus / Energy Efficiency</span><span class="benefit-value">${results.energyEligible ? 'Eligible — up to €100,000 guarantee' : 'Not eligible (Class ' + profile.energyClass + ')'}</span></div>
</div>

<div class="summary-box">
  <div class="summary-grid">
    <div class="summary-item">
      <div class="summary-value">${fmt(results.totalOneTimeSavings)}</div>
      <div class="summary-label">One-Time Savings</div>
    </div>
    <div class="summary-item">
      <div class="summary-value">${fmt(results.annualSaving)}</div>
      <div class="summary-label">Annual Interest Saving</div>
    </div>
    <div class="summary-item">
      <div class="summary-value">${fmt(results.lifetimeSaving)}</div>
      <div class="summary-label">Lifetime Interest Saving</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="label">Rate Scenario Comparison (after ${results.subsidyRate}% interest subsidy)</div>
  <table class="scenario-table">
    <thead>
      <tr><th>Rate Type</th><th>Base Rate</th><th>Effective Rate</th><th>Monthly Payment</th><th>Total Interest</th></tr>
    </thead>
    <tbody>
      ${results.scenarios.map(s => `
      <tr>
        <td>${s.label}</td>
        <td>${pct(s.baseRate)}</td>
        <td class="highlight">${pct(s.effectiveRate)}</td>
        <td class="highlight">${fmt(s.monthly)}</td>
        <td>${fmt(Math.max(0, s.totalInterest))}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

${narrative ? `
<div class="section">
  <div class="label">AI Advisory Analysis — Powered by Claude</div>
  <div class="narrative">${narrative.replace(/\n/g, '<br>')}</div>
</div>` : ''}

<div class="section">
  <div class="label">Net Total Purchase Cost</div>
  <div class="content">
    Purchase Price: ${fmt(profile.purchasePrice)}<br>
    + Registration &amp; Transfer Fees: ${fmt(results.registrationFees)}<br>
    + Notary Fees: ${fmt(results.notaryFees)}<br>
    + Bank Fees: ${fmt(results.bankFees)}<br>
    − Bëllegen Akt Credit: −${fmt(results.bellegenTotal)}<br>
    − Capital Grant: −${fmt(results.capitalGrant)}<br>
    ${profile.isNew ? `− VAT Saving: −${fmt(results.vatSaving)}<br>` : ''}
    <strong>= Net Total Cost: ${fmt(results.netPurchaseCost)}</strong>
  </div>
</div>

<div class="footer">
  This report was generated by <strong>HomeAdvisor LX</strong>, powered by Claude AI (Anthropic). It is provided for informational and simulation purposes only and does not constitute financial, legal, or mortgage advice. Benefit amounts and eligibility are based on Luxembourg government data (guichet.public.lu, logement.lu) as of 2025–2026. Interest rates are indicative, based on Banque Centrale du Luxembourg (BCL) data as of April 2026.<br><br>
  Always verify eligibility and amounts with the <strong>Guichet Unique des Aides au Logement</strong>, 11 rue de Hollerich, L-1741 Luxembourg · guichet@ml.etat.lu · logement.lu<br>
  Consult a licensed mortgage broker or bank for personalised mortgage advice.
</div>

</body>
</html>`
}
