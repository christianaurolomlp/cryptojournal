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

const ALL_BADGES = [
  {
    id: 'first', name: 'First Trade', emoji: '⚓', color: '#6B7280',
    req: t => t.length >= 1,
  },
  {
    id: 'sniper', name: 'Sniper', emoji: '🎯', color: '#10B981',
    req: t => {
      let s = 0, m = 0
      ;[...t].filter(x => x.closed)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .forEach(x => { x.result === 'WIN' ? m = Math.max(m, ++s) : (s = 0) })
      return m >= 5
    },
  },
  {
    id: 'fire', name: 'On Fire', emoji: '🔥', color: '#F59E0B',
    req: t => t.filter(x => x.result === 'WIN').length >= 10,
  },
  {
    id: 'diamond', name: 'Diamond', emoji: '💎', color: '#06B6D4',
    req: t => t.filter(x => x.closed).length >= 25,
  },
  {
    id: 'captain', name: 'Capitán', emoji: '🚢', color: '#8B5CF6',
    req: t => t.filter(x => x.closed).length >= 50,
  },
  {
    id: 'legend', name: 'Leyenda', emoji: '🏆', color: '#EC4899',
    req: t => t.filter(x => x.closed).length >= 100,
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
            title={ok ? b.name : '???'}
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
