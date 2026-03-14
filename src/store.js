import { LS_KEYS } from './constants.js'

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
  getApiKey() {
    return localStorage.getItem(LS_KEYS.API_KEY) || ''
  },
  saveApiKey(key) {
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
  }
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// Auto-seed: load demo data if no trades exist
export async function seedIfEmpty() {
  const existing = store.getTrades()
  if (existing.length > 0) return false
  
  try {
    const base = import.meta.env.BASE_URL || '/'
    const resp = await fetch(`${base}seed-data.json`)
    if (!resp.ok) return false
    const data = await resp.json()
    
    if (data.trades && data.trades.length > 0) {
      // Assign unique IDs
      const trades = data.trades.map(t => ({ ...t, id: uid() }))
      store.saveTrades(trades)
    }
    if (data.caps) {
      store.saveCaps(data.caps)
    }
    return true
  } catch (e) {
    console.log('No seed data found:', e)
    return false
  }
}
