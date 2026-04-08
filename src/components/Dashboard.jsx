import { useMemo, useState } from 'react'
import { calcStats, formatMoney, formatPct, monthLabel, tradesForMonth, equityPoints } from '../utils.js'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import TradeCard from './TradeCard.jsx'

const DEFAULT_CAPITAL = 13000


/* ── Recharts Custom Tooltip ── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-value" style={{ color: val >= 0 ? '#34C759' : '#FF3B30' }}>
        {val >= 0 ? '+' : ''}${Math.abs(val).toFixed(2)}
      </div>
    </div>
  )
}

function AssetTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, pnl, wins, count } = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{name}</div>
      <div className="chart-tooltip-value" style={{ color: pnl >= 0 ? '#34C759' : '#FF3B30' }}>
        {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
      </div>
      <div style={{ fontSize: 11, color: '#6D6D72', marginTop: 2 }}>{wins}/{count} wins</div>
    </div>
  )
}

export default function Dashboard({ trades, caps, currentMonth, theme, onEdit, onDelete, onClose, onReopen, onNewTrade, onToggleProtected }) {
  const isDark = theme === 'dark'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : '#E5E5EA'
  const axisColor = isDark ? '#8B949E' : '#8E8E93'
  const labelColor = isDark ? '#8B949E' : '#6D6D72'
  const cursorFill = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'

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

  // Equity chart data — aggregated by day (one point per day)
  const equityData = useMemo(() => {
    const pts = equityPoints(monthTrades)
    // Group by date: keep last cumulative PnL per day
    const dateMap = new Map()
    pts.forEach(p => {
      const rawDate = p.trade ? (p.trade.closeDate || p.trade.date) : null
      const key = rawDate || '__inicio__'
      dateMap.set(key, p.y)  // overwrites → last trade of day wins
    })
    return Array.from(dateMap.entries()).map(([key, cum], i) => {
      const display = key === '__inicio__' ? 'Inicio'
        : (() => { const dd = new Date(key); return `${dd.getDate()} ${dd.toLocaleString('es-ES', {month: 'short'})}` })()
      return { name: display, pnl: parseFloat(cum.toFixed(2)), idx: i }
    })
  }, [monthTrades])

  // Asset performance (for bar chart)
  const assetData = useMemo(() => {
    const assetMap = {}
    monthTrades.filter(t => t.closed && t.pnl !== null).forEach(t => {
      if (!assetMap[t.crypto]) assetMap[t.crypto] = { pnl: 0, count: 0, wins: 0 }
      assetMap[t.crypto].pnl += t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl
      assetMap[t.crypto].count++
      if (t.result === 'WIN') assetMap[t.crypto].wins++
    })
    return Object.entries(assetMap)
      .sort((a, b) => Math.abs(b[1].pnl) - Math.abs(a[1].pnl))
      .slice(0, 8)
      .map(([name, data]) => ({ name, ...data }))
  }, [monthTrades])

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

      {/* ─── KPI Strip — 4 cards ─── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">P&L del mes</div>
          <div className={`kpi-value ${pnlColor}`}>{formatMoney(stats.pnl)}</div>
          {capital > 0 && <div className="kpi-sub">{formatPct(stats.rentPct)} rentabilidad</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Win Rate</div>
          <div className={`kpi-value ${winRateColor}`}>{stats.winRate.toFixed(1)}%</div>
          <div className="kpi-sub">{stats.wins}W · {stats.losses}L · {stats.be}BE</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Operaciones</div>
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-sub">{openTrades.length} abiertas · {closedTrades.length} cerradas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Max Drawdown</div>
          <div className="kpi-value red">{stats.maxDrawdown > 0 ? `-$${stats.maxDrawdown.toFixed(0)}` : '—'}</div>
          <div className="kpi-sub">{capital > 0 && stats.maxDrawdown > 0 ? `${(stats.maxDrawdown / capital * 100).toFixed(1)}% del capital` : 'Caída máxima'}</div>
        </div>
      </div>

      {/* ─── Secondary KPIs ─── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
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
          <div className="kpi-label">Mejor / Peor</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font)', fontSize: 16, fontWeight: 700, marginTop: 4 }}>
            <span className="text-green">{stats.bestTrade !== null ? `+$${Math.abs(stats.bestTrade).toFixed(0)}` : '—'}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>/</span>
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

      {/* ─── Risk Card (if open trades) ─── */}
      {allOpenTrades.length > 0 && (
        <RiskCard riskData={riskData} />
      )}

      {/* ─── Charts Grid — Equity + Assets ─── */}
      <div className="charts-grid">
        {/* Equity Curve (recharts) */}
        <div className="card equity-card">
          <div className="card-header">
            <div>
              <div className="card-title">Equity Curve</div>
              <div className="card-description">{monthLabel(currentMonth)}</div>
            </div>
          </div>
          <div className="card-body">
            {equityData.length < 2 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <div className="empty-icon">📈</div>
                <div className="empty-sub">Sin operaciones cerradas</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minHeight={220}>
                <AreaChart data={equityData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34C759" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#34C759" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="eqFillRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF3B30" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#FF3B30" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} strokeOpacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: axisColor, fontSize: 11, fontFamily: "var(--font)" }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: 10, fontFamily: "var(--font)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `$${v}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="pnl"
                    stroke={equityData[equityData.length - 1]?.pnl >= 0 ? '#34C759' : '#FF3B30'}
                    strokeWidth={2}
                    fill={equityData[equityData.length - 1]?.pnl >= 0 ? 'url(#eqFill)' : 'url(#eqFillRed)'}
                    dot={false}
                    activeDot={{ r: 4, fill: '#34C759', stroke: '#F2F2F7', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right column — stacked cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Asset Performance */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Por Activo</div>
                <div className="card-description">PnL por criptomoneda</div>
              </div>
            </div>
            <div className="card-body">
              {assetData.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <div className="empty-sub">Sin operaciones cerradas</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, assetData.length * 28)}>
                  <BarChart data={assetData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} strokeOpacity={0.3} horizontal={false} />
                    <XAxis type="number" tick={{ fill: axisColor, fontSize: 10, fontFamily: "var(--font)" }} axisLine={{ stroke: gridColor }} tickLine={false} tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="name" interval={0} tick={{ fill: labelColor, fontSize: 11, fontFamily: "var(--font)", fontWeight: 600 }} axisLine={false} tickLine={false} width={72} />
                    <Tooltip content={<AssetTooltip />} cursor={{ fill: cursorFill }} />
                    <Bar dataKey="pnl" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {assetData.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? '#34C759' : '#FF3B30'} fillOpacity={0.75} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Distribución WIN/LOSS/BE */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Distribución</div>
            </div>
            <div className="card-body" style={{ paddingTop: 12 }}>
              {/* Visual bars */}
              {stats.total > 0 && (
                <>
                  <div style={{ display: 'flex', gap: 4, height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                    {stats.wins > 0 && <div style={{ flex: stats.wins, background: 'var(--green)', opacity: 0.8 }} />}
                    {stats.be > 0 && <div style={{ flex: stats.be, background: 'var(--orange)', opacity: 0.8 }} />}
                    {stats.losses > 0 && <div style={{ flex: stats.losses, background: 'var(--red)', opacity: 0.8 }} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                        WIN
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--green)' }}>{stats.wins} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>({stats.total > 0 ? Math.round(stats.wins/stats.total*100) : 0}%)</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--orange)', display: 'inline-block' }} />
                        BE
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--orange)' }}>{stats.be} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>({stats.total > 0 ? Math.round(stats.be/stats.total*100) : 0}%)</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
                        LOSS
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--red)' }}>{stats.losses} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>({stats.total > 0 ? Math.round(stats.losses/stats.total*100) : 0}%)</span></span>
                    </div>
                  </div>
                </>
              )}
              {stats.total === 0 && <div className="empty-sub">Sin datos</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Recent Trades Table ─── */}
      {closedTrades.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Últimas Operaciones</div>
              <div className="card-description">{closedTrades.length} cerradas este mes</div>
            </div>
          </div>
          <div className="card-body-flush">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Tipo</th>
                  <th>Resultado</th>
                  <th>TF</th>
                  <th>Margen</th>
                  <th style={{ textAlign: 'right' }}>PnL</th>
                </tr>
              </thead>
              <tbody>
                {closedTrades.slice(0, 8).map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text)' }}>{t.crypto}</td>
                    <td><span className={`badge badge-${t.type === 'LONG' ? 'long' : 'short'}`}>{t.type}</span></td>
                    <td>
                      <span className={`badge badge-${(t.result || '').toLowerCase()}`}>
                        {t.result === 'WIN' ? '✓ WIN' : t.result === 'LOSS' ? '✗ LOSS' : '≈ BE'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{t.tf}</td>
                    <td style={{ color: 'var(--text-muted)' }}>${t.margin?.toFixed(0)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: t.result === 'WIN' ? 'var(--green)' : t.result === 'LOSS' ? 'var(--red)' : 'var(--orange)' }}>
                      {t.pnl !== null ? formatMoney(t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Search ─── */}
      <div style={{ marginBottom: 16, marginTop: 8 }}>
        <input
          className="form-control"
          style={{ maxWidth: 360, height: 38 }}
          placeholder="🔍 Buscar operación por activo..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Search Results */}
      {isSearching && (
        <div style={{ marginTop: 12 }}>
          <div className="section-header">
            <span className="section-title">Resultados para "{searchQuery.trim().toUpperCase()}"</span>
            <span className="count-badge">{searchResults.length}</span>
          </div>
          {searchResults.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
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
            <div style={{ marginTop: 24 }}>
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
            <div style={{ marginTop: 24 }}>
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
        <div className="empty-state" style={{ marginTop: 48 }}>
          <div className="empty-icon">📊</div>
          <div className="empty-title">Sin operaciones este mes</div>
          <div className="empty-sub">Registra tu primera operación para comenzar</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onNewTrade}>+ Nueva Operación</button>
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
  const color = r < 5 ? '#34C759' : r < 10 ? '#FF9500' : r < 20 ? '#FF9500' : '#FF3B30'
  const label = r < 5 ? '🟢 Riesgo bajo' : r < 10 ? '🟡 Moderado' : r < 20 ? '🟠 Alto' : '🔴 LÍMITE'

  return (
    <div className="card" style={{ marginBottom: 24, borderLeftWidth: 3, borderLeftColor: color }}>
      <div className="card-header">
        <div>
          <div className="card-title">Riesgo Total Actual</div>
          <div className="card-description">{riskData.count} posiciones abiertas</div>
        </div>
        <span style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 700, color }}>{r.toFixed(1)}%</span>
      </div>
      <div className="card-body">
        {/* Risk bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: overLimit ? '#FF3B30' : 'var(--text-muted)', fontWeight: overLimit ? 700 : 400 }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FF3B30', fontFamily: 'var(--font)' }}>
              -${riskData.riskDollar.toLocaleString('es-ES', { maximumFractionDigits: 0 })} max loss
            </span>
          </div>
          <div style={{ background: 'var(--bg)', height: 6, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '20%', top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.06)' }} />
            <div style={{
              width: `${pct}%`, height: '100%', background: color, borderRadius: 3,
              transition: 'width 0.3s',
              animation: overLimit ? 'riskPulse 1s ease-in-out infinite' : 'none'
            }} />
          </div>
        </div>

        {overLimit && (
          <div className="alert alert-warning">
            ⚠️ Riesgo por encima del 20% — considera cerrar o proteger alguna posición
          </div>
        )}

        {/* Breakdown tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {riskData.breakdown.map((item, i) => (
            <span key={i} className="badge" style={{
              background: item.protected ? 'var(--green-soft)' : 'var(--bg)',
              borderColor: item.protected ? 'var(--green)' : 'var(--border)',
              color: item.protected ? 'var(--blue)' : 'var(--text-muted)',
            }}>
              {item.crypto}: {item.protected ? '🛡️ 0%' : `${item.risk}%`}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
