import { useState } from 'react'
import { sendReportByEmail, buildReportHTML } from '../api'

const fmt = (n) => '€' + Math.round(n).toLocaleString('fr-LU')
const pct = (n) => n.toFixed(2) + '%'

export default function TabReport({ profile, results, narrative, onReset, onBack }) {
  const [email,         setEmail]         = useState('')
  const [emailStatus,   setEmailStatus]   = useState(null) // null | 'sending' | 'sent' | 'error'
  const [emailError,    setEmailError]    = useState('')
  const [downloadDone,  setDownloadDone]  = useState(false)

  const r   = results
  const now = new Date().toLocaleDateString('en-LU', { day: 'numeric', month: 'long', year: 'numeric' })

  const handleDownload = () => {
    const html = buildReportHTML(profile, r, narrative)
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `HomeAdvisor_LX_Report_${Date.now()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloadDone(true)
  }

  const handleEmail = async () => {
    if (!email || !email.includes('@')) {
      setEmailStatus('error')
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailStatus('sending')
    setEmailError('')
    try {
      await sendReportByEmail({ toEmail: email, profile, results: r, narrative })
      setEmailStatus('sent')
    } catch (err) {
      setEmailStatus('error')
      setEmailError(
        err.message.includes('EmailJS') || err.message.includes('service') || err.message.includes('YOUR_')
          ? 'EmailJS not configured yet. Add VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY to your .env file.'
          : err.message
      )
    }
  }

  return (
    <div>
      <h2 className="section-title">📄 Automated Report & Delivery</h2>

      <div className="info-box">
        ⚙️ <strong>Automation in action:</strong> Your personalised report has been assembled automatically — no manual formatting required. Download it as a print-ready file or deliver it instantly by email.
      </div>

      {/* Report Preview */}
      <div className="card">
        <div className="card-title">Report Preview</div>
        <div className="report-preview">
          <div className="report-header">
            <div>
              <div className="report-title">Immo<span style={{ color: 'var(--gold)' }}>·LX</span></div>
              <div className="report-sub">Luxembourg Home Purchase Analysis · Benefits &amp; Mortgage Simulation</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-light)', fontFamily: 'var(--font-sans)' }}>
              <strong>{now}</strong><br />
              Ref: LX-{Date.now().toString(36).toUpperCase().slice(-6)}
            </div>
          </div>

          <div className="grid2" style={{ gap: '20px' }}>
            <div>
              <div className="report-label">Household Profile</div>
              <div className="report-content">
                <strong>Type:</strong> {profile.household === 'family' ? `Family — ${r.children} child${r.children !== 1 ? 'ren' : ''}` : profile.household === 'couple' ? 'Couple' : 'Single'}<br />
                <strong>Net Monthly Income:</strong> {fmt(profile.monthlyIncome)}<br />
                <strong>Monthly Debts:</strong> {fmt(profile.monthlyDebts)}<br />
                <strong>Property:</strong> {fmt(profile.purchasePrice)} {profile.propertyType}
              </div>
            </div>
            <div>
              <div className="report-label">Key Financials</div>
              <div className="report-content">
                <strong>Loan Amount:</strong> {fmt(r.loanAmount)}<br />
                <strong>Loan Term:</strong> {profile.loanTerm} years<br />
                <strong>Effective Rate:</strong> {pct(r.effectiveRate)} (after {r.subsidyRate}% subsidy)<br />
                <strong>Monthly Payment:</strong> {fmt(r.monthlyNet)}
              </div>
            </div>
          </div>

          <div className="report-section">
            <div className="report-label">Benefits Summary</div>
            <div className="report-content">
              🏷️ Bëllegen Akt Credit: <strong>{fmt(r.bellegenTotal)}</strong><br />
              💰 Capital Grant: <strong>{fmt(r.capitalGrant)}</strong><br />
              📉 Interest Subsidy: <strong>{r.subsidyRate}%</strong> → saving <strong>{fmt(r.monthlySaving)}/month</strong><br />
              🔒 State Guarantee: <strong>{r.guaranteeEligible ? `Eligible — up to ${fmt(r.maxGuarantee)}` : 'Not eligible'}</strong><br />
              ✨ Total One-Time Savings: <strong style={{ color: 'var(--teal)' }}>{fmt(r.totalOneTimeSavings)}</strong> &nbsp;|&nbsp;
              Lifetime Saving: <strong style={{ color: 'var(--teal)' }}>{fmt(r.lifetimeSaving)}</strong>
            </div>
          </div>

          {narrative && (
            <div className="report-section">
              <div className="report-label">Advisory Notes</div>
              <div className="report-content" style={{ fontStyle: 'italic', color: 'var(--text-mid)' }}>
                {narrative.split('\n').filter(Boolean).map((para, i) => (
                  <p key={i} style={{ marginBottom: '8px' }}>{para}</p>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '14px', fontSize: '10px', color: 'var(--text-light)', fontFamily: 'var(--font-sans)', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
            Immo·LX · For information purposes only · Verify eligibility with the Guichet Unique des Aides au Logement, 11 rue de Hollerich, L-1741 Luxembourg · logement.lu
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid2">
        {/* Download */}
        <div className="card">
          <div className="card-title">⬇ Download Report</div>
          <p style={{ fontSize: '12px', color: 'var(--text-mid)', marginBottom: '14px', lineHeight: '1.6' }}>
            Generate a complete, print-ready HTML report of your analysis. Open in any browser and use <strong>File → Print → Save as PDF</strong> to share with your bank or notary.
          </p>
          <button className="btn-dark" onClick={handleDownload}>
            ⬇ Download Report File
          </button>
          {downloadDone && (
            <div style={{ marginTop: '10px' }}>
              <span className="status-pill success">✓ Report downloaded — open &amp; print to PDF</span>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="card">
          <div className="card-title">📧 Automated Email Delivery</div>
          <p style={{ fontSize: '12px', color: 'var(--text-mid)', marginBottom: '10px', lineHeight: '1.6' }}>
            Enter your email to receive the full personalised report automatically — the automation pipeline assembles and delivers it without any manual step.
          </p>
          <div className="email-row">
            <input
              className="email-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={emailStatus === 'sending' || emailStatus === 'sent'}
              aria-label="Email address for report delivery"
            />
            <button
              className="btn-email"
              onClick={handleEmail}
              disabled={emailStatus === 'sending' || emailStatus === 'sent'}
            >
              {emailStatus === 'sending' ? '⏳ Sending…' : 'Send ✉'}
            </button>
          </div>

          {emailStatus === 'sent' && (
            <div style={{ marginTop: '10px' }}>
              <span className="status-pill success">✓ Report delivered to {email}</span>
            </div>
          )}
          {emailStatus === 'error' && (
            <div style={{ marginTop: '10px' }}>
              <span className="status-pill error">✕ {emailError}</span>
            </div>
          )}

          <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--text-light)', lineHeight: '1.6' }}>
            Your report will be delivered as a formatted summary. For a complete PDF version, use the Download option.
          </div>
        </div>
      </div>

      <div className="nav-row">
        <button className="btn-secondary" onClick={onBack}>← Back to Results</button>
        <span className="step-label">Step 4 of 4</span>
        <button className="btn-primary" onClick={onReset}>↺ Start New Analysis</button>
      </div>
    </div>
  )
}
