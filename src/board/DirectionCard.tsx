import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PieceContent from './Piece'
import type { Look, Part } from './Piece'
import { CloseIcon } from '../components/Icons'
import { IconButton } from '../components/Button'
import { useWeb } from '../components/view'

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
    texture: 'Petal veins', material: 'Petals & paper', finish: 'Clean cut, soft shadow', surface: [0.25, 0.7, 0.3] },
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

/** Each part of the card: a heading in the app's type, then its content. Space does the separating. */
const Section = ({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) => (
  <section style={{ marginTop: 36 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 32, marginBottom: 12 }}>
      <span style={{ fontSize: 18, lineHeight: '24px', fontWeight: 600 }}>{title}</span>
      {aside}
    </div>
    {children}
  </section>
)

/** The small pill used for asides, in the Pill's colours. */
const Chip = ({ children, on, onClick }: { children: React.ReactNode; on?: boolean; onClick?: () => void }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    animate={{ backgroundColor: on ? '#ad001a' : '#e9e4df', color: on ? '#ffffff' : '#111111' }}
    style={{ height: 32, padding: '0 14px', borderRadius: 999, fontSize: 13, whiteSpace: 'nowrap' }}
  >
    {children}
  </motion.button>
)

// dark text on light swatches, light on dark
const ink = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? 'rgba(17,17,17,.78)' : 'rgba(255,255,255,.92)'
}
const MUTED = 'var(--text-secondary)'
const TILE = 'var(--bg-default)'

const HERO_W = 358
const HERO_H = 310
const ease = [0.22, 1, 0.36, 1] as const

export type Direction = { title: string; keep: string[]; drop: string[]; dropKeys: string[]; palette: string[]; savedAt: number }

export default function DirectionCard({ items, saved, onClose, onSave }: {
  items: Piece[]
  saved?: Direction // reopening a saved card brings back its name and choices
  onClose: () => void
  onSave: (d: Direction) => void // called on open and after every change: there's no save button
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
  // on the web the hero is a tall column beside the details instead of a banner on top
  const web = useWeb()
  const HW = web ? 460 : HERO_W, HH = web ? 640 : HERO_H
  const s = Math.max(HW / bw, (HH + 20) / bh) // fill the hero; the far edges can crop
  const ox = (HW - bw * s) / 2, oy = (HH - (web ? 0 : 30) - bh * s) / 2

  // surface: the kept kinds averaged, weighted by how much of the board they are
  const weight = kept.reduce((n, c) => n + c.pieces.length, 0) || 1
  // averages huddle in the middle, so push them out to read as a clear lean
  const surface = AXES.map((_, i) => {
    const v = kept.reduce((n, c) => n + c.kind.surface[i] * c.pieces.length, 0) / weight
    return Math.min(0.92, Math.max(0.08, 0.5 + (v - 0.5) * 2.6))
  })

  // keep it saved as it changes; typing settles for a moment first
  const save = useRef(onSave)
  save.current = onSave
  const dropKey = dropped.join()
  useEffect(() => {
    const t = setTimeout(() => {
      save.current({
        title: title.trim() || 'Untitled direction', palette,
        keep: kept.map((c) => c.kind.name),
        drop: counts.filter((c) => dropped.includes(c.kind.key)).map((c) => c.kind.name),
        dropKeys: dropped, savedAt: Date.now(),
      })
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, dropKey])

  const copy = () => {
    navigator.clipboard?.writeText(palette.join(' ')).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const swatches = palette.slice(0, 5)
  const textures = kept.slice(0, 6)
  // never a lone tile on the last row; the web has room for one row
  const textureCols = web && textures.length <= 5 ? textures.length : textures.length <= 2 || textures.length === 4 ? 2 : 3

  // the name's box grows with it, so a one-line name leaves no gap
  const titleBox = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = titleBox.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [title])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      data-scroll // the board's trackpad panning leaves this alone, so the card scrolls
      style={{ position: 'absolute', inset: 0, zIndex: 80, touchAction: 'pan-y', overscrollBehavior: 'contain', background: 'rgba(233,228,223,.78)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', overflowY: 'auto', scrollbarWidth: 'none' }}
    >
      <motion.article
        initial={{ y: 70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.7, ease }}
        style={{
          position: 'relative', boxSizing: 'border-box', borderRadius: 'var(--radius-sheet)', background: 'var(--bg-canvas)', boxShadow: '0 30px 70px -30px rgba(40,30,20,.25)',
          ...(web
            ? { width: 'min(1080px, calc(100% - 64px))', margin: '32px auto', padding: 16, display: 'grid', gridTemplateColumns: `${HW}px minmax(0, 1fr)`, columnGap: 40, alignItems: 'start' }
            : { width: HERO_W + 20, margin: '62px auto 48px', padding: 10 }),
        }}
      >
        {/* hero: the board itself, fading into the card */}
        <div style={{ position: web ? 'sticky' : 'relative', top: 16 }}>
          <div
            style={{
              position: 'relative', height: HH, borderRadius: 'var(--radius-card)', overflow: 'hidden',
              background: `radial-gradient(120% 80% at 20% 0%, ${palette[0] ?? '#e8e2ff'}2e, transparent 60%), radial-gradient(100% 70% at 90% 20%, ${palette[1] ?? '#f2f8d8'}3a, transparent 60%), var(--bg-canvas)`,
              ...(!web && { WebkitMaskImage: 'linear-gradient(to bottom, #000 64%, transparent)', maskImage: 'linear-gradient(to bottom, #000 64%, transparent)' }),
            }}
          >
            {pieces.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.8, ease }}
                style={{ position: 'absolute', left: ox + (p.x - l) * s, top: oy + (p.y - t) * s, width: p.w * s, height: p.h * s }}
              >
                <PieceContent it={p} />
              </motion.div>
            ))}
          </div>
          {!web && (
            <IconButton label="Close direction card" onClick={onClose} style={{ position: 'absolute', top: 12, right: 12 }}>
              <CloseIcon />
            </IconButton>
          )}
        </div>
        {web && (
          <IconButton label="Close direction card" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
            <CloseIcon />
          </IconButton>
        )}

        <div style={web ? { padding: '28px 56px 16px 0' } : { padding: '0 16px 18px', marginTop: -18, position: 'relative' }}>
          {/* the name wraps and can be retyped */}
          <textarea
            aria-label="Direction name"
            ref={titleBox}
            value={title}
            rows={1}
            onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
            style={{ display: 'block', width: '100%', marginTop: 0, border: 0, outline: 'none', padding: 0, resize: 'none', background: 'none', font: 'inherit', fontSize: web ? 44 : 32, lineHeight: web ? '50px' : '38px', fontWeight: 600, letterSpacing: '-0.02em', color: '#111', overflow: 'hidden' }}
          />
          <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: '22px', color: MUTED, textWrap: 'pretty' } as React.CSSProperties}>{summary}</p>

          {/* colours: one strip, each band as wide as its share of the board */}
          <Section title="Colours" aside={<Chip on={copied} onClick={copy}>{copied ? 'Copied' : 'Copy hex'}</Chip>}>
            <div style={{ display: 'flex', gap: 4, height: 132 }}>
              {swatches.map((c, i) => (
                <motion.div
                  key={c}
                  initial={{ flexGrow: 0, opacity: 0 }}
                  animate={{ flexGrow: SHARE[i], opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.07, duration: 0.8, ease }}
                  style={{ flexBasis: 0, minWidth: 0, borderRadius: i === 0 ? '18px 6px 6px 18px' : i === swatches.length - 1 ? '6px 18px 18px 6px' : 6, background: c, padding: '10px 8px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: ink(c), overflow: 'hidden' }}
                >
                  <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{SHARE[i] >= 18 ? ROLE[i] : ''}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{SHARE[i]}%</span>
                </motion.div>
              ))}
            </div>
            {/* each colour as a pill: name and hex */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {[...swatches.map((c) => ({ c, name: cap(nameOf(c)) })), { c: GROUND, name: 'Ground' }].map(({ c, name }) => (
                <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px 0 6px', borderRadius: 999, background: TILE }}>
                  <span style={{ width: 18, height: 18, borderRadius: 999, background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.06)' }} />
                  <span style={{ fontSize: 13 }}>{name}</span>
                  <span style={{ fontSize: 11, color: MUTED }}>{c.toUpperCase()}</span>
                </span>
              ))}
            </div>
          </Section>

          {/* textures: a close-up of the real piece each one comes from */}
          <Section title="Textures">
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${textureCols}, minmax(0, 1fr))`, columnGap: 10, rowGap: 18 }}>
              {textures.map((c) => (
                <div key={c.kind.key}>
                  <div style={{ position: 'relative', aspectRatio: '4 / 5', borderRadius: 16, overflow: 'hidden', background: TILE }}>
                    <div style={{ position: 'absolute', inset: 0, transform: 'scale(2.6)' }}>
                      <PieceContent it={c.pieces[0]} />
                    </div>
                  </div>
                  <div className="t-label" style={{ marginTop: 6 }}>{c.kind.texture}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* materials: what it's made of, and how its edges are finished */}
          <Section title="Materials">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {kept.map((c) => (
                <div key={c.kind.key} style={{ padding: '12px 14px', borderRadius: 18, background: TILE }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.kind.material}</div>
                  <div className="t-label" style={{ color: MUTED, marginTop: 2 }}>{c.kind.finish}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* surface: where the board sits between opposites */}
          <Section title="Surface">
            <div style={{ display: 'grid', gap: 16, padding: '16px 16px 18px', borderRadius: 'var(--radius-card)', background: TILE }}>
              {AXES.map(([lo, hi], i) => (
                <div key={lo}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: surface[i] < 0.5 ? '#111' : MUTED }}>{lo}</span>
                    <span style={{ color: surface[i] >= 0.5 ? '#111' : MUTED }}>{hi}</span>
                  </div>
                  <div style={{ position: 'relative', height: 6, borderRadius: 999, background: 'var(--bg-canvas)' }}>
                    <motion.span
                      initial={false}
                      animate={{ left: `${surface[i] * 100}%` }}
                      transition={{ duration: 0.6, ease }}
                      style={{ position: 'absolute', top: -4, width: 14, height: 14, marginLeft: -7, borderRadius: 999, background: 'var(--bg-inverse)', boxShadow: '0 0 0 3px var(--bg-default)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* the clear ask: which kinds of pin to go after */}
          <Section title="Pins to look for" aside={<span className="t-label" style={{ color: MUTED }}>Tap to keep or drop</span>}>
            <div style={{ display: 'grid', gap: 8 }}>
            {counts.map((c, i) => {
              const off = dropped.includes(c.kind.key)
              return (
                <motion.button
                  key={c.kind.key}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setDropped((d) => (off ? d.filter((k) => k !== c.kind.key) : [...d, c.kind.key]))}
                  animate={{ opacity: off ? 0.38 : 1 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', boxSizing: 'border-box', padding: 8, paddingRight: 14, borderRadius: 20, textAlign: 'left', background: off ? 'transparent' : TILE, boxShadow: off ? 'inset 0 0 0 1.5px var(--bg-default)' : 'none' }}
                >
                  <div style={{ position: 'relative', width: 52, height: 52, flex: 'none', borderRadius: 14, background: 'var(--bg-canvas)' }}>
                    {c.pieces.slice(0, 2).map((p, k) => (
                      <div key={p.id} style={{ position: 'absolute', inset: k ? '14px 2px 2px 14px' : '4px 12px 12px 4px', transform: `rotate(${k ? 8 : -6}deg)` }}>
                        <PieceContent it={p} />
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, textDecoration: off ? 'line-through' : 'none' }}>{c.kind.name}</span>
                      {i === 0 && !off && <span style={{ padding: '1px 7px', borderRadius: 999, background: 'var(--red-100)', color: 'var(--red-700)', fontSize: 11, fontWeight: 600 }}>Lead</span>}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: '17px', color: MUTED, marginTop: 2 }}>{c.kind.look}</div>
                  </div>
                  <span
                    style={{
                      width: 22, height: 22, borderRadius: 999, flex: 'none', display: 'grid', placeItems: 'center',
                      background: off ? 'transparent' : 'var(--red-700)', boxShadow: off ? 'inset 0 0 0 1.5px rgba(17,17,17,.2)' : 'none', color: '#fff',
                    }}
                  >
                    {!off && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.6 2.6L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </span>
                </motion.button>
              )
            })}
            </div>
            <AnimatePresence>
              {dropped.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                  <div className="t-label" style={{ color: MUTED, paddingTop: 10 }}>
                    Less of {counts.filter((c) => dropped.includes(c.kind.key)).map((c) => c.kind.name.toLowerCase()).join(', ')}.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Section>

          {/* no save button: it keeps itself */}
          <div className="t-label" style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: MUTED }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#7bbf3a' }} />
            Saved automatically to Studio
          </div>
        </div>
      </motion.article>
    </motion.div>
  )
}
