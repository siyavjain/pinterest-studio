import { asset } from '../components/asset'
import { RADIUS } from './ingredients'
import type { Shape } from './ingredients'
import Sphere from './Sphere'
import type { Material } from './Sphere'

/** How a board piece is drawn: an image, a shaped crop of one, a colour chip, or a merge of parts. */
export type Look = {
  src: string
  crop?: { box: [number, number, number, number]; shape: Shape }
  colour?: string
  parts?: Part[]
  material?: Material // a colour-and-material sphere
}
// one piece inside a merge, placed relative to the merge's top-left, turned r degrees
export type Part = Look & { id: string; x: number; y: number; w: number; h: number; r: number; label?: string }

/** What a piece looks like, without its board behaviour. Merges draw their parts with it. */
export default function PieceContent({ it }: { it: Look }) {
  if (it.parts) {
    // the size the parts were laid out in
    const W = Math.max(...it.parts.map((p) => p.x + p.w)), H = Math.max(...it.parts.map((p) => p.y + p.h))
    return (
      // no card behind a merge: just its pieces, with one soft shadow so they read as one thing
      <div style={{ position: 'relative', width: '100%', height: '100%', filter: 'drop-shadow(0 10px 14px rgba(0,0,0,.16))' }}>
        {it.parts.map((p) => (
          // placed as fractions of the merge's own size, so it can be resized like any piece
          <div key={p.id} style={{ position: 'absolute', left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%`, width: `${(p.w / W) * 100}%`, height: `${(p.h / H) * 100}%`, transform: `rotate(${p.r}deg)` }}>
            <PieceContent it={p} />
          </div>
        ))}
      </div>
    )
  }
  if (it.material) return <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}><Sphere m={it.material} size={Math.round(56)} /></div>
  if (it.colour)
    return <div style={{ width: '100%', height: '100%', borderRadius: 999, background: it.colour, border: '3px solid #fff', boxSizing: 'border-box', boxShadow: '0 4px 12px rgba(0,0,0,.12)' }} />
  if (it.crop)
    return (
      <div
        style={{
          width: '100%', height: '100%', borderRadius: RADIUS[it.crop.shape], overflow: 'hidden', position: 'relative',
          // cut-outs already have their own edge; crops get a white sticker border
          ...(it.crop.shape !== 'cut' && { border: '3px solid #fff', boxSizing: 'border-box', boxShadow: '0 6px 16px rgba(0,0,0,.14)' }),
        }}
      >
        <img
          src={asset(it.src)}
          alt=""
          style={{
            position: 'absolute', pointerEvents: 'none', maxWidth: 'none',
            width: `${100 / it.crop.box[2]}%`, height: `${100 / it.crop.box[3]}%`,
            left: `${(-it.crop.box[0] / it.crop.box[2]) * 100}%`, top: `${(-it.crop.box[1] / it.crop.box[3]) * 100}%`,
          }}
        />
      </div>
    )
  return <img src={asset(it.src)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
}
