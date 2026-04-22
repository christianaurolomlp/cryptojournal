import { useState } from 'react'
import { uid } from '../store.js'

// Mapea el schema del prompt → formato interno del diario
function mapTrade(raw) {
  return {
    id: uid(),
    crypto: (raw.crypto || '').replace('USDT', '').replace('PERP', '').toUpperCase() || 'BTC',
    type: raw.type === 'SHORT' ? 'SHORT' : 'LONG',
    tf: raw.tf || '1h',
    margin: raw.margin != null ? parseFloat(raw.margin) : 0,
    risk: raw.risk != null ? parseFloat(raw.risk) : 1,
    lev: raw.leverage != null ? parseFloat(raw.leverage) : null,
    capUsed: raw.cap_used != null ? parseFloat(raw.cap_used) : null,
    date: raw.open_date || new Date().toISOString().split('T')[0],
    closeDate: raw.close_date || null,
    result: raw.result || null,
    pnl: raw.pnl != null ? parseFloat(raw.pnl) : null,
    notes: raw.notes || null,
    closed: raw.closed === true,
    protected: raw.protected === true
  }
}

export default function ImportModal({ onImport, onClose }) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [importing, setImporting] = useState(false)

  function handleParse() {
    setError(null)
    setPreview(null)
    try {
      // Extraer bloque JSON del texto (puede venir con ```json ... ```)
      let json = text.trim()
      const match = json.match(/```json\s*([\s\S]*?)```/i) || json.match(/```\s*([\s\S]*?)```/)
      if (match) json = match[1].trim()

      const parsed = JSON.parse(json)
      if (!Array.isArray(parsed)) throw new Error('El JSON debe ser un array de operaciones.')
      if (parsed.length === 0) throw new Error('El array está vacío.')

      const mapped = parsed.map((t, i) => {
        try { return mapTrade(t) }
        catch (e) { throw new Error(`Error en operación #${i + 1}: ${e.message}`) }
      })
      setPreview(mapped)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleImport() {
    if (!preview) return
    setImporting(true)
    try {
      await onImport(preview)
      setDone(true)
    } catch (e) {
      setError('Error al importar: ' + e.message)
    } finally {
      setImporting(false)
    }
  }

  const resultColor = { WIN: '#22c55e', LOSS: '#ef4444', BE: '#eab308' }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680, width: '95vw' }}>
        <div className="modal-header">
          <h2 className="modal-title">📥 Importar operaciones antiguas</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {!done ? (
          <div style={{ padding: '20px 24px' }}>
            {/* Instrucciones */}
            <div style={{
              background: 'rgba(56,216,245,0.08)', border: '1px solid rgba(56,216,245,0.2)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13,
              color: 'rgba(255,255,255,0.7)', lineHeight: 1.6
            }}>
              <strong style={{ color: '#38d8f5' }}>Cómo usar:</strong> Usa otra IA con el prompt de extracción,
              pégale tus screenshots o historial del broker, y copia aquí el JSON que te devuelva.
            </div>

            {/* Textarea */}
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setPreview(null); setError(null) }}
              placeholder={'Pega aquí el JSON de la otra IA...\n\n[\n  {\n    "crypto": "BTCUSDT",\n    "type": "LONG",\n    ...\n  }\n]'}
              style={{
                width: '100%', minHeight: 180, padding: '12px 14px',
                background: 'rgba(8,9,14,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#FAFAFA', fontSize: 13,
                fontFamily: 'Space Mono, monospace', resize: 'vertical',
                outline: 'none', boxSizing: 'border-box', lineHeight: 1.5
              }}
            />

            {error && (
              <div style={{
                marginTop: 10, padding: '10px 14px', borderRadius: 8,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444', fontSize: 13
              }}>⚠ {error}</div>
            )}

            {/* Botón parsear */}
            {!preview && (
              <button
                onClick={handleParse}
                disabled={!text.trim()}
                style={{
                  marginTop: 14, padding: '10px 24px', borderRadius: 8, fontSize: 14,
                  fontWeight: 600, background: text.trim() ? '#38d8f5' : 'rgba(255,255,255,0.1)',
                  color: text.trim() ? '#0a0e1a' : 'rgba(255,255,255,0.3)',
                  border: 'none', cursor: text.trim() ? 'pointer' : 'default'
                }}
              >
                Analizar JSON
              </button>
            )}

            {/* Preview de operaciones */}
            {preview && (
              <div style={{ marginTop: 16 }}>
                <div style={{ color: '#22c55e', fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
                  ✓ {preview.length} operación{preview.length !== 1 ? 'es' : ''} detectada{preview.length !== 1 ? 's' : ''}
                </div>

                <div style={{
                  maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6
                }}>
                  {preview.map((t, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'rgba(28,29,34,0.8)', borderRadius: 8,
                      padding: '8px 12px', fontSize: 13,
                      borderLeft: `3px solid ${t.type === 'LONG' ? '#22c55e' : '#ef4444'}`
                    }}>
                      <span style={{ fontWeight: 700, color: '#FAFAFA', minWidth: 50 }}>{t.crypto}</span>
                      <span style={{ color: t.type === 'LONG' ? '#22c55e' : '#ef4444', minWidth: 42, fontSize: 11, fontWeight: 700 }}>{t.type}</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{t.date}</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>→ {t.closeDate || 'abierta'}</span>
                      {t.result && (
                        <span style={{ color: resultColor[t.result] || '#FAFAFA', fontSize: 11, fontWeight: 700 }}>{t.result}</span>
                      )}
                      {t.pnl != null && (
                        <span style={{ color: t.pnl >= 0 ? '#22c55e' : '#ef4444', marginLeft: 'auto', fontWeight: 700 }}>
                          {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)} USDT
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    onClick={() => { setPreview(null); setError(null) }}
                    style={{
                      padding: '10px 20px', borderRadius: 8, fontSize: 14,
                      background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
                    }}
                  >
                    ← Editar
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    style={{
                      padding: '10px 28px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      color: '#fff', border: 'none', cursor: importing ? 'default' : 'pointer',
                      opacity: importing ? 0.7 : 1
                    }}
                  >
                    {importing ? 'Importando...' : `✓ Importar ${preview.length} operaciones`}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ color: '#22c55e', fontSize: 20, margin: '0 0 8px' }}>
              {preview?.length} operaciones importadas
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 24px' }}>
              Ya aparecen en tu historial y estadísticas.
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '10px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: '#38d8f5', color: '#0a0e1a', border: 'none', cursor: 'pointer'
              }}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
