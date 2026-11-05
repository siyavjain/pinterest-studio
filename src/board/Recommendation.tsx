import { useState } from 'react'
import { motion } from 'framer-motion'
import { CloseIcon, SparkIcon } from '../components/Icons'
import { Pill } from '../components/Button'

const PREVIEWS = ['p4-middle', 'p2-back', 'p5-middle']

/** "Studio noticed" suggestion card. Swipe it away, dismiss, or add. */
export default function Recommendation({ onAdd, onDismiss }: { onAdd: (srcs: string[]) => void; onDismiss: () => void }) {
  const [added, setAdded] = useState(false)

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, i) => Math.abs(i.offset.x) > 100 && onDismiss()}
      initial={{ y: -40, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -40, opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'absolute', left: 8, top: 126, width: 386, height: 174, borderRadius: 24,
        background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', zIndex: 34, padding: 18,
        boxShadow: '0 12px 30px rgba(0,0,0,.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.65, fontSize: 13 }}>
        <SparkIcon /> Studio noticed
      </div>
      <button aria-label="Dismiss" onClick={onDismiss} style={{ position: 'absolute', right: 16, top: 16 }}>
        <CloseIcon />
      </button>
      <motion.div key={String(added)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 10, width: 300, fontSize: 17, fontWeight: 600, lineHeight: '22px' }}>
        {added ? 'Added 3 grain textures to your board' : 'Your board leans soft gradients + bold type. Add grain to ground it?'}
      </motion.div>
      <div style={{ position: 'absolute', left: 18, bottom: 16, display: 'flex' }}>
        {PREVIEWS.map((p, i) => (
          <motion.img
            key={p}
            src={`/img/${p}.png`}
            alt=""
            animate={{ x: added ? i * 48 : i * 30 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            style={{ position: 'absolute', left: 0, bottom: 0, width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '2px solid var(--bg-inverse)' }}
          />
        ))}
      </div>
      <div style={{ position: 'absolute', right: 18, bottom: 16 }}>
        <Pill
          label={added ? 'Added' : 'Add to board'}
          selected={added}
          onClick={() => {
            if (added) return
            setAdded(true)
            onAdd(PREVIEWS)
            setTimeout(onDismiss, 1600)
          }}
        />
      </div>
    </motion.div>
  )
}
