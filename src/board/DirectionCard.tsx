import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PieceContent from './Piece'
import type { Look, Part } from './Piece'
import { CloseIcon } from '../components/Icons'

// The board, summed up once it's done: what it shows, its colours, and which kinds
// of pins to go after for this concept.

type Piece = Look & { id: string; x: number; y: number; w: number; h: number; label?: string }

// The kinds of pin a board is made of, matched on the piece's image. Order matters:
// "tree-hand" is a hand before it's nature.
const KINDS = [
  { key: 'type', test: /ribbon|scary/, name: 'Loud type stickers', look: 'Wavy, hand-set words in candy colours', short: 'loud type',
    texture: 'Puffy ink', material: 'Sticker vinyl', finish: 'Die-cut white edge', surface: [0.75, 0.55, 0.15] },
  { key: 'people', test: /hand|cap|head-hill/, name: 'Hands & faces', look: 'Gestures and portraits, cropped playfully', short: 'playful hands',
    texture: 'Photo grain', material: 'Photo print', finish: 'Rough scissor cut', surface: [0.35, 0.3, 0.55] },
  { key: 'florals', test: /flower|bloom|ws-14|poppy|peony|gardener|bags|tulip|phone|wanderlust|traffic|carrot/, name: 'Cut-out florals', look: 'Single blooms cut clean, no backdrop', short: 'cut florals',
    texture: 'Petal veins', material: 'Real petals & paper', finish: 'Clean cut, soft shadow', surface: [0.25, 0.7, 0.3] },
  { key: 'gradients', test: /gradient|blob/, name: 'Soft gradients', look: 'Blurry, grainy fields of colour', short: 'soft gradients',
    texture: 'Airbrush haze', material: 'Light & blur', finish: 'Edgeless, fades out', surface: [0.55, 0.15, 0.75] },
  { key: 'nature', test: /meadow|hill|nature|grass|sit|lamb/, name: 'Open nature', look: 'Grass, hills and sky as cut-outs', short: 'open nature',
    texture: 'Grass grain', material: 'Collage paper', finish: 'Torn, organic edge', surface: [0.1, 0.45, 0.85] },
] as const

// plain names for the palette, so the summary can say it out loud
const NAMED: [string, number[]][] = [
  ['violet', [123, 92, 255]], ['lime', [200, 240, 46]], ['pink', [244, 166, 196]], ['orange', [255, 122, 61]],
  ['moss', [62, 92, 42]], ['red', [200, 40, 40]], ['sky blue', [143, 180, 217]], ['cream', [240, 230, 210]],
]
const nameOf = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return NAMED.reduce((best, n) => {
    const d = n[1].reduce((s, v, i) => s + (v - c[i]) ** 2, 0)
    return d < best.d ? { n: n[0], d } : best
  }, { n: 'cream', d: Infinity }).n
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// where the board sits between each pair: 0 = left word, 1 = right word
const AXES = [['Matte', 'Glossy'], ['Flat', 'Dimensional'], ['Clean', 'Grainy']] as const
// how much of the board each palette colour carries, in order
const SHARE = [34, 24, 18, 14, 10]
const ROLE = ['Lead', 'Pop', 'Pop', 'Accent', 'Accent']
const GROUND = '#f7f4ee'

/** A small heading for each part of the card. */
const H = ({ title, note, children }: { title: string; note?: string; children?: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0 10px' }}>
    <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
    {children ?? <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{note}</span>}
  </div>
)

const HERO_W = 346
const HERO_H = 270
const ease = [0.22, 1, 0.36, 1] as const

export type Direction = { title: string; keep: string[]; drop: string[]; dropKeys: string[]; palette: string[]; savedAt: number }

export default function DirectionCard({ items, board, saved, onClose, onSave }: {
  items: Piece[]
  board: string
  saved?: Direction // reopening a saved card brings back its name and choices
  onClose: () => void
  onSave: (d: Direction) => void
}) {
  const pieces = items.filter((i) => !i.colour)
  const palette = [...new Set(items.filter((i) => i.colour).map((i) => i.colour!))].slice(0, 6)

  // what's on the board, by kind, most first; merges count each of their parts
  const flat = (p: Look & { id: string }): (Look & { id: string })[] => (p.parts ? p.parts.flatMap((q: Part) => flat(q)) : [p])
  const counts = KINDS.map((k) => ({ kind: k, pieces: pieces.flatMap(flat).filter((p) => k.test.test(p.src)) }))
    .filter((c) => c.pieces.length)
    .sort((a, b) => b.pieces.length - a.pieces.length)

  const [dropped, setDropped] = useState<string[]>(saved?.dropKeys ?? [])
  const kept = counts.filter((c) => !dropped.includes(c.kind.key))
  const [a, b] = kept.length ? kept : counts
  const [title, setTitle] = useState(saved?.title ?? cap(b ? `${a.kind.short} & ${b.kind.short}` : a?.kind.short ?? 'New direction'))
  const [copied, setCopied] = useState(false)

  const colourWords = [...new Set(palette.map(nameOf))].slice(0, 3)
  const summary =
    `${pieces.length} pieces that lean on ${a?.kind.short ?? 'collage'}${b ? ` and ${b.kind.short}` : ''}, ` +
    `set on a calm cream ground` + (colourWords.length ? ` with ${colourWords.slice(0, -1).join(', ')}${colourWords.length > 1 ? ' and ' : ''}${colourWords[colourWords.length - 1]} pops.` : '.')

  // the board in miniature, fitted into the hero
  const l = Math.min(...pieces.map((p) => p.x)), t = Math.min(...pieces.map((p) => p.y))
  const bw = Math.max(...pieces.map((p) => p.x + p.w)) - l, bh = Math.max(...pieces.map((p) => p.y + p.h)) - t
  const s = Math.max(HERO_W / bw, (HERO_H + 20) / bh) // fill the hero; the far edges can crop
  const ox = (HERO_W - bw * s) / 2, oy = (HERO_H - 30 - bh * s) / 2

  // surface: the kept kinds averaged, weighted by how much of the board they are
  const weight = kept.reduce((n, c) => n + c.pieces.length, 0) || 1
  const surface = AXES.map((_, i) => kept.reduce((n, c) => n + c.kind.surface[i] * c.pieces.length, 0) / weight)

  const copy = () => {
    navigator.clipboard?.writeText(palette.join(' ')).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      data-scroll // the board's trackpad panning leaves this alone, so the card scrolls
      style={{ position: 'absolute', inset: 0, zIndex: 80, touchAction: 'pan-y', overscrollBehavior: 'contain', background: 'rgba(245,245,245,.8)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', overflowY: 'auto', scrollbarWidth: 'none' }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.55, ease }}
        style={{ width: HERO_W + 24, margin: '64px auto 40px', padding: 12, boxSizing: 'border-box', borderRadius: 32, background: '#fff', boxShadow: '0 30px 60px rgba(0,0,0,.08)' }}
      >
        {/* hero: the board itself, fading into the card */}
        <div style={{ position: 'relative' }}>
        <div
          style={{
            position: 'relative', height: HERO_H, borderRadius: 22, overflow: 'hidden',
            background: `linear-gradient(160deg, ${palette[0] ?? '#e8e2ff'}33, ${palette[1] ?? '#f2f8d8'}40 60%, #fff)`,
            WebkitMaskImage: 'linear-gradient(to bottom, #000 72%, transparent)', maskImage: 'linear-gradient(to bottom, #000 72%, transparent)',
          }}
        >
          {pieces.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.04, duration: 0.5, ease }}
              style={{ position: 'absolute', left: ox + (p.x - l) * s, top: oy + (p.y - t) * s, width: p.w * s, height: p.h * s }}
            >
              <PieceContent it={p} />
            </motion.div>
          ))}
        </div>
        <motion.button
          aria-label="Close direction card"
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 999, background: 'rgba(255,255,255,.85)', display: 'grid', placeItems: 'center' }}
        >
          <CloseIcon size={14} />
        </motion.button>
        </div>

        <div style={{ padding: '4px 8px 6px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Direction · {board}{saved && ` · saved ${new Date(saved.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}</div>
          <input
            aria-label="Direction name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', border: 0, outline: 'none', padding: 0, background: 'none', font: 'inherit', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: '#111' }}
          />
          <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: '21px', color: 'var(--text-secondary)' }}>{summary}</p>

          {/* colours: what each one does, and how much of the board it is */}
          <H title="Colours">
            <motion.button whileTap={{ scale: 0.94 }} onClick={copy} style={{ height: 28, padding: '0 12px', borderRadius: 999, background: '#111', color: '#fff', fontSize: 12, fontWeight: 500 }}>
              {copied ? 'Copied' : 'Copy hex'}
            </motion.button>
          </H>
          <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
            {palette.slice(0, 5).map((c, i) => (
              <motion.span key={c} initial={{ flexGrow: 0 }} animate={{ flexGrow: SHARE[i] }} transition={{ delay: 0.3 + i * 0.06, duration: 0.6, ease }} style={{ background: c, flexBasis: 0 }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {[...palette.slice(0, 5).map((c, i) => ({ c, role: ROLE[i], share: `${SHARE[i]}%` })), { c: GROUND, role: 'Ground', share: 'base' }].map(({ c, role, share }) => (
              <div key={c} style={{ borderRadius: 14, border: '1px solid #ececec', overflow: 'hidden' }}>
                <div style={{ height: 40, background: c }} />
                <div style={{ padding: '6px 8px' }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{cap(nameOf(c))} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>· {role}</span></div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'ui-monospace, monospace' }}>{c.toUpperCase()} · {share}</div>
                </div>
              </div>
            ))}
          </div>

          {/* textures: a close-up of the real piece each one comes from */}
          <H title="Textures" note="Up close" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {kept.slice(0, 6).map((c) => (
              <div key={c.kind.key}>
                <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden', background: '#f3f1ec' }}>
                  <div style={{ position: 'absolute', inset: 0, transform: 'scale(2.4)' }}>
                    <PieceContent it={c.pieces[0]} />
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, marginTop: 5 }}>{c.kind.texture}</div>
              </div>
            ))}
          </div>

          {/* materials: what it's made of, and how its edges are finished */}
          <H title="Materials" note="Made of" />
          <div style={{ display: 'grid', gap: 2, borderRadius: 16, border: '1px solid #ececec', padding: '4px 12px' }}>
            {kept.map((c, i) => (
              <div key={c.kind.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid #f0f0f0' : 'none' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: palette[i % palette.length] ?? '#111', flex: 'none' }} />
                <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{c.kind.material}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.kind.finish}</span>
              </div>
            ))}
          </div>

          {/* surface: where the board sits between opposites */}
          <H title="Surface" note="Overall finish" />
          <div style={{ display: 'grid', gap: 14, padding: '4px 2px' }}>
            {AXES.map(([lo, hi], i) => (
              <div key={lo}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <span style={{ color: surface[i] < 0.5 ? '#111' : undefined, fontWeight: surface[i] < 0.5 ? 600 : 400 }}>{lo}</span>
                  <span style={{ color: surface[i] >= 0.5 ? '#111' : undefined, fontWeight: surface[i] >= 0.5 ? 600 : 400 }}>{hi}</span>
                </div>
                <div style={{ position: 'relative', height: 4, borderRadius: 999, background: '#ececec' }}>
                  <motion.span
                    initial={false}
                    animate={{ left: `${surface[i] * 100}%` }}
                    transition={{ duration: 0.5, ease }}
                    style={{ position: 'absolute', top: -6, width: 16, height: 16, marginLeft: -8, borderRadius: 999, background: '#111', border: '3px solid #fff', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,.25)' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* the clear ask: which kinds of pin to go after */}
          <H title="Pins to look for" note="Tap to keep or drop" />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 6 }}>
            {counts.map((c, i) => {
              const off = dropped.includes(c.kind.key)
              return (
                <motion.button
                  key={c.kind.key}
                  layout
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDropped((d) => (off ? d.filter((k) => k !== c.kind.key) : [...d, c.kind.key]))}
                  animate={{ opacity: off ? 0.45 : 1, backgroundColor: off ? '#ffffff' : '#f5f5f5' }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 14, textAlign: 'left', border: off ? '1px dashed #d5d5d5' : '1px solid transparent' }}
                >
                  <div style={{ position: 'relative', width: 44, height: 44, flex: 'none' }}>
                    {c.pieces.slice(0, 2).map((p, k) => (
                      <div key={p.id} style={{ position: 'absolute', inset: k ? '10px -4px -4px 10px' : '0 8px 8px 0', transform: `rotate(${k ? 8 : -6}deg)` }}>
                        <PieceContent it={p} />
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, textDecoration: off ? 'line-through' : 'none' }}>
                      {c.kind.name}
                      {i === 0 && !off && <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 999, background: '#ad001a', color: '#fff', fontSize: 10, fontWeight: 600, verticalAlign: 2 }}>Lead</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.kind.look}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 'none' }}>×{c.pieces.length}</span>
                  <span style={{ width: 22, height: 22, borderRadius: 999, flex: 'none', display: 'grid', placeItems: 'center', background: off ? 'transparent' : '#111', border: off ? '1.5px solid #ccc' : 'none', color: '#fff', fontSize: 12 }}>
                    {off ? '' : '✓'}
                  </span>
                </motion.button>
              )
            })}
          </div>

          <AnimatePresence>
            {dropped.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', paddingTop: 10 }}>
                  Less of: {counts.filter((c) => dropped.includes(c.kind.key)).map((c) => c.kind.name.toLowerCase()).join(', ')}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onSave({ title, palette, keep: kept.map((c) => c.kind.name), drop: counts.filter((c) => dropped.includes(c.kind.key)).map((c) => c.kind.name), dropKeys: dropped, savedAt: Date.now() })}
            style={{ marginTop: 20, width: '100%', height: 50, borderRadius: 999, background: '#000', color: '#fff', fontSize: 16, fontWeight: 500 }}
          >
            {saved ? 'Update direction' : 'Save direction'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
