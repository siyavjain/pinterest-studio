import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { asset } from '../components/asset'

// The "Loading screen" frame. One card in the middle flicks through the fourteen pins while a red
// line climbs from the Studio tab carrying the count from 0% to 100%. It ends on the sky leaves.
const PINS = [
  'pour/Water.jpg', 'pour/Ring.jpg', 'pour/Person.jpg', 'pour/Cave.jpg', 'pour/Window.jpg',
  'pour/Person air.jpg', 'pour/Water person.jpg', 'pour/Lead texture.jpg', 'pour/River.jpg',
  'pour/Leaf.jpg', 'pour/Person leaf.jpg', 'p3-back', 'p3-middle', 'pour/Sky leaves.jpg',
]
const CARD = { x: 116, y: 285, w: 170.37, h: 241.91, r: 17.7 }
const LAND_MS = 200 // the front card shows each pin for…
const HOLD_MS = 600 // …and rests this long on the last at 100%
const NAV_TOP = 772 // the line grows up from the nav bar…
const TOP_MARGIN = 70 // …and at 100% its count reaches the top margin, passing behind the stack
const RISE = NAV_TOP - TOP_MARGIN - 24

export default function Loading({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0) // which pin is on the front card
  const done = useRef(onDone)
  done.current = onDone
  // one smooth climb for the whole load; the line and the count both read it
  const progress = useMotionValue(0)
  const lineHeight = useTransform(progress, (p) => (p / 100) * RISE)
  const count = useTransform(progress, (p) => `${Math.round(p)}%`)

  useEffect(() => {
    const climb = animate(progress, 100, { duration: (LAND_MS * PINS.length) / 1000, ease: [0.45, 0, 0.25, 1] })
    const tick = setInterval(() => setShown((n) => Math.min(n + 1, PINS.length - 1)), LAND_MS)
    const end = setTimeout(() => done.current(), LAND_MS * PINS.length + HOLD_MS)
    return () => {
      climb.stop()
      clearInterval(tick)
      clearTimeout(end)
    }
  }, [progress])


  return (
    <div className="screen">
      {/* the count rides the top of a red line that climbs from the Studio tab */}
      <div aria-live="polite" style={{ position: 'absolute', left: 0, right: 0, bottom: 874 - NAV_TOP, display: 'grid', justifyItems: 'center' }}>
        <motion.span style={{ fontSize: 16, lineHeight: '24px', color: 'var(--red-700)', fontVariantNumeric: 'tabular-nums' }}>{count}</motion.span>
        <motion.span style={{ width: 1.5, height: lineHeight, background: 'var(--red-700)' }} />
      </div>

      <div style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: CARD.r, overflow: 'hidden' }}>
        {/* every pin is already in the card, so a switch is just a quick fade with nothing to load */}
        {PINS.map((src, i) => (
          <motion.img
            key={src}
            src={asset(src)}
            alt=""
            initial={false}
            animate={{ opacity: i <= shown ? 1 : 0 }}
            transition={{ duration: 0.12 }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ))}
      </div>

    </div>
  )
}
