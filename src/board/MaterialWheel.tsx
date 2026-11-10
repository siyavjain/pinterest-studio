import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Sphere, { materialsOf } from './Sphere'
import type { Material } from './Sphere'
import { extractColours } from './colours'
import { asset } from '../components/asset'
import { CloseIcon } from '../components/Icons'

// "Colour & material": the selected piece broken down CMF-style, as a ring of lit spheres on a
// solid flower of circles. Tap a sphere to put that material on the board.

export const SIZE = 204 // the wheel's box
const BALL = 56
const RING = 66 // centre of the wheel to the centre of each ball
const PETAL = 84 // the backing circle behind each ball
const HEART = 108 // the backing circle in the middle
export const WHEEL_H = SIZE + 60 // with its title above and its hint below
const ease = [0.22, 1, 0.36, 1] as const

export default function MaterialWheel({ src, name, at, side, onAdd, onClose }: {
  src: string // the piece's image
  name: string
  at: { x: number; y: number } // top-left, in the board layer
  side: 'left' | 'right' | 'below' | 'above' // where it sits by the piece, so it grows out from it
  onAdd: (m: Material) => void
  onClose: () => void
}) {
  const [materials, setMaterials] = useState<Material[] | null>(null)
  const [picked, setPicked] = useState<number[]>([])
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    let live = true
    extractColours(asset(src), 3).then((c) => live && setMaterials(materialsOf(src, c.length ? c : ['#a9c79a', '#5f7f3a', '#e9e2d3'])))
    return () => {
      live = false
    }
  }, [src])

  const spots = (materials ?? []).map((_, i, all) => {
    const a = -Math.PI / 2 + (i / all.length) * Math.PI * 2
    return { x: SIZE / 2 + Math.cos(a) * RING, y: SIZE / 2 + Math.sin(a) * RING }
  })
  const label = hover != null && materials ? materials[hover].name : picked.length ? `${picked.length} added to the board` : 'Tap a sphere to add it'

  return (
    <motion.div
      onPointerDown={(e) => e.stopPropagation()}
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 8 }}
      transition={{ duration: 0.4, ease }}
      style={{
        position: 'absolute', left: at.x, top: at.y, width: SIZE, zIndex: 958, display: 'grid', justifyItems: 'center', gap: 6,
        transformOrigin: { right: '0 50%', left: '100% 50%', below: '50% 0', above: '50% 100%' }[side],
      }}
    >
      <div title={name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 3px 3px 10px', borderRadius: 999, background: 'var(--bg-canvas)', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Colour & material</span>
        <motion.button aria-label="Close" whileTap={{ scale: 0.9 }} onClick={onClose} style={{ width: 22, height: 22, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--bg-default)' }}>
          <CloseIcon size={12} />
        </motion.button>
      </div>

      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        {/* the backing: a solid flower made of a circle behind each ball and one in the middle */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <div style={{ position: 'absolute', left: SIZE / 2 - HEART / 2, top: SIZE / 2 - HEART / 2, width: HEART, height: HEART, borderRadius: '50%', background: '#ebe7e2' }} />
          {spots.map((p, i) => (
            <div key={i} style={{ position: 'absolute', left: p.x - PETAL / 2, top: p.y - PETAL / 2, width: PETAL, height: PETAL, borderRadius: '50%', background: '#ebe7e2' }} />
          ))}
        </div>

        {materials?.map((m, i) => {
          const on = picked.includes(i)
          return (
            <motion.button
              key={i}
              aria-label={`Add ${m.name} to the board`}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: on ? 0.9 : 1 }}
              whileHover={{ scale: on ? 0.9 : 1.06 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: picked.length ? 0 : i * 0.06 }}
              onHoverStart={() => setHover(i)}
              onHoverEnd={() => setHover(null)}
              onClick={() => {
                if (on) return
                setPicked((p) => [...p, i])
                onAdd(m)
              }}
              style={{ position: 'absolute', left: spots[i].x - BALL / 2, top: spots[i].y - BALL / 2, width: BALL, height: BALL, borderRadius: '50%', opacity: on ? 0.55 : 1 }}
            >
              <Sphere m={m} size={BALL} />
            </motion.button>
          )
        })}
        {!materials && (
          <span className="t-label" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}>Reading its materials…</span>
        )}
      </div>

      <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(252,250,247,.9)', color: 'var(--text-secondary)', fontSize: 11, lineHeight: '16px', whiteSpace: 'nowrap' }}>{label}</span>
    </motion.div>
  )
}
