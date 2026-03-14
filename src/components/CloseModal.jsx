import { useState } from 'react'

const today = () => new Date().toISOString().split('T')[0]

export default function CloseModal({ trade, onSave, onClose }) {
  const [result, setResult] = useState('WIN')
  const [pnl, setPnl] = useState('')
  const [closeDate, setCloseDate] = useState(today())

  function handleSubmit(e) {
    e.preventDefault()
    const pnlVal = parseFloat(pnl)
    if (isNaN(pnlVal) && result !== 'BE') {
      alert('Ingresa el P&L')
      return
    }
    onSave({
      ...trade,
      closed: true,
      result,
      pnl: result === 'BE' ? 0 : Math.abs(pnlVal),
      closeDate
    })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Cerrar operación</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                {trade.type} {trade.crypto}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 10 }}>
                {trade.tf} · Margen ${trade.margin}
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Resultado</label>
              <div className="result-toggle">
                <button type="button" className={`result-btn win ${result === 'WIN' ? 'active' : ''}`} onClick={() => setResult('WIN')}>
                  ✓ Ganada
                </button>
                <button type="button" className={`result-btn loss ${result === 'LOSS' ? 'active' : ''}`} onClick={() => setResult('LOSS')}>
                  ✗ Perdida
                </button>
                <button type="button" className={`result-btn be ${result === 'BE' ? 'active' : ''}`} onClick={() => setResult('BE')}>
                  ≈ Breakeven
                </button>
              </div>
            </div>

            {result !== 'BE' && (
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">
                  {result === 'WIN' ? 'Ganancia (USD)' : 'Pérdida (USD)'}
                </label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="any"
                  placeholder={result === 'WIN' ? '150.00' : '80.00'}
                  value={pnl}
                  onChange={e => setPnl(e.target.value)}
                  required={result !== 'BE'}
                />
                <span className="form-hint">
                  {result === 'LOSS' ? 'Ingresa el monto positivo — se registrará como pérdida automáticamente.' : ''}
                </span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Fecha de cierre</label>
              <input
                className="form-control"
                type="date"
                value={closeDate}
                onChange={e => setCloseDate(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className={`btn ${result === 'WIN' ? 'btn-success' : result === 'LOSS' ? 'btn-danger' : 'btn-warning'}`}>
              Confirmar cierre
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
