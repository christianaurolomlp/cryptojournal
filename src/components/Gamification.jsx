import React, { useMemo, useState, useCallback, useEffect } from 'react'
import ReactDOM from 'react-dom'
// Gamification system — XP, Badges, Streak Calendar

// Niveles de progresión del trader — simples, motivadores, sin rangos navales
const LEVELS = [
  { name: 'Nivel 1 · Novato',    min: 0,     max: 500,      color: '#6B7280', icon: '🌱' },
  { name: 'Nivel 2 · Aprendiz',  min: 500,   max: 1500,     color: '#10B981', icon: '📈' },
  { name: 'Nivel 3 · Operador',  min: 1500,  max: 3500,     color: '#1278B7', icon: '🎯' },
  { name: 'Nivel 4 · Trader',    min: 3500,  max: 7000,     color: '#1278B7', icon: '💹' },
  { name: 'Nivel 5 · Experto',   min: 7000,  max: 12000,    color: '#F59E0B', icon: '🏆' },
  { name: 'Nivel 6 · Élite',     min: 12000, max: Infinity, color: '#EC4899', icon: '💎' },
]

function calcXP(trades) {
  return trades.reduce((sum, t) => {
    if (!t.closed) return sum
    if (t.result === 'WIN')  return sum + 100
    if (t.result === 'BE')   return sum + 50
    return sum + 25
  }, 0)
}

export function XPBar({ trades }) {
  const xp = calcXP(trades)
  const level = [...LEVELS].reverse().find(l => xp >= l.min) || LEVELS[0]
  const pct = level.max === Infinity
    ? 100
    : Math.min(100, ((xp - level.min) / (level.max - level.min)) * 100)

  return (
    <div className="xp-bar-container">
      <div className="xp-header">
        <span className="xp-level" style={{ color: level.color }}>
          {level.icon} {level.name}
        </span>
        <span className="xp-points">{xp.toLocaleString()} XP</span>
      </div>
      <div className="xp-track">
        <div
          className="xp-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${level.color}, ${level.color}88)`,
            boxShadow: `0 0 10px ${level.color}60`,
          }}
        />
      </div>
      {level.max !== Infinity && (
        <div className="xp-next">Próximo: {level.max.toLocaleString()} XP</div>
      )}
    </div>
  )
}

// ─── Badges ──────────────────────────────────────────────────────────────────

const SCALPER_TFS  = ['1', '3', '5', '15']
const DAYTRADER_TFS = ['60', '1h', '240', '4h']
const SWING_TFS    = ['D', '1d', 'W', '1w', 'M', '1M']

const ALL_BADGES = [
  // ── Milestone
  {
    id: 'first', name: 'First Trade', emoji: '⚓', color: '#6B7280',
    desc: 'Registra tu primer trade',
    achieved: '¡Lo conseguiste! Registraste tu primer trade en el diario.',
    req: t => t.length >= 1,
  },
  {
    id: 'diamond', name: 'Veterano', emoji: '💎', color: '#1278B7',
    desc: 'Llega a 25 trades cerrados',
    achieved: '25 trades cerrados registrados. Ya tienes datos reales con los que trabajar.',
    req: t => t.filter(x => x.closed).length >= 25,
  },
  {
    id: 'prolific', name: 'Incansable', emoji: '📈', color: '#F59E0B',
    desc: 'Llega a 50 trades cerrados',
    achieved: '50 trades cerrados. Tu muestra estadística empieza a ser sólida.',
    req: t => t.filter(x => x.closed).length >= 50,
  },
  {
    id: 'centurion', name: 'Leyenda', emoji: '🏆', color: '#EC4899',
    desc: 'Llega a 100 trades cerrados',
    achieved: '100 trades cerrados. Eres de los pocos que llegan aquí con datos reales.',
    req: t => t.filter(x => x.closed).length >= 100,
  },

  // ── Performance
  {
    id: 'fire', name: 'On Fire', emoji: '🔥', color: '#F59E0B',
    desc: 'Consigue 5 wins en el mismo mes',
    achieved: '5 wins en un mes. El mercado está respondiendo a tu análisis.',
    req: t => {
      const byMonth = {}
      t.filter(x => x.closed && x.result === 'WIN').forEach(x => {
        const m = (x.closeDate || x.date || '').slice(0, 7)
        if (m) byMonth[m] = (byMonth[m] || 0) + 1
      })
      return Object.values(byMonth).some(v => v >= 5)
    },
  },
  {
    id: 'sniper', name: 'Sniper', emoji: '🎯', color: '#10B981',
    desc: 'Encadena 5 wins consecutivos',
    achieved: '5 wins seguidos. Tu proceso está alineado con el mercado.',
    req: t => {
      let s = 0, m = 0
      t.filter(x => x.closed)
        .slice()
        .sort((a, b) => new Date(a.closeDate || a.date) - new Date(b.closeDate || b.date))
        .forEach(x => { x.result === 'WIN' ? (m = Math.max(m, ++s)) : (s = 0) })
      return m >= 5
    },
  },

  // ── Estilo de trading
  {
    id: 'scalper', name: 'Scalper', emoji: '⚡', color: '#22c55e',
    desc: 'Opera 5 trades en TF cortos (1m–15m)',
    achieved: 'Más de 5 trades en TF de 1m a 15m. Dominas los movimientos rápidos.',
    req: t => t.filter(x => x.closed && SCALPER_TFS.includes(String(x.tf))).length >= 5,
  },
  {
    id: 'daytrader', name: 'Day Trader', emoji: '📊', color: '#1278B7',
    desc: 'Opera 5 trades en TF 1h o 4h',
    achieved: 'Más de 5 trades en 1h/4h. Tu estilo es el intradía con contexto.',
    req: t => t.filter(x => x.closed && DAYTRADER_TFS.includes(String(x.tf))).length >= 5,
  },
  {
    id: 'swing', name: 'Swing Trader', emoji: '🌊', color: '#38d8f5',
    desc: 'Opera 3 trades en TF 1d o superior',
    achieved: 'Más de 3 trades en diario o superior. Juegas a grande y con paciencia.',
    req: t => t.filter(x => x.closed && SWING_TFS.includes(String(x.tf))).length >= 3,
  },
]

// ── Naval Shield Badges ──
function Shield_first({unlocked}) {
  return (
    <svg width='56' height='64' viewBox='0 0 90 104' style={{opacity:unlocked?1:0.3}} xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient id='sgfirst' x1='30%' y1='0%' x2='70%' y2='100%'>
          <stop offset='0%' stopColor='#5BA4FF'/>
          <stop offset='50%' stopColor='#1C77FF'/>
          <stop offset='100%' stopColor='#0a3a8c'/>
        </linearGradient>
        <linearGradient id='shfirst' x1='0%' y1='0%' x2='40%' y2='70%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.35)'/>
          <stop offset='100%' stopColor='rgba(255,255,255,0)'/>
        </linearGradient>
        <filter id='gffirst'><feDropShadow dx='0' dy='2' stdDeviation='3' floodColor='#0a3a8c' floodOpacity='0.7'/></filter>
      </defs>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='#1C77FF' opacity='0.25' transform='scale(1.07) translate(-3,-2)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#sgfirst)' filter='url(#gffirst)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#shfirst)'/>
      <path d='M45 10 L81 22 L81 54 C81 71 64 86 45 95 C26 86 9 71 9 54 L9 22 Z' fill='none' stroke='rgba(255,255,255,0.2)' strokeWidth='1.5'/>
      <g transform='translate(18,22)'>
        <svg viewBox='0 0 512 512' width='54' height='54'><path fill="white" d="M90.53 23c-18.345 0-36.688 7.002-50.686 21-27.996 27.996-27.994 73.38 0 101.375 21.776 21.776 54.08 26.603 80.53 14.5l53.69 53.688c-21.425 19.696-44 38.257-67.44 55.937l30.126 30.125c18.734-22.545 37.953-44.474 57.844-65.53l169.594 169.593c-51.845 40.444-120.866 53.838-192.813 42.562L173 424.906 72.47 404.47l95.405 88.405 1.97-26c86.593 36.97 177.603 34.61 241.343-11.75l63.062 21.313-21.47-63.594c44.61-63.62 46.408-153.412 9.908-238.875l26.03-1.97-88.406-95.375 20.438 100.53 21.344-1.624c11.278 71.983-2.168 141.017-42.656 192.876l-169.782-169.75c21.075-20.34 42.93-39.665 65.78-57.72l-30.123-30.124c-17.015 24.154-35.673 46.66-55.688 67.813l-53.97-53.97C167.834 98.183 163.032 65.814 141.22 44c-14-13.998-32.343-21-50.69-21zm0 27.03c11.434.002 22.872 4.34 31.595 13.064 17.447 17.447 17.446 45.742 0 63.187-17.446 17.447-45.71 17.447-63.156 0-17.447-17.444-17.448-45.74 0-63.186C67.69 54.37 79.097 50.03 90.53 50.03z"/></svg>
      </g>
    </svg>
  )
}

function Shield_diamond({unlocked}) {
  return (
    <svg width='56' height='64' viewBox='0 0 90 104' style={{opacity:unlocked?1:0.3}} xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient id='sgdiamond' x1='30%' y1='0%' x2='70%' y2='100%'>
          <stop offset='0%' stopColor='#4ade80'/>
          <stop offset='50%' stopColor='#22c55e'/>
          <stop offset='100%' stopColor='#14532d'/>
        </linearGradient>
        <linearGradient id='shdiamond' x1='0%' y1='0%' x2='40%' y2='70%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.35)'/>
          <stop offset='100%' stopColor='rgba(255,255,255,0)'/>
        </linearGradient>
        <filter id='gfdiamond'><feDropShadow dx='0' dy='2' stdDeviation='3' floodColor='#14532d' floodOpacity='0.7'/></filter>
      </defs>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='#22c55e' opacity='0.25' transform='scale(1.07) translate(-3,-2)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#sgdiamond)' filter='url(#gfdiamond)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#shdiamond)'/>
      <path d='M45 10 L81 22 L81 54 C81 71 64 86 45 95 C26 86 9 71 9 54 L9 22 Z' fill='none' stroke='rgba(255,255,255,0.2)' strokeWidth='1.5'/>
      <g transform='translate(18,22)'>
        <svg viewBox='0 0 512 512' width='54' height='54'><path fill="white" d="m203.97 23-18.032 4.844 11.656 43.468c-25.837 8.076-50.32 21.653-71.594 40.75L94.53 80.594l-13.218 13.22 31.376 31.374c-19.467 21.125-33.414 45.53-41.813 71.343l-42.313-11.343-4.843 18.063 42.25 11.313c-6.057 27.3-6.157 55.656-.345 83L23.72 308.78l4.843 18.064 41.812-11.22a193.261 193.261 0 0 0 31.25 59.876l-29.97 52.688-16.81 29.593 29.56-16.842 52.657-29.97a193.306 193.306 0 0 0 60.094 31.407l-11.22 41.844 18.033 4.81 11.218-41.905a195.701 195.701 0 0 0 83-.375l11.312 42.28 18.063-4.81-11.344-42.376c25.812-8.4 50.217-22.315 71.342-41.78l31.375 31.373 13.22-13.218-31.47-31.47a193.26 193.26 0 0 0 40.72-71.563l43.53 11.657 4.813-18.063-43.625-11.686a195.693 195.693 0 0 0-.344-82.063l43.97-11.78-4.813-18.063L440.908 197c-6.73-20.866-17.08-40.79-31.032-58.844l29.97-52.656 16.842-29.563-29.593 16.844-52.656 29.97c-17.998-13.875-37.874-24.198-58.657-30.906l11.783-44L309.5 23l-11.78 43.97c-27-5.925-55.02-6.05-82.064-.376L203.97 23zm201.56 85L297.25 298.313l-.75.437-40.844-40.875-148.72 148.72-2.186 1.25 109.125-191.75 41.78 41.78L405.532 108zm-149.686 10.594c21.858 0 43.717 5.166 63.594 15.47l-116.625 66.342-2.22 1.28-1.28 2.22-66.25 116.406c-26.942-52.04-18.616-117.603 25.03-161.25 26.99-26.988 62.38-40.468 97.75-40.468zm122.72 74.594c26.994 52.054 18.67 117.672-25.002 161.343-43.66 43.662-109.263 52.005-161.312 25.033l116.438-66.282 2.25-1.25 1.25-2.25 66.375-116.592z"/></svg>
      </g>
    </svg>
  )
}

function Shield_prolific({unlocked}) {
  return (
    <svg width='56' height='64' viewBox='0 0 90 104' style={{opacity:unlocked?1:0.3}} xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient id='sgprolific' x1='30%' y1='0%' x2='70%' y2='100%'>
          <stop offset='0%' stopColor='#FCD34D'/>
          <stop offset='50%' stopColor='#F59E0B'/>
          <stop offset='100%' stopColor='#92400e'/>
        </linearGradient>
        <linearGradient id='shprolific' x1='0%' y1='0%' x2='40%' y2='70%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.35)'/>
          <stop offset='100%' stopColor='rgba(255,255,255,0)'/>
        </linearGradient>
        <filter id='gfprolific'><feDropShadow dx='0' dy='2' stdDeviation='3' floodColor='#92400e' floodOpacity='0.7'/></filter>
      </defs>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='#F59E0B' opacity='0.25' transform='scale(1.07) translate(-3,-2)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#sgprolific)' filter='url(#gfprolific)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#shprolific)'/>
      <path d='M45 10 L81 22 L81 54 C81 71 64 86 45 95 C26 86 9 71 9 54 L9 22 Z' fill='none' stroke='rgba(255,255,255,0.2)' strokeWidth='1.5'/>
      <g transform='translate(18,22)'>
        <svg viewBox='0 0 512 512' width='54' height='54'><path fill="white" d="M256 15.99c-8.8 0-16 14.33-16 32 0 8.47 1.7 16.59 4.7 22.57-4.7.21-9 1.16-13.7 2.43v15.85c17.1-2.42 34.1-2.31 50 0V72.99c-4.5-1.35-9.4-2.11-13.7-2.43 3-5.98 4.7-14.1 4.7-22.57 0-17.67-7.2-32-16-32zM86.23 86.28c-6.25 6.25-1.19 21.42 11.3 33.92 6.07 6 12.97 10.6 19.37 12.7-3.2 3.5-5.6 7.2-8 11.4l11.3 11.2c9.9-13.4 21.9-25.4 35.3-35.3l-11.2-11.3c-4.2 2.2-8 5.2-11.4 8-2.1-6.4-6.7-13.3-12.7-19.3-8-6.21-24.55-20.4-33.97-11.32zm305.57 11.3c-6 6.02-10.6 12.92-12.7 19.32-3.5-3.2-7.2-5.6-11.4-8l-11.2 11.3c13.4 9.9 25.4 21.9 35.3 35.3l11.3-11.2c-2.2-4.2-5.2-8-8-11.4 6.3-2.2 13.2-6.7 19.2-12.7 12.5-12.5 17.6-27.69 11.3-33.93-9.9-7.87-28 5.62-33.8 11.31zm-142.3 7.52c-36.8 1.6-70.2 16.3-95.6 39.6-3.3 3.1-6.6 6.3-9.2 9.2-23.3 25.4-38 58.8-39.6 95.7 0 4.5-.2 9.1.1 13 1.5 36.8 16.2 70.2 39.5 95.6 3.1 3.2 6.4 6.5 9.2 9.2 25.4 23.2 58.8 37.9 95.6 39.5h.2c4.1.2 8.7 0 12.8 0 36.8-1.6 70.2-16.3 95.6-39.6 3.3-3.1 6.6-6.3 9.2-9.2 23.3-25.4 38-58.8 39.6-95.6v-.2c.2-4.2 0-8.7 0-12.8-1.6-36.8-16.3-70.2-39.6-95.6-3.1-3.3-6.3-6.6-9.2-9.2-25.4-23.3-58.8-38-95.6-39.6-4.5-.2-9.1 0-13 0zm6.5 10.7c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm6.9 28.4c25.7 1.6 49.1 11.8 67.3 27.9 3.4 3.1 6.7 6.3 9.7 9.7 16.1 18.2 26.3 41.6 27.9 67.4.4 4.6 0 9.2 0 13.7-1.6 25.7-11.8 49.1-27.9 67.3-3.1 3.4-6.3 6.7-9.7 9.7-18.2 16.1-41.6 26.3-67.4 27.9-4.6.1-9.2.4-13.7 0-25.7-1.6-49.1-11.8-67.2-27.9h-.1c-3.4-3-6.6-6.3-9.6-9.7-16.1-18.1-26.4-41.5-28-67.3-.1-4.6-.4-9.1 0-13.6.5-25.8 13.3-50.5 27.9-67.5 3.1-3.4 6.3-6.7 9.7-9.7 18.2-16.1 41.6-26.3 67.4-27.9 4.6-.4 9.2 0 13.7 0zm-94.8 12.6c3.1 3.1 3.1 8.2 0 11.3-3.1 3.1-8.2 3.1-11.3 0-3.1-3.1-3.1-8.2 0-11.3 3.5-2.9 8.2-2.9 11.3 0zm187.1 0c3.1 3.1 3.1 8.2 0 11.3-3.1 3.1-8.2 3.1-11.3 0-3.1-3.1-3.1-8.2 0-11.3 3.5-2.9 8.2-2.9 11.3 0zM240 163.3v8.7c2.5 3.2 4.4 5.5 7.8 6.8-.7 12.4-1.6 25.1-2.8 37.7 7.4-1.9 15.2-2 22.1.1-1.2-12.7-2.2-25.4-2.9-37.9 7.9-2.1 7.8-8.6 7.8-15.4-11-1.7-21.8-1.6-32 0zm-38.3 15.8c-8.7 6.2-16.4 13.9-22.6 22.6l6.2 6.2c4 .5 7 .8 10.3-.7 8.3 9.3 16.6 18.9 24.7 28.7 3.7-6.5 9.1-11.9 15.7-15.6-9.9-8.1-19.5-16.4-28.8-24.7 1.8-3.1 1.3-6.7.7-10.3zm108.6 0-6.2 6.2c-.7 4-.8 6.9.6 10.3-9.2 8.3-18.9 16.6-28.7 24.7 6.5 3.7 11.9 9.1 15.6 15.7 8.1-9.9 16.5-19.5 24.7-28.8 3.2 1.7 6.7 1.3 10.3.7l6.2-6.2c-6.2-8.7-13.8-16.4-22.5-22.6zM423.1 231c2.5 17.1 2.3 34.1 0 50H439c1.5-4.5 2-9.4 2.3-13.7 6 3 14.2 4.7 22.7 4.7 17.7 0 32-7.2 32-16s-14.3-16-32-16c-8.5 0-16.7 1.7-22.7 4.7-.1-4.7-1-9-2.3-13.7zm-350.07.1c-1.35 4.5-2.11 9.2-2.4 13.6-6.02-3-14.15-4.6-22.6-4.6-17.67 0-32 7.2-32 16s14.33 16 32 16c8.48 0 16.61-1.7 22.6-4.7.15 4.7 1.12 9 2.4 13.7h15.8c-2.38-17.1-2.5-34.1 0-50zM256 233c-12.9 0-23 10.2-23 23s10.1 23 23 23c12.8 0 23-10.2 23-23s-10.2-23-23-23zm84 7c-3.2 2.5-5.5 4.4-6.8 7.8-12.4-.7-25.1-1.6-37.7-2.8 1.9 7.5 1.9 15.2 0 22.1 12.6-1.2 25.2-2.2 37.7-2.9 1 3.5 3.8 5.7 6.8 7.8h8.7c1.7-11 1.6-21.8 0-32zm-176.7.1c-1.7 10.9-1.5 21.8 0 32h8.7c3.1-2.5 5.6-4.3 6.7-7.8 12.5.6 25.1 1.6 37.8 2.8-2-7.5-2-15.2-.1-22.1-12.6 1.2-25.3 2.1-37.7 2.8-.9-3.5-3.8-5.7-6.7-7.7zm224.9 7.9c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm-264.4.1c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm167.9 28c-3.7 6.5-9.1 11.9-15.7 15.6 9.9 8.1 19.5 16.4 28.8 24.7-1.8 3.1-1.3 6.7-.7 10.3l6.2 6.2c8.7-6.2 16.4-13.9 22.6-22.6l-6.2-6.2c-4-.5-7-.8-10.3.7-8.3-9.3-16.6-18.9-24.7-28.7zm-71.4 0c-8.1 9.8-16.4 19.4-24.7 28.7-3.1-1.8-6.7-1.3-10.2-.7l-6.3 6.2c6.2 8.8 13.9 16.5 22.7 22.6l6.2-6.2c.5-4 .8-7-.7-10.3 9.3-8.3 18.9-16.6 28.7-24.7-6.5-3.7-12-9.1-15.7-15.6zm24.6 19.3c1.2 12.7 2.2 25.4 2.9 37.9-3.5.8-5.8 3.8-7.8 6.7v8.7c11 1.7 21.8 1.6 32 0V340c-2.5-3.2-4.4-5.5-7.8-6.8.7-12.4 1.6-25.1 2.8-37.7-7.7 1.3-15.8 1.7-22.1-.1zm-76.7 48.5c3.1 3.1 3.1 8.2 0 11.3-3.1 3.1-8.2 3.1-11.3 0-3.1-3.1-3.1-8.2 0-11.3 3.5-3 8.2-3 11.3 0zm187 0c3.1 3.1 3.1 8.2 0 11.3-3.1 3.1-8.2 3.1-11.3 0-3.1-3.1-3.1-8.2 0-11.3 3.5-3 8.3-3 11.3 0zm36.6 12.6c-9.9 13.4-21.9 25.4-35.3 35.3l11.2 11.3c4.2-2.2 8-5.2 11.4-8 2.1 6.4 6.7 13.3 12.7 19.3 12.5 12.5 27.6 17.5 33.9 11.3 6.2-6.3 1.2-21.4-11.3-33.9-6-6-12.9-10.6-19.3-12.7 3.2-3.5 5.6-7.2 8-11.4zm-271.6 0L109 367.7c2.3 4.1 5.1 8.2 8 11.4-6.4 2.1-13.3 6.7-19.37 12.7-12.47 12.5-17.52 27.6-11.3 33.9 6.24 6.3 21.47 1.2 33.97-11.3 6-6 10.6-12.9 12.7-19.3 3.5 3.2 7.2 5.6 11.4 8l11.2-11.2c-13.5-10-25.4-21.9-35.4-35.4zM256 380.2c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm-25 43V439c4.5 1.4 9.4 2.1 13.7 2.4-3 6-4.7 14.1-4.7 22.6 0 17.7 7.2 32 16 32s16-14.3 16-32c0-8.5-1.7-16.6-4.7-22.6 4.7-.2 9-1.1 13.7-2.4v-15.9c-17.1 2.5-34.1 2.4-50 .1z"/></svg>
      </g>
    </svg>
  )
}

function Shield_centurion({unlocked}) {
  return (
    <svg width='56' height='64' viewBox='0 0 90 104' style={{opacity:unlocked?1:0.3}} xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient id='sgcenturion' x1='30%' y1='0%' x2='70%' y2='100%'>
          <stop offset='0%' stopColor='#f87171'/>
          <stop offset='50%' stopColor='#ef4444'/>
          <stop offset='100%' stopColor='#7f1d1d'/>
        </linearGradient>
        <linearGradient id='shcenturion' x1='0%' y1='0%' x2='40%' y2='70%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.35)'/>
          <stop offset='100%' stopColor='rgba(255,255,255,0)'/>
        </linearGradient>
        <filter id='gfcenturion'><feDropShadow dx='0' dy='2' stdDeviation='3' floodColor='#7f1d1d' floodOpacity='0.7'/></filter>
      </defs>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='#ef4444' opacity='0.25' transform='scale(1.07) translate(-3,-2)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#sgcenturion)' filter='url(#gfcenturion)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#shcenturion)'/>
      <path d='M45 10 L81 22 L81 54 C81 71 64 86 45 95 C26 86 9 71 9 54 L9 22 Z' fill='none' stroke='rgba(255,255,255,0.2)' strokeWidth='1.5'/>
      <g transform='translate(18,22)'>
        <svg viewBox='0 0 512 512' width='54' height='54'><path fill="white" d="m142.373 116.285-15.92 9.79 19.223 31.257c-17.208 13.06-28.326 33.725-28.326 56.994 0 21.555 9.55 40.866 24.632 53.977l-71.76 92.16L20.66 379.69v17.828h71.834l73.588-95.78h8.22c-5.383 42.56 21.434 83.807 63.995 95.21 46.448 12.447 94.437-15.26 106.883-61.708a86.702 86.702 0 0 0 2.273-33.502h35.3v-30.61l109.858-7.968v-96.365l-286.655-21.91a71.608 71.608 0 0 0-17.094-2.072c-9.53 0-18.62 1.88-26.934 5.265l-19.553-31.793zM260.637 244.04a69.025 69.025 0 0 1 17.998 2.37c36.692 9.832 58.323 47.3 48.492 83.992-9.832 36.692-47.3 58.326-83.992 48.494-36.692-9.83-58.326-47.3-48.494-83.992 7.99-29.812 34.222-49.684 63.46-50.814.843-.033 1.69-.05 2.537-.05zm3.633 19.747-8.225 30.697-22.47-22.47-13.216 13.215 22.47 22.47-30.695 8.226 4.838 18.053 30.695-8.226-8.225 30.695 18.053 4.835 8.225-30.693 22.47 22.47 13.214-13.216-22.468-22.47 30.695-8.226-4.837-18.052-30.695 8.224 8.224-30.697-18.052-4.838z"/></svg>
      </g>
    </svg>
  )
}

function Shield_fire({unlocked}) {
  return (
    <svg width='56' height='64' viewBox='0 0 90 104' style={{opacity:unlocked?1:0.3}} xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient id='sgfire' x1='30%' y1='0%' x2='70%' y2='100%'>
          <stop offset='0%' stopColor='#fdba74'/>
          <stop offset='50%' stopColor='#f97316'/>
          <stop offset='100%' stopColor='#7c2d12'/>
        </linearGradient>
        <linearGradient id='shfire' x1='0%' y1='0%' x2='40%' y2='70%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.35)'/>
          <stop offset='100%' stopColor='rgba(255,255,255,0)'/>
        </linearGradient>
        <filter id='gffire'><feDropShadow dx='0' dy='2' stdDeviation='3' floodColor='#7c2d12' floodOpacity='0.7'/></filter>
      </defs>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='#f97316' opacity='0.25' transform='scale(1.07) translate(-3,-2)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#sgfire)' filter='url(#gffire)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#shfire)'/>
      <path d='M45 10 L81 22 L81 54 C81 71 64 86 45 95 C26 86 9 71 9 54 L9 22 Z' fill='none' stroke='rgba(255,255,255,0.2)' strokeWidth='1.5'/>
      <g transform='translate(18,22)'>
        <svg viewBox='0 0 512 512' width='54' height='54'><path fill="white" d="M108.938 32.188c-16.757.062-32.684 5.93-45.907 15.375-33.85 24.18-50.405 74.845-18.686 117.968C69.32 199.486 58.5 243.86 32.656 268.907L45.5 282.344c31.974-30.99 45.087-85.642 14-127.906-25.943-35.27-12.438-72.78 14.03-91.688 13.236-9.452 29.788-13.753 46.126-10.53 15.666 3.088 31.67 13.164 46.063 34.593l-59.095 34.218 24.125 41.876c-49.458 63.36-58.507 153.055-15.906 227.063 55.97 97.234 179.88 130.564 276.75 74.468 96.87-56.096 130.002-180.39 74.03-277.625-42.52-73.87-124.233-110.863-203.53-99.782L237.906 45l-56.03 32.47c-16.75-25.338-37.47-39.752-58.688-43.94a72.379 72.379 0 0 0-14.25-1.342zm147.625 95.03c93.497 43.5 111.52 101.61 74.718 169.25 33.92-18.19 48.58-45.006 34.314-83.968 32.75 21.997 50.043 65.77 49.312 113-.972 62.85-33.36 102.228-74.562 119.03 8.57-13.104 13.687-29.526 13.687-47.374 0-40.277-25.984-73.374-59.217-77.156 13.385 8.105 22.312 22.803 22.312 39.594 0 25.546-20.703 46.25-46.25 46.25-21.17 0-39.004-14.218-44.5-33.625a90.308 90.308 0 0 0-3.5 24.936c0 16.41 4.325 31.624 11.688 44.157-39.222-18.57-69.606-57.46-70.875-115.813-.993-45.67 16.568-75.766 56.718-97.75-15.158 28.373-9.246 61.335 6.906 75.125-10.62-69.398 94.788-106.956 29.25-175.594v-.06z"/></svg>
      </g>
    </svg>
  )
}

function Shield_sniper({unlocked}) {
  return (
    <svg width='56' height='64' viewBox='0 0 90 104' style={{opacity:unlocked?1:0.3}} xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient id='sgsniper' x1='30%' y1='0%' x2='70%' y2='100%'>
          <stop offset='0%' stopColor='#f9a8d4'/>
          <stop offset='50%' stopColor='#ec4899'/>
          <stop offset='100%' stopColor='#831843'/>
        </linearGradient>
        <linearGradient id='shsniper' x1='0%' y1='0%' x2='40%' y2='70%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.35)'/>
          <stop offset='100%' stopColor='rgba(255,255,255,0)'/>
        </linearGradient>
        <filter id='gfsniper'><feDropShadow dx='0' dy='2' stdDeviation='3' floodColor='#831843' floodOpacity='0.7'/></filter>
      </defs>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='#ec4899' opacity='0.25' transform='scale(1.07) translate(-3,-2)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#sgsniper)' filter='url(#gfsniper)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#shsniper)'/>
      <path d='M45 10 L81 22 L81 54 C81 71 64 86 45 95 C26 86 9 71 9 54 L9 22 Z' fill='none' stroke='rgba(255,255,255,0.2)' strokeWidth='1.5'/>
      <g transform='translate(18,22)'>
        <svg viewBox='0 0 512 512' width='54' height='54'><path fill="white" d="M27.48 25.695C37 62.802 51.945 100.233 69.07 137.86c17.496-31.598 41.214-52.96 71.563-70.473C102.823 50.575 65.097 36.27 27.48 25.695zm456.24 0c-37.62 10.575-75.347 24.88-113.156 41.692 30.35 17.514 54.067 38.875 71.563 70.472 17.125-37.627 32.07-75.058 41.592-112.165zm-367.1 81.315a146.074 146.074 0 0 0-10.224 10.117L232.12 242.85l10.257-10.243L116.62 107.01zm277.956 0L28.018 473.11l10.54 10.26L404.8 117.126a145.208 145.208 0 0 0-10.224-10.117zm-138.963 26.81c-24.338 0-47.014 7.245-65.998 19.682l13.494 13.477c15.33-9.19 33.285-14.472 52.503-14.472 19.214 0 37.16 5.28 52.483 14.465l13.492-13.477c-18.975-12.433-41.64-19.676-65.975-19.676zm-.004 45.08a75.11 75.11 0 0 0-32.967 7.588l14.246 14.23a57.163 57.163 0 0 1 18.72-3.138c6.56 0 12.848 1.11 18.702 3.13l14.25-14.228a75.09 75.09 0 0 0-32.953-7.582zm102.27 11.58-13.556 13.55c8.464 14.877 13.297 32.102 13.297 50.488 0 19.172-5.255 37.087-14.403 52.392l13.496 13.48c12.386-18.958 19.598-41.59 19.598-65.872 0-23.51-6.76-45.467-18.43-64.04zm-204.56 0c-11.677 18.573-18.443 40.527-18.443 64.038 0 24.282 7.217 46.912 19.61 65.87l13.493-13.478c-9.154-15.305-14.416-33.22-14.416-52.392 0-18.386 4.838-35.61 13.307-50.487l-13.55-13.55zm171.315 33.24-14.457 14.458a57.324 57.324 0 0 1 2.373 16.343 57.204 57.204 0 0 1-3.113 18.654l14.25 14.23a75.117 75.117 0 0 0 7.543-32.883c0-10.962-2.37-21.38-6.595-30.8zm-138.072.003a75.016 75.016 0 0 0-6.598 30.798 75.087 75.087 0 0 0 7.547 32.882l14.25-14.23a57.191 57.191 0 0 1-3.117-18.65c0-5.69.837-11.17 2.375-16.344l-14.458-14.455zm92.523 45.547-10.274 10.273 203.83 203.826 10.54-10.26-204.096-203.84zm-39.84 39.84-14.453 14.452a75.063 75.063 0 0 0 30.816 6.604 75.02 75.02 0 0 0 30.798-6.6l-14.453-14.453a57.27 57.27 0 0 1-16.346 2.375 57.26 57.26 0 0 1-16.364-2.38zM81.87 341.3l-68.024 68.026h51.588l68.11-68.025H81.872zm295.78 0 68.112 68.026h51.59L429.326 341.3H377.65zm-172.546 1.95-13.55 13.553c18.58 11.68 40.544 18.45 64.06 18.45 23.51 0 45.464-6.768 64.036-18.444l-13.55-13.552c-14.875 8.47-32.102 13.306-50.487 13.306-18.39 0-35.625-4.84-50.51-13.314zm-34.88 34.883-68.03 68.025.003 51.52 68.026-68.024v-51.52zm170.75 0v51.52L409 497.68l.002-51.52-68.027-68.025z"/></svg>
      </g>
    </svg>
  )
}

function Shield_scalper({unlocked}) {
  return (
    <svg width='56' height='64' viewBox='0 0 90 104' style={{opacity:unlocked?1:0.3}} xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient id='sgscalper' x1='30%' y1='0%' x2='70%' y2='100%'>
          <stop offset='0%' stopColor='#c084fc'/>
          <stop offset='50%' stopColor='#a855f7'/>
          <stop offset='100%' stopColor='#4c1d95'/>
        </linearGradient>
        <linearGradient id='shscalper' x1='0%' y1='0%' x2='40%' y2='70%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.35)'/>
          <stop offset='100%' stopColor='rgba(255,255,255,0)'/>
        </linearGradient>
        <filter id='gfscalper'><feDropShadow dx='0' dy='2' stdDeviation='3' floodColor='#4c1d95' floodOpacity='0.7'/></filter>
      </defs>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='#a855f7' opacity='0.25' transform='scale(1.07) translate(-3,-2)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#sgscalper)' filter='url(#gfscalper)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#shscalper)'/>
      <path d='M45 10 L81 22 L81 54 C81 71 64 86 45 95 C26 86 9 71 9 54 L9 22 Z' fill='none' stroke='rgba(255,255,255,0.2)' strokeWidth='1.5'/>
      <g transform='translate(18,22)'>
        <svg viewBox='0 0 512 512' width='54' height='54'><path fill="white" d="M19.656 20.688v36.437L73.5 110.97c6.515-14.93 17.988-27.23 32.313-34.814L50.25 20.686l-30.594.002zm119.47 65.906c-29.312 0-52.876 23.533-52.876 52.844a52.75 52.75 0 0 0 31.406 48.375c1.88-37.477 32.825-67.482 70.656-67.907-7.734-19.565-26.786-33.312-49.187-33.312zm213.843 44.25L312.06 145.47l97.032 253.436 7.5 19.625L397 410.97l-253.28-97.533-14.345 40.97L492.28 494.312l-139.31-363.47zm-163.845 7.72a52.736 52.736 0 0 0-52.875 52.874c0 24.35 16.282 44.705 38.594 50.906 2.935-34.576 30.61-62.252 65.187-65.188-6.2-22.312-26.553-38.594-50.905-38.594zm113.5 34.53L278.75 273.688l-1.344 5.625-5.625 1.312-100.124 23.53L384.156 386l-81.53-212.906zm-56.5 22.47a52.736 52.736 0 0 0-52.875 52.874c0 10.896 3.28 20.983 8.875 29.375l59.78-14.063 14.033-59.03c-8.473-5.784-18.724-9.157-29.813-9.157z"/></svg>
      </g>
    </svg>
  )
}

function Shield_daytrader({unlocked}) {
  return (
    <svg width='56' height='64' viewBox='0 0 90 104' style={{opacity:unlocked?1:0.3}} xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient id='sgdaytrader' x1='30%' y1='0%' x2='70%' y2='100%'>
          <stop offset='0%' stopColor='#7be8fa'/>
          <stop offset='50%' stopColor='#38d8f5'/>
          <stop offset='100%' stopColor='#0e4a5c'/>
        </linearGradient>
        <linearGradient id='shdaytrader' x1='0%' y1='0%' x2='40%' y2='70%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.35)'/>
          <stop offset='100%' stopColor='rgba(255,255,255,0)'/>
        </linearGradient>
        <filter id='gfdaytrader'><feDropShadow dx='0' dy='2' stdDeviation='3' floodColor='#0e4a5c' floodOpacity='0.7'/></filter>
      </defs>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='#38d8f5' opacity='0.25' transform='scale(1.07) translate(-3,-2)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#sgdaytrader)' filter='url(#gfdaytrader)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#shdaytrader)'/>
      <path d='M45 10 L81 22 L81 54 C81 71 64 86 45 95 C26 86 9 71 9 54 L9 22 Z' fill='none' stroke='rgba(255,255,255,0.2)' strokeWidth='1.5'/>
      <g transform='translate(18,22)'>
        <svg viewBox='0 0 512 512' width='54' height='54'><path fill="white" d="M297.688 21.063c-15.634.137-31.488 4.074-46.657 12.343 34.997-2.542 65.762 8.182 74.345 33.938-128.86-16.852-260.25 113.34-31.72 245.187 62.006 35.773 19.38 127.795-104.31 75.095C24.494 317.39 36.47 186.86 95.844 118.562c7.322 12.328 13.418 26.194 18.936 40.75 19.067-48.595 56.388-68.62 93.595-88.812-52.197-24.58-102.01-14.783-150.906 8.406 10.362 5.744 19.104 13.503 26.655 22.72-113.558 67.915-77.773 280.4 71.406 366.53 189.853 109.61 414.786-132.238 208.157-211.062-151.438-57.77-111.705-139.905-38.03-126.156l2.624 42.625 141.345 39.375 20.906-60.657c-28.94-12.513-52.207-26.577-71.092-43.843 1.268-28.244-10.66-56.505-33.907-84.75.757 13.793.603 27.582-1.592 41.376-22.21-28.084-53.733-44.287-86.25-44zm43.437 65.374c23 7.268 44.722 20.866 62 44.094-33.73 15.82-69.124-5.32-62-44.093z"/></svg>
      </g>
    </svg>
  )
}

function Shield_swing({unlocked}) {
  return (
    <svg width='56' height='64' viewBox='0 0 90 104' style={{opacity:unlocked?1:0.3}} xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient id='sgswing' x1='30%' y1='0%' x2='70%' y2='100%'>
          <stop offset='0%' stopColor='#4ade80'/>
          <stop offset='50%' stopColor='#22c55e'/>
          <stop offset='100%' stopColor='#14532d'/>
        </linearGradient>
        <linearGradient id='shswing' x1='0%' y1='0%' x2='40%' y2='70%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.35)'/>
          <stop offset='100%' stopColor='rgba(255,255,255,0)'/>
        </linearGradient>
        <filter id='gfswing'><feDropShadow dx='0' dy='2' stdDeviation='3' floodColor='#14532d' floodOpacity='0.7'/></filter>
      </defs>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='#22c55e' opacity='0.25' transform='scale(1.07) translate(-3,-2)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#sgswing)' filter='url(#gfswing)'/>
      <path d='M45 4 L86 17 L86 55 C86 74 68 90 45 100 C22 90 4 74 4 55 L4 17 Z' fill='url(#shswing)'/>
      <path d='M45 10 L81 22 L81 54 C81 71 64 86 45 95 C26 86 9 71 9 54 L9 22 Z' fill='none' stroke='rgba(255,255,255,0.2)' strokeWidth='1.5'/>
      <g transform='translate(18,22)'>
        <svg viewBox='0 0 512 512' width='54' height='54'><path fill="white" d="M298.844 21.47c-19.177.074-37.7 9.793-43.156 29.06-21.613-18.783-57.038-5.957-57.97 13.907-.397.11-.79.234-1.187.344-12.147-4.116-20.077-.304-24.186 7.44-18.52-14.45-44.42-1.614-51.188 19.218-14.786-17.19-42.58 4.042-30.406 25.124.188.327.397.63.594.938a341.266 341.266 0 0 0-14.063 11.28 51.335 51.335 0 0 0-23.56-5.155c-13.145.303-26.367 5.78-36.19 17.625v118.063c6.726 4.154 16.51 6.48 24.94 5.375a372.038 372.038 0 0 0-16.75 58.437c-.277.918-.546 1.85-.782 2.813-.782 3.182-1.24 6.21-1.407 9.093-9.176 55.403-5.31 111.628 13.095 161.126H56.72c-15.91-39.335-21.726-84.3-18.095-129.875 20.554 13.602 55.617 7.05 63.563-25.31 7.245-29.515-15.273-47.982-38.126-47.876-4.062.02-8.143.638-12.062 1.875 5.06-17.025 11.418-33.773 19.063-49.94a341.501 341.501 0 0 1 19.75-36.03c13.37 8.93 38.33 6.824 41.25-21 1.343 4.814 9.112 7.514 15.656 7.438-10.532 23.45-18.023 48.2-22.564 73.343-8.506 47.1-6.837 95.784 4.625 140.564-22.214 3.28-24.636 38.295 1.22 38.844 4.18.087 7.748-.735 10.72-2.188 7.164 17.84 16.073 34.685 26.686 50.156h23.156c-45.083-57.982-62.535-143.55-48-224.03.185-1.024.4-2.042.594-3.063 12.583 16.662 30.995 16.28 44.313 7.156.098 7.433.444 14.858 1.06 22.25 6.366 76.193 39.422 149.527 91.626 197.686h29.156c-57.272-43.11-95.5-119.53-102.156-199.22-5.615-67.22 10.893-136.265 56.125-190.155-22.662 48.81-28.814 101.335-22.405 152.032-10.69 7.01-16.59 20.936-7.063 35.813 4.65 7.262 10.705 10.994 16.938 12.125a330.085 330.085 0 0 0 6.72 20.78c25.606 71.122 74.834 133.122 135.936 168.626h43.28c-69.03-26.022-128.378-90.037-158.405-166.47 12.857.64 25.67-14.788 16.658-29.686-3.872-6.39-9.452-9.026-14.97-9 3.396-7.17 3.52-15.913-2-24.53-4.954-7.738-11.826-11.5-18.874-12.25-5.378-44.973-.098-91.102 18.812-134.345l.906 1.75C273.37 181.75 290.925 240.357 322.625 289c10 15.346 21.402 29.735 33.906 42.938a19.978 19.978 0 0 0-3.592-.313c-19.654.194-25.004 31.01-1.75 36.72 15.508 3.807 23.524-8.896 21.687-20.408 34.925 31.702 76.562 54.554 119.906 64.094v-19.217c-59.818-14.523-117.576-57.376-154.5-114.032-24.12-37.01-39.39-79.608-41.092-124 4.408-66.014 98.113-44.375 115.656-5.155-6.523-34.758-23.54-58.183-46.094-73.188 15.407-13.958-4.283-37.503-20.813-26.156-8.08-19.323-27.917-28.886-47.093-28.81zm-138.625 2c-2.13.103-4.395.752-6.72 2.03-16.766 9.213-4.997 35.847 12.75 26.094 15.18-8.345 7.774-27.85-5.125-28.125-.3-.008-.602-.016-.906 0zm264.155 22.874c-19.126-.404-22.245 28.57-2 29 20.526.43 21.4-28.59 2-29zM53.5 75.687C43.338 76.05 33.672 88.067 40.562 100c10.167 17.61 36.35 2.13 25.594-16.5-3.315-5.743-8.037-7.977-12.656-7.813zm69.906 42.282c.402.812.812 1.623 1.28 2.436 2.326 4.027 5.03 7.26 7.97 9.813a320.203 320.203 0 0 0-29.875 30.936 44.622 44.622 0 0 0-10.25-20.78c6.11-5.04 12.437-9.807 18.907-14.376 4.71-1.154 9.05-4.033 11.97-8.03zM181 123.062a46.38 46.38 0 0 0 7.063 7.374 272.932 272.932 0 0 0-11.97 15.5 37.77 37.77 0 0 0-10.593-10.812 36.763 36.763 0 0 0 15.5-12.063zm240 51.593c-25.802.693-29.64 40.193-1.594 40.78 28.89.61 30.117-40.2 2.813-40.78-.422-.01-.81-.01-1.22 0zm-244.188 4.625c3.198 9.806 12.542 14.786 22.125 13.69a285.615 285.615 0 0 0-5.718 25.124c-6.353-6.258-13.926-9.102-21.5-9.25-3.403-.067-6.787.43-10.064 1.375a276.48 276.48 0 0 1 15.156-30.94zm280.47 42.22c-18.49-.39-21.542 27.59-1.97 28 19.844.417 20.725-27.608 1.97-28z"/></svg>
      </g>
    </svg>
  )
}

const SHIELD_MAP = {
  first: Shield_first,
  diamond: Shield_diamond,
  prolific: Shield_prolific,
  centurion: Shield_centurion,
  fire: Shield_fire,
  sniper: Shield_sniper,
  scalper: Shield_scalper,
  daytrader: Shield_daytrader,
  swing: Shield_swing,
}

// ── Portal Tooltip ──────────────────────────────────────────────────────────
function BadgeTooltip({ text, x, y }) {
  if (!text) return null
  const style = {
    position: 'fixed',
    left: Math.min(Math.max(x - 110, 8), window.innerWidth - 236),
    top: y - 8,
    transform: 'translateY(-100%)',
    background: 'rgba(10,12,22,0.97)',
    color: '#fff',
    fontSize: 12,
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
    maxWidth: 220,
    zIndex: 999999,
    pointerEvents: 'none',
    lineHeight: 1.5,
    textAlign: 'center',
    whiteSpace: 'normal',
  }
  return ReactDOM.createPortal(<div style={style}>{text}</div>, document.body)
}


export function BadgeGrid({ trades }) {
  const [tooltip, setTooltip] = useState({ text: '', x: 0, y: 0 })

  const showTip = useCallback((e, text) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTooltip({ text, x: r.left + r.width / 2, y: r.top })
  }, [])
  const hideTip = useCallback(() => setTooltip({ text: '', x: 0, y: 0 }), [])

  return (
    <>
      <BadgeTooltip text={tooltip.text} x={tooltip.x} y={tooltip.y} />
      <div className="badge-grid">
        {ALL_BADGES.map(b => {
          const ok = b.req(trades)
          const ShieldComp = SHIELD_MAP[b.id]
          const tipText = ok ? '✅ ' + b.achieved : '🔒 ' + b.desc
          return (
            <div
              key={b.id}
              className={`badge-item ${ok ? 'unlocked' : 'locked'}`}
              onMouseEnter={e => showTip(e, tipText)}
              onMouseLeave={hideTip}
            >
              <div className="badge-shield">
                {ShieldComp ? <ShieldComp unlocked={ok} /> : <span style={{fontSize:32}}>{ok ? b.emoji : '???'}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─── Streak Calendar ─────────────────────────────────────────────────────────

export function StreakCalendar({ trades, currentMonth }) {
  const today = new Date()
  const todayKey = today.toISOString().split('T')[0]

  // currentMonth format: "YYYY-MM"
  const [year, month] = currentMonth ? currentMonth.split('-').map(Number) : [today.getFullYear(), today.getMonth() + 1]
  const daysInMonth = new Date(year, month, 0).getDate()

  // Get day of week of 1st (0=Sun…6=Sat → convert to Mon-first: Mon=0)
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7
  // Pad with empty cells at start
  const cells = [
    ...Array.from({ length: firstDow }, (_, i) => ({ key: `empty-${i}`, empty: true })),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const dt = trades.filter(t => (t.closeDate || t.date || '').startsWith(key))
      return {
        key, empty: false, day: d,
        hasWin:  dt.some(t => t.result === 'WIN'),
        hasLoss: dt.some(t => t.result === 'LOSS'),
        isToday: key === todayKey,
        count:   dt.length,
      }
    })
  ]

  const DOW = ['L','M','X','J','V','S','D']
  const monthName = new Date(year, month - 1, 1).toLocaleString('es-ES', { month: 'long' })

  return (
    <div className="streak-wrapper">
      <div className="streak-cal-title">Actividad — {monthName}</div>
      <div className="streak-dow">
        {DOW.map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="streak-cal">
        {cells.map(d => {
          if (d.empty) return <div key={d.key} className="streak-day empty" />
          let cls = 'streak-day'
          if (d.hasWin && !d.hasLoss) cls += ' win'
          else if (d.hasLoss && !d.hasWin) cls += ' loss'
          else if (d.count > 0) cls += ' mixed'
          if (d.isToday) cls += ' today'
          return <div key={d.key} className={cls} title={`${d.day} — ${d.count > 0 ? d.count + ' trade(s)' : 'sin trades'}`} />
        })}
      </div>
      <div className="streak-legend">
        <span><span className="sl-dot win" />Win</span>
        <span><span className="sl-dot loss" />Loss</span>
        <span><span className="sl-dot mixed" />Mixto</span>
        <span><span className="sl-dot" />Sin op.</span>
      </div>
    </div>
  )
}
