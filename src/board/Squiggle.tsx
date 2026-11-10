import { useEffect, useId, useRef } from 'react'
import { voice } from './voice/level'

// The voice wave, airbrushed: a mass of ink with uneven peaks, grain spraying up off them and a
// soft reflection fading below. The shape repeats every P px, so sliding it left by P and starting
// over is seamless.
const P = 386
const LENGTH = P * 2 + 40

// tall uneven peaks on top; the underside stays fairly flat, so the ink reads as a ridge
function ridge(height: number) {
  const mid = height * 0.6
  const amp = height * 0.42
  const top: string[] = []
  const bottom: string[] = []
  for (let x = 0; x <= LENGTH; x += 3) {
    const t = (x / P) * Math.PI * 2
    // several crests in view at once, each a different height
    const y = 10 * Math.sin(5 * t) + 8 * Math.sin(8 * t + 1.1) + 6 * Math.sin(3 * t + 2.3) + 4 * Math.sin(11 * t + 0.4)
    const peak = Math.max(0, y) ** 1.35 / 26 ** 0.35 // sharpen the crests
    const dip = Math.min(0, y) * 0.25
    top.push(`${x} ${(mid - ((peak + dip) / 26) * amp).toFixed(1)}`)
    const body = height * (0.1 + 0.06 * Math.sin(4 * t + 0.7))
    bottom.unshift(`${x} ${(mid + body).toFixed(1)}`)
  }
  return `M ${top.join(' L ')} L ${bottom.join(' L ')} Z`
}

// The look shared by both waves: crisp ink with a light dusting of grain at its edges and a
// faint reflection below.
function InkFilter({ id, h }: { id: string; h: number }) {
  return (
    <filter id={id} x="-2%" y="-100%" width="104%" height="300%" colorInterpolationFilters="sRGB">
      {/* the ink itself, edges softened */}
      <feGaussianBlur in="SourceGraphic" stdDeviation={h * 0.008} result="ink" />
      {/* where the grain may fall: drawn out upward and downward from the ink */}
      <feGaussianBlur in="SourceGraphic" stdDeviation={`${h * 0.02} ${h * 0.12}`} result="reach" />
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="7" result="noise" />
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  9 0 0 0 -6.2" result="specks" />
      <feComposite in="specks" in2="reach" operator="in" result="spray" />
      {/* a blurred reflection, dropped below the ridge */}
      <feGaussianBlur in="SourceGraphic" stdDeviation={h * 0.06} result="soft" />
      <feOffset in="soft" dy={h * 0.18} result="dropped" />
      <feComponentTransfer in="dropped" result="reflection">
        <feFuncA type="linear" slope="0.12" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode in="reflection" />
        <feMergeNode in="spray" />
        <feMergeNode in="ink" />
      </feMerge>
    </filter>
  )
}

const EDGES = 'linear-gradient(to right, transparent, black 18%, black 82%, transparent)'

export default function Squiggle({ height = 40, width = 386, paused = false }: {
  height?: number
  width?: number
  strokeWidth?: number // kept for callers; the ink's weight now follows the height
  paused?: boolean
}) {
  const id = `ink-${useId().replace(/:/g, '')}`
  return (
    <div style={{ width, height, overflow: 'hidden', maskImage: EDGES, WebkitMaskImage: EDGES }}>
      <svg className={paused ? undefined : 'squiggle'} width={LENGTH} height={height} style={{ display: 'block' }}>
        <defs>
          <InkFilter id={id} h={height} />
        </defs>
        <path d={ridge(height)} fill="var(--bg-inverse)" filter={`url(#${id})`} />
      </svg>
    </div>
  )
}

// The live wave: drawn from how loud the voice is, like a trace. Each moment of sound becomes a
// peak at the right that scrolls away left: loud is tall, soft is small, silence is a calm line.
const STEP = 5 // px between samples
const SPEED = 80 // px a second

export function VoiceWave({ height = 64, width = 386 }: { height?: number; width?: number }) {
  const id = `ink-${useId().replace(/:/g, '')}`
  const path = useRef<SVGPathElement>(null)

  useEffect(() => {
    const n = Math.ceil(width / STEP) + 3
    const samples: number[] = Array(n).fill(0)
    let shift = 0 // px scrolled since the newest sample
    let loudest = 0 // the peak since the last sample, so short sounds aren't missed
    let last = performance.now()
    let frame = 0
    const mid = height * 0.64
    const amp = height * 0.56

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      loudest = Math.max(loudest, voice.level)
      shift += SPEED * dt
      while (shift >= STEP) {
        shift -= STEP
        samples.shift()
        // a little unevenness, so a held sound still looks like a voice and not a block
        samples.push(loudest * (0.75 + Math.random() * 0.5))
        loudest = voice.level
      }
      const t = now / 1000
      const top = samples.map((v, i) => {
        const x = i * STEP - shift
        const breath = height * 0.025 * Math.sin(t * 2.4 + i * 0.5) // the ink never sits perfectly still
        return [x, mid - Math.min(1, v) * amp - breath] as const
      })
      // smooth the crests: curve through the midpoints between samples
      let d = `M ${top[0][0].toFixed(1)} ${top[0][1].toFixed(1)}`
      for (let i = 1; i < top.length - 1; i++) {
        const [x, y] = top[i]
        const [nx, ny] = top[i + 1]
        d += ` Q ${x.toFixed(1)} ${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)} ${((y + ny) / 2).toFixed(1)}`
      }
      // the underside thickens a touch under loud moments
      for (let i = top.length - 1; i >= 0; i -= 2) {
        const x = i * STEP - shift
        d += ` L ${x.toFixed(1)} ${(mid + height * (0.07 + Math.min(1, samples[i]) * 0.07)).toFixed(1)}`
      }
      path.current?.setAttribute('d', d + ' Z')
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [height, width])

  return (
    <div style={{ width, height, overflow: 'hidden', maskImage: EDGES, WebkitMaskImage: EDGES }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        <defs>
          <InkFilter id={id} h={height} />
        </defs>
        <path ref={path} fill="var(--bg-inverse)" filter={`url(#${id})`} />
      </svg>
    </div>
  )
}
