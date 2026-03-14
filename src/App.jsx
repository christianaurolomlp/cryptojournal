import { useState, useEffect, useRef, useCallback } from 'react'
import { VIEWS } from './constants.js'
import { store, uid, seedIfEmpty } from './store.js'
import { currentMonthKey, monthLabel, prevMonth, nextMonth } from './utils.js'
import Dashboard from './components/Dashboard.jsx'
import Calendar from './components/Calendar.jsx'
import Stats from './components/Stats.jsx'
import Annual from './components/Annual.jsx'
import Settings from './components/Settings.jsx'
import TradeForm from './components/TradeForm.jsx'
import CloseModal from './components/CloseModal.jsx'
import DeleteModal from './components/DeleteModal.jsx'

// ─── Voice Status ────────────────────────────────────────────────────────────
const VOICE_IDLE = 'idle'
const VOICE_LISTENING = 'listening'
const VOICE_PROCESSING = 'processing'
const VOICE_SUCCESS = 'success'
const VOICE_ERROR = 'error'

// ─── Capital Modal ────────────────────────────────────────────────────────────
function CapitalModal({ currentMonth, caps, onSave, onClose }) {
  const [val, setVal] = useState(caps[currentMonth] ? String(caps[currentMonth]) : '')

  function handleSubmit(e) {
    e.preventDefault()
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0) onSave(n)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <h2 className="modal-title">Capital de {monthLabel(currentMonth)}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Capital inicial (USD)</label>
              <input
                className="form-control"
                type="number"
                min="0"
                step="any"
                placeholder="10000"
                value={val}
                onChange={e => setVal(e.target.value)}
                autoFocus
              />
              <span className="form-hint">Usado para calcular rentabilidad y riesgo en $</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Voice Banner ─────────────────────────────────────────────────────────────
function VoiceBanner({ status, text, onClose }) {
  if (status === VOICE_IDLE) return null
  const labels = {
    [VOICE_LISTENING]: '🎙 Escuchando...',
    [VOICE_PROCESSING]: '⚡ Procesando con IA...',
    [VOICE_SUCCESS]: '✓ Operación detectada',
    [VOICE_ERROR]: '✗ Error'
  }
  return (
    <div className={`voice-banner ${status}`}>
      <div className={`voice-dot ${status}`} />
      <div style={{ flex: 1 }}>
        <div className="voice-banner-text">{labels[status]}</div>
        {text && <div className="voice-banner-sub">{text}</div>}
      </div>
      {(status === VOICE_SUCCESS || status === VOICE_ERROR) && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}>✕</button>
      )}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [trades, setTrades] = useState(() => store.getTrades())
  const [caps, setCaps] = useState(() => store.getCaps())
  const [apiKey, setApiKey] = useState(() => store.getApiKey())
  const [view, setView] = useState(VIEWS.DASHBOARD)
  const [currentMonth, setCurrentMonth] = useState(currentMonthKey())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Modals
  const [showNewTrade, setShowNewTrade] = useState(false)
  const [editTrade, setEditTrade] = useState(null)
  const [closeTrade, setCloseTrade] = useState(null)
  const [deleteTrade, setDeleteTrade] = useState(null)
  const [showCapital, setShowCapital] = useState(false)
  const [voicePrefill, setVoicePrefill] = useState(null)

  // Voice
  const [voiceStatus, setVoiceStatus] = useState(VOICE_IDLE)
  const [voiceText, setVoiceText] = useState('')
  const recognitionRef = useRef(null)

  // Auto-seed on first load
  useEffect(() => {
    seedIfEmpty().then(seeded => {
      if (seeded) {
        setTrades(store.getTrades())
        setCaps(store.getCaps())
      }
    })
  }, [])

  // ── Trade actions ──────────────────────────────────────────────────────────
  const saveTrade = useCallback((trade) => {
    setTrades(prev => {
      const exists = prev.find(t => t.id === trade.id)
      const next = exists ? prev.map(t => t.id === trade.id ? trade : t) : [...prev, trade]
      store.saveTrades(next)
      return next
    })
    setShowNewTrade(false)
    setEditTrade(null)
    setCloseTrade(null)
    setVoicePrefill(null)
  }, [])

  const deleteTradeFn = useCallback((trade) => {
    setTrades(prev => {
      const next = prev.filter(t => t.id !== trade.id)
      store.saveTrades(next)
      return next
    })
    setDeleteTrade(null)
  }, [])

  const reopenTrade = useCallback((trade) => {
    const updated = { ...trade, closed: false, result: null, pnl: null, closeDate: null }
    saveTrade(updated)
  }, [saveTrade])

  const saveCaps = useCallback((newCaps) => {
    setCaps(newCaps)
    store.saveCaps(newCaps)
  }, [])

  const saveCapForMonth = useCallback((amount) => {
    const newCaps = { ...caps, [currentMonth]: amount }
    saveCaps(newCaps)
    setShowCapital(false)
  }, [caps, currentMonth, saveCaps])

  // ── Voice commands ─────────────────────────────────────────────────────────
  const startVoice = useCallback(async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceStatus(VOICE_ERROR)
      setVoiceText('Tu navegador no soporta reconocimiento de voz. Usa Chrome.')
      setTimeout(() => setVoiceStatus(VOICE_IDLE), 4000)
      return
    }

    if (!apiKey) {
      setVoiceStatus(VOICE_ERROR)
      setVoiceText('Configura tu API key de Anthropic en Ajustes.')
      setTimeout(() => setVoiceStatus(VOICE_IDLE), 4000)
      return
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }

    const rec = new SpeechRecognition()
    rec.lang = 'es-ES'
    rec.interimResults = false
    rec.maxAlternatives = 1
    recognitionRef.current = rec

    rec.onstart = () => {
      setVoiceStatus(VOICE_LISTENING)
      setVoiceText('Habla ahora...')
    }

    rec.onresult = async (e) => {
      const transcript = e.results[0][0].transcript
      setVoiceStatus(VOICE_PROCESSING)
      setVoiceText(`"${transcript}"`)

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 256,
            system: `Extrae datos de trading cripto del texto en español. Devuelve SOLO JSON válido sin markdown:
{"crypto":"BTC","type":"LONG","timeframe":"15m","margin":500,"risk":1,"leverage":50}
Usa null si falta un campo. type debe ser "LONG" o "SHORT". crypto debe ser el ticker en mayúsculas.
timeframe ejemplos: "1m","3m","5m","15m","30m","1h","2h","4h","8h","12h","1D","1W","1M"`,
            messages: [{ role: 'user', content: transcript }]
          })
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.error?.message || `HTTP ${response.status}`)
        }

        const data = await response.json()
        const rawText = data.content?.[0]?.text || ''
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('No se pudo parsear la respuesta')

        const parsed = JSON.parse(jsonMatch[0])
        const prefill = {
          crypto: parsed.crypto || 'BTC',
          type: parsed.type === 'SHORT' ? 'SHORT' : 'LONG',
          tf: parsed.timeframe || '15m',
          margin: parsed.margin || '',
          risk: parsed.risk || 1,
          lev: parsed.leverage || 50
        }

        setVoiceStatus(VOICE_SUCCESS)
        setVoiceText(`${prefill.type} ${prefill.crypto} · ${prefill.tf} · Margen: ${prefill.margin ? '$' + prefill.margin : '?'} · Riesgo: ${prefill.risk}% · ${prefill.lev}x`)
        setVoicePrefill(prefill)
        setShowNewTrade(true)

        setTimeout(() => setVoiceStatus(VOICE_IDLE), 5000)
      } catch (err) {
        setVoiceStatus(VOICE_ERROR)
        setVoiceText(`Error al procesar: ${err.message}`)
        setTimeout(() => setVoiceStatus(VOICE_IDLE), 5000)
      }
    }

    rec.onerror = (e) => {
      setVoiceStatus(VOICE_ERROR)
      setVoiceText(`Error de micrófono: ${e.error}`)
      setTimeout(() => setVoiceStatus(VOICE_IDLE), 4000)
    }

    rec.onend = () => {
      if (voiceStatus === VOICE_LISTENING) {
        setVoiceStatus(VOICE_IDLE)
      }
    }

    rec.start()
  }, [apiKey, voiceStatus])

  const stopVoice = useCallback(() => {
    try { recognitionRef.current?.stop() } catch {}
    setVoiceStatus(VOICE_IDLE)
  }, [])

  // ── Nav actions ────────────────────────────────────────────────────────────
  const navigate = (v) => {
    setView(v)
    setSidebarOpen(false)
  }

  const navItems = [
    { id: VIEWS.DASHBOARD, icon: '📊', label: 'Dashboard' },
    { id: VIEWS.CALENDAR, icon: '📅', label: 'Calendario' },
    { id: VIEWS.STATS, icon: '📈', label: 'Estadísticas' },
    { id: VIEWS.ANNUAL, icon: '🗓', label: 'Vista Anual' },
    { id: VIEWS.SETTINGS, icon: '⚙', label: 'Configuración' }
  ]

  const capital = caps[currentMonth] || 0

  return (
    <div className="app-layout">
      {/* Overlay for mobile sidebar */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">₿</div>
          <div>
            <div className="brand-text">CryptoJournal</div>
            <div className="brand-sub">Trading Diary</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => { setVoicePrefill(null); setShowNewTrade(true); setSidebarOpen(false) }}
          >
            + Nueva Operación
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
              <span /><span /><span />
            </button>

            {view !== VIEWS.ANNUAL && view !== VIEWS.SETTINGS && (
              <div className="month-nav">
                <button className="month-nav-btn" onClick={() => setCurrentMonth(m => prevMonth(m))}>‹</button>
                <span className="month-label">{monthLabel(currentMonth)}</span>
                <button className="month-nav-btn" onClick={() => setCurrentMonth(m => nextMonth(m))}>›</button>
              </div>
            )}

            {view !== VIEWS.ANNUAL && view !== VIEWS.SETTINGS && (
              <button
                className={`capital-badge ${!capital ? 'no-cap' : ''}`}
                onClick={() => setShowCapital(true)}
                title="Editar capital del mes"
              >
                <span>Capital</span>
                <strong>{capital ? `$${capital.toLocaleString('es-ES')}` : '— Sin definir'}</strong>
              </button>
            )}
          </div>

          <div className="topbar-right">
            {/* Voice Button */}
            <button
              className={`btn-voice ${voiceStatus === VOICE_LISTENING ? 'listening' : voiceStatus === VOICE_PROCESSING ? 'processing' : ''}`}
              onClick={voiceStatus === VOICE_LISTENING ? stopVoice : startVoice}
              title="Comando de voz"
            >
              {voiceStatus === VOICE_LISTENING ? '⏹ Detener' : voiceStatus === VOICE_PROCESSING ? '⚡ IA...' : '🎙 Voz'}
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setVoicePrefill(null); setShowNewTrade(true) }}
            >
              + Nueva
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main>
          {view === VIEWS.DASHBOARD && (
            <Dashboard
              key={currentMonth}
              trades={trades}
              caps={caps}
              currentMonth={currentMonth}
              onEdit={t => setEditTrade(t)}
              onDelete={t => setDeleteTrade(t)}
              onClose={t => setCloseTrade(t)}
              onReopen={reopenTrade}
              onNewTrade={() => setShowNewTrade(true)}
            />
          )}
          {view === VIEWS.CALENDAR && (
            <Calendar
              key={currentMonth}
              trades={trades}
              currentMonth={currentMonth}
            />
          )}
          {view === VIEWS.STATS && (
            <Stats
              key={currentMonth}
              trades={trades}
              caps={caps}
              currentMonth={currentMonth}
            />
          )}
          {view === VIEWS.ANNUAL && (
            <Annual
              trades={trades}
              caps={caps}
              onMonthClick={key => {
                setCurrentMonth(key)
                setView(VIEWS.DASHBOARD)
              }}
            />
          )}
          {view === VIEWS.SETTINGS && (
            <Settings
              caps={caps}
              onCapsChange={saveCaps}
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
            />
          )}
        </main>
      </div>

      {/* ── Modals ── */}
      {(showNewTrade || voicePrefill) && (
        <TradeForm
          prefill={voicePrefill}
          capital={capital}
          onSave={saveTrade}
          onClose={() => { setShowNewTrade(false); setVoicePrefill(null) }}
        />
      )}

      {editTrade && (
        <TradeForm
          initial={editTrade}
          capital={capital}
          onSave={saveTrade}
          onClose={() => setEditTrade(null)}
          isEdit
        />
      )}

      {closeTrade && (
        <CloseModal
          trade={closeTrade}
          onSave={saveTrade}
          onClose={() => setCloseTrade(null)}
        />
      )}

      {deleteTrade && (
        <DeleteModal
          trade={deleteTrade}
          onConfirm={() => deleteTradeFn(deleteTrade)}
          onClose={() => setDeleteTrade(null)}
        />
      )}

      {showCapital && (
        <CapitalModal
          currentMonth={currentMonth}
          caps={caps}
          onSave={saveCapForMonth}
          onClose={() => setShowCapital(false)}
        />
      )}

      {/* Voice Banner */}
      <VoiceBanner
        status={voiceStatus}
        text={voiceText}
        onClose={() => setVoiceStatus(VOICE_IDLE)}
      />
    </div>
  )
}
