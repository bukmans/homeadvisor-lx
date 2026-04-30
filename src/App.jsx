import { useState, useRef, useCallback } from 'react'
import TabAdvisor   from './components/TabAdvisor'
import TabBenefits  from './components/TabBenefits'
import TabResults   from './components/TabResults'
import TabReport    from './components/TabReport'
import { runSimulation } from './calculations'
import './App.css'

const TABS = [
  { id: 0, icon: '💬', label: 'AI Advisor' },
  { id: 1, icon: '🏛️', label: 'Benefits' },
  { id: 2, icon: '📊', label: 'Results' },
  { id: 3, icon: '📄', label: 'Report & Delivery' },
]

const DEFAULT_PROFILE = {
  household:    'couple',
  children:     2,
  monthlyIncome:  8500,
  monthlyDebts:    400,
  purchasePrice: 750000,
  propertyType: 'apartment',
  isNew:         false,
  ownFunds:     100000,
  loanTerm:         25,
  energyClass:    'C',
  rateType:     'fixed',
}

export default function App() {
  const [activeTab, setActiveTab]   = useState(0)
  const [profile,   setProfile]     = useState(DEFAULT_PROFILE)
  const [results,   setResults]     = useState(() => runSimulation(DEFAULT_PROFILE))
  const [narrative, setNarrative]   = useState('')
  const [sessionKey, setSessionKey] = useState(0) // forces TabAdvisor remount on reset

  const updateProfile = useCallback((updates) => {
    setProfile(prev => {
      const next = { ...prev, ...updates }
      setResults(runSimulation(next))
      return next
    })
  }, [])

  const handleReset = useCallback(() => {
    setProfile(DEFAULT_PROFILE)
    setResults(runSimulation(DEFAULT_PROFILE))
    setNarrative('')
    setSessionKey(k => k + 1)
    setActiveTab(0)
  }, [])

  const progressPct = [25, 50, 75, 100][activeTab]

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner">
          <span className="header-badge">Luxembourg · 2026 · AI-Powered</span>
          <h1 className="header-title">HomeAdvisor <em>LX</em></h1>
          <p className="header-sub">Intelligent Home Purchase Advisor — Powered by Claude AI</p>
          <div className="header-pills">
            {['Conversational AI', 'Benefits Engine', 'AI Narrative', 'Auto Report', 'Email Automation'].map(p => (
              <span key={p} className="pill"><span className="pill-dot" />{p}</span>
            ))}
          </div>
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav className="tabs" aria-label="Application sections">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            aria-current={activeTab === t.id ? 'page' : undefined}
          >
            <span className="tab-icon" aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Progress ── */}
      <div className="progress-bar" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* ── Main ── */}
      <main className="app-body">

        {activeTab === 0 && (
          <TabAdvisor
            key={sessionKey}
            profile={profile}
            updateProfile={updateProfile}
            onComplete={() => setActiveTab(1)}
          />
        )}

        {activeTab === 1 && (
          <TabBenefits
            profile={profile}
            results={results}
            onNext={() => setActiveTab(2)}
            onBack={() => setActiveTab(0)}
          />
        )}

        {activeTab === 2 && (
          <TabResults
            profile={profile}
            results={results}
            narrative={narrative}
            setNarrative={setNarrative}
            onNext={() => setActiveTab(3)}
            onBack={() => setActiveTab(1)}
          />
        )}

        {activeTab === 3 && (
          <TabReport
            profile={profile}
            results={results}
            narrative={narrative}
            onReset={handleReset}
            onBack={() => setActiveTab(2)}
          />
        )}

        {/* ── Footer ── */}
        <footer className="app-footer">
          HomeAdvisor LX · Powered by Claude AI (Anthropic) · Built for Luxembourg residents · 2026<br />
          Benefits data from guichet.public.lu &amp; logement.lu · For information only — not financial advice<br />
          Interest rates based on Banque Centrale du Luxembourg data, April 2026
        </footer>
      </main>
    </div>
  )
}
