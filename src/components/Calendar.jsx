import { useMemo } from 'react'
import {
  DAYS_ES, MONTHS_ES
} from '../constants.js'
import {
  getDaysInMonth, getFirstDayOfMonth, pnlForDay, monthLabel, tradesForMonth, formatMoney
} from '../utils.js'

export default function Calendar({ trades, currentMonth }) {
  const [year, month] = currentMonth.split('-').map(Number)
  const monthIdx = month - 1
  const daysInMonth = getDaysInMonth(year, monthIdx)
  const firstDay = getFirstDayOfMonth(year, monthIdx) // 0=Mon
  const todayStr = new Date().toISOString().split('T')[0]

  const monthTrades = useMemo(() => tradesForMonth(trades, currentMonth), [trades, currentMonth])

  // Group trades by day
  const dayMap = useMemo(() => {
    const map = {}
    monthTrades.forEach(t => {
      const d = t.closeDate || t.date
      if (!d) return
      if (!map[d]) map[d] = { trades: [], pnl: 0, hasOpen: false }
      map[d].trades.push(t)
      if (!t.closed) map[d].hasOpen = true
      if (t.closed && t.pnl !== null) {
        map[d].pnl += t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl
      }
    })
    return map
  }, [monthTrades])

  // Get days with trades for summary below
  const tradeDays = Object.entries(dayMap)
    .filter(([, v]) => v.trades.length > 0)
    .sort((a, b) => a[0].localeCompare(b[0]))

  function getDayStatus(dateStr) {
    const d = dayMap[dateStr]
    if (!d) return null
    if (d.hasOpen && d.trades.filter(t => t.closed).length === 0) return 'open'
    if (d.pnl > 0) return 'win'
    if (d.pnl < 0) return 'loss'
    if (d.pnl === 0 && d.trades.some(t => t.closed)) return 'be'
    if (d.hasOpen) return 'open'
    return null
  }

  // Build calendar cells
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push({ empty: true, key: `e-${i}` })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const status = getDayStatus(dateStr)
    const dayClosed = dayMap[dateStr]?.trades.filter(t => t.closed) || []
    const dayPnl = dayClosed.length > 0
      ? dayClosed.reduce((a, t) => a + (t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl), 0)
      : null
    cells.push({ day: d, dateStr, status, pnl: dayPnl, isToday: dateStr === todayStr, key: dateStr })
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title" style={{ margin: 0 }}>{monthLabel(currentMonth)}</h1>
      </div>

      {/* Calendar Grid */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="calendar-grid">
            {DAYS_ES.map(d => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}
            {cells.map(cell => (
              cell.empty ? (
                <div key={cell.key} className="calendar-day empty" />
              ) : (
                <div
                  key={cell.key}
                  className={[
                    'calendar-day',
                    cell.isToday ? 'today' : '',
                    cell.status === 'win' ? 'has-win' : '',
                    cell.status === 'loss' ? 'has-loss' : '',
                    cell.status === 'be' ? 'has-be' : '',
                    cell.status === 'open' ? 'has-open' : ''
                  ].filter(Boolean).join(' ')}
                  title={cell.dateStr}
                >
                  <span>{cell.day}</span>
                  {cell.pnl !== null && (
                    <span className={`cal-pnl ${cell.pnl > 0 ? 'green' : cell.pnl < 0 ? 'red' : 'yellow'}`}>
                      {cell.pnl > 0 ? '+' : ''}{(cell.pnl / 1).toFixed(0)}
                    </span>
                  )}
                </div>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Day Summary */}
      {tradeDays.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Días con operaciones</span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{tradeDays.length} días</span>
          </div>
          <div className="card-body" style={{ padding: '8px 12px' }}>
            {tradeDays.map(([dateStr, dayData]) => {
              const closed = dayData.trades.filter(t => t.closed)
              const open = dayData.trades.filter(t => !t.closed)
              const pnl = closed.reduce((a, t) => a + (t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl), 0)
              const hasClosed = closed.length > 0

              return (
                <div key={dateStr} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 8px', borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)', marginRight: 12 }}>
                      {dateStr}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {closed.length} cerradas
                      {open.length > 0 ? ` · ${open.length} abiertas` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {dayData.trades.map(t => (
                      <span key={t.id} className={`badge badge-${t.type === 'LONG' ? 'long' : 'short'}`} style={{ fontSize: 10 }}>
                        {t.crypto}
                      </span>
                    ))}
                    {hasClosed && (
                      <span className={`trade-pnl ${pnl > 0 ? 'green' : pnl < 0 ? 'red' : 'yellow'}`} style={{ fontSize: 13 }}>
                        {formatMoney(pnl)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-title">Sin operaciones este mes</div>
          <div className="empty-sub">Las operaciones aparecerán coloreadas en el calendario según su resultado</div>
        </div>
      )}
    </div>
  )
}
