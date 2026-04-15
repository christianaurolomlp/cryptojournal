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

  // Insight del día — rota entre varios tipos según el día del mes
  const insight = useMemo(() => {
    const closed = monthTrades.filter(t => t.closed)
    if (closed.length < 2) return null

    // Build asset map
    const assetMap = {}
    closed.forEach(t => {
      if (!assetMap[t.crypto]) assetMap[t.crypto] = { wins: 0, losses: 0, total: 0, pnl: 0 }
      assetMap[t.crypto].total++
      assetMap[t.crypto].pnl += parseFloat(t.pnl) || 0
      if (t.result === 'WIN') assetMap[t.crypto].wins++
      else if (t.result === 'LOSS') assetMap[t.crypto].losses++
    })
    const assets = Object.entries(assetMap).filter(([, v]) => v.total >= 2)

    // Best win-rate asset
    const bestWR = assets.length ? assets.sort((a,b) => (b[1].wins/b[1].total)-(a[1].wins/a[1].total))[0] : null
    // Most traded
    const mostTraded = assets.length ? [...assets].sort((a,b) => b[1].total-a[1].total)[0] : null
    // Best PnL asset
    const bestPnl = assets.length ? [...assets].sort((a,b) => b[1].pnl-a[1].pnl)[0] : null
    // Worst asset
    const worstAsset = assets.length ? [...assets].sort((a,b) => a[1].pnl-b[1].pnl)[0] : null

    // Win/loss streak
    const sorted = [...closed].sort((a,b) => new Date(a.closeDate||a.date)-new Date(b.closeDate||b.date))
    let curStreak = 0, curType = null
    sorted.forEach(t => {
      if (t.result === curType) curStreak++
      else { curType = t.result; curStreak = 1 }
    })

    // Avg trades per active day
    const activeDays = new Set(closed.map(t => (t.closeDate||t.date||'').slice(0,10))).size
    const avgPerDay = activeDays > 0 ? (closed.length / activeDays).toFixed(1) : null

    // Rotate by day of month
    const dayOfMonth = new Date().getDate()
    const pool = []

    if (bestWR && bestWR[1].wins/bestWR[1].total >= 0.5)
      pool.push({ icon:'🎯', label:'MEJOR ACTIVO', text: `<b style="color:#F59E0B">${bestWR[0]}</b> es tu activo más rentable este mes con un <b style="color:#22c55e">${Math.round(bestWR[1].wins/bestWR[1].total*100)}%</b> de win rate en ${bestWR[1].total} trades.` })

    if (worstAsset && worstAsset[1].pnl < 0)
      pool.push({ icon:'⚠️', label:'PUNTO DÉBIL', text: `<b style="color:#F7931A">${worstAsset[0]}</b> es donde más pierdes este mes (${worstAsset[1].wins}W/${worstAsset[1].losses}L). Considera reducir tamaño o pausar.` })

    if (curStreak >= 2 && curType === 'WIN')
      pool.push({ icon:'🔥', label:'EN RACHA', text: `Llevas <b style="color:#22c55e">${curStreak} wins consecutivos</b>. Mantén el mismo proceso, el mercado está respondiendo.` })

    if (curStreak >= 2 && curType === 'LOSS')
      pool.push({ icon:'🔄', label:'AJUSTA EL SESGO', text: `Llevas <b style="color:#ef4444">${curStreak} pérdidas seguidas</b>. Revisa la dirección del mercado — puede que el bias haya cambiado.` })

    if (mostTraded && mostTraded[1].total >= 3)
      pool.push({ icon:'📊', label:'MÁS OPERADO', text: `Este mes has operado <b style="color:#8B5CF6">${mostTraded[0]}</b> ${mostTraded[1].total} veces. Es tu activo principal — asegúrate de tener un edge claro en él.` })

    if (stats.winRate > 0 && stats.profitFactor >= 2)
      pool.push({ icon:'💎', label:'TRADING SÓLIDO', text: `Con un profit factor de <b style="color:#06B6D4">${stats.profitFactor.toFixed(2)}</b> y win rate del ${stats.winRate.toFixed(0)}%, tu sistema está funcionando. Sigue el proceso.` })

    if (avgPerDay && parseFloat(avgPerDay) >= 3)
      pool.push({ icon:'⚡', label:'ACTIVO', text: `Estás operando <b style="color:#F59E0B">${avgPerDay} trades/día</b> de media. Tu ritmo es alto — más datos = mejor estadística a largo plazo.` })

    if (!pool.length) return null
    return pool[dayOfMonth % pool.length]
  }, [monthTrades, stats])

  return (
    <>
    <div className="page page-3col">
      {/* ── LEFT + CENTER COLUMN ── */}
      <div className="page-main">

        {!capital && (
          <div className="alert alert-warning">
            ⚠ No hay capital definido para {monthLabel(currentMonth)}. Configúralo para calcular rentabilidad.
          </div>
        )}

        {/* ─── Hero Banner ─── */}
        <div className="hero-banner">
          <div className="hero-banner-left">
            <div className="hero-banner-label">📅 {monthLabel(currentMonth).toUpperCase()} · RESUMEN</div>
            <div className="hero-banner-title">
              {stats.pnl >= 0
                ? <><span className="hero-value green">+{Math.abs(stats.pnl).toLocaleString('es-ES', {minimumFractionDigits:0, maximumFractionDigits:0})} USD</span> este mes</>
                : <><span className="hero-value red">-{Math.abs(stats.pnl).toLocaleString('es-ES', {minimumFractionDigits:0, maximumFractionDigits:0})} USD</span> este mes</>
              }
            </div>
            {insight && (
              <div className="hero-banner-sub">
                <span style={{color:'var(--accent-amber)',fontWeight:600}}>{insight.icon} {insight.label}:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: insight.text }} />
              </div>
            )}
          </div>
          <div className="hero-banner-right">
            <div className="hero-stat">
              <span className="hero-stat-val" style={{ color: stats.winRate >= 50 ? 'var(--green)' : 'var(--red)' }}>{stats.winRate.toFixed(0)}%</span>
              <span className="hero-stat-label">Win rate</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-val">{stats.total}</span>
              <span className="hero-stat-label">Trades</span>
            </div>
            {capital > 0 && (
              <div className="hero-stat">
                <span className="hero-stat-val" style={{ color: stats.rentPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {stats.rentPct >= 0 ? '+' : ''}{stats.rentPct?.toFixed(1)}%
                </span>
                <span className="hero-stat-label">Rentabilidad</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── KPI Grid — 4 cards ─── */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Operaciones</div>
            <div className="kpi-value">{stats.total}</div>
            <div className="kpi-sub">{stats.wins}W · {stats.losses}L · {stats.be}BE</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Profit Factor</div>
            <div className={`kpi-value ${pfColor}`}>{stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</div>
            <div className="kpi-sub">Ganancia / Pérdida bruta</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Max Drawdown</div>
            <div className="kpi-value red">{stats.maxDrawdown > 0 ? `-$${stats.maxDrawdown.toFixed(0)}` : '—'}</div>
            <div className="kpi-sub">{capital > 0 && stats.maxDrawdown > 0 ? `${(stats.maxDrawdown / capital * 100).toFixed(1)}% del capital` : 'Caída máxima'}</div>
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
      {/* ─── Equity Curve — full width ─── */}
      <div className="card equity-card" style={{ width: '100%' }}>
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

      </div>{/* end page-main */}

      {/* ── RIGHT PANEL ── */}
      <aside className="page-right-panel">
        {/* Capital widget */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><div className="card-title">Capital</div></div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 4 }}>
              {stats.capitalFinal !== null ? `$${Math.round(stats.capitalFinal).toLocaleString('es-ES')}` : capital ? `$${capital.toLocaleString('es-ES')}` : '—'}
            </div>
            {capital > 0 && <div style={{ fontSize: 13, color: stats.rentPct >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{stats.rentPct >= 0 ? '▲' : '▼'} {Math.abs(stats.rentPct || 0).toFixed(1)}%</div>}
            {capital > 0 && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>Inicial: ${capital.toLocaleString('es-ES')}</div>}
          </div>
        </div>

        {/* Mejor / Peor widget */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><div className="card-title">Mejor · Peor trade</div></div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Mejor trade</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>{stats.bestTrade !== null ? `+$${Math.abs(stats.bestTrade).toFixed(0)}` : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Peor trade</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)' }}>{stats.worstTrade !== null ? `-$${Math.abs(stats.worstTrade).toFixed(0)}` : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Abiertas ahora</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{openTrades.length}</span>
            </div>
          </div>
        </div>

        {/* Por Activo */}
        {assetData.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-header"><div className="card-title">Por Activo</div></div>
            <div className="card-body" style={{ paddingTop: 8, paddingBottom: 12 }}>
              {assetData.slice(0, 6).map((item, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{item.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {item.pnl >= 0 ? '+' : ''}{item.pnl.toFixed(0)} USD
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      background: item.pnl >= 0 ? 'var(--green)' : 'var(--red)',
                      width: `${Math.min(100, Math.abs(item.pnl) / Math.max(...assetData.map(a => Math.abs(a.pnl))) * 100)}%`,
                      opacity: 0.8
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Distribución */}
        {stats.total > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-header"><div className="card-title">Distribución</div></div>
            <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div style={{ display: 'flex', gap: 3, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                {stats.wins > 0 && <div style={{ flex: stats.wins, background: 'var(--green)', opacity: 0.85 }} />}
                {stats.be > 0 && <div style={{ flex: stats.be, background: 'var(--orange)', opacity: 0.85 }} />}
                {stats.losses > 0 && <div style={{ flex: stats.losses, background: 'var(--red)', opacity: 0.85 }} />}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✓ {stats.wins} wins</span>
                {stats.be > 0 && <span style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 600 }}>— {stats.be} BE</span>}
                <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>✗ {stats.losses} loss</span>
              </div>
            </div>
          </div>
        )}

        {/* Open positions */}
        {openTrades.length > 0 && (
          <div className="card">
            <div className="card-header"><div className="card-title">Posiciones abiertas <span className="count-badge" style={{ marginLeft: 6 }}>{openTrades.length}</span></div></div>
            <div className="card-body" style={{ paddingTop: 12 }}>
              {openTrades.slice(0, 5).map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.type === 'LONG' ? 'var(--green)' : 'var(--red)', background: t.type === 'LONG' ? 'var(--green-soft)' : 'var(--red-soft)', padding: '2px 5px', borderRadius: 4 }}>{t.type}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{t.crypto}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.risk || 0}% riesgo</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>{/* end page-3col */}

    {/* ─── Trade list — full width ─── */}
    <div className="page page-trades">
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

    </div>{/* end page-trades */}
    </>
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
