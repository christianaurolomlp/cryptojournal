import { useMemo, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { calcStats, calcStatsByTf, formatMoney, formatPct, tradesForMonth, monthLabel } from '../utils.js'


function InfoTip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4, cursor: 'help', verticalAlign: 'middle' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle size={13} strokeWidth={1.8} style={{ color: 'var(--text-muted)', opacity: 0.7 }} />
      {show && (
        <span style={{
          position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text)', color: 'var(--bg-card)',
          padding: '5px 8px', borderRadius: 6, fontSize: 11, fontWeight: 400,
          whiteSpace: 'nowrap', zIndex: 100, lineHeight: 1.4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
        }}>
          {text}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '4px solid transparent', borderTopColor: 'var(--text)' }} />
        </span>
      )}
    </span>
  )
}

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
          <div className="kpi-label">Win Rate <InfoTip text="Wins ÷ (Wins + Losses), excluyendo BE" /></div>
          <div className={`kpi-value ${stats.winRate >= 60 ? 'green' : stats.winRate >= 40 ? 'yellow' : 'red'}`}>
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="kpi-sub">{stats.wins}W / {stats.losses}L / {stats.be}BE</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Profit Factor <InfoTip text="Ganancias brutas ÷ Pérdidas brutas. Mayor de 1 = rentable" /></div>
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
          <div className="kpi-label">Avg Ganancia <InfoTip text="Media de PnL en operaciones WIN" /></div>
          <div className="kpi-value green">{formatMoney(stats.avgWin)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Pérdida <InfoTip text="Media de PnL en operaciones LOSS" /></div>
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

      {/* Expectativa Matemática (EV) */}
      {totalClosed > 0 && (
        <div className="stats-section">
          <div className="stats-section-title">Expectativa Matemática <InfoTip text="¿Cuánto ganas en promedio por operación si mantienes el sistema?" /></div>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {(() => {
              const wr = stats.winRate / 100
              const lr = 1 - wr
              const ev = (wr * stats.avgWin) - (lr * stats.avgLoss)
              const evColor = ev > 0 ? 'green' : ev < 0 ? 'red' : ''
              return (
                <>
                  <div className="kpi-card hero">
                    <div className="kpi-label">EV por Operación <InfoTip text="Expectativa por trade: (WR × Avg Win) − (LR × Avg Loss)" /></div>
                    <div className={`kpi-value lg ${evColor}`}>{formatMoney(ev)}</div>
                    <div className="kpi-sub">
                      ({(wr * 100).toFixed(0)}% × {formatMoney(stats.avgWin)}) − ({(lr * 100).toFixed(0)}% × {formatMoney(stats.avgLoss)})
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Ratio W/L <InfoTip text="Avg ganancia ÷ Avg pérdida. Mayor de 1 = ganas más de lo que pierdes" /></div>
                    <div className={`kpi-value ${stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss >= 1 ? 'green' : 'red') : ''}`}>
                      {stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss).toFixed(2) : '∞'}
                    </div>
                    <div className="kpi-sub">Avg Win / Avg Loss</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">EV × Operaciones <InfoTip text="Expectativa total si repites el mismo sistema N veces" /></div>
                    <div className={`kpi-value ${evColor}`}>{formatMoney(ev * totalClosed)}</div>
                    <div className="kpi-sub">Expectativa total ({totalClosed} ops)</div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

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
          <span className="progress-label" style={{ color: 'var(--green)' }}>LONG</span>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${(stats.longs.count / maxLongShort) * 100}%`, background: 'var(--green)' }} />
          </div>
          <span className="progress-val">{stats.longs.count} ops</span>
        </div>
        <div className="progress-row">
          <span className="progress-label" style={{ color: 'var(--red)' }}>SHORT</span>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${(stats.shorts.count / maxLongShort) * 100}%`, background: 'var(--red)' }} />
          </div>
          <span className="progress-val">{stats.shorts.count} ops</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="kpi-card" style={{ borderLeft: '3px solid var(--green)' }}>
            <div className="kpi-label">LONG</div>
            <div className={`kpi-value ${stats.longs.pnl >= 0 ? 'green' : 'red'}`}>{formatMoney(stats.longs.pnl)}</div>
            <div className="kpi-sub">WR: {stats.longs.winRate.toFixed(1)}%</div>
          </div>
          <div className="kpi-card" style={{ borderLeft: '3px solid var(--red)' }}>
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
            {wins > 0 && <div className="dist-segment" style={{ width: `${winPct}%`, background: 'var(--green)' }} title={`WIN: ${wins}`} />}
            {be > 0 && <div className="dist-segment" style={{ width: `${bePct}%`, background: 'var(--orange)' }} title={`BE: ${be}`} />}
            {losses > 0 && <div className="dist-segment" style={{ width: `${lossPct}%`, background: 'var(--red)' }} title={`LOSS: ${losses}`} />}
          </div>
          <div className="flex gap-5 flex-wrap">
            <LegendItem color="var(--green)" label={`WIN: ${wins} (${winPct.toFixed(1)}%)`} />
            {be > 0 && <LegendItem color="var(--orange)" label={`BE: ${be} (${bePct.toFixed(1)}%)`} />}
            <LegendItem color="var(--red)" label={`LOSS: ${losses} (${lossPct.toFixed(1)}%)`} />
          </div>
        </div>
      )}

      {/* Timeframe Performance */}
      {tfStats.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-title">Rendimiento por Temporalidad <InfoTip text="Stats agrupadas por timeframe de entrada" /></div>
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
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}
