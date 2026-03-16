import { useState, useRef, useCallback } from 'react'
import { equityPoints } from '../utils.js'

export default function EquityCurve({ trades, height = 140, capital = 0 }) {
  const [hover, setHover] = useState(null) // { idx, svgX, svgY, clientX, clientY }
  const svgRef = useRef(null)

  const points = equityPoints(trades)
  if (points.length < 2) {
    return (
      <div className="equity-curve" style={{ height }}>
        <div className="empty-state" style={{ height }}>
          <div className="empty-icon">📈</div>
          <div className="empty-sub">Sin operaciones cerradas</div>
        </div>
      </div>
    )
  }

  const w = 600
  const h = height
  const pad = { top: 10, bottom: 10, left: 0, right: 0 }
  const iw = w - pad.left - pad.right
  const ih = h - pad.top - pad.bottom

  const values = points.map(p => p.y)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1

  const toX = i => pad.left + (i / (points.length - 1)) * iw
  const toY = v => pad.top + (1 - (v - minV) / range) * ih

  const coords = points.map((p, i) => ({ x: toX(i), y: toY(p.y) }))
  const polyline = coords.map(c => `${c.x},${c.y}`).join(' ')

  const finalValue = points[points.length - 1].y
  const isPositive = finalValue >= 0

  const fillColor = isPositive ? '#22c55e' : '#ef4444'
  const strokeColor = isPositive ? '#22c55e' : '#ef4444'
  const gradId = `eq-grad-${isPositive ? 'g' : 'r'}`

  const zeroY = toY(0)
  const fillPts = [
    `${coords[0].x},${Math.min(zeroY, h - pad.bottom)}`,
    ...coords.map(c => `${c.x},${c.y}`),
    `${coords[coords.length - 1].x},${Math.min(zeroY, h - pad.bottom)}`
  ].join(' ')

  // Find nearest point index from mouse position
  const handleMouseMove = useCallback((e) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    // Convert client coords to SVG viewBox coords
    const relX = (e.clientX - rect.left) / rect.width * w
    // Find closest point by x
    let closest = 0
    let minDist = Infinity
    for (let i = 0; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - relX)
      if (dist < minDist) {
        minDist = dist
        closest = i
      }
    }
    setHover({ idx: closest, clientX: e.clientX - rect.left, clientY: e.clientY - rect.top })
  }, [coords.length, w])

  const handleMouseLeave = useCallback(() => setHover(null), [])

  // Tooltip data
  const hoverPoint = hover !== null ? points[hover.idx] : null
  const hoverCoord = hover !== null ? coords[hover.idx] : null

  const formatPnl = (val) => {
    const sign = val >= 0 ? '+' : ''
    return `${sign}$${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getDate = (point) => {
    if (!point.trade) return 'Inicio'
    const d = point.trade.closeDate || point.trade.date
    if (!d) return '—'
    const date = new Date(d)
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const getPctGain = (cumPnl) => {
    if (!capital || capital <= 0) return null
    const pct = (cumPnl / capital) * 100
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
  }

  return (
    <div className="equity-curve" style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ height, cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Zero line */}
        {minV < 0 && maxV > 0 && (
          <line
            x1={pad.left} y1={toY(0)}
            x2={w - pad.right} y2={toY(0)}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        )}
        {/* Fill area */}
        <polygon points={fillPts} fill={`url(#${gradId})`} />
        {/* Stroke line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Last point dot */}
        {coords.length > 0 && !hover && (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="4"
            fill={strokeColor}
            stroke="var(--surface)"
            strokeWidth="2"
          />
        )}
        {/* Hover crosshair + dot */}
        {hover !== null && hoverCoord && (
          <>
            <line
              x1={hoverCoord.x} y1={pad.top}
              x2={hoverCoord.x} y2={h - pad.bottom}
              stroke="rgba(212,175,55,0.5)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={hoverCoord.x}
              cy={hoverCoord.y}
              r="5"
              fill={strokeColor}
              stroke="#d4af37"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
      {/* Tooltip */}
      {hover !== null && hoverPoint && (
        <div className="equity-tooltip" style={{
          left: hover.clientX,
          top: hover.clientY,
        }}>
          <div className="equity-tooltip-date">{getDate(hoverPoint)}</div>
          <div className="equity-tooltip-pnl" style={{ color: hoverPoint.y >= 0 ? '#22c55e' : '#ef4444' }}>
            {formatPnl(hoverPoint.y)}
          </div>
          {getPctGain(hoverPoint.y) && (
            <div className="equity-tooltip-pct">{getPctGain(hoverPoint.y)}</div>
          )}
        </div>
      )}
    </div>
  )
}
