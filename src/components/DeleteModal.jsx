export default function DeleteModal({ trade, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">Confirmar eliminación</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
            ¿Estás seguro que deseas eliminar esta operación? Esta acción no se puede deshacer.
          </p>
          <div style={{ padding: '12px 14px', background: 'var(--red-soft)', border: '1px solid rgba(255,59,48,0.15)', borderLeft: '3px solid var(--red)' }}>
            <div style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 4 }}>
              {trade.type} {trade.crypto}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {trade.tf} · Margen ${trade.margin} · {trade.lev}x · {trade.date}
            </div>
            {trade.closed && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Resultado: {trade.result} {trade.pnl ? `· $${Math.abs(trade.pnl)}` : ''}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm}>
            ✕ Eliminar operación
          </button>
        </div>
      </div>
    </div>
  )
}
