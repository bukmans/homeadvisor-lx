import { useEffect, useRef } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { generateNarrative } from '../api'

const fmt = (n) => '€' + Math.round(n).toLocaleString('fr-LU')
const pct = (n) => n.toFixed(2) + '%'

export default function TabResults({ profile, results, narrative, setNarrative, onNext, onBack }) {
  const r            = results
  const narrativeRun = useRef(false)

  useEffect(() => {
    if (narrative || narrativeRun.current) return
    narrativeRun.current = true
    generateNarrative(profile, r)
      .then(text => setNarrative(text))
      .catch(() => setNarrative('AI narrative unavailable — ensure CLAUDE_API_KEY is configured in Vercel environment variables. Your numerical analysis above provides the complete picture.'))
  }, [profile, r, narrative, setNarrative])

  const dtiGrossClamped = Math.min(r.dtiGross, 98)
  const dtiNetClamped   = Math.min(r.dtiNet,   98)

  // Cost breakdown bars
  const maxVal = profile.purchasePrice * 1.05
  const bars = [
    { label: 'Purchase Price',     value: profile.purchasePrice, color: '#0B1F3A' },
    { label: 'Registration Fees',  value: r.registrationFees,   color: '#C0392B' },
    { label: 'Bëllegen Akt Saving',value: r.bellegenTotal,       color: '#0E8A74' },
    { label: 'Capital Grant',      value: r.capitalGrant,        color: '#13B090' },
    { label: 'Net Purchase Cost',  value: r.netPurchaseCost,     color: '#C9A84C' },
  ]

  // Chart data — sample every 3 years for bar chart, all years for line
  const barData  = r.amortisation.filter((_, i) => i % 3 === 0 || i === r.amortisation.length - 1)
  const lineData = r.amortisation

  return (
    <div>
      <h2 className="section-title">📊 Full Results Dashboard</h2>

      {/* Key Metrics */}
      <div className="grid4" style={{ marginBottom: '16px' }}>
        <div className="metric-card">
          <div className="metric-value">{fmt(r.loanAmount)}</div>
          <div className="metric-label">Loan Amount</div>
        </div>
        <div className="metric-card" style={{ borderTopColor: 'var(--red)' }}>
          <div className="metric-value">{fmt(r.monthlyGross)}</div>
          <div className="metric-label">Monthly (Gross)</div>
          <div className="metric-sub">At {pct(r.baseRate)} base rate</div>
        </div>
        <div className="metric-card" style={{ borderTopColor: 'var(--teal)' }}>
          <div className="metric-value" style={{ color: 'var(--teal)' }}>{fmt(r.monthlyNet)}</div>
          <div className="metric-label">Monthly (After Aid)</div>
          <div className="metric-sub">At {pct(r.effectiveRate)} effective</div>
        </div>
        <div className="metric-card" style={{ borderTopColor: 'var(--navy)' }}>
          <div className="metric-value">{fmt(r.netPurchaseCost)}</div>
          <div className="metric-label">Net Purchase Cost</div>
          <div className="metric-sub">After all benefits</div>
        </div>
      </div>

      {/* Affordability */}
      <div className="card">
        <div className="card-title">Affordability — Debt to Income Ratio</div>
        <div className="grid2">
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', marginBottom: '4px' }}>Before State Aid</div>
            <div className="dti-track">
              <div className="dti-needle" style={{ left: `${dtiGrossClamped}%` }} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: r.dtiGross > 45 ? 'var(--red)' : r.dtiGross > 35 ? '#B45309' : 'var(--navy)', marginTop: '6px' }}>
              {r.dtiGross.toFixed(1)}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
              {r.dtiGross <= 35 ? '✅ Comfortable — well within bank limits' : r.dtiGross <= 45 ? '⚠️ Acceptable — banks allow up to 45%' : '❌ High — may challenge bank approval'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', marginBottom: '4px' }}>After State Aid</div>
            <div className="dti-track">
              <div className="dti-needle" style={{ left: `${dtiNetClamped}%` }} />
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--teal)', marginTop: '6px' }}>
              {r.dtiNet.toFixed(1)}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
              {r.dtiNet <= 35 ? '✅ Comfortable after subsidy' : '⚠️ Manageable after subsidy'}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '14px', display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-mid)', flexWrap: 'wrap' }}>
          <span>Monthly income: <strong>{fmt(profile.monthlyIncome)}</strong></span>
          <span>Monthly payment after aid: <strong>{fmt(r.monthlyNet)}</strong></span>
          <span>Remaining disposable: <strong style={{ color: r.disposable > 0 ? 'var(--teal)' : 'var(--red)' }}>{fmt(r.disposable)}/mo</strong></span>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="card">
        <div className="card-title">Cost Breakdown & Savings</div>
        {bars.map(b => {
          const w = Math.min(99, (b.value / maxVal) * 100)
          return (
            <div key={b.label} className="bar-row">
              <div className="bar-label">{b.label}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${w}%`, background: b.color }}>
                  {fmt(b.value)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recharts bar chart — monthly payments */}
      <div className="card">
        <div className="card-title">Monthly Payment — With vs Without State Subsidy</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE8D5" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fontFamily: 'sans-serif' }} />
            <YAxis tickFormatter={v => '€' + (v / 1000).toFixed(0) + 'k'} tick={{ fontSize: 11, fontFamily: 'sans-serif' }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Bar dataKey="withoutAid" name="Without Aid"  fill="#C0392B" opacity={0.75} radius={[4,4,0,0]} />
            <Bar dataKey="withAid"    name="With Aid"     fill="#0E8A74"                radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line chart — cumulative savings */}
      <div className="card">
        <div className="card-title">Cumulative Savings & Remaining Balance Over Loan Term</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE8D5" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fontFamily: 'sans-serif' }} interval={Math.floor(profile.loanTerm / 6)} />
            <YAxis tickFormatter={v => '€' + (v / 1000).toFixed(0) + 'k'} tick={{ fontSize: 11, fontFamily: 'sans-serif' }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Line dataKey="cumulativeSavings" name="Cumulative Savings" stroke="#C9A84C" strokeWidth={2.5} dot={false} />
            <Line dataKey="remainingBalance"  name="Remaining Balance"  stroke="#1E3D63" strokeWidth={2}   dot={false} strokeDasharray="5 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scenario table */}
      <div className="card">
        <div className="card-title">Rate Scenario Comparison (After {r.subsidyRate}% Interest Subsidy)</div>
        <table className="scenario-table">
          <thead>
            <tr>
              <th>Rate Type</th>
              <th>Base Rate</th>
              <th>Subsidy</th>
              <th>Effective Rate</th>
              <th>Monthly Payment</th>
              <th>Total Interest</th>
            </tr>
          </thead>
          <tbody>
            {r.scenarios.map((s, i) => (
              <tr key={i}>
                <td style={{ fontWeight: i === 0 ? '600' : '400' }}>{s.label}</td>
                <td>{pct(s.baseRate)}</td>
                <td style={{ color: 'var(--teal)' }}>−{pct(r.subsidyRate)}</td>
                <td className="highlight">{pct(s.effectiveRate)}</td>
                <td className="highlight">{fmt(s.monthly)}/mo</td>
                <td>{fmt(Math.max(0, s.totalInterest))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Narrative */}
      <div className="narrative-box">
        <div className="narrative-title">
          <span>AI Advisor Analysis</span>
          <span className="ai-badge">CLAUDE</span>
        </div>
        <div className="narrative-text">
          {narrative
            ? narrative.split('\n').map((para, i) => para.trim() ? <p key={i} style={{ marginBottom: '10px' }}>{para}</p> : null)
            : (
              <span>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <em style={{ fontSize: '12px', marginLeft: '8px', color: 'rgba(255,255,255,0.4)' }}>
                  Generating personalised analysis…
                </em>
              </span>
            )
          }
        </div>
      </div>

      <div className="nav-row">
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <span className="step-label">Step 3 of 4</span>
        <button className="btn-primary" onClick={onNext}>Generate Report →</button>
      </div>
    </div>
  )
}
