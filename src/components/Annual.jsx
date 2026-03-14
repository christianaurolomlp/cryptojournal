import { useState, useMemo } from 'react'
import { MONTHS_ES, MONTHS_SHORT } from '../constants.js'
import { calcStats, formatMoney, formatPct, tradesForMonth } from '../utils.js'

export default function Annual({ trades, caps, onMonthClick }) {
  const [year, setYear] = useState(new Date().getFullYear())

  const monthKeys = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`),
    [year]
  )

  const monthStats = useMemo(() =>
    monthKeys.map(key => {
      const t = tradesForMonth(trades, key)
      const cap = caps[key] || 0
      const st = calcStats(t, cap)
      return { key, stats: st, capital: cap, tradeCount: t.length }
    }),
    [monthKeys, trades, caps]
  )

  // Annual stats
  const annualStats = useMemo(() => {
    const all = monthStats.flatMap(m => tradesForMonth(trades, m.key))
    return calcStats(all, 0)
  }, [monthStats, trades])

  const maxAbsPnl = Math.max(...monthStats.map(m => Math.abs(m.stats.pnl)), 1)

  const totalCap = monthStats.reduce((a, m) => a + (m.capital || 0), 0)
  const avgCap = totalCap > 0 ? totalCap / monthStats.filter(m => m.capital > 0).length : 0
  const annualRent = avgCap > 0 ? (annualStats.pnl / avgCap) * 100 : null

  return (
    <div className="page">
      {/* Year navigation */}
      <div className="year-nav">
        <button className="month-nav-btn" onClick={() => setYear(y => y - 1)}>◀</button>
        <h1 className="year-label">{year}</h1>
        <button className="month-nav-btn" onClick={() => setYear(y => y + 1)}>▶</button>
      </div>

      {/* Annual stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card hero">
          <div className="stat-label">P&L Anual {year}</div>
          <div className={`stat-value display ${annualStats.pnl > 0 ? 'green' : annualStats.pnl < 0 ? 'red' : ''}`}>
            {formatMoney(annualStats.pnl)}
          </div>
          {annualRent !== null && (
            <div className="stat-sub">{formatPct(annualRent)} rentabilidad media</div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">Operaciones</div>
          <div className="stat-value">{annualStats.total}</div>
          <div className="stat-sub">{annualStats.totalClosed} cerradas</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Win Rate Anual</div>
          <div className={`stat-value ${annualStats.winRate >= 60 ? 'green' : annualStats.winRate >= 40 ? 'yellow' : 'red'}`}>
            {annualStats.winRate.toFixed(1)}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Profit Factor</div>
          <div className="stat-value">
            {annualStats.profitFactor === Infinity ? '∞' : annualStats.profitFactor.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Monthly bar chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">📊 P&L Mensual {year}</span>
        </div>
        <div className="card-body">
          <div className="bar-chart">
            {monthStats.map(({ key, stats }, i) => {
              const pct = Math.abs(stats.pnl) / maxAbsPnl
              const hasData = stats.total > 0
              const barH = hasData ? Math.max(pct * 96, 2) : 2
              return (
                <div className="bar-wrap" key={key} onClick={() => onMonthClick(key)} style={{ cursor: 'pointer' }}>
                  <div
                    className="bar"
                    style={{
                      height: `${barH}px`,
                      background: !hasData
                        ? 'var(--surface3)'
                        : stats.pnl > 0
                        ? 'var(--green)'
                        : stats.pnl < 0
                        ? 'var(--red)'
                        : 'var(--yellow)',
                      opacity: hasData ? 1 : 0.3
                    }}
                    title={`${MONTHS_ES[i]}: ${formatMoney(stats.pnl)}`}
                  />
                  <span className="bar-label">{MONTHS_SHORT[i]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Monthly detail */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Detalle Mensual</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Mes', 'Trades', 'Win Rate', 'P&L', 'Rentabilidad'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text3)'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthStats.map(({ key, stats, capital }, i) => {
                const rent = capital > 0 ? (stats.pnl / capital) * 100 : null
                const hasData = stats.total > 0
                return (
                  <tr
                    key={key}
                    onClick={() => onMonthClick(key)}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      opacity: hasData ? 1 : 0.5,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text)' }}>
                      {MONTHS_ES[i]}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text2)' }}>
                      {stats.total}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                      {stats.totalClosed > 0 ? (
                        <span style={{ color: stats.winRate >= 60 ? 'var(--green)' : stats.winRate >= 40 ? 'var(--yellow)' : 'var(--red)' }}>
                          {stats.winRate.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>
                      {stats.total > 0 ? (
                        <span style={{ color: stats.pnl > 0 ? 'var(--green)' : stats.pnl < 0 ? 'var(--red)' : 'var(--text3)' }}>
                          {formatMoney(stats.pnl)}
                        </span>
                      ) : <span style={{ color: 'var(--text3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                      {rent !== null ? (
                        <span style={{ color: rent > 0 ? 'var(--green)' : rent < 0 ? 'var(--red)' : 'var(--text3)' }}>
                          {formatPct(rent)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
