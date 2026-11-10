import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Look, Part } from './Piece'
import { CloseIcon, DownloadIcon, PlusIcon } from '../components/Icons'
import { IconButton, Pill } from '../components/Button'
import ShareSheet from './ShareSheet'
import { downloadConceptPdf } from './conceptPdf'
import { useWeb } from '../components/view'
import { asset } from '../components/asset'
import Grain from '../components/Grain'
import Sphere, { colourName } from './Sphere'

// The board, summed up once it's done: what it shows, its colours, and which kinds
// of pins to go after for this concept.

type Piece = Look & { id: string; x: number; y: number; w: number; h: number; label?: string }

// The kinds of pin a board is made of, matched on the piece's image. Order matters:
// "tree-hand" is a hand before it's nature.
const KINDS = [
  { key: 'type', test: /ribbon|scary/, name: 'Loud type stickers', look: 'Wavy, hand-set words in candy colours', short: 'loud type',
    texture: 'Puffy ink', material: 'Sticker vinyl', finish: 'Die-cut white edge', surface: [0.75, 0.55, 0.15] },
  { key: 'people', test: /hand|cap|head-hill|image (34|37|40|44|45)/, name: 'Hands & faces', look: 'Gestures and portraits, cropped playfully', short: 'playful hands',
    texture: 'Photo grain', material: 'Photo print', finish: 'Rough scissor cut', surface: [0.35, 0.3, 0.55] },
  { key: 'florals', test: /flower|bloom|ws-14|poppy|peony|gardener|bags|tulip|phone|wanderlust|traffic|carrot/, name: 'Cut-out florals', look: 'Single blooms cut clean, no backdrop', short: 'cut florals',
    texture: 'Petal veins', material: 'Petals & paper', finish: 'Clean cut, soft shadow', surface: [0.25, 0.7, 0.3] },
  { key: 'gradients', test: /gradient|blob/, name: 'Soft gradients', look: 'Blurry, grainy fields of colour', short: 'soft gradients',
    texture: 'Airbrush haze', material: 'Light & blur', finish: 'Edgeless, fades out', surface: [0.55, 0.15, 0.75] },
  { key: 'nature', test: /meadow|hill|nature|grass|sit|lamb|image (35|36|38|39|41|42)/, name: 'Open nature', look: 'Grass, hills and sky as cut-outs', short: 'open nature',
    texture: 'Grass grain', material: 'Collage paper', finish: 'Torn, organic edge', surface: [0.1, 0.45, 0.85] },
] as const

// plain names for the palette, so the summary can say it out loud (the same names as the spheres)
const nameOf = (hex: string) => colourName(hex).toLowerCase()
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// where the board sits between each pair: 0 = left word, 1 = right word
const AXES = [['Matte', 'Glossy'], ['Flat', 'Dimensional'], ['Clean', 'Grainy']] as const
// how much of the board each palette colour carries, in order
const SHARE = [34, 24, 18, 14, 10]
const ROLE = ['Lead', 'Pop', 'Pop', 'Accent', 'Accent']

// dark text on light swatches, light on dark
const ink = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? 'rgba(17,17,17,.78)' : 'rgba(255,255,255,.92)'
}
const MUTED = 'var(--text-secondary)'

// What this board's concept card says and shows (the Figma "Concept card · full page")
const CONCEPT = {
  title: 'Organic Fluidity',
  about: 'A dreamlike exploration of nature, movement, and human connection. Soft, flowing forms, translucent textures, and botanical greens blend with aquatic blues to create an ethereal visual language that feels fresh, immersive, and effortlessly organic.',
  wash: 'Sky leaves',
  materials: [
    { name: 'Sheer Fabric', src: 'image 49', size: 140, at: [20, 130] },
    { name: 'Water', src: 'image 56', size: 101, at: [172, 100] },
    { name: 'Reflective', src: 'image 54', size: 119, at: [252, 196] },
    { name: 'Foliage', src: 'Leaf', size: 84, at: [70, 296] },
  ],
  checklist: ['Soft, flowing forms', 'Translucent, layered textures', 'Botanical greens with aquatic blues', 'A human touch: hands or faces'],
  textures: [
    { name: 'Shadow Play', src: 'Person leaf', at: [28, 150], turn: -4, label: 'top' },
    { name: 'Translucence', src: 'Sky leaves', at: [196, 180], turn: 3, label: 'top' },
    { name: 'Veined Grain', src: 'Dry leaf', at: [36, 320], turn: -2, label: 'bottom' },
    { name: 'Organic Overgrowth', src: 'Window', at: [190, 340], turn: 4, label: 'bottom' },
  ],
} as const

const ease = [0.22, 1, 0.36, 1] as const

export type Check = { text: string; done: boolean }
export type Direction = {
  title: string; keep: string[]; drop: string[]; dropKeys: string[]; palette: string[]; savedAt: number
  statement?: string // the concept or artist statement, in the user's words
  checklist?: Check[] // what they want the concept to have
}

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

  const [dropped] = useState<string[]>(saved?.dropKeys ?? [])
  const kept = counts.filter((c) => !dropped.includes(c.kind.key))
  // older saves carry a name made up from the kinds of pin ("Cut florals & loud type"): this board's
  // concept is Organic Fluidity, so those start from that; a name the user typed themselves stays
  const autoNames = new Set([...KINDS.map((k) => cap(k.short)), ...KINDS.flatMap((x) => KINDS.map((y) => cap(`${x.short} & ${y.short}`)))])
  const [title, setTitle] = useState(!saved?.title || autoNames.has(saved.title) ? CONCEPT.title : saved.title)
  const [statement, setStatement] = useState(saved?.statement ?? '')
  const [checklist, setChecklist] = useState<Check[]>(saved?.checklist ?? CONCEPT.checklist.map((text) => ({ text, done: false })))
  const [newItem, setNewItem] = useState('')
  const [sharing, setSharing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [kept2, setKept2] = useState(false) // saved from the share sheet

  const web = useWeb()

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
        title: title.trim() || 'Untitled concept', palette,
        keep: kept.map((c) => c.kind.name),
        drop: counts.filter((c) => dropped.includes(c.kind.key)).map((c) => c.kind.name),
        dropKeys: dropped, savedAt: Date.now(), statement, checklist,
      })
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, dropKey, statement, checklist])
  const addItem = () => {
    const text = newItem.trim()
    if (!text) return
    setChecklist((c) => [...c, { text, done: false }])
    setNewItem('')
  }

  const swatches = palette.slice(0, 5)

  // the name's box grows with it, so a one-line name leaves no gap
  const titleBox = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = titleBox.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [title])

  const kicker = (text: string) => <div style={{ fontSize: 13, lineHeight: '18px', color: MUTED }}>{text}</div>
  const heading = (text: string) => (
    <h2 style={{ margin: '4px 0 0', fontSize: 40, lineHeight: '42px', fontWeight: 600, letterSpacing: '-0.03em', color: '#111' }}>{text}</h2>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ position: 'absolute', inset: 0, zIndex: 80 }}
    >
    {/* the share sheet opens here, above the card rather than under it */}
    <div id="concept-overlay" style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }} />
    <div
      data-scroll // the board's trackpad panning leaves this alone, so the card scrolls
      style={{ position: 'absolute', inset: 0, touchAction: 'pan-y', overscrollBehavior: 'contain', background: 'var(--bg-canvas)', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none' }}
    >
      {/* close stays in reach the whole way down */}
      <div style={{ position: 'sticky', top: 0, height: 0, zIndex: 6 }}>
        <IconButton label="Close concept card" onClick={onClose} style={{ position: 'absolute', right: web ? 24 : 12, top: web ? 24 : 'var(--ui-top)', background: 'rgba(252,250,247,.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <CloseIcon />
        </IconButton>
      </div>

      {/* the Figma "Concept card · full page": a 402-wide page, drawn larger on the web */}
      <div style={{ width: 402, margin: '0 auto', zoom: web ? 1.4 : 1 } as React.CSSProperties}>
        {/* ---------- hero: a blurred, grainy wash of the board with the concept said in the middle ---------- */}
        <section style={{ position: 'relative', height: 483, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: -60, top: -60, width: 522, height: 820, overflow: 'hidden' }}>
            <img src={asset(CONCEPT.wash)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px)' }} />
            <Grain opacity={0.3} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(252,250,247,.23)' }} />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease }}
            style={{ position: 'absolute', left: 39, top: 180, width: 324, display: 'grid', justifyItems: 'center', textAlign: 'center' }}
          >
            <div style={{ fontSize: 13, lineHeight: '18px', color: 'rgba(17,17,17,.7)' }}>Concept</div>
            {/* the name wraps and can be retyped */}
            <textarea
              aria-label="Concept name"
              ref={titleBox}
              value={title}
              rows={1}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
              style={{ display: 'block', width: '100%', marginTop: 4, border: 0, outline: 'none', padding: 0, resize: 'none', background: 'none', font: 'inherit', fontSize: 38, lineHeight: '40px', fontWeight: 600, letterSpacing: '-0.03em', color: '#111', textAlign: 'center', overflow: 'hidden' }}
            />
            <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: '21px', fontWeight: 500, color: '#111' }}>{CONCEPT.about}</p>
          </motion.div>
        </section>

        {/* ---------- 01 colour: torn paper strips ---------- */}
        <section style={{ position: 'relative', marginTop: -40, padding: '60px 7px 20px', background: 'var(--bg-canvas)', clipPath: torn(3, 'top') }}>
          <div style={{ padding: '0 13px' }}>
            {kicker('01 - Color')}
            {heading('The palette')}
          </div>
          <div style={{ display: 'flex', marginTop: 20, height: 222 }}>
            {swatches.map((c, i) => (
              <motion.div
                key={c}
                initial={{ flexGrow: 0, opacity: 0 }}
                animate={{ flexGrow: SHARE[i], opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.07, duration: 0.9, ease }}
                style={{
                  flexBasis: 0, minWidth: 0, marginLeft: i ? -10 : 0, background: c, clipPath: torn(10 + i, 'sides'), transform: `rotate(${i % 2 ? 1.2 : -1}deg)`,
                  position: 'relative', padding: '14px 14px 18px', boxSizing: 'border-box', color: ink(c),
                }}
              >
                <span style={{ fontSize: 11, lineHeight: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{SHARE[i] >= 18 ? ROLE[i] : ''}</span>
                {/* centred on the part you can see: the next strip covers this one's right 10px */}
                <span style={{ position: 'absolute', left: 0, right: i < swatches.length - 1 ? 10 : 0, bottom: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', whiteSpace: 'nowrap', fontWeight: 300 }}>
                  <span style={{ fontSize: 12, lineHeight: '18px' }}>{cap(nameOf(c))}</span>
                  <span style={{ fontSize: 10, lineHeight: '18px', opacity: 0.85 }}>{c.toUpperCase()}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ---------- 02 material: photo spheres, each named for what it feels like ---------- */}
        <section style={{ position: 'relative', height: 410, padding: '20px 20px 0', boxSizing: 'border-box' }}>
          {kicker('02 - Material')}
          {heading('What it’s made of')}
          {CONCEPT.materials.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.3 + i * 0.08 }}
              style={{ position: 'absolute', left: m.at[0], top: m.at[1], width: m.size, display: 'grid', justifyItems: 'center', gap: 6 }}
            >
              <Sphere m={{ kind: 'texture', src: m.src, at: [0.5, 0.45], under: '#e9e4df', name: m.name, zoom: 1.6 }} size={m.size} />
              <span style={{ fontSize: 12, lineHeight: '16px', color: MUTED, whiteSpace: 'nowrap' }}>{m.name}</span>
            </motion.div>
          ))}
        </section>

        {/* ---------- 03 texture: close-ups torn out and layered ---------- */}
        <section style={{ position: 'relative', height: 580, padding: '56px 20px 0', boxSizing: 'border-box', background: 'var(--bg-default)', clipPath: torn(21, 'both') }}>
          {kicker('03 - Texture')}
          {heading('Up close')}
          {CONCEPT.textures.map((tx, i) => (
            <motion.div
              key={tx.name}
              initial={{ opacity: 0, y: 30, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: tx.turn }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.8, ease }}
              // 160 wide: turned by up to 4°, every tile still sits inside the 20px margins
              style={{ position: 'absolute', left: tx.at[0], top: tx.at[1], width: 160, height: 190, zIndex: i }}
            >
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#fcfaf7', clipPath: torn(30 + i, 'all'), boxShadow: '0 10px 30px rgba(0,0,0,.12)' }}>
                <img src={asset(tx.src)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span style={{ position: 'absolute', left: 10, [tx.label]: 12, padding: '3px 9px', borderRadius: 999, background: 'rgba(252,250,247,.9)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{tx.name}</span>
            </motion.div>
          ))}
        </section>

        {/* ---------- 04 finish: where the board sits between opposites, said big ---------- */}
        <section style={{ padding: '30px 20px 60px' }}>
          {kicker('04 - Finish')}
          {heading('The surface')}
          <div style={{ display: 'grid', gap: 22, marginTop: 24 }}>
            {AXES.map(([lo, hi], i) => (
              <div key={lo}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>
                  <span style={{ color: surface[i] < 0.5 ? '#111' : 'rgba(17,17,17,.25)' }}>{lo}</span>
                  <span style={{ color: surface[i] >= 0.5 ? '#111' : 'rgba(17,17,17,.25)' }}>{hi}</span>
                </div>
                <div style={{ position: 'relative', height: 1.5, marginTop: 8, background: 'rgba(17,17,17,.15)' }}>
                  <motion.span
                    initial={{ left: '50%' }}
                    animate={{ left: `${surface[i] * 100}%` }}
                    transition={{ delay: 0.4, duration: 0.9, ease }}
                    style={{ position: 'absolute', top: -5, width: 11, height: 11, marginLeft: -5.5, borderRadius: 999, background: 'var(--red-700)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- 05 statement: the concept in the user's own words ---------- */}
        <section style={{ padding: '10px 20px 0' }}>
          {kicker('05 - Statement')}
          {heading('In your words')}
          <textarea
            aria-label="Concept or artist statement"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Write your concept or artist statement: what this is about, and what you want people to feel."
            rows={6}
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 18, padding: 16, border: 0, outline: 'none', resize: 'vertical', borderRadius: 20, background: 'var(--bg-default)', font: 'inherit', fontSize: 16, lineHeight: '24px', color: '#111' }}
          />
          <div style={{ fontSize: 12, color: MUTED, marginTop: 6, textAlign: 'right' }}>{statement.trim() ? `${statement.trim().split(/\s+/).length} words` : 'Saved as you type'}</div>
        </section>

        {/* ---------- 06 checklist: what it has to have ---------- */}
        <section style={{ padding: '40px 20px 0' }}>
          {kicker('06 - Checklist')}
          {heading('Make sure it has')}
          <div style={{ display: 'grid', marginTop: 16 }}>
            {checklist.map((c, i) => (
              <motion.div key={c.text + i} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid rgba(17,17,17,.12)' }}>
                <motion.button
                  aria-label={c.done ? `Untick ${c.text}` : `Tick ${c.text}`}
                  aria-pressed={c.done}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setChecklist((l) => l.map((x, k) => (k === i ? { ...x, done: !x.done } : x)))}
                  style={{ width: 24, height: 24, borderRadius: 999, flex: 'none', display: 'grid', placeItems: 'center', background: c.done ? 'var(--bg-inverse)' : 'transparent', boxShadow: c.done ? 'none' : 'inset 0 0 0 1.5px rgba(17,17,17,.3)', transition: 'background .2s' }}
                >
                  {c.done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.6 2.6L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </motion.button>
                <span style={{ flex: 1, fontSize: 16, lineHeight: '22px', color: c.done ? MUTED : '#111', textDecoration: c.done ? 'line-through' : 'none' }}>{c.text}</span>
                <button aria-label={`Remove ${c.text}`} onClick={() => setChecklist((l) => l.filter((_, k) => k !== i))} style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', color: MUTED, flex: 'none' }}>
                  <CloseIcon size={14} />
                </button>
              </motion.div>
            ))}
            {/* add your own */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid rgba(17,17,17,.12)' }}>
              <span style={{ width: 24, height: 24, borderRadius: 999, flex: 'none', display: 'grid', placeItems: 'center', border: '1.5px dashed rgba(17,17,17,.3)', boxSizing: 'border-box', color: MUTED }}>
                <PlusIcon size={12} />
              </span>
              <input
                aria-label="Add to the checklist"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                placeholder="Add something it needs…"
                style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'none', font: 'inherit', fontSize: 16, color: '#111' }}
              />
              {newItem.trim() && <Pill label="Add" onClick={addItem} />}
            </div>
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{checklist.filter((c) => c.done).length} of {checklist.length} done</div>
        </section>

        {/* ---------- finish: take it with you ---------- */}
        <section style={{ padding: '40px 20px 140px', display: 'grid', gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setExporting(true)
              downloadConceptPdf({
                title: title.trim() || CONCEPT.title, about: CONCEPT.about, wash: CONCEPT.wash,
                palette: swatches.map((c, i) => ({ colour: c, name: cap(nameOf(c)), share: SHARE[i] })),
                materials: CONCEPT.materials.map((m) => ({ name: m.name, src: m.src })),
                textures: CONCEPT.textures.map((t) => ({ name: t.name, src: t.src })),
                surface: AXES.map(([lo, hi], i) => ({ lo, hi, at: surface[i] })),
                statement, checklist,
              }).finally(() => setExporting(false))
            }}
            style={{ height: 52, borderRadius: 999, background: 'var(--bg-default)', color: '#111', fontSize: 16, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <DownloadIcon size={18} /> {exporting ? 'Making the PDF…' : 'Download PDF'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setSharing(true)}
            style={{ height: 52, borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', fontSize: 16, fontWeight: 500 }}
          >
            Share
          </motion.button>
          {kept2 && <div style={{ fontSize: 12, color: MUTED, textAlign: 'center' }}>Saved to your Studio</div>}
        </section>
      </div>
    </div>
    <ShareSheet
      open={sharing}
      onClose={() => setSharing(false)}
      hostId="concept-overlay"
      cover={asset(CONCEPT.wash)}
      title={title || 'Concept'}
      subtitle="Concept card · Ads"
      link="pin.it/studio/ads/concept"
      note="Anyone with the link can view this concept."
      action="Share concept"
      onSave={() => setKept2(true)}
    />
    </motion.div>
  )
}

/** A torn-paper edge as a clip-path: rough along the chosen sides, the same every time for a seed. */
function torn(seed: number, edges: 'top' | 'sides' | 'both' | 'all') {
  let x = seed * 9301 + 49297
  const rand = () => ((x = (x * 9301 + 49297) % 233280) / 233280)
  const rough = (n: number, amp: number) => Array.from({ length: n + 1 }, (_, i) => [(i / n) * 100, rand() * amp])
  const pts: string[] = []
  const T = edges === 'sides' ? 0 : edges === 'all' ? 3 : 2.2 // depth of the tear, in %
  const S = edges === 'sides' || edges === 'all' ? 4 : 0
  const B = edges === 'both' || edges === 'all' ? T : 0
  // top, left to right
  rough(24, edges === 'sides' ? 0 : T).forEach(([px, d]) => pts.push(`${px}% ${d}%`))
  // right side, top to bottom
  rough(14, S).forEach(([py, d]) => pts.push(`${100 - d}% ${py}%`))
  // bottom, right to left
  rough(24, B).reverse().forEach(([px, d]) => pts.push(`${px}% ${100 - d}%`))
  // left side, bottom to top
  rough(14, S).reverse().forEach(([py, d]) => pts.push(`${d}% ${py}%`))
  return `polygon(${pts.join(', ')})`
}
