import { useState } from 'react'
import { motion } from 'framer-motion'
import { CloseIcon, SparkIcon } from '../components/Icons'
import { Pill } from '../components/Button'
import { asset } from '../components/asset'
import { FINDS } from './ingredients'

// three florals that suit the board; adding them drops in their cut-outs
const PICKS = ['phone', 'bags', 'tulip']

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
        position: 'absolute', left: 'var(--ui-x)', right: 'var(--ui-x)', top: 'var(--ui-top2)', height: 64, borderRadius: 999, zIndex: 34,
        padding: '0 8px 0 10px', display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', boxShadow: '0 12px 30px rgba(0,0,0,.2)',
      }}
    >
      <div style={{ position: 'relative', width: added ? 44 + 2 * 26 : 44 + 2 * 14, height: 44, flexShrink: 0, transition: 'width .3s' }}>
        {PICKS.map((id, i) => (
          <motion.img
            key={id}
            src={asset(FINDS[id].photo)}
            alt=""
            animate={{ x: added ? i * 26 : i * 14 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            style={{ position: 'absolute', left: 0, top: 0, width: 44, height: 44, borderRadius: 999, objectFit: 'cover', border: '2px solid var(--bg-inverse)' }}
          />
        ))}
      </div>
      <motion.div key={String(added)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0.6, fontSize: 11 }}>
          <SparkIcon /> Studio noticed
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: '18px' }}>{added ? 'Florals added' : 'More florals to match?'}</div>
      </motion.div>
      {!added && (
        <>
          <Pill
            label="Add"
            onClick={() => {
              setAdded(true)
              onAdd(PICKS)
              setTimeout(onDismiss, 1400)
            }}
          />
          <button aria-label="Dismiss" onClick={onDismiss} style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', opacity: 0.7 }}>
            <CloseIcon />
          </button>
        </>
      )}
    </motion.div>
  )
}
