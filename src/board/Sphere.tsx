import { asset } from '../components/asset'

// A material swatch drawn as a lit ball, like a CMF board: a colour in a finish, or a patch of a
// photo's surface wrapped round. Light comes from the top left.

export type Material =
  | { kind: 'colour'; colour: string; finish: 'gloss' | 'matte' | 'metal'; name: string }
  | { kind: 'texture'; src: string; at: [number, number]; under: string; name: string; zoom?: number } // at: which patch of the photo, 0–1; under: shows through a cut-out's clear parts; zoom: how far in (3.2 by default)

// the ball's light and shade, laid over its surface
const LIGHT: Record<string, string> = {
  gloss: 'radial-gradient(circle at 34% 26%, rgba(255,255,255,.95) 0 6%, rgba(255,255,255,.35) 14%, rgba(255,255,255,0) 32%)',
  matte: 'radial-gradient(circle at 34% 28%, rgba(255,255,255,.35) 0, rgba(255,255,255,0) 45%)',
  metal: 'radial-gradient(circle at 34% 26%, rgba(255,255,255,.9) 0 5%, rgba(255,255,255,0) 20%), linear-gradient(160deg, rgba(255,255,255,0) 35%, rgba(255,255,255,.55) 48%, rgba(255,255,255,0) 58%, rgba(0,0,0,.25) 75%, rgba(255,255,255,.2) 88%)',
  texture: 'radial-gradient(circle at 34% 28%, rgba(255,255,255,.4) 0, rgba(255,255,255,0) 40%)',
}
const SHADE = 'radial-gradient(circle at 64% 72%, rgba(0,0,0,0) 38%, rgba(0,0,0,.42) 100%)'

export default function Sphere({ m, size }: { m: Material; size: number }) {
  const base: React.CSSProperties =
    m.kind === 'colour'
      ? { background: m.colour }
      : { backgroundColor: m.under, backgroundImage: `url("${asset(m.src)}")`, backgroundSize: `${(m.zoom ?? 3.2) * 100}%`, backgroundPosition: `${m.at[0] * 100}% ${m.at[1] * 100}%` }
  return (
    <div
      aria-label={m.name}
      style={{
        position: 'relative', width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, ...base,
        boxShadow: `0 ${size * 0.08}px ${size * 0.16}px rgba(0,0,0,.18)`,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: `${LIGHT[m.kind === 'colour' ? m.finish : 'texture']}, ${SHADE}` }} />
    </div>
  )
}

// plain names for a colour, so a sphere can say what it is
const NAMED: [string, number[]][] = [
  // the board's own palette, by the names the concept card uses
  ['Moss', [95, 127, 58]], ['Sage', [169, 199, 154]], ['Azure', [111, 163, 201]], ['Ivory', [233, 226, 211]], ['Forest', [47, 74, 42]],
  ['Moss', [74, 98, 52]], ['Sage', [150, 168, 128]], ['Fern', [96, 140, 70]], ['Lime', [190, 210, 90]],
  ['Celadon', [172, 200, 156]], ['Olive', [110, 120, 60]], ['Mint', [190, 225, 200]],
  ['Sky', [140, 180, 215]], ['Sea', [70, 120, 130]], ['Ink', [30, 32, 34]], ['Stone', [150, 146, 140]],
  ['Cream', [236, 228, 212]], ['Sand', [210, 185, 150]], ['Clay', [176, 108, 80]], ['Rose', [220, 150, 160]],
  ['Blossom', [240, 200, 210]], ['Rust', [150, 70, 40]], ['Deep teal', [20, 60, 60]], ['Pearl', [240, 240, 235]],
]
export const colourName = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return NAMED.reduce((best, n) => {
    const d = n[1].reduce((s, v, i) => s + (v - c[i]) ** 2, 0)
    return d < best.d ? { n: n[0], d } : best
  }, { n: 'Neutral', d: Infinity }).n
}

const FINISH = { gloss: 'gloss', matte: 'matte', metal: 'metallic' } as const

/** Six materials read off a piece: its colours in three finishes, and three patches of its surface. */
export function materialsOf(src: string, colours: string[]): Material[] {
  const finishes = ['gloss', 'matte', 'metal'] as const
  const swatches: Material[] = colours.slice(0, 3).map((colour, i) => ({ kind: 'colour', colour, finish: finishes[i], name: `${colourName(colour)}, ${FINISH[finishes[i]]}` }))
  const patches: [number, number][] = [[0.3, 0.3], [0.7, 0.55], [0.45, 0.8]]
  const textures: Material[] = patches.map((at, i) => ({ kind: 'texture', src, at, under: colours[i] ?? '#e9e4df', name: ['Surface', 'Grain', 'Detail'][i] }))
  // alternate them round the wheel
  const out: Material[] = []
  for (let i = 0; i < 3; i++) {
    if (swatches[i]) out.push(swatches[i])
    out.push(textures[i])
  }
  return out
}
