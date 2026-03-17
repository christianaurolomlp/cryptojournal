import { useState } from 'react'
import { MONTHS_ES } from '../constants.js'
import { store, saveApiConfig, isApiConfigured, apiStore } from '../store.js'
import { monthLabel, currentMonthKey } from '../utils.js'

export default function Settings({ caps, onCapsChange, anthropicKey, onAnthropicKeyChange, onDataReload }) {
  const [keyInput, setKeyInput] = useState(anthropicKey)
  const [keyVisible, setKeyVisible] = useState(false)
  const [editingMonth, setEditingMonth] = useState(null)
  const [capInput, setCapInput] = useState('')
  const [saved, setSaved] = useState(false)

  // Backend API config
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('cj_api_url') || 'https://cryptojournal-api-production.up.railway.app')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('cj_api_key') || '')
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [apiSaved, setApiSaved] = useState(false)
  const [apiTesting, setApiTesting] = useState(false)
  const [apiStatus, setApiStatus] = useState(isApiConfigured() ? 'connected' : 'disconnected')

  const cur = currentMonthKey()

  // Show last 12 months + next 2
  const months = []
  for (let i = -11; i <= 2; i++) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push(key)
  }

  function saveAnthropicKey() {
    onAnthropicKeyChange(keyInput)
    store.saveAnthropicKey(keyInput)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveBackendConfig() {
    saveApiConfig(apiUrl, apiKey)
    setApiTesting(true)
    setApiStatus('testing')
    try {
      const resp = await fetch(`${apiUrl}/health`)
      if (resp.ok) {
        setApiStatus('connected')
        setApiSaved(true)
        setTimeout(() => setApiSaved(false), 2000)
        // Reload data from backend
        if (onDataReload) onDataReload()
      } else {
        setApiStatus('error')
      }
    } catch {
      setApiStatus('error')
    }
    setApiTesting(false)
  }

  function disconnectBackend() {
    localStorage.removeItem('cj_api_url')
    localStorage.removeItem('cj_api_key')
    setApiKey('')
    setApiStatus('disconnected')
    if (onDataReload) onDataReload()
  }

  function startEditCap(key) {
    setEditingMonth(key)
    setCapInput(caps[key] ? String(caps[key]) : '')
  }

  function saveCap(key) {
    const val = parseFloat(capInput)
    const newCaps = { ...caps }
    if (!isNaN(val) && val > 0) {
      newCaps[key] = val
    } else {
      delete newCaps[key]
    }
    onCapsChange(newCaps)
  }

  function clearAllData() {
    if (window.confirm('¿Estás seguro? Esto eliminará TODAS las operaciones y configuración. Esta acción no se puede deshacer.')) {
      localStorage.clear()
      window.location.reload()
    }
  }

  function exportData() {
    const data = {
      trades: store.getTrades(),
      caps: store.getCaps(),
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cryptojournal-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (isApiConfigured() && data.trades) {
          // Import to API
          await apiStore.bulkImport(data.trades)
          if (data.caps) await apiStore.saveCaps(data.caps)
          alert('Datos importados al servidor. Recargando...')
        } else {
          if (data.trades) store.saveTrades(data.trades)
          if (data.caps) store.saveCaps(data.caps)
          alert('Datos importados correctamente. Recargando...')
        }
        window.location.reload()
      } catch {
        alert('Error al importar: archivo inválido')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const statusColors = {
    connected: 'var(--green)',
    disconnected: 'var(--text3)',
    testing: 'var(--yellow)',
    error: 'var(--red)'
  }
  const statusLabels = {
    connected: '✓ Conectado',
    disconnected: 'Sin conectar',
    testing: 'Probando...',
    error: '✗ Error de conexión'
  }

  return (
    <div className="page">
      <h1 className="page-title">Configuración</h1>

      {/* Backend API */}
      <div className="settings-section">
        <div className="settings-section-header">
          Base de Datos (Backend)
          <span style={{ marginLeft: 8, fontSize: 12, color: statusColors[apiStatus] }}>
            {statusLabels[apiStatus]}
          </span>
        </div>
        <div className="settings-body">
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
            Conecta con el servidor para guardar tus datos de forma segura en la nube. Sin conexión, se usa localStorage.
          </p>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label" style={{ fontSize: 12 }}>URL del servidor</label>
            <input
              className="form-control"
              type="text"
              placeholder="https://cryptojournal-api-production.up.railway.app"
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label" style={{ fontSize: 12 }}>API Key</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-control"
                type={apiKeyVisible ? 'text' : 'password'}
                placeholder="Tu API key del servidor..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-ghost" onClick={() => setApiKeyVisible(v => !v)}>
                {apiKeyVisible ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={saveBackendConfig} disabled={apiTesting}>
              {apiSaved ? '✓ Conectado' : apiTesting ? 'Probando...' : 'Conectar'}
            </button>
            {isApiConfigured() && (
              <button className="btn btn-ghost" onClick={disconnectBackend}>
                Desconectar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Anthropic API Key */}
      <div className="settings-section">
        <div className="settings-section-header">API de Anthropic (Comandos de Voz)</div>
        <div className="settings-body">
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
            Necesaria para procesar comandos de voz con IA. Obtén tu key en <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: 'var(--indigo-hover)' }}>console.anthropic.com</a>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-control"
              type={keyVisible ? 'text' : 'password'}
              placeholder="sk-ant-..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-ghost" onClick={() => setKeyVisible(v => !v)}>
              {keyVisible ? '🙈' : '👁'}
            </button>
            <button className="btn btn-primary" onClick={saveAnthropicKey}>
              {saved ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>
          {anthropicKey && (
            <div className="alert alert-success" style={{ marginTop: 10, marginBottom: 0 }}>
              ✓ API key configurada
            </div>
          )}
        </div>
      </div>

      {/* Capital mensual */}
      <div className="settings-section">
        <div className="settings-section-header">Capital Mensual</div>
        <div className="settings-body">
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
            Define el capital inicial de cada mes para calcular rentabilidad y riesgo en dólares.
          </p>
          <div className="capital-months">
            {months.map(key => (
              <div key={key} className="capital-month-row">
                <span className="capital-month-label">{monthLabel(key)}</span>
                {editingMonth === key ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="10000"
                      value={capInput}
                      onChange={e => setCapInput(e.target.value)}
                      style={{ width: 120, padding: '4px 8px' }}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveCap(key)
                        if (e.key === 'Escape') setEditingMonth(null)
                      }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => saveCap(key)}>✓</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingMonth(null)}>✕</button>
                  </div>
                ) : (
                  <span className="capital-month-val" onClick={() => startEditCap(key)}>
                    {caps[key] ? `$${caps[key].toLocaleString('es-ES')}` : <span style={{ color: 'var(--text3)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Sin definir — click para editar</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="settings-section">
        <div className="settings-section-header">Datos</div>
        <div className="settings-body">
          <div className="settings-row">
            <div>
              <div className="settings-label">Exportar datos</div>
              <div className="settings-sub">Descarga todas tus operaciones en formato JSON</div>
            </div>
            <button className="btn btn-ghost" onClick={exportData}>
              ↓ Exportar
            </button>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Importar datos</div>
              <div className="settings-sub">Restaura desde un backup JSON anterior</div>
            </div>
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
              ↑ Importar
              <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
            </label>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label" style={{ color: 'var(--red)' }}>Eliminar todos los datos</div>
              <div className="settings-sub">Borra todo de localStorage. Irreversible.</div>
            </div>
            <button className="btn btn-danger" onClick={clearAllData}>
              ✕ Borrar todo
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="settings-section">
        <div className="settings-section-header">Acerca de</div>
        <div className="settings-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--indigo), var(--purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
            }}>₿</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>MLP Diario de Trading</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                v1.1 · Diario de Trading Cripto · {isApiConfigured() ? 'Datos en la nube ☁️' : 'Datos locales en tu navegador'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
