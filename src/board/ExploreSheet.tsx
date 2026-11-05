import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sheet from './Sheet'
import { Pill } from '../components/Button'
import { PlusIcon } from '../components/Icons'
import { asset } from '../components/asset'

const SIMILAR = [
  { src: 'p3-middle', h: 200 },
  { src: 'p2-front', h: 150 },
  { src: 'p5-middle', h: 120 },
  { src: 'p4-back', h: 140 },
  { src: 'p1-front', h: 190 },
  { src: 'p5-front', h: 130 },
]
const COLOURS = ['#7B5CFF', '#C8F02E', '#F4A6C4', '#FF7A3D', '#3E5C2A', '#1E1E1E']
const TEXTURES = [
  { name: 'Grain', src: 'p4-middle' },
  { name: 'Gloss', src: 'board-gradient' },
  { name: 'Paper', src: 'p2-back' },
  { name: 'Grass', src: 'p3-front' },
]
const TYPE = ['Wavy ribbon type', 'Bold grotesk', 'Puffy blobs', 'Cut-out collage']

export default function ExploreSheet({ open, onClose, onAdd, subject = 'this board', initialTab = 'similar' }: {
  open: boolean
  onClose: () => void
  onAdd: (src: string) => void
  subject?: string
  initialTab?: 'similar' | 'ingredients'
}) {
  const [tab, setTab] = useState<'similar' | 'ingredients'>(initialTab)
  const [added, setAdded] = useState<string[]>([])

  return (
    <Sheet open={open} onClose={onClose} height={620} handleOnly>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Explore</div>
        <div className="t-body">{tab === 'similar' ? `12 more like ${subject}` : `Pulled from ${subject}`}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Pill label="Similar" selected={tab === 'similar'} onClick={() => setTab('similar')} />
          <Pill label="Ingredients" selected={tab === 'ingredients'} onClick={() => setTab('ingredients')} />
        </div>
      </div>

      <div style={{ position: 'relative', height: 470, marginTop: 16, overflowY: 'auto', overflowX: 'hidden' }}>
        <AnimatePresence initial={false} mode="popLayout">
          {tab === 'similar' ? (
            <motion.div
              key="similar"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ columnCount: 2, columnGap: 8, padding: '0 8px 40px' }}
            >
              {SIMILAR.map((s) => {
                const isAdded = added.includes(s.src)
                return (
                  <div key={s.src} style={{ position: 'relative', breakInside: 'avoid', marginBottom: 8 }}>
                    <img src={asset(s.src)} alt="" style={{ width: '100%', height: s.h, objectFit: 'cover', borderRadius: 16 }} />
                    <motion.button
                      aria-label="Add to board"
                      whileTap={{ scale: 0.85 }}
                      animate={{ backgroundColor: isAdded ? '#ad001a' : '#fcfaf7', color: isAdded ? '#fcfaf7' : '#111111', rotate: isAdded ? 45 : 0 }}
                      onClick={() => {
                        if (isAdded) return
                        setAdded((a) => [...a, s.src])
                        onAdd(s.src)
                      }}
                      style={{ position: 'absolute', right: 8, top: 8, width: 30, height: 30, borderRadius: 999, display: 'grid', placeItems: 'center' }}
                    >
                      <PlusIcon size={16} />
                    </motion.button>
                  </div>
                )
              })}
            </motion.div>
          ) : (
            <motion.div
              key="ingredients"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: '0 20px 40px', display: 'grid', gap: 22 }}
            >
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
