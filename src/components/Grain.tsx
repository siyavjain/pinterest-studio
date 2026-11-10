// The soft mottled texture Figma lays over the blurred cover photos: fractal noise, greyed out
// and blended gently so it reads as grain, not colour. Fills its parent.
const NOISE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>
    <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter>
    <rect width='100%' height='100%' filter='url(#n)'/>
  </svg>`,
)}")`

export default function Grain({ opacity = 0.22 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      style={{ position: 'absolute', inset: 0, backgroundImage: NOISE, backgroundSize: '240px 240px', mixBlendMode: 'overlay', opacity, pointerEvents: 'none' }}
    />
  )
}
