// One organic red line that flows continuously. The path repeats every P px,
// so sliding it left by P and starting over is seamless.
const P = 386
const LENGTH = P * 2 + 40

function buildPath(height: number) {
  const mid = height / 2
  const amp = height / 2 - 2
  const pts: string[] = []
  for (let x = 0; x <= LENGTH; x += 3) {
    const t = (x / P) * Math.PI * 2
    const y = 11 * Math.sin(3 * t) + 7 * Math.sin(5 * t + 1.1) + 5 * Math.sin(2 * t + 2.3) + 3 * Math.sin(7 * t + 0.4)
    pts.push(`${x} ${(mid + (y / 26) * amp).toFixed(1)}`)
  }
  return 'M ' + pts.join(' L ')
}

export default function Squiggle({ height = 40, width = 386, strokeWidth = 2, paused = false }: {
  height?: number
  width?: number
  strokeWidth?: number
  paused?: boolean
}) {
  return (
    <div
      style={{
        width,
        height,
        overflow: 'hidden',
        maskImage: 'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
      }}
    >
      <svg className={paused ? undefined : 'squiggle'} width={LENGTH} height={height} style={{ display: 'block' }}>
        <path d={buildPath(height)} fill="none" stroke="var(--red-700)" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
