// Gamification system — XP, Badges, Streak Calendar

const LEVELS = [
  { name: 'Grumete',            min: 0,     max: 500,      color: '#6B7280' },
  { name: 'Marinero',           min: 500,   max: 1500,     color: '#10B981' },
  { name: 'Contramaestre',      min: 1500,  max: 3000,     color: '#06B6D4' },
  { name: 'Teniente',           min: 3000,  max: 6000,     color: '#8B5CF6' },
  { name: 'Capitán Táctico',    min: 6000,  max: 10000,    color: '#F59E0B' },
  { name: 'Almirante Estratega',min: 10000, max: Infinity, color: '#EC4899' },
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
          {level.name}
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

export function StreakCalendar({ trades }) {
  const today = new Date()
  const todayKey = today.toISOString().split('T')[0]

  // 28 days = 4 weeks, fill to start on Monday
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (27 - i))
    const key = d.toISOString().split('T')[0]
    const dt = trades.filter(t => (t.closeDate || t.date || '').startsWith(key))
    const hasWin  = dt.some(t => t.result === 'WIN')
    const hasLoss = dt.some(t => t.result === 'LOSS')
    const dayNum = d.getDate()
    const mon = d.toLocaleString('es-ES', { month: 'short' })
    return { key, hasWin, hasLoss, isToday: key === todayKey, count: dt.length, label: `${dayNum} ${mon}` }
  })

  // Days of week headers
  const DOW = ['L','M','X','J','V','S','D']

  return (
    <div className="streak-wrapper">
      <div className="streak-cal-title">Actividad — 4 semanas</div>
      <div className="streak-dow">
        {DOW.map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="streak-cal">
        {days.map(d => {
          let cls = 'streak-day'
          if (d.hasWin && !d.hasLoss) cls += ' win'
          else if (d.hasLoss && !d.hasWin) cls += ' loss'
          else if (d.count > 0) cls += ' mixed'
          if (d.isToday) cls += ' today'
          return <div key={d.key} className={cls} title={`${d.label}${d.count > 0 ? ` — ${d.count} trade(s)` : ''}`} />
        })}
      </div>
      <div className="streak-legend">
        <span><span className="sl-dot win" />Win</span>
        <span><span className="sl-dot loss" />Loss</span>
        <span><span className="sl-dot mixed" />Mixto</span>
        <span><span className="sl-dot" />Sin trade</span>
      </div>
    </div>
  )
}
