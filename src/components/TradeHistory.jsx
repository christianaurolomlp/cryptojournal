import { useState, useMemo } from 'react'

const RESULT_COLORS = { WIN: 'var(--blue)', LOSS: 'var(--red)', BE: 'var(--orange)' }
const RESULT_LABELS = { WIN: 'WIN', LOSS: 'LOSS', BE: 'BE' }

export default function TradeHistory({ trades, onEdit, onDelete, onClose, onReopen }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setType] = useState('all')
  const [resultFilter, setRes] = useState('all')
  const [dateFrom, setFrom] = useState('')
  const [dateTo, setTo] = useState('')
  const [sortBy, setSort] = useState('date-desc')

  const assets = useMemo(() => {
    const set = new Set(trades.map(t => t.crypto?.toUpperCase()).filter(Boolean))
    return ['Todos', ...Array.from(set).sort()]
  }, [trades])

  const filtered = useMemo(() => {
    let list = [...trades]
    const q = search.trim().toUpperCase()
    if (q && q !== 'TODOS') list = list.filter(t => t.crypto?.toUpperCase().includes(q))
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter)
    if (resultFilter === 'open') list = list.filter(t => !t.closed)
    else if (resultFilter !== 'all') list = list.filter(t => t.closed && t.result === resultFilter.toUpperCase())
    if (dateFrom) list = list.filter(t => (t.date || t.closeDate || '') >= dateFrom)
    if (dateTo) list = list.filter(t => (t.date || t.closeDate || '') <= dateTo)

    const [key, dir] = sortBy.split('-')
    list.sort((a, b) => {
      let va, vb
      if (key === 'date') { va = a.date || ''; vb = b.date || '' }
      if (key === 'pnl') { va = a.pnl || 0; vb = b.pnl || 0 }
      if (key === 'crypto') { va = a.crypto || ''; vb = b.crypto || '' }
      if (va < vb) return dir === 'asc' ? -1 : 1
      if (va > vb) return dir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [trades, search, typeFilter, resultFilter, dateFrom, dateTo, sortBy])

  const stats = useMemo(() => {
    const closed = filtered.filter(t => t.closed)
    const wins = closed.filter(t => t.result === 'WIN').length
    const losses = closed.filter(t => t.result === 'LOSS').length
    const bes = closed.filter(t => t.result === 'BE').length
    const pnl = closed.reduce((s, t) => s + (t.result === 'LOSS' ? -Math.abs(t.pnl || 0) : (t.pnl || 0)), 0)
    const wr = (wins + losses) > 0 ? Math.round(wins / (wins + losses) * 100) : null
    return { total: filtered.length, wins, losses, bes, pnl, wr, open: filtered.filter(t => !t.closed).length }
  }, [filtered])

  return (
    <div className="page">
      <h1 className="page-title">Historial de Operaciones</h1>

      {/* Filters */}
      <div className="card mb-5">
        <div className="card-body">
          <div className="flex flex-wrap gap-3 items-end">
            <FilterField label="Activo" flex="1 1 150px">
              <input list="asset-list" className="form-control" style={{ height: 38 }} placeholder="BTC, ETH…" value={search} onChange={e => setSearch(e.target.value)} />
              <datalist id="asset-list">{assets.map(a => <option key={a} value={a} />)}</datalist>
            </FilterField>
            <FilterField label="Dirección" flex="0 0 120px">
              <select className="form-control" style={{ height: 38 }} value={typeFilter} onChange={e => setType(e.target.value)}>
                <option value="all">Todos</option>
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </FilterField>
            <FilterField label="Resultado" flex="0 0 120px">
              <select className="form-control" style={{ height: 38 }} value={resultFilter} onChange={e => setRes(e.target.value)}>
                <option value="all">Todos</option>
                <option value="open">Abiertas</option>
                <option value="win">WIN</option>
                <option value="loss">LOSS</option>
                <option value="be">BE</option>
              </select>
            </FilterField>
            <FilterField label="Desde" flex="0 0 140px">
              <input type="date" className="form-control" style={{ height: 38 }} value={dateFrom} onChange={e => setFrom(e.target.value)} />
            </FilterField>
            <FilterField label="Hasta" flex="0 0 140px">
              <input type="date" className="form-control" style={{ height: 38 }} value={dateTo} onChange={e => setTo(e.target.value)} />
            </FilterField>
            <FilterField label="Ordenar" flex="0 0 160px">
              <select className="form-control" style={{ height: 38 }} value={sortBy} onChange={e => setSort(e.target.value)}>
                <option value="date-desc">Fecha ↓</option>
                <option value="date-asc">Fecha ↑</option>
                <option value="pnl-desc">PnL ↓</option>
                <option value="pnl-asc">PnL ↑</option>
                <option value="crypto-asc">Activo A→Z</option>
              </select>
            </FilterField>
            <div style={{ flex: '0 0 auto' }}>
              <button className="btn btn-ghost" style={{ height: 38 }} onClick={() => { setSearch(''); setType('all'); setRes('all'); setFrom(''); setTo(''); setSort('date-desc') }}>✕ Limpiar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="kpi-grid mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))' }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--text)' },
          { label: 'Abiertas', value: stats.open, color: 'var(--color-info)' },
          { label: 'Win', value: stats.wins, color: 'var(--blue)' },
          { label: 'Loss', value: stats.losses, color: 'var(--red)' },
          { label: 'Win Rate', value: stats.wr != null ? `${stats.wr}%` : '—', color: stats.wr >= 50 ? 'var(--blue)' : 'var(--red)' },
          { label: 'PnL', value: `${stats.pnl >= 0 ? '+' : ''}$${stats.pnl.toFixed(0)}`, color: stats.pnl >= 0 ? 'var(--blue)' : 'var(--red)' },
        ].map(s => (
          <div key={s.label} className="kpi-card" style={{ textAlign: 'center', padding: '14px 12px' }}>
            <div style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div className="kpi-sub" style={{ marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">Sin operaciones</div>
          <div className="empty-sub">No hay operaciones con los filtros actuales</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Fecha', 'Activo', 'Dir', 'TF', 'Lev', 'Margen', 'Riesgo', 'PnL', 'Resultado', ''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600,
                      color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
                      borderBottom: '1px solid var(--border)', background: 'var(--bg)',
                      whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'var(--font)' }}>
                      {t.date || '—'}
                      {t.closeDate && t.closeDate !== t.date && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>→ {t.closeDate}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font)' }}>
                      {t.crypto?.toUpperCase() || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge badge-${t.type === 'LONG' ? 'long' : 'short'}`}>{t.type}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>{t.tf || '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>{t.lev ? `${t.lev}x` : '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>{t.margin ? `$${t.margin}` : '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>{t.risk ? `${t.risk}%` : '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'var(--font)' }}>
                      {t.pnl != null && t.closed
                        ? (() => {
                            const displayPnl = t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl
                            return <span style={{ color: displayPnl >= 0 ? 'var(--blue)' : 'var(--red)' }}>
                              {displayPnl >= 0 ? '+' : ''}${displayPnl.toFixed(0)}
                            </span>
                          })()
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {!t.closed
                        ? <span className="badge badge-open">ABIERTA</span>
                        : <span className={`badge badge-${(t.result || '').toLowerCase()}`} style={{ fontWeight: 700 }}>
                            {RESULT_LABELS[t.result] || t.result}
                          </span>
                      }
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="flex gap-2">
                        <button onClick={() => onEdit(t)} className="btn btn-ghost btn-sm" title="Editar">✏️</button>
                        {!t.closed && (
                          <button onClick={() => onClose(t)} className="btn btn-primary btn-sm" title="Cerrar">Cerrar</button>
                        )}
                        <button onClick={() => onDelete(t)} className="btn btn-ghost btn-sm" title="Eliminar" style={{ color: 'var(--red)', opacity: 0.7 }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterField({ label, flex, children }) {
  return (
    <div style={{ flex }}>
      <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  )
}
