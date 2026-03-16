import { useMemo } from 'react'
import { calcStats, formatMoney, formatPct, monthLabel, tradesForMonth } from '../utils.js'
import EquityCurve from './EquityCurve.jsx'
import TradeCard from './TradeCard.jsx'

export default function Dashboard({ trades, caps, currentMonth, onEdit, onDelete, onClose, onReopen, onNewTrade }) {
  const capital = caps[currentMonth] || 0
  const monthTrades = useMemo(() => tradesForMonth(trades, currentMonth), [trades, currentMonth])
  const stats = useMemo(() => calcStats(monthTrades, capital), [monthTrades, capital])

  const openTrades = monthTrades.filter(t => !t.closed)
  const closedTrades = [...monthTrades.filter(t => t.closed)]
    .sort((a, b) => new Date(b.closeDate || b.date) - new Date(a.closeDate || a.date))

  // Asset performance
  const assetMap = {}
  monthTrades.filter(t => t.closed && t.pnl !== null).forEach(t => {
    if (!assetMap[t.crypto]) assetMap[t.crypto] = { pnl: 0, count: 0, wins: 0 }
    assetMap[t.crypto].pnl += t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl
    assetMap[t.crypto].count++
    if (t.result === 'WIN') assetMap[t.crypto].wins++
  })
  const assets = Object.entries(assetMap).sort((a, b) => Math.abs(b[1].pnl) - Math.abs(a[1].pnl)).slice(0, 8)
  const maxAssetPnl = assets.length > 0 ? Math.max(...assets.map(([, v]) => Math.abs(v.pnl))) : 1

  const pnlColor = stats.pnl > 0 ? 'green' : stats.pnl < 0 ? 'red' : ''
  const winRateColor = stats.winRate >= 60 ? 'green' : stats.winRate >= 40 ? 'yellow' : 'red'
  const pfColor = stats.profitFactor >= 2 ? 'green' : stats.profitFactor >= 1 ? 'yellow' : 'red'

  return (
    <div className="page">
      {!capital && (
        <div className="alert alert-warning">
          ⚠ No hay capital definido para {monthLabel(currentMonth)}. Ve a Configuración para establecerlo.
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="stat-card hero" style={{ gridColumn: 'span 2' }}>
          <div className="stat-label">P&L del mes</div>
          <div className={`stat-value display ${pnlColor}`}>{formatMoney(stats.pnl)}</div>
          {capital > 0 && (
            <div className="stat-sub">{formatPct(stats.rentPct)} rentabilidad</div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">Win Rate</div>
          <div className={`stat-value ${winRateColor}`}>{stats.winRate.toFixed(1)}%</div>
          <div className="stat-sub">{stats.wins}W · {stats.losses}L · {stats.be}BE</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Profit Factor</div>
          <div className={`stat-value ${pfColor}`}>
            {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
          </div>
          <div className="stat-sub">Ganancia / Pérdida</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Capital Final</div>
          <div className="stat-value indigo">
            {stats.capitalFinal !== null ? formatMoney(stats.capitalFinal) : '—'}
          </div>
          {capital > 0 && <div className="stat-sub">Inicial: {formatMoney(capital)}</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">Operaciones</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">{openTrades.length} abiertas · {closedTrades.length} cerradas</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Equity Curve */}
        <div className="card span-2">
          <div className="card-header">
            <span className="card-title">📈 Equity Curve</span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{monthLabel(currentMonth)}</span>
          </div>
          <div className="card-body" style={{ padding: '12px 16px' }}>
            <EquityCurve trades={monthTrades} height={140} capital={capital} />
          </div>
        </div>

        {/* Asset Performance */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏆 Rendimiento por Activo</span>
          </div>
          <div className="card-body">
            {assets.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <div className="empty-sub">Sin operaciones cerradas</div>
              </div>
            ) : (
              <div className="asset-list">
                {assets.map(([crypto, data]) => (
                  <div className="asset-row" key={crypto}>
                    <span className="asset-name">{crypto}</span>
                    <div className="asset-bar-wrap">
                      <div
                        className="asset-bar"
                        style={{
                          width: `${(Math.abs(data.pnl) / maxAssetPnl) * 100}%`,
                          background: data.pnl >= 0 ? 'var(--green)' : 'var(--red)'
                        }}
                      />
                    </div>
                    <span className={`asset-pnl ${data.pnl >= 0 ? 'text-green' : 'text-red'}`}>
                      {formatMoney(data.pnl)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Últimas Operaciones */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🕒 Últimas Operaciones</span>
            {closedTrades.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{closedTrades.length} cerradas</span>
            )}
          </div>
          <div className="card-body" style={{ padding: '10px 12px' }}>
            {closedTrades.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <div className="empty-sub">Sin operaciones cerradas</div>
              </div>
            ) : (
              <div className="trade-list">
                {closedTrades.slice(0, 5).map(t => (
                  <div key={t.id} style={{ padding: '8px 10px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{t.crypto}</span>
                      <span className={`badge badge-${t.type === 'LONG' ? 'long' : 'short'}`} style={{ fontSize: 10 }}>{t.type}</span>
                      <span className={`badge badge-${(t.result || '').toLowerCase()}`} style={{ fontSize: 10 }}>
                        {t.result === 'WIN' ? '✓' : t.result === 'LOSS' ? '✗' : '≈'} {t.result}
                      </span>
                    </div>
                    <span className={`trade-pnl ${t.result === 'WIN' ? 'green' : t.result === 'LOSS' ? 'red' : 'yellow'}`} style={{ fontSize: 13 }}>
                      {t.pnl !== null ? formatMoney(t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Open Trades */}
      {openTrades.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="section-header">
            <span className="section-title">Operaciones Abiertas</span>
            <span className="count-badge">{openTrades.length}</span>
          </div>
          <div className="trade-list">
            {openTrades.map(t => (
              <TradeCard
                key={t.id}
                trade={t}
                onEdit={onEdit}
                onDelete={onDelete}
                onClose={onClose}
                onReopen={onReopen}
              />
            ))}
          </div>
        </div>
      )}

      {/* Closed Trades */}
      {closedTrades.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="section-header">
            <span className="section-title">Historial</span>
            <span className="count-badge">{closedTrades.length}</span>
          </div>
          <div className="trade-list">
            {closedTrades.map(t => (
              <TradeCard
                key={t.id}
                trade={t}
                onEdit={onEdit}
                onDelete={onDelete}
                onClose={onClose}
                onReopen={onReopen}
              />
            ))}
          </div>
        </div>
      )}

      {monthTrades.length === 0 && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-icon">📊</div>
          <div className="empty-title">Sin operaciones este mes</div>
          <div className="empty-sub">Registra tu primera operación para comenzar a trackear tu rendimiento</div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onNewTrade}>
            + Nueva Operación
          </button>
        </div>
      )}
    </div>
  )
}
