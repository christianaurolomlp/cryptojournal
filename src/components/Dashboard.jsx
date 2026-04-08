import { useMemo, useState } from 'react'
import { calcStats, formatMoney, formatPct, monthLabel, tradesForMonth } from '../utils.js'
import EquityCurve from './EquityCurve.jsx'
import TradeCard from './TradeCard.jsx'

const DEFAULT_CAPITAL = 13000

export default function Dashboard({ trades, caps, currentMonth, onEdit, onDelete, onClose, onReopen, onNewTrade, onToggleProtected }) {
  const [searchQuery, setSearchQuery] = useState('')
  const capital = caps[currentMonth] || 0
  const monthTrades = useMemo(() => tradesForMonth(trades, currentMonth), [trades, currentMonth])
  const stats = useMemo(() => calcStats(monthTrades, capital), [monthTrades, capital])

  const isSearching = searchQuery.trim().length > 0
  const searchResults = useMemo(() => {
    if (!isSearching) return []
    const q = searchQuery.trim().toUpperCase()
    return [...trades]
      .filter(t => t.crypto?.toUpperCase().includes(q) || t.notes?.toUpperCase().includes(q))
      .sort((a, b) => new Date(b.date || '') - new Date(a.date || ''))
  }, [trades, searchQuery, isSearching])

  const openTrades = monthTrades.filter(t => !t.closed)
  const closedTrades = [...monthTrades.filter(t => t.closed)]
    .sort((a, b) => new Date(b.closeDate || b.date) - new Date(a.closeDate || a.date))

  const allOpenTrades = useMemo(() => trades.filter(t => !t.closed), [trades])
  const riskData = useMemo(() => {
    const protectedCount = allOpenTrades.filter(t => t.protected).length
    const totalRisk = allOpenTrades.reduce((sum, t) => sum + (t.protected ? 0 : (parseFloat(t.risk) || 0)), 0)
    const refCapital = stats?.capitalFinal || capital || DEFAULT_CAPITAL
    const riskDollar = (totalRisk / 100) * refCapital
    const breakdown = allOpenTrades.map(t => ({
      crypto: t.crypto,
      risk: t.protected ? 0 : (parseFloat(t.risk) || 0),
      protected: !!t.protected
    }))
    return { totalRisk, riskDollar, protectedCount, breakdown, refCapital, count: allOpenTrades.length }
  }, [allOpenTrades, capital, stats])

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
          ⚠ No hay capital definido para {monthLabel(currentMonth)}. Configúralo para calcular rentabilidad.
        </div>
      )}

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card hero">
          <div className="kpi-label">P&L del mes</div>
          <div className={`kpi-value lg ${pnlColor}`}>{formatMoney(stats.pnl)}</div>
          {capital > 0 && <div className="kpi-sub">{formatPct(stats.rentPct)} rentabilidad</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Win Rate</div>
          <div className={`kpi-value ${winRateColor}`}>{stats.winRate.toFixed(1)}%</div>
          <div className="kpi-sub">{stats.wins}W · {stats.losses}L · {stats.be}BE</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Profit Factor</div>
          <div className={`kpi-value ${pfColor}`}>
            {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
          </div>
          <div className="kpi-sub">Ganancia / Pérdida</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Capital Final</div>
          <div className="kpi-value info">
            {stats.capitalFinal !== null ? formatMoney(stats.capitalFinal) : '—'}
          </div>
          {capital > 0 && <div className="kpi-sub">Inicial: {formatMoney(capital)}</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Operaciones</div>
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-sub">{openTrades.length} abiertas · {closedTrades.length} cerradas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Max Drawdown</div>
          <div className="kpi-value red">{stats.maxDrawdown > 0 ? `-$${stats.maxDrawdown.toFixed(2)}` : '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Mejor / Peor</div>
          <div className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>
            <span className="text-green">{stats.bestTrade !== null ? `+$${Math.abs(stats.bestTrade).toFixed(0)}` : '—'}</span>
            <span style={{ color: 'var(--color-text-dim)' }}>/</span>
            <span className="text-red">{stats.worstTrade !== null ? `-$${Math.abs(stats.worstTrade).toFixed(0)}` : '—'}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Racha actual</div>
          <div className={`kpi-value ${stats.currentStreakType === 'WIN' ? 'green' : stats.currentStreakType === 'LOSS' ? 'red' : ''}`}>
            {stats.currentStreakType ? `${stats.currentStreak} ${stats.currentStreakType === 'WIN' ? '✓' : '✗'}` : '—'}
          </div>
          <div className="kpi-sub">Máx: {stats.maxWinStreak}W · {stats.maxLossStreak}L</div>
        </div>
      </div>

      {/* Risk Card */}
      {allOpenTrades.length > 0 && (
        <RiskCard riskData={riskData} />
      )}

      {/* Charts Grid */}
      <div className="dashboard-grid">
        {/* Equity Curve */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Equity Curve</span>
            <span className="text-xs font-mono" style={{ color: 'var(--color-text-dim)' }}>{monthLabel(currentMonth)}</span>
          </div>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            <EquityCurve trades={monthTrades} height={160} capital={capital} />
          </div>
        </div>

        {/* Asset Performance */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Rendimiento por Activo</span>
          </div>
          <div className="card-body">
            {assets.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-sub">Sin operaciones cerradas</div>
              </div>
            ) : (
              <div className="asset-list">
                {assets.map(([crypto, data]) => (
                  <div className="asset-row" key={crypto}>
                    <span className="asset-name">{crypto}</span>
                    <div className="asset-bar-wrap">
                      <div className="asset-bar" style={{
                        width: `${(Math.abs(data.pnl) / maxAssetPnl) * 100}%`,
                        background: data.pnl >= 0 ? 'var(--color-accent)' : 'var(--color-danger)'
                      }} />
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
      </div>

      {/* Recent Trades Compact */}
      {closedTrades.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <span className="card-title">Últimas Operaciones</span>
            <span className="text-xs font-mono" style={{ color: 'var(--color-text-dim)' }}>{closedTrades.length} cerradas</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {closedTrades.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--color-text-bright)' }}>{t.crypto}</span>
                  <span className={`badge badge-${t.type === 'LONG' ? 'long' : 'short'}`}>{t.type}</span>
                  <span className={`badge badge-${(t.result || '').toLowerCase()}`}>
                    {t.result === 'WIN' ? '✓' : t.result === 'LOSS' ? '✗' : '≈'} {t.result}
                  </span>
                </div>
                <span className={`trade-pnl ${t.result === 'WIN' ? 'green' : t.result === 'LOSS' ? 'red' : 'yellow'}`} style={{ fontSize: 13 }}>
                  {t.pnl !== null ? formatMoney(t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 mt-4">
        <div className="relative" style={{ maxWidth: 380 }}>
          <input
            className="form-control pl-4"
            style={{ height: 40 }}
            placeholder="🔍 Buscar operación por activo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer"
              style={{ color: 'var(--color-text-dim)', fontSize: 14, padding: '2px 4px' }}
            >✕</button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {isSearching && (
        <div className="mt-3">
          <div className="section-header">
            <span className="section-title">Resultados para "{searchQuery.trim().toUpperCase()}"</span>
            <span className="count-badge">{searchResults.length}</span>
          </div>
          {searchResults.length === 0 ? (
            <p style={{ color: 'var(--color-text-dim)', fontSize: 13, padding: '20px 0' }}>
              No hay operaciones con ese activo
            </p>
          ) : (
            <div className="trade-list">
              {searchResults.map(t => (
                <TradeCard key={t.id} trade={t} onEdit={onEdit} onDelete={onDelete} onClose={onClose} onReopen={onReopen} onToggleProtected={onToggleProtected} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Normal month view */}
      {!isSearching && (
        <>
          {openTrades.length > 0 && (
            <div className="mt-6">
              <div className="section-header">
                <span className="section-title">Operaciones Abiertas</span>
                <span className="count-badge">{openTrades.length}</span>
              </div>
              <div className="trade-list">
                {openTrades.map(t => (
                  <TradeCard key={t.id} trade={t} onEdit={onEdit} onDelete={onDelete} onClose={onClose} onReopen={onReopen} onToggleProtected={onToggleProtected} />
                ))}
              </div>
            </div>
          )}

          {closedTrades.length > 0 && (
            <div className="mt-6">
              <div className="section-header">
                <span className="section-title">Historial del mes</span>
                <span className="count-badge">{closedTrades.length}</span>
              </div>
              <div className="trade-list">
                {closedTrades.map(t => (
                  <TradeCard key={t.id} trade={t} onEdit={onEdit} onDelete={onDelete} onClose={onClose} onReopen={onReopen} onToggleProtected={onToggleProtected} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!isSearching && monthTrades.length === 0 && (
        <div className="empty-state mt-10">
          <div className="empty-icon">📊</div>
          <div className="empty-title">Sin operaciones este mes</div>
          <div className="empty-sub">Registra tu primera operación para comenzar</div>
          <button className="btn btn-primary mt-4" onClick={onNewTrade}>+ Nueva Operación</button>
        </div>
      )}
    </div>
  )
}

/* ── Risk Card ── */
function RiskCard({ riskData }) {
  const r = riskData.totalRisk
  const pct = Math.min(r, 100)
  const overLimit = r > 20
  const color = r < 5 ? '#00FF41' : r < 10 ? '#FFD700' : r < 20 ? '#FF8C00' : '#FF3B3B'
  const label = r < 5 ? '🟢 Riesgo bajo' : r < 10 ? '🟡 Riesgo moderado' : r < 20 ? '🟠 Riesgo alto' : '🔴 LÍMITE SUPERADO'

  return (
    <div className="card mb-6" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="card-header">
        <span className="card-title">💰 Riesgo Total Actual</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color }}>{r.toFixed(1)}%</span>
      </div>
      <div className="card-body">
        {/* Risk bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span style={{ fontSize: 12, color: overLimit ? '#ef4444' : 'var(--color-text-dim)', fontWeight: overLimit ? 700 : 400 }}>{label}</span>
          </div>
          <div style={{ background: 'var(--color-surface-3)', height: 8, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '20%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)', zIndex: 1 }} />
            <div style={{
              width: `${pct}%`, height: '100%', background: color, borderRadius: 4,
              transition: 'width 0.3s, background 0.3s',
              animation: overLimit ? 'riskPulse 1s ease-in-out infinite' : 'none'
            }} />
          </div>
          <div className="flex justify-between mt-2">
            <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Pérdida máxima si sale todo mal</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
              -${riskData.riskDollar.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {overLimit && (
          <div className="alert alert-warning mb-4" style={{ marginBottom: 16 }}>
            ⚠️ Riesgo por encima del 20% — considera cerrar o proteger alguna posición
          </div>
        )}

        {/* Summary row */}
        <div className="flex gap-8 flex-wrap mb-4">
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Abiertas</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--color-text-bright)' }}>{riskData.count}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Riesgo total</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color }}>{riskData.totalRisk.toFixed(1)}%</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Protegidas</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--color-accent)' }}>{riskData.protectedCount}</div>
          </div>
        </div>

        {/* Breakdown tags */}
        <div className="flex flex-wrap gap-2">
          {riskData.breakdown.map((item, i) => (
            <span key={i} className="badge" style={{
              background: item.protected ? 'rgba(0,255,65,0.08)' : 'var(--color-surface-3)',
              borderColor: item.protected ? 'rgba(0,255,65,0.2)' : 'var(--color-border)',
              color: item.protected ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}>
              {item.crypto}: {item.protected ? '🛡️ 0%' : `${item.risk}%`}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
