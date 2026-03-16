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

      {/* Summary grid */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card hero">
          <div className="stat-label">P&L Total</div>
          <div className={`stat-value display ${stats.pnl > 0 ? 'green' : stats.pnl < 0 ? 'red' : ''}`}>
            {formatMoney(stats.pnl)}
          </div>
          {capital > 0 && <div className="stat-sub">{formatPct(stats.rentPct)} rentabilidad</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">Win Rate</div>
          <div className={`stat-value ${stats.winRate >= 60 ? 'green' : stats.winRate >= 40 ? 'yellow' : 'red'}`}>
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="stat-sub">{stats.wins}W / {stats.losses}L / {stats.be}BE</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Profit Factor</div>
          <div className={`stat-value ${stats.profitFactor >= 2 ? 'green' : stats.profitFactor >= 1 ? 'yellow' : 'red'}`}>
            {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Trades</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">{stats.totalClosed} cerradas</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Promedio Ganancia</div>
          <div className="stat-value green">{formatMoney(stats.avgWin)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Promedio Pérdida</div>
          <div className="stat-value red">{formatMoney(-stats.avgLoss)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mejor Trade</div>
          <div className="stat-value green">{stats.bestTrade !== null ? formatMoney(stats.bestTrade) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Peor Trade</div>
          <div className="stat-value red">{stats.worstTrade !== null ? formatMoney(stats.worstTrade) : '—'}</div>
        </div>
      </div>

      {/* Streaks */}
      <div className="stats-section">
        <div className="stats-section-title">Rachas</div>
        <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="stat-card">
            <div className="stat-label">Racha Positiva Máx.</div>
            <div className="stat-value green">
              {stats.maxWinStreak} {stats.maxWinStreak === 1 ? 'win' : 'wins'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Racha Negativa Máx.</div>
            <div className="stat-value red">
              {stats.maxLossStreak} {stats.maxLossStreak === 1 ? 'loss' : 'losses'}
            </div>
          </div>
        </div>
      </div>

      {/* Long vs Short */}
      <div className="stats-section">
        <div className="stats-section-title">Long vs Short</div>
        <div className="progress-row">
          <span className="progress-label" style={{ color: 'var(--green)' }}>LONG</span>
          <div className="progress-bar-wrap">
            <div
              className="progress-bar"
              style={{
                width: `${(stats.longs.count / maxLongShort) * 100}%`,
                background: 'var(--green)'
              }}
            />
          </div>
          <span className="progress-val">{stats.longs.count} ops</span>
        </div>
        <div className="progress-row">
          <span className="progress-label" style={{ color: 'var(--red)' }}>SHORT</span>
          <div className="progress-bar-wrap">
            <div
              className="progress-bar"
              style={{
                width: `${(stats.shorts.count / maxLongShort) * 100}%`,
                background: 'var(--red)'
              }}
            />
          </div>
          <span className="progress-val">{stats.shorts.count} ops</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div style={{ padding: '12px 14px', background: 'var(--green-dim)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>LONG</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: stats.longs.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {formatMoney(stats.longs.pnl)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              Win rate: {stats.longs.winRate.toFixed(1)}%
            </div>
          </div>
          <div style={{ padding: '12px 14px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>SHORT</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: stats.shorts.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {formatMoney(stats.shorts.pnl)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              Win rate: {stats.shorts.winRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Distribution */}
      {totalClosed > 0 && (
        <div className="stats-section">
          <div className="stats-section-title">Distribución de Resultados</div>
          <div className="distribution-bar">
            {wins > 0 && (
              <div
                className="dist-segment"
                style={{ width: `${winPct}%`, background: 'var(--green)' }}
                title={`WIN: ${wins} (${winPct.toFixed(1)}%)`}
              />
            )}
            {be > 0 && (
              <div
                className="dist-segment"
                style={{ width: `${bePct}%`, background: 'var(--yellow)' }}
                title={`BE: ${be} (${bePct.toFixed(1)}%)`}
              />
            )}
            {losses > 0 && (
              <div
                className="dist-segment"
                style={{ width: `${lossPct}%`, background: 'var(--red)' }}
                title={`LOSS: ${losses} (${lossPct.toFixed(1)}%)`}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--green)' }} />
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>WIN: {wins} ({winPct.toFixed(1)}%)</span>
            </div>
            {be > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--yellow)' }} />
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>BE: {be} ({bePct.toFixed(1)}%)</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--red)' }} />
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>LOSS: {losses} ({lossPct.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Timeframe Performance */}
      {tfStats.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-title">📊 Rendimiento por Temporalidad</div>
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
                    <td className={row.pnl > 0 ? 'text-green' : row.pnl < 0 ? 'text-red' : ''} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {formatMoney(row.pnl)}
                    </td>
                    <td className="text-green" style={{ fontFamily: 'var(--font-mono)' }}>
                      {row.best !== null ? formatMoney(row.best) : '—'}
                    </td>
                    <td className="text-red" style={{ fontFamily: 'var(--font-mono)' }}>
                      {row.worst !== null ? formatMoney(row.worst) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
