import { LS_KEYS } from './constants.js'

// ── API Configuration ────────────────────────────────────────────────────────
const DEFAULT_API_URL = 'https://cryptojournal-api-production.up.railway.app'
const DEFAULT_API_KEY = '86556ca1c637eeb0f85e5b9fc0443b54c0c2807642da66ae8fe30bdab91fdf49'

function getApiConfig() {
  return {
    url: localStorage.getItem('cj_api_url') || DEFAULT_API_URL,
    key: localStorage.getItem('cj_api_key') || DEFAULT_API_KEY
  }
}

export function saveApiConfig(url, key) {
  localStorage.setItem('cj_api_url', url)
  localStorage.setItem('cj_api_key', key)
}

export function isApiConfigured() {
  const { key } = getApiConfig()
  return !!key
}

async function apiFetch(path, options = {}) {
  const { url, key } = getApiConfig()
  if (!key) throw new Error('API key not configured')
  
  const resp = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      ...(options.headers || {})
    }
  })
  
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }))
    throw new Error(err.error || `HTTP ${resp.status}`)
  }
  
  return resp.json()
}

// ── API Store (remote) ───────────────────────────────────────────────────────
export const apiStore = {
  async getTrades() {
    try {
      return await apiFetch('/api/trades')
    } catch (err) {
      console.error('API getTrades error:', err)
      return null // null = API error, fallback to local
    }
  },

  async saveTrade(trade) {
    const { id, ...data } = trade
    await apiFetch(`/api/trades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(trade)
    })
  },

  async deleteTrade(id) {
    await apiFetch(`/api/trades/${id}`, { method: 'DELETE' })
  },

  async bulkImport(trades) {
    await apiFetch('/api/trades/bulk', {
      method: 'POST',
      body: JSON.stringify({ trades })
    })
  },

  async getCaps() {
    try {
      const resp = await apiFetch('/api/settings/caps')
      return resp.value || {}
    } catch {
      return null
    }
  },

  async saveCaps(caps) {
    await apiFetch('/api/settings/caps', {
      method: 'PUT',
      body: JSON.stringify({ value: caps })
    })
  }
}

// ── Local Store (localStorage fallback) ──────────────────────────────────────
export const store = {
  getTrades() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEYS.TRADES) || '[]')
    } catch {
      return []
    }
  },
  saveTrades(trades) {
    localStorage.setItem(LS_KEYS.TRADES, JSON.stringify(trades))
  },
  getCaps() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEYS.CAPS) || '{}')
    } catch {
      return {}
    }
  },
  saveCaps(caps) {
    localStorage.setItem(LS_KEYS.CAPS, JSON.stringify(caps))
  },
  getAnthropicKey() {
    return localStorage.getItem(LS_KEYS.API_KEY) || ''
  },
  saveAnthropicKey(key) {
    localStorage.setItem(LS_KEYS.API_KEY, key)
  },
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEYS.SETTINGS) || '{}')
    } catch {
      return {}
    }
  },
  saveSettings(settings) {
    localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings))
  },
  hasLocalTrades() {
    try {
      const trades = JSON.parse(localStorage.getItem(LS_KEYS.TRADES) || '[]')
      return trades.length > 0
    } catch {
      return false
    }
  },
  clearLocalTrades() {
    localStorage.removeItem(LS_KEYS.TRADES)
    localStorage.removeItem(LS_KEYS.CAPS)
  }
}

// Keep backward compat aliases
store.getApiKey = store.getAnthropicKey
store.saveApiKey = store.saveAnthropicKey

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// Auto-seed: load demo data if no trades exist
export async function seedIfEmpty() {
  // If API is configured, check remote first
  if (isApiConfigured()) {
    const remoteTrades = await apiStore.getTrades()
    if (remoteTrades && remoteTrades.length > 0) return false
  }

  const existing = store.getTrades()
  if (existing.length > 0) return false
  
  try {
    const base = import.meta.env.BASE_URL || '/'
    const resp = await fetch(`${base}seed-data.json`)
    if (!resp.ok) return false
    const data = await resp.json()
    
    if (data.trades && data.trades.length > 0) {
      const trades = data.trades.map(t => ({ ...t, id: uid() }))
      store.saveTrades(trades)
      // Also push to API if configured
      if (isApiConfigured()) {
        try { await apiStore.bulkImport(trades) } catch {}
      }
    }
    if (data.caps) {
      store.saveCaps(data.caps)
      if (isApiConfigured()) {
        try { await apiStore.saveCaps(data.caps) } catch {}
      }
    }
    return true
  } catch (e) {
    console.log('No seed data found:', e)
    return false
  }
}
