const fmt = (n) => '€' + Math.round(n).toLocaleString('fr-LU')

function BenefitRow({ icon, title, eligible, amount, desc }) {
  return (
    <div className={`benefit-row ${eligible ? 'eligible' : 'not-eligible'}`}>
      <div className={`benefit-icon ${eligible ? 'eligible' : 'not-eligible'}`} aria-hidden="true">
        {eligible ? '✓' : '✕'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '16px' }} aria-hidden="true">{icon}</span>
          <span className={`benefit-title ${eligible ? 'eligible' : 'not-eligible'}`}>{title}</span>
          {eligible && amount  && <span className="benefit-amount">{amount}</span>}
          {!eligible           && <span className="benefit-not-elig">Not Eligible</span>}
        </div>
        <p className="benefit-desc">{desc}</p>
      </div>
    </div>
  )
}

export default function TabBenefits({ profile, results, onNext, onBack }) {
  const r  = results
  const ch = r.children

  const benefits = [
    {
      icon: '🏷️',
      title: "Bëllegen Akt — Registration Duty Credit",
      eligible: true,
      amount: `${fmt(r.bellegenTotal)} saving`,
      desc: `€40,000 per person × ${r.bellegenPersons === 2 ? '2 persons' : '1 person'} = ${fmt(r.bellegenTotal)} deducted from your ${fmt(r.registrationFees)} registration fee. Net fee payable: ${fmt(r.netRegistration)}. Permanently available from July 2025.`,
    },
    {
      icon: '💰',
      title: "Capital Grant (Prime d'Accession à la Propriété)",
      eligible: true,
      amount: `${fmt(r.capitalGrant)} one-time`,
      desc: `One-time capital grant based on your income and household composition. ${profile.propertyType === 'apartment' || profile.propertyType === 'terraced' ? '+40% bonus for apartment/terraced house applied.' : profile.propertyType === 'semi' ? '+15% bonus for semi-detached applied.' : ''} Applied via Ministry of Housing (guichet.lu).`,
    },
    {
      icon: '📉',
      title: "Interest Subsidy (Subvention d'Intérêt)",
      eligible: true,
      amount: `${r.subsidyRate}% rate reduction`,
      desc: `${r.subsidyRate}% subsidy applied on up to ${fmt(r.subsidisedCap)} of your loan. Reduces your mortgage rate from ${r.baseRate.toFixed(2)}% to ${r.effectiveRate.toFixed(2)}%. Monthly saving: ${fmt(r.monthlySaving)} → ${fmt(r.annualSaving)}/year → ${fmt(r.lifetimeSaving)} lifetime.`,
    },
    {
      icon: '🔒',
      title: "State Loan Guarantee (Garantie de l'État)",
      eligible: r.guaranteeEligible,
      amount: r.guaranteeEligible ? `Up to ${fmt(r.maxGuarantee)}` : undefined,
      desc: r.guaranteeEligible
        ? `Your annual income (${fmt(r.annualNetIncome)}) is within the ${fmt(r.guaranteeLimit)} ${r.isCouple ? '(couple)' : '(single)'} threshold. Covers up to 40% of project cost, capped at €303,862. Useful if own funds are below 10%.`
        : `Annual household income (${fmt(r.annualNetIncome)}) exceeds the ${fmt(r.guaranteeLimit)} ${r.isCouple ? '(couple)' : '(single)'} income limit for this benefit.`,
    },
    {
      icon: '⚡',
      title: "Super-Reduced 3% VAT (New Builds Only)",
      eligible: profile.isNew,
      amount: profile.isNew ? `${fmt(r.vatSaving)} saving` : undefined,
      desc: profile.isNew
        ? `Your new build qualifies for the 3% super-reduced VAT rate (vs 17% standard rate) on up to €50,000 of home value. Estimated saving: ${fmt(r.vatSaving)}.`
        : "Applies only to new builds (VEFA / off-plan) used as primary residence. Your property is listed as an existing property.",
    },
    {
      icon: '🌱',
      title: "Energy Efficiency Bonus (Klimabonus / State Guarantee)",
      eligible: r.energyEligible,
      amount: r.energyEligible ? "Up to €100,000 guarantee" : undefined,
      desc: r.energyEligible
        ? `Class ${profile.energyClass} property qualifies for the state energy loan guarantee (up to €50,000 over 15 years) and an additional interest subsidy on energy improvement loans up to €100,000.`
        : `Energy class ${profile.energyClass} does not qualify for premium energy efficiency benefits. Classes A or B are required. Consider renovation grants to improve your rating.`,
    },
  ]

  return (
    <div>
      <h2 className="section-title">🏛️ Government Benefits Eligibility</h2>

      <div className="info-box">
        All benefits assessed against your household profile. Core eligibility requires: legal age, Luxembourg residency (&gt;3 months), property as primary and permanent residence, and no existing property ownership in Luxembourg or abroad.
      </div>

      {benefits.map((b, i) => (
        <BenefitRow key={i} {...b} />
      ))}

      {/* Summary totals */}
      <div className="summary-box">
        <div className="card-title" style={{ color: 'var(--gold-light)', marginBottom: '16px' }}>
          Total Benefits Package
        </div>
        <div className="grid3">
          <div className="summary-item">
            <div className="summary-value">{fmt(r.totalOneTimeSavings)}</div>
            <div className="summary-label">One-Time Savings</div>
          </div>
          <div className="summary-item">
            <div className="summary-value" style={{ color: 'var(--teal-light)' }}>{fmt(r.monthlySaving)}/mo</div>
            <div className="summary-label">Monthly Interest Saving</div>
          </div>
          <div className="summary-item">
            <div className="summary-value" style={{ color: '#7FC8BD' }}>{fmt(r.lifetimeSaving)}</div>
            <div className="summary-label">Lifetime Saving</div>
          </div>
        </div>
      </div>

      <div className="nav-row">
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <span className="step-label">Step 2 of 4</span>
        <button className="btn-primary" onClick={onNext}>View Full Results →</button>
      </div>
    </div>
  )
}
