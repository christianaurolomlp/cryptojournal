import { equityPoints } from '../utils.js'

export default function EquityCurve({ trades, height = 140 }) {
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

  // Close polygon for fill (bring down to baseline y=zero)
  const zeroY = toY(0)
  const fillPts = [
    `${coords[0].x},${Math.min(zeroY, h - pad.bottom)}`,
    ...coords.map(c => `${c.x},${c.y}`),
    `${coords[coords.length - 1].x},${Math.min(zeroY, h - pad.bottom)}`
  ].join(' ')

  return (
    <div className="equity-curve">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height }}>
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
        {coords.length > 0 && (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="4"
            fill={strokeColor}
            stroke="var(--surface)"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  )
}
