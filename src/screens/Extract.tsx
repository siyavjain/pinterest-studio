import { motion } from 'framer-motion'
import { ActionButton, IconButton } from '../components/Button'
import { BackIcon } from '../components/Icons'
import { asset } from '../components/asset'
import Grain from '../components/Grain'

// The "Transition" and "Pin extration screen" frames. Swiping a project up pours its pins in:
// the left column rises from below while the right one drops from above, and both ease to rest
// on the four pins the extraction screen keeps.
const TILE = { w: 189, h: 265, gap: 16 }
const STEP = TILE.h + TILE.gap
const COLUMNS = [
  { x: 8, top: -19, rise: true, pins: ['Sky leaves', 'River'] },
  { x: 205, top: -52, rise: false, pins: ['Leaf', 'Person leaf'] },
]
const TRAVEL = 900 // both columns start just off screen, the same distance away
// light copies of the photos (pour/*.jpg), so nothing decodes mid-flight; Home preloads them
const pin = (name: string) => asset(`pour/${name}.jpg`)
export const POUR_PINS = COLUMNS.flatMap((c) => c.pins).map(pin)
// a quick start, then a soft glide into place
const POUR = { duration: 1, ease: [0.25, 0.1, 0.1, 1] } as const
const SETTLED = 0.7 // seconds in, when the screen's words arrive

export default function Extract({ onBack, onExtract }: { onBack: () => void; onExtract: () => void }) {
  const after = (delay: number) => ({ delay: SETTLED + delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const })
  return (
    <div className="screen" style={{ overflow: 'hidden' }}>
      {/* the project's photo, blurred, faintly behind the pins and fading out by the words */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={after(-0.3)}
        style={{ position: 'absolute', left: -263, top: -179, width: 928, height: 1232, pointerEvents: 'none' }}
      >
        <img src={pin('Sky leaves')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px)' }} />
        <Grain />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(252,250,247,.36) 47.552%, var(--bg-canvas) 61.798%)' }} />
      </motion.div>

      {COLUMNS.map((col) => (
        <motion.div
          key={col.x}
          initial={{ y: col.top + (col.rise ? TRAVEL : -TRAVEL) }}
          animate={{ y: col.top }}
          transition={POUR}
          style={{ position: 'absolute', left: col.x, top: 0, width: TILE.w, willChange: 'transform' }}
        >
          {col.pins.map((src, i) => (
            <img
              key={src}
              src={pin(src)}
              alt=""
              style={{ position: 'absolute', left: 0, top: i * STEP, width: TILE.w, height: TILE.h, borderRadius: 24, objectFit: 'cover' }}
            />
          ))}
        </motion.div>
      ))}

      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={after(0.1)} style={{ position: 'absolute', left: 8, top: 70 }}>
        <IconButton label="Back" onClick={onBack}>
          <BackIcon />
        </IconButton>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={after(0)}
        style={{ position: 'absolute', left: 8, right: 8, top: 576, textAlign: 'center' }}
      >
        <div className="t-title">14 Pins Ready to be Extracted</div>
        <p className="t-body" style={{ margin: '8px 0 32px' }}>
          Explore shared colors, materials, and shapes across
          <br />
          your Pins. Keep the elements that inspire you.
        </p>
        <ActionButton label="Extract Elements" onClick={onExtract} />
      </motion.div>
    </div>
  )
}
