import { useMemo } from 'react'
import { calcStats, calcStatsByTf, formatMoney, formatPct, tradesForMonth, monthLabel } from '../utils.js'

export default function Stats({ trades, caps, currentMonth }) {
  const capital = caps[currentMonth] || 0
  const monthTrades = useMemo(() => tradesForMonth(trades, currentMonth), [trades, currentMonth])
  const stats = useMemo(() => calcStats(monthTrades, capital), [monthTrades, capital])
  const tfStats = useMemo(() => calcStatsByTf(monthTrades), [monthTrades])

  const { wins, losses, be, totalClosed } = stats
  const winPct = totalClosed > 0 ? (wins / totalClosed) * 100 : 0
  const lossPct = totalClosed > 0 ? (losses / totalClosed) * 100 : 0
  const bePct = totalClosed > 0 ? (be / totalClosed) * 100 : 0
  const maxLongShort = Math.max(stats.longs.count, stats.shorts.count, 1)

  return (
    <div className="page">
      <h1 className="page-title">Estadísticas — {monthLabel(currentMonth)}</h1>

      {/* Summary KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card hero">
          <div className="kpi-label">P&L Total</div>
          <div className={`kpi-value lg ${stats.pnl > 0 ? 'green' : stats.pnl < 0 ? 'red' : ''}`}>
            {formatMoney(stats.pnl)}
          </div>
          {capital > 0 && <div className="kpi-sub">{formatPct(stats.rentPct)} rentabilidad</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Win Rate</div>
          <div className={`kpi-value ${stats.winRate >= 60 ? 'green' : stats.winRate >= 40 ? 'yellow' : 'red'}`}>
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="kpi-sub">{stats.wins}W / {stats.losses}L / {stats.be}BE</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Profit Factor</div>
          <div className={`kpi-value ${stats.profitFactor >= 2 ? 'green' : stats.profitFactor >= 1 ? 'yellow' : 'red'}`}>
            {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Trades</div>
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-sub">{stats.totalClosed} cerradas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Promedio Ganancia</div>
          <div className="kpi-value green">{formatMoney(stats.avgWin)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Promedio Pérdida</div>
          <div className="kpi-value red">{formatMoney(-stats.avgLoss)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Mejor Trade</div>
          <div className="kpi-value green">{stats.bestTrade !== null ? formatMoney(stats.bestTrade) : '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Peor Trade</div>
          <div className="kpi-value red">{stats.worstTrade !== null ? formatMoney(stats.worstTrade) : '—'}</div>
        </div>
      </div>

      {/* Streaks */}
      <div className="stats-section">
        <div className="stats-section-title">Rachas</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="kpi-card">
            <div className="kpi-label">Racha Positiva Máx.</div>
            <div className="kpi-value green">{stats.maxWinStreak} {stats.maxWinStreak === 1 ? 'win' : 'wins'}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Racha Negativa Máx.</div>
            <div className="kpi-value red">{stats.maxLossStreak} {stats.maxLossStreak === 1 ? 'loss' : 'losses'}</div>
          </div>
        </div>
      </div>

      {/* Long vs Short */}
      <div className="stats-section">
        <div className="stats-section-title">Long vs Short</div>
        <div className="progress-row">
          <span className="progress-label" style={{ color: 'var(--color-accent)' }}>LONG</span>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${(stats.longs.count / maxLongShort) * 100}%`, background: 'var(--color-accent)' }} />
          </div>
          <span className="progress-val">{stats.longs.count} ops</span>
        </div>
        <div className="progress-row">
          <span className="progress-label" style={{ color: 'var(--color-danger)' }}>SHORT</span>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${(stats.shorts.count / maxLongShort) * 100}%`, background: 'var(--color-danger)' }} />
          </div>
          <span className="progress-val">{stats.shorts.count} ops</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="kpi-card" style={{ borderLeft: '3px solid var(--color-accent)' }}>
            <div className="kpi-label">LONG</div>
            <div className={`kpi-value ${stats.longs.pnl >= 0 ? 'green' : 'red'}`}>{formatMoney(stats.longs.pnl)}</div>
            <div className="kpi-sub">WR: {stats.longs.winRate.toFixed(1)}%</div>
          </div>
          <div className="kpi-card" style={{ borderLeft: '3px solid var(--color-danger)' }}>
            <div className="kpi-label">SHORT</div>
            <div className={`kpi-value ${stats.shorts.pnl >= 0 ? 'green' : 'red'}`}>{formatMoney(stats.shorts.pnl)}</div>
            <div className="kpi-sub">WR: {stats.shorts.winRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Distribution */}
      {totalClosed > 0 && (
        <div className="stats-section">
          <div className="stats-section-title">Distribución de Resultados</div>
          <div className="distribution-bar">
            {wins > 0 && <div className="dist-segment" style={{ width: `${winPct}%`, background: 'var(--color-accent)' }} title={`WIN: ${wins}`} />}
            {be > 0 && <div className="dist-segment" style={{ width: `${bePct}%`, background: 'var(--color-warning)' }} title={`BE: ${be}`} />}
            {losses > 0 && <div className="dist-segment" style={{ width: `${lossPct}%`, background: 'var(--color-danger)' }} title={`LOSS: ${losses}`} />}
          </div>
          <div className="flex gap-5 flex-wrap">
            <LegendItem color="var(--color-accent)" label={`WIN: ${wins} (${winPct.toFixed(1)}%)`} />
            {be > 0 && <LegendItem color="var(--color-warning)" label={`BE: ${be} (${bePct.toFixed(1)}%)`} />}
            <LegendItem color="var(--color-danger)" label={`LOSS: ${losses} (${lossPct.toFixed(1)}%)`} />
          </div>
        </div>
      )}

      {/* Timeframe Performance */}
      {tfStats.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-title">Rendimiento por Temporalidad</div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="tf-table-wrap">
              <table className="tf-table">
                <thead>
                  <tr>
                    <th>Temporalidad</th>
                    <th>Ops</th>
                    <th>Win Rate</th>
                    <th>PnL Total</th>
                    <th>Mejor Op</th>
                    <th>Peor Op</th>
                  </tr>
                </thead>
                <tbody>
                  {tfStats.map(row => (
                    <tr key={row.tf}>
                      <td><span className="tf-badge">{row.tf}</span></td>
                      <td>{row.ops}</td>
                      <td className={row.winRate >= 60 ? 'text-green' : row.winRate >= 40 ? 'text-yellow' : 'text-red'}>
                        {row.winRate.toFixed(1)}%
                      </td>
                      <td className={row.pnl > 0 ? 'text-green' : row.pnl < 0 ? 'text-red' : ''} style={{ fontWeight: 700 }}>
                        {formatMoney(row.pnl)}
                      </td>
                      <td className="text-green">{row.best !== null ? formatMoney(row.best) : '—'}</td>
                      <td className="text-red">{row.worst !== null ? formatMoney(row.worst) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {totalClosed === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-title">Sin datos estadísticos</div>
          <div className="empty-sub">Cierra operaciones para ver estadísticas completas</div>
        </div>
      )}
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  )
}
