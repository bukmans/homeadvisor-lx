import { useState, useRef, useEffect, useCallback } from 'react'
import { sendAdvisorMessage } from '../api'

const INITIAL_MESSAGE = {
  role: 'assistant',
  text: `Hello! I'm your Luxembourg HomeAdvisor, powered by Claude AI. I'm here to help you understand which government housing benefits you qualify for and simulate your mortgage options.

To get started, simply describe your situation — for example: "We are a couple with 2 children, our combined net income is around €8,500 per month, and we're looking at a €750,000 apartment in Luxembourg City."`,
}

export default function TabAdvisor({ profile, updateProfile, onComplete }) {
  const [messages,    setMessages]    = useState([INITIAL_MESSAGE])
  const [input,       setInput]       = useState('')
  const [thinking,    setThinking]    = useState(false)
  const [extracted,   setExtracted]   = useState(null)
  const [ready,       setReady]       = useState(false)
  const [apiError,    setApiError]    = useState('')

  const historyRef     = useRef([])   // tracks actual API conversation
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || thinking) return
    setInput('')
    setApiError('')
    setThinking(true)

    const userMsg = { role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    historyRef.current = [...historyRef.current, { role: 'user', content: text }]

    try {
      const reply = await sendAdvisorMessage(historyRef.current)

      // Extract JSON block if present
      const jsonMatch = reply.match(/\{"EXTRACTED":\{.*?\}\}/s)
      const displayText = reply.replace(/\{"EXTRACTED":\{.*?\}\}/s, '').trim()

      setMessages(prev => [...prev, { role: 'assistant', text: displayText }])
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }]

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          const ext    = parsed.EXTRACTED
          if (ext?.complete) {
            const updates = {
              household:     ext.household     || profile.household,
              children:      ext.children      ?? profile.children,
              monthlyIncome: ext.monthlyIncome || profile.monthlyIncome,
              monthlyDebts:  ext.monthlyDebts  ?? profile.monthlyDebts,
              purchasePrice: ext.purchasePrice || profile.purchasePrice,
              propertyType:  ext.propertyType  || profile.propertyType,
              isNew:         ext.isNew         ?? profile.isNew,
              ownFunds:      ext.ownFunds      || profile.ownFunds,
              loanTerm:      ext.loanTerm      || profile.loanTerm,
              energyClass:   ext.energyClass   || profile.energyClass,
            }
            updateProfile(updates)
            setExtracted(updates)
            setReady(true)
          }
        } catch (_) { /* malformed JSON — ignore */ }
      }
    } catch (err) {
      setApiError(err.message)
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `I'm having trouble connecting right now. Please check your API key configuration. Error: ${err.message}`,
      }])
    } finally {
      setThinking(false)
    }
  }, [input, thinking, profile, updateProfile])

  const fmt = (n) => '€' + Math.round(n).toLocaleString('fr-LU')

  return (
    <div>
      <h2 className="section-title">💬 AI Advisor — Tell Me About Your Situation</h2>

      <div className="info-box">
        ✨ <strong>AI-powered intake:</strong> Describe your home-buying situation in plain language. Claude will extract your profile, ask follow-up questions, and prepare your personalised benefit analysis automatically.
      </div>

      {apiError && (
        <div className="info-box" style={{ borderLeftColor: 'var(--red)', background: '#FEF2F2' }}>
          ⚠️ <strong>API Configuration:</strong> {apiError}. Add <code>VITE_CLAUDE_API_KEY=your_key</code> to your <code>.env</code> file and restart the dev server.
        </div>
      )}

      <div className="chat-container">
        <div className="chat-messages" role="log" aria-live="polite" aria-label="Conversation with AI Advisor">
          {messages.map((msg, i) => (
            <div key={i} className={`msg${msg.role === 'user' ? ' user' : ''} fade-in`}>
              <div className={`avatar ${msg.role === 'user' ? 'user' : 'ai'}`} aria-hidden="true">
                {msg.role === 'user' ? 'You' : 'AI'}
              </div>
              <div
                className={`bubble ${msg.role === 'user' ? 'user' : 'ai'}`}
                dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
              />
            </div>
          ))}
          {thinking && (
            <div className="msg fade-in">
              <div className="avatar ai" aria-hidden="true">AI</div>
              <div className="bubble thinking" aria-label="AI is thinking">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <em style={{ fontSize: '12px', marginLeft: '6px', color: 'var(--text-light)' }}>Thinking…</em>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-row">
          <input
            className="chat-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe your situation…"
            disabled={thinking}
            aria-label="Message input"
          />
          <button className="btn-dark" onClick={handleSend} disabled={thinking || !input.trim()}>
            Send →
          </button>
        </div>
      </div>

      {/* Extracted Parameters Panel */}
      {extracted && (
        <div className="params-panel">
          <div className="params-title">✓ Profile Extracted by AI</div>
          <div className="param-grid">
            {[
              ['Household',      extracted.household === 'family' ? `Family (${extracted.children} child${extracted.children !== 1 ? 'ren' : ''})` : extracted.household === 'couple' ? 'Couple' : 'Single'],
              ['Monthly Income', fmt(extracted.monthlyIncome)],
              ['Monthly Debts',  fmt(extracted.monthlyDebts)],
              ['Purchase Price', fmt(extracted.purchasePrice)],
              ['Property Type',  extracted.propertyType.charAt(0).toUpperCase() + extracted.propertyType.slice(1)],
              ['Own Funds',      fmt(extracted.ownFunds)],
              ['Loan Term',      `${extracted.loanTerm} years`],
              ['New Build',      extracted.isNew ? 'Yes' : 'No'],
            ].map(([label, value]) => (
              <div key={label} className="param-row">
                <span className="param-label">{label}</span>
                <span className="param-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ready && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button className="btn-primary" onClick={onComplete} style={{ fontSize: '14px', padding: '12px 32px' }}>
            View My Benefits Analysis →
          </button>
        </div>
      )}

      <div className="nav-row">
        <div />
        <span className="step-label">Step 1 of 4</span>
        <button className="btn-secondary" onClick={onComplete}>
          Skip to Benefits →
        </button>
      </div>
    </div>
  )
}
