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
