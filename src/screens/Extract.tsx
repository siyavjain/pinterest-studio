import { motion } from 'framer-motion'
import { ActionButton, IconButton } from '../components/Button'
import { BackIcon } from '../components/Icons'

// Positions from the "Pin extration screen" frame
const PINS = [
  { src: 'pin-1', x: 8, y: -19 },
  { src: 'pin-4', x: 8, y: 262 },
  { src: 'pin-2', x: 205, y: -52 },
  { src: 'pin-3', x: 205, y: 229 },
]

export default function Extract({ onBack, onExtract }: { onBack: () => void; onExtract: () => void }) {
  return (
    <div className="screen">
      {PINS.map((p, i) => (
        <motion.img
          key={p.src}
          src={`/img/${p.src}.png`}
          alt=""
          initial={{ opacity: 0, y: p.y + 60, scale: 0.94 }}
          animate={{ opacity: 1, y: p.y, scale: 1 }}
          transition={{ delay: 0.08 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'absolute', left: p.x, top: 0, width: 189, height: 265, borderRadius: 24, objectFit: 'cover' }}
        />
      ))}

      <IconButton label="Back" onClick={onBack} style={{ position: 'absolute', left: 8, top: 70 }}>
        <BackIcon />
      </IconButton>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'absolute', left: 8, right: 8, top: 576, textAlign: 'center' }}
      >
        <div className="t-title">14 pins ready to be extracted</div>
        <p className="t-body" style={{ margin: '8px 0 32px' }}>
          Studio pulls out the colours, materials and shapes these pins share. You keep what fits.
        </p>
        <ActionButton label="Extract Pins" onClick={onExtract} />
      </motion.div>
    </div>
  )
}
