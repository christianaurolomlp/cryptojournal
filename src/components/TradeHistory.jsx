import { useState, useMemo } from 'react'
import { formatDate } from '../utils.js'

const RESULT_COLORS = {
  win:  'var(--green)',
  loss: 'var(--red)',
  be:   'var(--text3)',
}
const RESULT_LABELS = { win: 'WIN', loss: 'LOSS', be: 'BE' }

export default function TradeHistory({ trades, onEdit, onDelete, onClose, onReopen }) {
  const [search, setSearch]     = useState('')
  const [typeFilter, setType]   = useState('all')   // all | LONG | SHORT
  const [resultFilter, setRes]  = useState('all')   // all | win | loss | be | open
  const [dateFrom, setFrom]     = useState('')
  const [dateTo, setTo]         = useState('')
  const [sortBy, setSort]       = useState('date-desc')

  // Unique asset list
  const assets = useMemo(() => {
    const set = new Set(trades.map(t => t.crypto?.toUpperCase()).filter(Boolean))
    return ['Todos', ...Array.from(set).sort()]
  }, [trades])

  const filtered = useMemo(() => {
    let list = [...trades]

    // Asset search
    const q = search.trim().toUpperCase()
    if (q && q !== 'TODOS') {
      list = list.filter(t => t.crypto?.toUpperCase().includes(q))
    }

    // Type
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter)

    // Result
    if (resultFilter === 'open')  list = list.filter(t => !t.closed)
    else if (resultFilter !== 'all') list = list.filter(t => t.closed && t.result === resultFilter)

    // Date from
    if (dateFrom) list = list.filter(t => (t.date || t.closeDate || '') >= dateFrom)
    // Date to
    if (dateTo)   list = list.filter(t => (t.date || t.closeDate || '') <= dateTo)

    // Sort
    const [key, dir] = sortBy.split('-')
    list.sort((a, b) => {
      let va, vb
      if (key === 'date')   { va = a.date || ''; vb = b.date || '' }
      if (key === 'pnl')    { va = a.pnl || 0;   vb = b.pnl || 0 }
      if (key === 'crypto') { va = a.crypto || ''; vb = b.crypto || '' }
      if (va < vb) return dir === 'asc' ? -1 : 1
      if (va > vb) return dir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [trades, search, typeFilter, resultFilter, dateFrom, dateTo, sortBy])

  // Summary stats for filtered set
  const stats = useMemo(() => {
    const closed = filtered.filter(t => t.closed)
    const wins   = closed.filter(t => t.result === 'win').length
    const losses = closed.filter(t => t.result === 'loss').length
    const bes    = closed.filter(t => t.result === 'be').length
    const pnl    = closed.reduce((s, t) => s + (t.pnl || 0), 0)
    const wr     = (wins + losses) > 0 ? Math.round(wins / (wins + losses) * 100) : null
    return { total: filtered.length, wins, losses, bes, pnl, wr, open: filtered.filter(t => !t.closed).length }
  }, [filtered])

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>
          📋 Historial de Operaciones
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Busca y filtra todas tus operaciones
        </p>
      </div>

      {/* ── Filters ── */}
      <div style={{
        background: 'var(--surface1)', borderRadius: 12, padding: '16px 20px',
        marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end'
      }}>
        {/* Asset search */}
        <div style={{ flex: '1 1 160px' }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>ACTIVO</label>
          <input
            list="asset-list"
            className="form-control"
            style={{ height: 36, fontSize: 13 }}
            placeholder="BTC, ETH…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <datalist id="asset-list">
            {assets.map(a => <option key={a} value={a} />)}
          </datalist>
        </div>

        {/* Type */}
        <div style={{ flex: '0 0 130px' }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>DIRECCIÓN</label>
          <select className="form-control" style={{ height: 36, fontSize: 13 }} value={typeFilter} onChange={e => setType(e.target.value)}>
            <option value="all">Todos</option>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>
        </div>

        {/* Result */}
        <div style={{ flex: '0 0 130px' }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>RESULTADO</label>
          <select className="form-control" style={{ height: 36, fontSize: 13 }} value={resultFilter} onChange={e => setRes(e.target.value)}>
            <option value="all">Todos</option>
            <option value="open">Abiertas</option>
            <option value="win">WIN</option>
            <option value="loss">LOSS</option>
            <option value="be">BE</option>
          </select>
        </div>

        {/* Date from */}
        <div style={{ flex: '0 0 150px' }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>DESDE</label>
          <input type="date" className="form-control" style={{ height: 36, fontSize: 13 }} value={dateFrom} onChange={e => setFrom(e.target.value)} />
        </div>

        {/* Date to */}
        <div style={{ flex: '0 0 150px' }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>HASTA</label>
          <input type="date" className="form-control" style={{ height: 36, fontSize: 13 }} value={dateTo} onChange={e => setTo(e.target.value)} />
        </div>

        {/* Sort */}
        <div style={{ flex: '0 0 160px' }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>ORDENAR</label>
          <select className="form-control" style={{ height: 36, fontSize: 13 }} value={sortBy} onChange={e => setSort(e.target.value)}>
            <option value="date-desc">Fecha ↓ (reciente)</option>
            <option value="date-asc">Fecha ↑ (antigua)</option>
            <option value="pnl-desc">PnL ↓ (mayor)</option>
            <option value="pnl-asc">PnL ↑ (menor)</option>
            <option value="crypto-asc">Activo A→Z</option>
          </select>
        </div>

        {/* Clear button */}
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-ghost" style={{ height: 36, fontSize: 13 }} onClick={() => {
            setSearch(''); setType('all'); setRes('all'); setFrom(''); setTo(''); setSort('date-desc')
          }}>✕ Limpiar</button>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { label: 'Operaciones', value: stats.total, color: 'var(--text1)' },
          { label: 'Abiertas', value: stats.open, color: 'var(--yellow)' },
          { label: 'WIN', value: stats.wins, color: 'var(--green)' },
          { label: 'LOSS', value: stats.losses, color: 'var(--red)' },
          { label: 'Winrate', value: stats.wr != null ? `${stats.wr}%` : '—', color: stats.wr >= 50 ? 'var(--green)' : 'var(--red)' },
          { label: 'PnL Total', value: `${stats.pnl >= 0 ? '+' : ''}$${stats.pnl.toFixed(0)}`, color: stats.pnl >= 0 ? 'var(--green)' : 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface1)', borderRadius: 10, padding: '10px 18px',
            textAlign: 'center', flex: '1 1 80px'
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Trade Table ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '60px 0', fontSize: 14 }}>
          No hay operaciones con los filtros actuales
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Fecha', 'Activo', 'Dir', 'TF', 'Lev', 'Margen', 'Riesgo', 'PnL', 'Resultado', ''].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 12px', fontSize: 11,
                    color: 'var(--text3)', fontWeight: 600, whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} style={{
                  borderBottom: '1px solid var(--border)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  transition: 'background 0.1s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface1)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  <td style={{ padding: '10px 12px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                    {t.date ? t.date : '—'}
                    {t.closeDate && t.closeDate !== t.date && (
                      <span style={{ fontSize: 10, color: 'var(--text3)', display: 'block' }}>→ {t.closeDate}</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text1)' }}>
                    {t.crypto?.toUpperCase() || '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: t.type === 'LONG' ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)',
                      color: t.type === 'LONG' ? 'var(--green)' : 'var(--red)'
                    }}>{t.type}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{t.tf || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{t.lev ? `${t.lev}x` : '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{t.margin ? `$${t.margin}` : '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{t.risk ? `${t.risk}%` : '—'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {t.pnl != null
                      ? <span style={{ color: t.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(0)}
                        </span>
                      : <span style={{ color: 'var(--text3)' }}>—</span>
                    }
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {!t.closed
                      ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(250,204,21,0.15)', color: 'var(--yellow)' }}>ABIERTA</span>
                      : <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: t.result === 'win' ? 'rgba(52,211,153,0.15)' : t.result === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.1)',
                          color: RESULT_COLORS[t.result] || 'var(--text3)'
                        }}>{RESULT_LABELS[t.result] || t.result}</span>
                    }
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => onEdit(t)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, padding: '2px 4px' }}
                        title="Editar"
                      >✏️</button>
                      {!t.closed && (
                        <button
                          onClick={() => onClose(t)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', fontSize: 12, padding: '2px 4px', fontWeight: 600 }}
                          title="Cerrar operación"
                        >Cerrar</button>
                      )}
                      <button
                        onClick={() => onDelete(t)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 14, padding: '2px 4px', opacity: 0.6 }}
                        title="Eliminar"
                      >🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
