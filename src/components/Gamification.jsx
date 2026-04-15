// Gamification system — XP, Badges, Streak Calendar

// Niveles de progresión del trader — simples, motivadores, sin rangos navales
const LEVELS = [
  { name: 'Nivel 1 · Novato',    min: 0,     max: 500,      color: '#6B7280', icon: '🌱' },
  { name: 'Nivel 2 · Aprendiz',  min: 500,   max: 1500,     color: '#10B981', icon: '📈' },
  { name: 'Nivel 3 · Operador',  min: 1500,  max: 3500,     color: '#06B6D4', icon: '🎯' },
  { name: 'Nivel 4 · Trader',    min: 3500,  max: 7000,     color: '#8B5CF6', icon: '💹' },
  { name: 'Nivel 5 · Experto',   min: 7000,  max: 12000,    color: '#F59E0B', icon: '🏆' },
  { name: 'Nivel 6 · Élite',     min: 12000, max: Infinity, color: '#EC4899', icon: '💎' },
]

function calcXP(trades) {
  return trades.reduce((sum, t) => {
    if (!t.closed) return sum
    if (t.result === 'WIN')  return sum + 100
    if (t.result === 'BE')   return sum + 50
    return sum + 25
  }, 0)
}

export function XPBar({ trades }) {
  const xp = calcXP(trades)
  const level = [...LEVELS].reverse().find(l => xp >= l.min) || LEVELS[0]
  const pct = level.max === Infinity
    ? 100
    : Math.min(100, ((xp - level.min) / (level.max - level.min)) * 100)

  return (
    <div className="xp-bar-container">
      <div className="xp-header">
        <span className="xp-level" style={{ color: level.color }}>
          {level.icon} {level.name}
        </span>
        <span className="xp-points">{xp.toLocaleString()} XP</span>
      </div>
      <div className="xp-track">
        <div
          className="xp-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${level.color}, ${level.color}88)`,
            boxShadow: `0 0 10px ${level.color}60`,
          }}
        />
      </div>
      {level.max !== Infinity && (
        <div className="xp-next">Próximo: {level.max.toLocaleString()} XP</div>
      )}
    </div>
  )
}

// ─── Badges ──────────────────────────────────────────────────────────────────

const SCALPER_TFS  = ['1', '3', '5', '15']
const DAYTRADER_TFS = ['60', '1h', '240', '4h']
const SWING_TFS    = ['D', '1d', 'W', '1w', 'M', '1M']

const ALL_BADGES = [
  // ── Milestone
  {
    id: 'first', name: 'First Trade', emoji: '⚓', color: '#6B7280',
    desc: 'Registra tu primer trade',
    achieved: '¡Lo conseguiste! Registraste tu primer trade en el diario.',
    req: t => t.length >= 1,
  },
  {
    id: 'diamond', name: 'Veterano', emoji: '💎', color: '#06B6D4',
    desc: 'Llega a 25 trades cerrados',
    achieved: '25 trades cerrados registrados. Ya tienes datos reales con los que trabajar.',
    req: t => t.filter(x => x.closed).length >= 25,
  },
  {
    id: 'prolific', name: 'Incansable', emoji: '📈', color: '#F59E0B',
    desc: 'Llega a 50 trades cerrados',
    achieved: '50 trades cerrados. Tu muestra estadística empieza a ser sólida.',
    req: t => t.filter(x => x.closed).length >= 50,
  },
  {
    id: 'centurion', name: 'Leyenda', emoji: '🏆', color: '#EC4899',
    desc: 'Llega a 100 trades cerrados',
    achieved: '100 trades cerrados. Eres de los pocos que llegan aquí con datos reales.',
    req: t => t.filter(x => x.closed).length >= 100,
  },

  // ── Performance
  {
    id: 'fire', name: 'On Fire', emoji: '🔥', color: '#F59E0B',
    desc: 'Consigue 5 wins en el mismo mes',
    achieved: '5 wins en un mes. El mercado está respondiendo a tu análisis.',
    req: t => {
      const byMonth = {}
      t.filter(x => x.closed && x.result === 'WIN').forEach(x => {
        const m = (x.closeDate || x.date || '').slice(0, 7)
        if (m) byMonth[m] = (byMonth[m] || 0) + 1
      })
      return Object.values(byMonth).some(v => v >= 5)
    },
  },
  {
    id: 'sniper', name: 'Sniper', emoji: '🎯', color: '#10B981',
    desc: 'Encadena 5 wins consecutivos',
    achieved: '5 wins seguidos. Tu proceso está alineado con el mercado.',
    req: t => {
      let s = 0, m = 0
      t.filter(x => x.closed)
        .slice()
        .sort((a, b) => new Date(a.closeDate || a.date) - new Date(b.closeDate || b.date))
        .forEach(x => { x.result === 'WIN' ? (m = Math.max(m, ++s)) : (s = 0) })
      return m >= 5
    },
  },

  // ── Estilo de trading
  {
    id: 'scalper', name: 'Scalper', emoji: '⚡', color: '#22c55e',
    desc: 'Opera 5 trades en TF cortos (1m–15m)',
    achieved: 'Más de 5 trades en TF de 1m a 15m. Dominas los movimientos rápidos.',
    req: t => t.filter(x => x.closed && SCALPER_TFS.includes(String(x.tf))).length >= 5,
  },
  {
    id: 'daytrader', name: 'Day Trader', emoji: '📊', color: '#8B5CF6',
    desc: 'Opera 5 trades en TF 1h o 4h',
    achieved: 'Más de 5 trades en 1h/4h. Tu estilo es el intradía con contexto.',
    req: t => t.filter(x => x.closed && DAYTRADER_TFS.includes(String(x.tf))).length >= 5,
  },
  {
    id: 'swing', name: 'Swing Trader', emoji: '🌊', color: '#38d8f5',
    desc: 'Opera 3 trades en TF 1d o superior',
    achieved: 'Más de 3 trades en diario o superior. Juegas a grande y con paciencia.',
    req: t => t.filter(x => x.closed && SWING_TFS.includes(String(x.tf))).length >= 3,
  },
]

export function BadgeGrid({ trades }) {
  return (
    <div className="badge-grid">
      {ALL_BADGES.map(b => {
        const ok = b.req(trades)
        return (
          <div
            key={b.id}
            className={`badge-item ${ok ? 'unlocked' : 'locked'}`}
            title={ok ? `✅ ${b.name} — ${b.achieved}` : `🔒 ${b.name}: ${b.desc}`}
          >
            <div
              className="badge-emoji"
              style={ok ? { filter: `drop-shadow(0 0 5px ${b.color})` } : {}}
            >
              {ok ? b.emoji : '???'}
            </div>
            <div className="badge-name" style={ok ? { color: b.color } : {}}>
              {ok ? b.name : '???'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Streak Calendar ─────────────────────────────────────────────────────────

export function StreakCalendar({ trades, currentMonth }) {
  const today = new Date()
  const todayKey = today.toISOString().split('T')[0]

  // currentMonth format: "YYYY-MM"
  const [year, month] = currentMonth ? currentMonth.split('-').map(Number) : [today.getFullYear(), today.getMonth() + 1]
  const daysInMonth = new Date(year, month, 0).getDate()

  // Get day of week of 1st (0=Sun…6=Sat → convert to Mon-first: Mon=0)
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7
  // Pad with empty cells at start
  const cells = [
    ...Array.from({ length: firstDow }, (_, i) => ({ key: `empty-${i}`, empty: true })),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const dt = trades.filter(t => (t.closeDate || t.date || '').startsWith(key))
      return {
        key, empty: false, day: d,
        hasWin:  dt.some(t => t.result === 'WIN'),
        hasLoss: dt.some(t => t.result === 'LOSS'),
        isToday: key === todayKey,
        count:   dt.length,
      }
    })
  ]

  const DOW = ['L','M','X','J','V','S','D']
  const monthName = new Date(year, month - 1, 1).toLocaleString('es-ES', { month: 'long' })

  return (
    <div className="streak-wrapper">
      <div className="streak-cal-title">Actividad — {monthName}</div>
      <div className="streak-dow">
        {DOW.map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="streak-cal">
        {cells.map(d => {
          if (d.empty) return <div key={d.key} className="streak-day empty" />
          let cls = 'streak-day'
          if (d.hasWin && !d.hasLoss) cls += ' win'
          else if (d.hasLoss && !d.hasWin) cls += ' loss'
          else if (d.count > 0) cls += ' mixed'
          if (d.isToday) cls += ' today'
          return <div key={d.key} className={cls} title={`${d.day} — ${d.count > 0 ? d.count + ' trade(s)' : 'sin trades'}`} />
        })}
      </div>
      <div className="streak-legend">
        <span><span className="sl-dot win" />Win</span>
        <span><span className="sl-dot loss" />Loss</span>
        <span><span className="sl-dot mixed" />Mixto</span>
        <span><span className="sl-dot" />Sin op.</span>
      </div>
    </div>
  )
}
