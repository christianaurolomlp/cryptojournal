import { formatMoney } from '../utils.js'
import CryptoLogo from './CryptoLogo.jsx'


function getPnlClass(result) {
  if (result === 'WIN') return 'green'
  if (result === 'LOSS') return 'red'
  if (result === 'BE') return 'yellow'
  return ''
}

function getCardClass(trade) {
  if (!trade.closed) return 'open'
  if (trade.result === 'WIN') return 'win'
  if (trade.result === 'LOSS') return 'loss'
  if (trade.result === 'BE') return 'be'
  return ''
}

export default function TradeCard({ trade, onEdit, onDelete, onClose, onReopen, onToggleProtected, compact = false }) {
  const pnlValue = trade.pnl !== null && trade.pnl !== undefined
    ? (trade.result === 'LOSS' ? -Math.abs(trade.pnl) : trade.pnl)
    : null

  const positionSize = trade.margin * trade.lev

  return (
    <div className={`trade-card ${getCardClass(trade)}`}>
      <div className="trade-card-top">
        <div className="trade-card-left">
          <span className={`trade-crypto crypto-tag crypto-${['BTC','ETH','SOL','BNB','XRP'].includes(trade.crypto) ? trade.crypto : 'default'}`} style={{display:'inline-flex',alignItems:'center',gap:5}}>
            <CryptoLogo symbol={trade.crypto} size={18} />
            {trade.crypto}
          </span>
          <span className={`badge badge-${trade.type === 'LONG' ? 'long' : 'short'}`}>
            {trade.type}
          </span>
          <span className="badge badge-tf">{trade.tf}</span>
          <span className="badge badge-lev">{trade.lev}x</span>
          {trade.closed
            ? <span className={`badge badge-${(trade.result || '').toLowerCase()}`}>
                {trade.result === 'WIN' ? '✓ WIN' : trade.result === 'LOSS' ? '✗ LOSS' : '≈ BE'}
              </span>
            : <span className="badge badge-open">Abierta</span>
          }
          {!trade.closed && trade.protected && (
            <span className="badge" style={{ background: 'var(--blue)', color: '#fff', fontSize: 10 }}>🛡️ Protegida</span>
          )}
        </div>
        {trade.closed && pnlValue !== null && (
          <span className={`trade-pnl ${getPnlClass(trade.result)}`}>
            {formatMoney(pnlValue)}
          </span>
        )}
      </div>

      <div className="trade-card-meta">
        <div className="meta-item">
          <span>Margen:</span>
          <strong>${trade.margin?.toFixed(2)}</strong>
        </div>
        <div className="meta-item">
          <span>Posición:</span>
          <strong>${positionSize?.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</strong>
        </div>
        <div className="meta-item">
          <span>Riesgo:</span>
          <strong>{trade.risk}%</strong>
        </div>
        <div className="meta-item">
          <span>Fecha:</span>
          <strong>{trade.date}</strong>
        </div>
        {trade.closeDate && (
          <div className="meta-item">
            <span>Cierre:</span>
            <strong>{trade.closeDate}</strong>
          </div>
        )}
        {!trade.closed && trade.date && (() => {
          const diffH = Math.floor((Date.now() - new Date(trade.date + 'T00:00:00')) / 3600000)
          const diffD = Math.floor(diffH / 24)
          const label = diffD >= 1 ? `${diffD}d` : diffH >= 1 ? `${diffH}h` : '<1h'
          return (
            <div className="meta-item">
              <span>Abierta hace:</span>
              <strong style={{ color: diffD >= 3 ? 'var(--color-orange)' : 'inherit' }}>{label}</strong>
            </div>
          )
        })()}
      </div>

      {trade.notes && (
        <div className="trade-notes">📝 {trade.notes}</div>
      )}

      {!compact && (
        <div className="trade-actions">
          <button className="ta-btn ta-edit" onClick={() => onEdit(trade)} title="Editar">
            ✎ Editar
          </button>
          {!trade.closed && onToggleProtected && (
            <button
              className={`ta-btn ${trade.protected ? 'ta-protect-on' : 'ta-protect-off'}`}
              onClick={() => onToggleProtected(trade)}
              title="SL en entrada — riesgo 0"
            >
              {trade.protected ? '✅ Prot.' : '🛡️ Prot.'}
            </button>
          )}
          {!trade.closed && (
            <button className="ta-btn ta-close" onClick={() => onClose(trade)} title="Cerrar trade">
              ✓ Cerrar
            </button>
          )}
          {trade.closed && (
            <button className="ta-btn ta-reopen" onClick={() => onReopen(trade)} title="Reabrir">
              ↩ Reabrir
            </button>
          )}
          <button className="ta-btn ta-delete" onClick={() => onDelete(trade)} title="Eliminar">
            ✕ Elim.
          </button>
        </div>
      )}
    </div>
  )
}
