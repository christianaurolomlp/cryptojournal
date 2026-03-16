import { MONTHS_ES } from './constants.js'

export function formatMoney(value, decimals = 2) {
  if (value === null || value === undefined) return '—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : value > 0 ? '+' : ''
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`
  return `${sign}$${abs.toFixed(decimals)}`
}

export function formatMoneyPlain(value, decimals = 2) {
  if (value === null || value === undefined) return '—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  return `${sign}$${abs.toFixed(decimals)}`
}

export function formatPct(value, decimals = 1) {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function monthKey(date) {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function monthLabel(key) {
  const [y, m] = key.split('-')
  return `${MONTHS_ES[parseInt(m) - 1]} ${y}`
}

export function currentMonthKey() {
  return monthKey(new Date())
}

export function tradesForMonth(trades, key) {
  return trades.filter(t => t.date && t.date.startsWith(key))
}

export function calcStats(trades, capital) {
  const closed = trades.filter(t => t.closed && t.result && t.pnl !== null)
  const total = trades.length
  const totalClosed = closed.length
  const wins = closed.filter(t => t.result === 'WIN').length
  const losses = closed.filter(t => t.result === 'LOSS').length
  const be = closed.filter(t => t.result === 'BE').length
  const winLossClosed = wins + losses  // excluye BE del winrate
  const winRate = winLossClosed > 0 ? (wins / winLossClosed) * 100 : 0
  const pnl = closed.reduce((acc, t) => acc + (t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl), 0)
  
  const winPnls = closed.filter(t => t.result === 'WIN').map(t => t.pnl)
  const lossPnls = closed.filter(t => t.result === 'LOSS').map(t => Math.abs(t.pnl))
  
  const avgWin = winPnls.length > 0 ? winPnls.reduce((a, b) => a + b, 0) / winPnls.length : 0
  const avgLoss = lossPnls.length > 0 ? lossPnls.reduce((a, b) => a + b, 0) / lossPnls.length : 0
  
  const grossProfit = winPnls.reduce((a, b) => a + b, 0)
  const grossLoss = lossPnls.reduce((a, b) => a + b, 0)
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
  
  const bestTrade = closed.length > 0
    ? Math.max(...closed.map(t => t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl))
    : null
  const worstTrade = closed.length > 0
    ? Math.min(...closed.map(t => t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl))
    : null

  // Streaks
  let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0
  for (const t of closed) {
    if (t.result === 'WIN') { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin) }
    else if (t.result === 'LOSS') { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss) }
    else { curWin = 0; curLoss = 0 }
  }

  const rentPct = capital > 0 ? (pnl / capital) * 100 : 0
  const capitalFinal = capital > 0 ? capital + pnl : null

  // Long vs Short
  const longs = closed.filter(t => t.type === 'LONG')
  const shorts = closed.filter(t => t.type === 'SHORT')
  const longWins = longs.filter(t => t.result === 'WIN').length
  const shortWins = shorts.filter(t => t.result === 'WIN').length
  const longPnl = longs.reduce((a, t) => a + (t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl), 0)
  const shortPnl = shorts.reduce((a, t) => a + (t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl), 0)

  return {
    total, totalClosed, wins, losses, be,
    winRate, pnl, avgWin, avgLoss, profitFactor,
    bestTrade, worstTrade, maxWinStreak, maxLossStreak,
    rentPct, capitalFinal,
    longs: { count: longs.length, wins: longWins, pnl: longPnl, winRate: (() => { const ll = longs.filter(t => t.result !== 'BE').length; return ll > 0 ? (longWins / ll) * 100 : 0 })() },
    shorts: { count: shorts.length, wins: shortWins, pnl: shortPnl, winRate: (() => { const sl = shorts.filter(t => t.result !== 'BE').length; return sl > 0 ? (shortWins / sl) * 100 : 0 })() }
  }
}

export function calcStatsByTf(trades) {
  const closed = trades.filter(t => t.closed && t.result && t.pnl !== null)
  const tfMap = {}
  for (const t of closed) {
    const tf = t.tf || t.timeframe || 'Sin TF'
    if (!tfMap[tf]) tfMap[tf] = { ops: 0, wins: 0, losses: 0, be: 0, pnl: 0, best: -Infinity, worst: Infinity }
    const entry = tfMap[tf]
    const pnlVal = t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl
    entry.ops++
    if (t.result === 'WIN') entry.wins++
    else if (t.result === 'LOSS') entry.losses++
    else entry.be++
    entry.pnl += pnlVal
    if (pnlVal > entry.best) entry.best = pnlVal
    if (pnlVal < entry.worst) entry.worst = pnlVal
  }
  return Object.entries(tfMap)
    .map(([tf, d]) => {
      const winLoss = d.wins + d.losses
      return {
        tf,
        ops: d.ops,
        winRate: winLoss > 0 ? (d.wins / winLoss) * 100 : 0,
        pnl: d.pnl,
        best: d.best === -Infinity ? null : d.best,
        worst: d.worst === Infinity ? null : d.worst
      }
    })
    .sort((a, b) => b.pnl - a.pnl)
}

export function equityPoints(trades) {
  const sorted = [...trades]
    .filter(t => t.closed && t.result && t.pnl !== null)
    .sort((a, b) => new Date(a.closeDate || a.date) - new Date(b.closeDate || b.date))
  
  let cum = 0
  const points = [{ x: 0, y: 0, cum: 0 }]
  sorted.forEach((t, i) => {
    cum += t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl
    points.push({ x: i + 1, y: cum, cum, trade: t })
  })
  return points
}

export function pnlForDay(trades, dateStr) {
  const closed = trades.filter(t => t.closed && (t.closeDate || t.date) === dateStr && t.pnl !== null)
  if (closed.length === 0) return null
  return closed.reduce((a, t) => a + (t.result === 'LOSS' ? -Math.abs(t.pnl) : t.pnl), 0)
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfMonth(year, month) {
  // 0=Sunday → convert to Mon-first (0=Mon...6=Sun)
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export function prevMonth(key) {
  const [y, m] = key.split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
}

export function nextMonth(key) {
  const [y, m] = key.split('-').map(Number)
  if (m === 12) return `${y + 1}-01`
  return `${y}-${String(m + 1).padStart(2, '0')}`
}
