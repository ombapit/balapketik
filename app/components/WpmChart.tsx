type WpmPoint = { wpm: number; label: string }

export default function WpmChart({ points }: { points: WpmPoint[] }) {
  if (!points.length) return <div className="chart-empty">Belum ada race pada periode ini.</div>
  const values = points.map(item => item.wpm)
  const min = Math.max(0, Math.floor(Math.min(...values) / 10) * 10 - 10)
  const max = Math.max(min + 20, Math.ceil(Math.max(...values) / 10) * 10 + 10)
  const range = max - min
  const coordinates = points.map((item, index) => ({ x: points.length === 1 ? 50 : 8 + index / (points.length - 1) * 84, y: 88 - (item.wpm - min) / range * 72, value: item.wpm, label: item.label }))
  const polyline = coordinates.map(point => `${point.x},${point.y}`).join(' ')
  const area = `M ${polyline.split(' ').join(' L ')} L ${coordinates[coordinates.length - 1].x},96 L ${coordinates[0].x},96 Z`

  return <div className="wpm-chart"><div className="chart-scale"><span>{max}</span><span>{Math.round((max + min) / 2)}</span><span>{min}</span></div><div className="wpm-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Grafik WPM"><defs><linearGradient id="wpm-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ff704d" stopOpacity=".25" /><stop offset="100%" stopColor="#ff704d" stopOpacity="0" /></linearGradient></defs><path d={area} fill="url(#wpm-area)" /><polyline points={polyline} fill="none" stroke="#ff704d" strokeWidth="2.3" vectorEffect="non-scaling-stroke" /></svg>{coordinates.map((point, index) => <span key={index} className="chart-dot" style={{ left: `${point.x}%`, top: `${point.y}%` }} aria-label={`${point.label}: ${point.value} WPM`}><span className="sr-only">{point.label}: {point.value} WPM</span></span>)}</div><div className="chart-days">{points.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}</div></div>
}
