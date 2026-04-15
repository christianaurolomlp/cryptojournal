import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from './hooks/useTheme'
import { VIEWS } from './constants.js'
import { LayoutDashboard, CalendarDays, BarChart2, CalendarRange, History, Settings as SettingsIcon, Plus, Mic, MicOff, Zap, RefreshCw, Moon, Sun } from 'lucide-react'
import { store, apiStore, isApiConfigured, uid, seedIfEmpty } from './store.js'
import { currentMonthKey, monthLabel, prevMonth, nextMonth, calcStats, tradesForMonth } from './utils.js'
import { XPBar, BadgeGrid } from './components/Gamification.jsx'
import Dashboard from './components/Dashboard.jsx'
import Calendar from './components/Calendar.jsx'
import Stats from './components/Stats.jsx'
import Annual from './components/Annual.jsx'
import Settings from './components/Settings.jsx'
import TradeHistory from './components/TradeHistory.jsx'
import TradeForm from './components/TradeForm.jsx'
import CloseModal from './components/CloseModal.jsx'
import DeleteModal from './components/DeleteModal.jsx'

// ─── Voice Status ────────────────────────────────────────────────────────────
const VOICE_IDLE = 'idle'
const VOICE_LISTENING = 'listening'
const VOICE_PROCESSING = 'processing'
const VOICE_SUCCESS = 'success'
const VOICE_ERROR = 'error'

// ─── Migration Modal ──────────────────────────────────────────────────────────
function MigrationModal({ count, onMigrate, onSkip }) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">📦 Migrar datos locales</h2>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Se encontraron <strong>{count}</strong> operaciones guardadas en este navegador. 
            ¿Quieres migrarlas a la base de datos?
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>
            Después de migrar, los datos estarán seguros en la nube y accesibles desde cualquier dispositivo.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onSkip}>No, descartar</button>
          <button className="btn btn-primary" onClick={onMigrate}>Sí, migrar</button>
        </div>
      </div>
    </div>
  )
}

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
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
      )}
    </div>
  )
}

// ─── Sync indicator ───────────────────────────────────────────────────────────
function SyncBadge({ syncing }) {
  if (!isApiConfigured()) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, color: syncing ? 'var(--orange)' : 'var(--blue)',
      marginLeft: 8, opacity: 0.7
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: syncing ? 'var(--orange)' : 'var(--blue)',
        animation: syncing ? 'pulse 1s infinite' : 'none'
      }} />
      {syncing ? 'Sincronizando...' : 'Sync'}
    </span>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const PALETTES = [
  { id: 'default', color: '#1278B7', label: 'Midnight Blue' },
  { id: 'layer3',  color: '#6366F1', label: 'Layer3 Purple' },
  { id: 'mlp',    color: '#38d8f5', label: 'MLP Cyan'       },
  { id: 'carbon', color: '#22c55e', label: 'Carbon Green'   },
  { id: 'gold',   color: '#F59E0B', label: 'Noir Gold'      },
]

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const [palette, setPalette] = useState(() => localStorage.getItem('cj-palette') || 'default')
  const [trades, setTrades] = useState([])
  const [caps, setCaps] = useState({})
  const [anthropicKey, setAnthropicKey] = useState(() => store.getAnthropicKey())
  const [view, setView] = useState(VIEWS.DASHBOARD)
  const [currentMonth, setCurrentMonth] = useState(currentMonthKey())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showMigration, setShowMigration] = useState(false)
  const [migrationCount, setMigrationCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)

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

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async (retryCount = 0) => {
    if (isApiConfigured()) {
      setSyncing(true)
      try {
        const [remoteTrades, remoteCaps] = await Promise.all([
          apiStore.getTrades(),
          apiStore.getCaps()
        ])
        if (remoteTrades !== null) {
          setTrades(remoteTrades)
          if (remoteCaps !== null) setCaps(remoteCaps)
          
          // Check for local data to migrate — only if DB is empty (prevents duplicate migration)
          if (store.hasLocalTrades() && remoteTrades.length === 0) {
            const localTrades = store.getTrades()
            setMigrationCount(localTrades.length)
            setShowMigration(true)
          } else if (store.hasLocalTrades()) {
            // DB already has data — clear local to prevent future duplicates
            store.clearLocalTrades()
          }
          
          setSyncing(false)
          setLoading(false)
          setApiError(false)
          return
        }
      } catch (err) {
        console.error('Failed to load from API:', err)
      }
      setSyncing(false)
      
      // Auto-retry con backoff (Railway cold start puede tardar 10-20s)
      if (retryCount < 3) {
        const delay = retryCount === 0 ? 3000 : retryCount === 1 ? 6000 : 10000
        console.log(`API load failed, retrying in ${delay}ms... (attempt ${retryCount + 1}/3)`)
        await new Promise(r => setTimeout(r, delay))
        return loadData(retryCount + 1)
      }
      
      // After retry, show error state with refresh button
      setTrades([])
      setCaps({})
      setApiError(true)
      setLoading(false)
      return
    }
    
    // No API key — use localStorage
    const localTrades = store.getTrades()
    const localCaps = store.getCaps()
    setTrades(localTrades)
    setCaps(localCaps)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Migration ──────────────────────────────────────────────────────────────
  const handleMigrate = useCallback(async () => {
    const localTrades = store.getTrades()
    const localCaps = store.getCaps()
    setSyncing(true)
    setShowMigration(false)
    try {
      if (localTrades.length > 0) {
        await apiStore.bulkImport(localTrades)
      }
      if (Object.keys(localCaps).length > 0) {
        // Merge with remote caps
        const remoteCaps = await apiStore.getCaps() || {}
        const merged = { ...remoteCaps, ...localCaps }
        await apiStore.saveCaps(merged)
      }
      // Clear local data after successful migration
      store.clearLocalTrades()
      // Reload from API
      const fresh = await apiStore.getTrades()
      if (fresh) setTrades(fresh)
      const freshCaps = await apiStore.getCaps()
      if (freshCaps) setCaps(freshCaps)
    } catch (err) {
      console.error('Migration error:', err)
    }
    setSyncing(false)
  }, [])

  const handleSkipMigration = useCallback(() => {
    store.clearLocalTrades()
    setShowMigration(false)
  }, [])

  // ── Trade actions ──────────────────────────────────────────────────────────
  const saveTrade = useCallback(async (trade) => {
    setTrades(prev => {
      const exists = prev.find(t => t.id === trade.id)
      return exists ? prev.map(t => t.id === trade.id ? trade : t) : [...prev, trade]
    })
    setShowNewTrade(false)
    setEditTrade(null)
    setCloseTrade(null)
    setVoicePrefill(null)

    if (isApiConfigured()) {
      setSyncing(true)
      try {
        await apiStore.saveTrade(trade)
      } catch (err) {
        console.error('Failed to save trade to API:', err)
      }
      setSyncing(false)
    } else {
      // Fallback: save to localStorage
      setTrades(prev => {
        store.saveTrades(prev)
        return prev
      })
    }
  }, [])

  const deleteTradeFn = useCallback(async (trade) => {
    setTrades(prev => {
      const next = prev.filter(t => t.id !== trade.id)
      if (!isApiConfigured()) store.saveTrades(next)
      return next
    })
    setDeleteTrade(null)

    if (isApiConfigured()) {
      setSyncing(true)
      try {
        await apiStore.deleteTrade(trade.id)
      } catch (err) {
        console.error('Failed to delete trade from API:', err)
      }
      setSyncing(false)
    }
  }, [])

  const reopenTrade = useCallback((trade) => {
    const updated = { ...trade, closed: false, result: null, pnl: null, closeDate: null }
    saveTrade(updated)
  }, [saveTrade])

  const toggleProtectedTrade = useCallback((trade) => {
    const updated = { ...trade, protected: !trade.protected }
    saveTrade(updated)
  }, [saveTrade])

  const saveCaps = useCallback(async (newCaps) => {
    setCaps(newCaps)
    if (isApiConfigured()) {
      setSyncing(true)
      try {
        await apiStore.saveCaps(newCaps)
      } catch (err) {
        console.error('Failed to save caps to API:', err)
      }
      setSyncing(false)
    } else {
      store.saveCaps(newCaps)
    }
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

    if (!anthropicKey) {
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
        // ── Local regex fallback parser ──────────────────────────────────────
        function localParse(text) {
          const t = text.toLowerCase()
          // Direction
          const type = /\b(short|bajista|venta|vendo|cort[oó])\b/.test(t) ? 'SHORT' : 'LONG'
          // Crypto normalization
          const cryptoMap = {
            bitcoin: 'BTC', btc: 'BTC', ethereum: 'ETH', eth: 'ETH',
            solana: 'SOL', sol: 'SOL', ripple: 'XRP', xrp: 'XRP',
            cardano: 'ADA', ada: 'ADA', doge: 'DOGE', dogecoin: 'DOGE',
            pepe: 'PEPE', bonk: 'BONK', shib: 'SHIB', shibainu: 'SHIB',
            bnb: 'BNB', binance: 'BNB', avalanche: 'AVAX', avax: 'AVAX',
            link: 'LINK', chainlink: 'LINK', dot: 'DOT', polkadot: 'DOT',
            atom: 'ATOM', cosmos: 'ATOM', near: 'NEAR', ton: 'TON',
            trump: 'TRUMP', icp: 'ICP', hondo: 'HBAR', hbar: 'HBAR',
            oro: 'GOLD', gold: 'GOLD', plata: 'SILVER', silver: 'SILVER',
            xrp: 'XRP', ondo: 'ONDO', pengu: 'PENGU', tao: 'TAO',
          }
          let crypto = 'BTC'
          for (const [k, v] of Object.entries(cryptoMap)) {
            if (t.includes(k)) { crypto = v; break }
          }
          // Timeframe
          const tfMap = [
            [/\b(un minuto|1 minuto|1m)\b/, '1m'],
            [/\b(tres minutos?|3 minutos?|3m)\b/, '3m'],
            [/\b(cinco minutos?|5 minutos?|5m)\b/, '5m'],
            [/\b(quince|15 minutos?|15m)\b/, '15m'],
            [/\b(treinta|30 minutos?|30m)\b/, '30m'],
            [/\b(una hora|1 hora|1h)\b/, '1h'],
            [/\b(2 horas?|dos horas?|2h)\b/, '2h'],
            [/\b(4 horas?|cuatro horas?|4h)\b/, '4h'],
            [/\b(8 horas?|ocho horas?|8h)\b/, '8h'],
            [/\b(diario|1d|un d[íi]a)\b/, '1D'],
          ]
          let tf = '15m'
          for (const [rx, val] of tfMap) { if (rx.test(t)) { tf = val; break } }
          // In "el tres" / "en el 3" → 3m
          if (/\ben el (tres|3)\b/.test(t)) tf = '3m'
          if (/\ben el (cinco|5)\b/.test(t)) tf = '5m'
          if (/\ben el (quince|15)\b/.test(t)) tf = '15m'
          // Margin
          let margin = null
          const mMatch = t.match(/(\d+)\s*(k|mil)?\s*(de\s+)?(margen|margin|dólares?|usd)?/)
          if (mMatch) {
            let n = parseInt(mMatch[1])
            if (mMatch[2]) n *= 1000
            if (n >= 10 && n <= 100000) margin = n
          }
          // Risk
          let risk = 1
          const rMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(%|por ciento|porciento)/)
          if (rMatch) risk = parseFloat(rMatch[1].replace(',', '.'))
          // Leverage
          let lev = 50
          const lMatch = t.match(/(\d+)\s*x\b/) || t.match(/\b(x|con)\s*(\d+)\b/)
          if (lMatch) lev = parseInt(lMatch[1] || lMatch[2])
          return { crypto, type, tf, margin, risk, lev }
        }

        let prefill
        if (anthropicKey) {
          // ── Claude Haiku (smart parse) ──────────────────────────────────────
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 300,
              system: `Eres un parser experto de operaciones de trading cripto. Aurolo habla en español natural y rápido.
Extrae los datos y devuelve SOLO JSON sin markdown:
{"crypto":"BTC","type":"LONG","tf":"1h","margin":500,"risk":1,"lev":50,"notes":""}

REGLAS ESTRICTAS:
- crypto: ticker EN MAYÚSCULAS. bitcoin→BTC, ethereum/eth→ETH, solana→SOL, ripple→XRP, cardano→ADA, doge/dogecoin→DOGE, pepe→PEPE, bonk→BONK, shib→SHIB, bnb→BNB, avalanche/avax→AVAX, link→LINK, atom/cosmos→ATOM, near→NEAR, ton→TON, hondo/hbar→HBAR, oro/gold→GOLD, trump→TRUMP, icp→ICP, ondo→ONDO, pengu→PENGU, tao→TAO, xrp→XRP
- type: "LONG" o "SHORT". long/compra/alcista/sube→LONG, short/venta/bajista/baja/cae→SHORT
- tf: "1m","3m","5m","15m","30m","1h","2h","4h","8h","12h","1D","1W". "en el tres"→"3m", "en el quince"→"15m", "1 hora"→"1h", "4 horas"→"4h", "diario"→"1D"
- margin: dólares numéricos. "mil"→1000, "dos mil"→2000, "500"→500. null si no menciona
- risk: % de riesgo. "1 por ciento"→1, "dos"→2. Default: 1
- lev: apalancamiento. "50x"→50, "con 20"→20. Default: 50
- notes: cualquier comentario extra o contexto relevante. "" si nada

EJEMPLOS:
"long en bitcoin en 1 hora 500 de margen" → {"crypto":"BTC","type":"LONG","tf":"1h","margin":500,"risk":1,"lev":50,"notes":""}
"short eth en el quince con 2 por ciento de riesgo" → {"crypto":"ETH","type":"SHORT","tf":"15m","margin":null,"risk":2,"lev":50,"notes":""}
"long solana 4 horas mil de margen 20x" → {"crypto":"SOL","type":"LONG","tf":"4h","margin":1000,"risk":1,"lev":20,"notes":""}
"entro long en xrp diario señal fuerte" → {"crypto":"XRP","type":"LONG","tf":"1D","margin":null,"risk":1,"lev":50,"notes":"señal fuerte"}`,
              messages: [{ role: 'user', content: transcript }]
            })
          })

          if (!response.ok) throw new Error(`API ${response.status}`)
          const data = await response.json()
          const raw = data.content?.[0]?.text || ''
          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          if (!jsonMatch) throw new Error('Sin JSON en respuesta')
          const p = JSON.parse(jsonMatch[0])
          prefill = {
            crypto: p.crypto || 'BTC',
            type: p.type === 'SHORT' ? 'SHORT' : 'LONG',
            tf: p.tf || '15m',
            margin: p.margin || '',
            risk: p.risk ?? 1,
            lev: p.lev || 50,
            notes: p.notes || ''
          }
        } else {
          // ── Local fallback (no API key needed) ──────────────────────────────
          prefill = { ...localParse(transcript), notes: '' }
        }

        setVoiceStatus(VOICE_SUCCESS)
        setVoiceText(`${prefill.type} ${prefill.crypto} · ${prefill.tf}${prefill.margin ? ' · $' + prefill.margin : ''} · ${prefill.risk}% riesgo · ${prefill.lev}x`)
        setVoicePrefill(prefill)
        setShowNewTrade(true)

        setTimeout(() => setVoiceStatus(VOICE_IDLE), 6000)
      } catch (err) {
        // Try local parse as last resort
        try {
          function localParseEmerg(text) {
            const t = text.toLowerCase()
            const type = /\b(short|bajista|venta)\b/.test(t) ? 'SHORT' : 'LONG'
            const cryptoMap = { bitcoin:'BTC',btc:'BTC',ethereum:'ETH',eth:'ETH',solana:'SOL',sol:'SOL',ripple:'XRP',xrp:'XRP',doge:'DOGE',pepe:'PEPE',bonk:'BONK',shib:'SHIB',bnb:'BNB',avax:'AVAX',link:'LINK',atom:'ATOM',near:'NEAR',ton:'TON',trump:'TRUMP',icp:'ICP',hondo:'HBAR',hbar:'HBAR',oro:'GOLD',gold:'GOLD',ondo:'ONDO',pengu:'PENGU',tao:'TAO' }
            let crypto = 'BTC'
            for (const [k,v] of Object.entries(cryptoMap)) { if(t.includes(k)){crypto=v;break} }
            let tf='15m'
            if(/1\s*hora|1h/.test(t))tf='1h'; else if(/4\s*hora|4h/.test(t))tf='4h'; else if(/el tres|3m/.test(t))tf='3m'; else if(/quince|15m/.test(t))tf='15m'; else if(/diario|1d/.test(t))tf='1D'
            const mMatch=t.match(/(\d{3,})/); const margin=mMatch?parseInt(mMatch[1]):null
            return {crypto,type,tf,margin:margin||'',risk:1,lev:50,notes:''}
          }
          const prefill = localParseEmerg(transcript)
          setVoiceStatus(VOICE_SUCCESS)
          setVoiceText(`${prefill.type} ${prefill.crypto} · ${prefill.tf} (local) · ${prefill.margin ? '$'+prefill.margin : 'sin margen'}`)
          setVoicePrefill(prefill)
          setShowNewTrade(true)
          setTimeout(() => setVoiceStatus(VOICE_IDLE), 6000)
        } catch {
          setVoiceStatus(VOICE_ERROR)
          setVoiceText(`No entendí: "${transcript.slice(0,40)}" — intenta de nuevo`)
          setTimeout(() => setVoiceStatus(VOICE_IDLE), 5000)
        }
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
  }, [anthropicKey, voiceStatus])

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
    { id: VIEWS.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
    { id: VIEWS.CALENDAR, icon: CalendarDays, label: 'Calendario' },
    { id: VIEWS.STATS, icon: BarChart2, label: 'Estadísticas' },
    { id: VIEWS.ANNUAL, icon: CalendarRange, label: 'Vista Anual' },
    { id: VIEWS.HISTORY, icon: History, label: 'Historial' },
    { id: VIEWS.SETTINGS, icon: SettingsIcon, label: 'Configuración' }
  ]

  const capital = caps[currentMonth] || 0

  // Capital final = capital inicial + P&L del mes (igual que calcStats en Dashboard)
  const capitalActual = (() => {
    if (!capital) return 0
    const mTrades = tradesForMonth(trades, currentMonth)
    const st = calcStats(mTrades, capital)
    return st.capitalFinal ?? capital
  })()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-muted)', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontFamily: 'var(--font)', color: 'var(--blue)', letterSpacing: '0.15em', marginBottom: 12 }}>CRYPTO JOURNAL</div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--text-muted)', animation: 'pulse 1s infinite' }}>INITIALIZING...</div>
        </div>
      </div>
    )
  }

  if (apiError) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-muted)', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', maxWidth: 380, padding: '0 24px' }}>
          <div style={{ fontSize: 16, fontFamily: 'var(--font)', color: 'var(--red)', letterSpacing: '0.1em', marginBottom: 16 }}>CONNECTION ERROR</div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font)', color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.8 }}>Server cold start detected. Retry in a few seconds.</div>
          <button
            onClick={() => { setApiError(false); setLoading(true); loadData() }}
            className="btn btn-primary"
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-layout" data-palette={palette}>
      <div className="bg-ambient" />
      {/* Overlay for mobile sidebar */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">⚓</span>
          <div className="brand-text">
            <div className="brand-name">BITÁCORA</div>
            <div className="brand-sub">Trading Journal <SyncBadge syncing={syncing} /></div>
          </div>
        </div>

        {capital > 0 && (
          <div className="sidebar-widget">
            <div className="sidebar-widget-label">Capital Final del mes</div>
            <div className="sidebar-widget-value" style={{ color: capitalActual > capital ? '#22c55e' : capitalActual < capital ? '#ef4444' : '#fff' }}>
              ${capitalActual.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="xp-next" style={{ marginTop: 2 }}>
              Inicial: ${capital.toLocaleString('es-ES')}
              {capitalActual > capital && <span style={{ color: '#22c55e', marginLeft: 4 }}>+{((capitalActual/capital - 1)*100).toFixed(1)}%</span>}
              {capitalActual < capital && <span style={{ color: '#ef4444', marginLeft: 4 }}>{((capitalActual/capital - 1)*100).toFixed(1)}%</span>}
            </div>
          </div>
        )}

        <XPBar trades={trades} />

        <nav className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`nav-item ${view === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.id)}
              >
                <Icon size={18} strokeWidth={1.8} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <BadgeGrid trades={trades} />



        <div className="sidebar-footer">
          <button
            className="btn-primary-full"
            onClick={() => { setVoicePrefill(null); setShowNewTrade(true); setSidebarOpen(false) }}
          >
            <Plus size={14} strokeWidth={2.2} /> Nueva operación
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

            <input
              className="topbar-search"
              placeholder="Buscar operaciones..."
              type="search"
              style={{ display: typeof window !== 'undefined' && window.innerWidth <= 768 ? 'none' : undefined }}
            />
          </div>

          <div className="topbar-right">
            {/* Palette picker */}
            <div className="palette-picker">
              {PALETTES.map(p => (
                <div
                  key={p.id}
                  className={`palette-dot${palette === p.id ? ' active' : ''}`}
                  data-p={p.id}
                  title={p.label}
                  onClick={() => { setPalette(p.id); localStorage.setItem('cj-palette', p.id) }}
                />
              ))}
            </div>

            {/* Refresh button — recargar datos desde la API */}
            <button
              onClick={() => { setSyncing(true); loadData() }}
              disabled={syncing}
              title="Recargar datos"
              className="icon-btn"
            >
              <RefreshCw size={15} strokeWidth={1.8} style={{ opacity: syncing ? 0.4 : 1, animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            {/* Voice Button */}
            <button
              className={`btn-voice ${voiceStatus === VOICE_LISTENING ? 'listening' : voiceStatus === VOICE_PROCESSING ? 'processing' : ''}`}
              onClick={voiceStatus === VOICE_LISTENING ? stopVoice : startVoice}
              title="Comando de voz"
            >
              {voiceStatus === VOICE_LISTENING
                ? <><MicOff size={13} strokeWidth={2} /> Detener</>
                : voiceStatus === VOICE_PROCESSING
                  ? <><Zap size={13} strokeWidth={2} /> IA...</>
                  : <><Mic size={13} strokeWidth={1.8} /> Voz</>
              }
            </button>

            <button
              className="btn-new"
              onClick={() => { setVoicePrefill(null); setShowNewTrade(true) }}
            >
              <Plus size={14} strokeWidth={2.2} /> Nueva
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
              theme={theme}
              onEdit={t => setEditTrade(t)}
              onDelete={t => setDeleteTrade(t)}
              onClose={t => setCloseTrade(t)}
              onReopen={reopenTrade}
              onNewTrade={() => setShowNewTrade(true)}
              onToggleProtected={toggleProtectedTrade}
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
          {view === VIEWS.HISTORY && (
            <TradeHistory
              trades={trades}
              onEdit={t => setEditTrade(t)}
              onDelete={t => setDeleteTrade(t)}
              onClose={t => setCloseTrade(t)}
              onReopen={reopenTrade}
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
              anthropicKey={anthropicKey}
              onAnthropicKeyChange={setAnthropicKey}
              onDataReload={loadData}
            />
          )}
        </main>
      </div>

      {/* ── Modals ── */}
      {(showNewTrade || voicePrefill) && (
        <TradeForm
          prefill={voicePrefill}
          capital={capitalActual}
          onSave={saveTrade}
          onClose={() => { setShowNewTrade(false); setVoicePrefill(null) }}
        />
      )}

      {editTrade && (
        <TradeForm
          initial={editTrade}
          capital={capitalActual}
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

      {showMigration && (
        <MigrationModal
          count={migrationCount}
          onMigrate={handleMigrate}
          onSkip={handleSkipMigration}
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
