import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sheet from './Sheet'
import { Pill } from '../components/Button'
import { PlusIcon } from '../components/Icons'
import { asset } from '../components/asset'
import { useWeb } from '../components/view'

// "Add more": three places pins can come from. Studio's picks for this board, pins saved on your
// other boards, and photos from your own device. (Voice can also open it on the board's ingredients.)

export type AddTab = 'similar' | 'boards' | 'device' | 'ingredients'

// pins that match the moodboard, each with its width ÷ height
const SIMILAR = ([
  [46, 780, 1170], [52, 1080, 1348], [47, 1080, 1346], [53, 928, 1232], [48, 928, 1232], [56, 736, 981],
  [49, 1454, 1818], [59, 1000, 1500], [51, 1002, 1440], [54, 736, 909], [55, 1080, 1350], [60, 1440, 1440],
  [57, 715, 1430], [58, 1000, 1500], [61, 1080, 1350], [62, 736, 1104],
] as const).map(([n, w, h]) => ({ src: `image ${n}`, aspect: w / h }))

// your other Studio boards, and the pins saved on each
const BOARDS = [
  { name: 'Collage', p: 1 },
  { name: 'Interiors', p: 2 },
  { name: 'Shoes', p: 4 },
  { name: 'Sport', p: 5 },
].map((b) => ({ name: b.name, pins: ['front', 'middle', 'back'].map((k) => ({ src: `p${b.p}-${k}`, aspect: 364 / 517 })) }))

const DEVICE = [
  { src: 'image 59', aspect: 1000 / 1500 }, // limes and blossom
  { src: 'image 61', aspect: 1080 / 1350 }, // lime leaves
  { src: 'image 58', aspect: 1000 / 1500 }, // star fruit
]

const COLOURS = ['#5F7F3A', '#A9C79A', '#6FA3C9', '#E9E2D3', '#2F4A2A', '#C8D96A']
const TEXTURES = [
  { name: 'Water', src: 'image 59' },
  { name: 'Leaf', src: 'image 54' },
  { name: 'Glass', src: 'image 56' },
  { name: 'Petal', src: 'image 60' },
]
const TYPE = ['Wavy ribbon type', 'Bold grotesk', 'Puffy blobs', 'Cut-out collage']

const SOURCES: { tab: AddTab; label: string }[] = [
  { tab: 'similar', label: 'Studio picks' },
  { tab: 'boards', label: 'Your boards' },
  { tab: 'device', label: 'Your device' },
]
const slide = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 }, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } }

/** A pin with a + to put it on the board. Adding turns the + a quarter-ish turn into a red ×;
 *  tapping the × turns it back and takes the pin off the board again. */
function Tile({ src, aspect, height, added, onToggle }: { src: string; aspect: number; height?: number; added: boolean; onToggle: () => void }) {
  return (
    <div style={{ position: 'relative', breakInside: 'avoid', marginBottom: 8 }}>
      <img src={asset(src)} alt="" style={{ display: 'block', width: '100%', height: height ?? 'auto', aspectRatio: height ? undefined : String(aspect), objectFit: 'cover', borderRadius: 16, background: 'var(--bg-default)' }} />
      <motion.button
        aria-label={added ? 'Remove from board' : 'Add to board'}
        aria-pressed={added}
        whileTap={{ scale: 0.85 }}
        initial={false}
        animate={{ backgroundColor: added ? '#ad001a' : '#fcfaf7', color: added ? '#fcfaf7' : '#111111' }}
        transition={{ duration: 0.25 }}
        onClick={onToggle}
        style={{ position: 'absolute', right: 8, top: 8, width: 30, height: 30, borderRadius: 999, display: 'grid', placeItems: 'center' }}
      >
        {/* the + turns into a × and back, with a little spring to the turn */}
        <motion.span initial={false} animate={{ rotate: added ? 135 : 0 }} transition={{ type: 'spring', stiffness: 320, damping: 18 }} style={{ display: 'grid' }}>
          <PlusIcon size={16} />
        </motion.span>
      </motion.button>
    </div>
  )
}

export default function ExploreSheet({ open, onClose, onAdd, onRemove, subject = 'this board', initialTab = 'similar' }: {
  open: boolean
  onClose: () => void
  onAdd: (src: string, aspect: number) => string // the board piece it made
  onRemove: (pieceId: string) => void
  subject?: string
  initialTab?: AddTab
}) {
  const [tab, setTab] = useState<AddTab>(initialTab)
  const [added, setAdded] = useState<Record<string, string>>({}) // pin → the piece it put on the board
  // photos already brought in from this device (the Figma "Added from this device" row); new picks join the front
  const [uploads, setUploads] = useState<{ src: string; aspect: number }[]>(DEVICE)
  const [dragOver, setDragOver] = useState(false)
  const picker = useRef<HTMLInputElement>(null)
  const web = useWeb()

  const add = (src: string, aspect: number) => {
    const piece = onAdd(src, aspect)
    setAdded((a) => ({ ...a, [src]: piece }))
  }
  // a photo from the device is already added, so it shows a ×: tapping it takes the photo off the
  // board (if it went on this time) and out of the row
  const drop = (src: string) => {
    if (added[src]) onRemove(added[src])
    setAdded(({ [src]: _, ...rest }) => rest)
    setUploads((u) => u.filter((x) => x.src !== src))
  }
  const toggle = (src: string, aspect: number) => {
    const piece = added[src]
    if (!piece) return add(src, aspect)
    onRemove(piece)
    setAdded(({ [src]: _, ...rest }) => rest)
  }
  // photos from the device: read each one's shape, then put it straight on the board
  const takeFiles = (files: FileList | null) => {
    Array.from(files ?? []).filter((f) => f.type.startsWith('image/')).forEach((f) => {
      const src = URL.createObjectURL(f)
      const img = new Image()
      img.onload = () => {
        const aspect = img.naturalWidth / img.naturalHeight || 1
        setUploads((u) => [{ src, aspect }, ...u])
        add(src, aspect)
      }
      img.src = src
    })
  }

  const ingredients = tab === 'ingredients'
  const line =
    tab === 'similar' ? `${SIMILAR.length} picks for ${subject}`
      : tab === 'boards' ? `Pins saved on your other boards`
      : tab === 'device' ? 'Photos and screenshots from this device'
      : `Pulled from ${subject}`

  return (
    <Sheet open={open} onClose={onClose} height={620} handleOnly>
      {/* on the web the panel scrolls as a whole, so the title and tabs stay pinned at its top */}
      <div style={{ padding: '14px 20px 0', ...(web && { position: 'sticky', top: -8, zIndex: 2, paddingBottom: 14, background: 'var(--bg-canvas)' }) }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>{ingredients ? 'Ingredients' : 'Add more'}</div>
        <div className="t-body">{line}</div>
        {!ingredients && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {SOURCES.map((s) => <Pill key={s.tab} label={s.label} selected={tab === s.tab} onClick={() => setTab(s.tab)} />)}
          </div>
        )}
      </div>

      {/* the phone's sheet is a fixed height, so the list scrolls inside it; the web's panel
          runs the full window height and scrolls as a whole */}
      <div style={{ position: 'relative', marginTop: 16, overflowX: 'hidden', ...(web ? {} : { height: 470, overflowY: 'auto' }) }}>
        <AnimatePresence initial={false} mode="popLayout">
          {tab === 'similar' && (
            <motion.div key="similar" {...slide} style={{ columnCount: 2, columnGap: 8, padding: '0 8px 40px' }}>
              {SIMILAR.map((s) => <Tile key={s.src} {...s} added={!!added[s.src]} onToggle={() => toggle(s.src, s.aspect)} />)}
            </motion.div>
          )}

          {tab === 'boards' && (
            <motion.div key="boards" {...slide} style={{ padding: '0 8px 40px', display: 'grid', gap: 18 }}>
              {BOARDS.map((b) => (
                <section key={b.name}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 12px 8px' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</span>
                    <span className="t-label" style={{ color: 'var(--text-secondary)' }}>{b.pins.length} pins</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    {b.pins.map((p) => <Tile key={p.src} {...p} added={!!added[p.src]} onToggle={() => toggle(p.src, p.aspect)} />)}
                  </div>
                </section>
              ))}
            </motion.div>
          )}

          {tab === 'device' && (
            <motion.div key="device" {...slide} style={{ padding: '0 16px 40px', display: 'grid', gap: 16 }}>
              <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(e) => { takeFiles(e.target.files); e.target.value = '' }} />
              {/* tap to pick photos; on a computer, files can be dropped here too */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => picker.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); takeFiles(e.dataTransfer.files) }}
                style={{
                  height: 200, borderRadius: 24, border: `1.5px dashed ${dragOver ? 'var(--red-700)' : 'rgba(17,17,17,.2)'}`,
                  background: dragOver ? 'rgba(173,0,26,.05)' : 'var(--bg-default)', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 10,
                  transition: 'border-color .2s, background .2s',
                }}
              >
                <span style={{ width: 48, height: 48, borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', display: 'grid', placeItems: 'center' }}>
                  <PlusIcon size={20} />
                </span>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Choose photos</span>
                <span className="t-label" style={{ color: 'var(--text-secondary)' }}>{web ? 'or drop them here' : 'from your camera roll or files'}</span>
              </motion.button>
              {uploads.length > 0 && (
                <section>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Added from this device</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    {uploads.map((u) => <Tile key={u.src} {...u} height={168} added onToggle={() => drop(u.src)} />)}
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {ingredients && (
            <motion.div key="ingredients" {...slide} style={{ padding: '0 20px 40px', display: 'grid', gap: 22 }}>
              <section>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Colours</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {COLOURS.map((c) => <motion.div key={c} whileTap={{ scale: 0.9 }} style={{ width: 44, height: 44, borderRadius: 999, background: c }} />)}
                </div>
              </section>
              <section>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Textures</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {TEXTURES.map((t) => (
                    <div key={t.name} style={{ display: 'grid', gap: 6 }}>
                      <img src={asset(t.src)} alt="" style={{ width: 80, height: 80, borderRadius: 14, objectFit: 'cover', background: 'var(--bg-default)' }} />
                      <span className="t-label" style={{ color: 'var(--text-secondary)' }}>{t.name}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Type & shape</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TYPE.map((t) => <Pill key={t} label={t} />)}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sheet>
  )
}
