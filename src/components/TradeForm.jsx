import { useState, useEffect } from 'react'
import { CRYPTOS, TIMEFRAMES, LEVERAGES, RISK_PRESETS } from '../constants.js'
import { uid } from '../store.js'

const today = () => new Date().toISOString().split('T')[0]

function defaultForm(prefill = {}) {
  return {
    crypto: 'BTC',
    type: 'LONG',
    tf: '15m',
    margin: '',
    risk: 1,
    lev: 50,
    date: today(),
    notes: '',
    ...prefill
  }
}

export default function TradeForm({ initial, prefill, capital, onSave, onClose, isEdit = false }) {
  const [form, setForm] = useState(() => {
    if (initial) return { ...defaultForm(), ...initial, margin: initial.margin ?? '' }
    return defaultForm(prefill)
  })

  useEffect(() => {
    if (prefill && !isEdit) {
      setForm(f => ({ ...f, ...prefill }))
    }
  }, [prefill])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const margin = parseFloat(form.margin) || 0
  const positionSize = margin * form.lev
  const riskUSD = capital > 0 ? capital * form.risk / 100 : null
  const capUsedPct = capital > 0 && margin > 0 ? (margin / capital) * 100 : null

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.margin || isNaN(parseFloat(form.margin))) {
      alert('El margen es requerido.')
      return
    }
    const trade = {
      id: initial?.id || uid(),
      crypto: form.crypto,
      type: form.type,
      tf: form.tf,
      margin: parseFloat(form.margin),
      risk: parseFloat(form.risk),
      lev: parseInt(form.lev),
      capUsed: capUsedPct,
      date: form.date,
      notes: form.notes,
      closed: initial?.closed || false,
      result: initial?.result || null,
      pnl: initial?.pnl ?? null,
      closeDate: initial?.closeDate || null
    }
    onSave(trade)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? '✎ Editar Operación' : '+ Nueva Operación'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              {/* Tipo LONG/SHORT */}
              <div className="form-group full">
                <label className="form-label">Dirección</label>
                <div className="type-toggle">
                  <button
                    type="button"
                    className={`type-btn long ${form.type === 'LONG' ? 'active' : ''}`}
                    onClick={() => set('type', 'LONG')}
                  >▲ LONG</button>
                  <button
                    type="button"
                    className={`type-btn short ${form.type === 'SHORT' ? 'active' : ''}`}
                    onClick={() => set('type', 'SHORT')}
                  >▼ SHORT</button>
                </div>
              </div>

              {/* Cripto */}
              <div className="form-group">
                <label className="form-label">Criptomoneda</label>
                <input
                  className="form-control"
                  list="crypto-list"
                  value={form.crypto}
                  onChange={e => set('crypto', e.target.value.toUpperCase())}
                  placeholder="BTC, ETH, ROBO..."
                  autoComplete="off"
                />
                <datalist id="crypto-list">
                  {CRYPTOS.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              {/* Temporalidad */}
              <div className="form-group">
                <label className="form-label">Temporalidad</label>
                <select
                  className="form-control"
                  value={form.tf}
                  onChange={e => set('tf', e.target.value)}
                >
                  {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Margen */}
              <div className="form-group">
                <label className="form-label">Margen (USD)</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="500"
                  value={form.margin}
                  onChange={e => set('margin', e.target.value)}
                  required
                />
              </div>

              {/* Apalancamiento */}
              <div className="form-group">
                <label className="form-label">Apalancamiento</label>
                <select
                  className="form-control"
                  value={form.lev}
                  onChange={e => set('lev', parseInt(e.target.value))}
                >
                  {LEVERAGES.map(l => <option key={l} value={l}>{l}x</option>)}
                </select>
              </div>

              {/* Riesgo */}
              <div className="form-group">
                <label className="form-label">Riesgo (%)</label>
                <input
                  className="form-control"
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  placeholder="1"
                  value={form.risk}
                  onChange={e => set('risk', parseFloat(e.target.value))}
                />
              </div>

              {/* Fecha */}
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input
                  className="form-control"
                  type="date"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                />
              </div>

              {/* Cálculos */}
              {margin > 0 && (
                <div className="form-group full">
                  <label className="form-label">Cálculos automáticos</label>
                  <div className="calc-display">
                    <div className="calc-item">
                      <span className="calc-item-label">Tamaño posición</span>
                      <span className="calc-item-val">${positionSize.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>
                    </div>
                    {riskUSD !== null && (
                      <div className="calc-item">
                        <span className="calc-item-label">Riesgo en $</span>
                        <span className="calc-item-val">${riskUSD.toFixed(2)}</span>
                      </div>
                    )}
                    {capUsedPct !== null && (
                      <div className="calc-item">
                        <span className="calc-item-label">% capital usado</span>
                        <span className="calc-item-val">{capUsedPct.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notas */}
              <div className="form-group full">
                <label className="form-label">Notas (opcional)</label>
                <textarea
                  className="form-control"
                  placeholder="Setup en soporte, confluencia con RSI, etc."
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              {isEdit ? '✓ Guardar cambios' : '+ Registrar operación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
