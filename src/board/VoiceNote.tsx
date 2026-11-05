import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PlayIcon } from '../components/Icons'
import Squiggle from './Squiggle'

/** Board Note: a pinned avatar that opens into a voice note. */
export default function VoiceNote({ x, y }: { x: number; y: number }) {
  const [open, setOpen] = useState(true)
  const [playing, setPlaying] = useState(false)

  return (
    <motion.div
      onPointerDown={(e) => e.stopPropagation()}
      drag
      dragMomentum={false}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      style={{ position: 'absolute', left: x, top: y, zIndex: 25, transformOrigin: '0 0' }}
    >
      <motion.div
        layout
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: open ? 240 : 36,
          height: open ? 150 : 36,
          borderRadius: open ? '6px 20px 20px 20px' : '6px 18px 18px 18px',
          background: 'var(--bg-canvas)',
          boxShadow: '0 6px 20px rgba(0,0,0,.12)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <button
          aria-label={open ? 'Collapse note' : 'Open note'}
          onClick={() => setOpen((o) => !o)}
          style={{ position: 'absolute', left: 4, top: 4, width: 28, height: 28, borderRadius: 999, background: 'var(--bg-default)', border: '2px solid var(--red-700)' }}
        />
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ position: 'absolute', left: 42, top: 10, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>You · voice note</div>
              <div style={{ position: 'absolute', left: 16, top: 44, width: 208, fontSize: 14, lineHeight: '19px' }}>
                Love the grain on this flower. Keep the purple but make it softer.
              </div>
              <div style={{ position: 'absolute', left: 16, top: 100, width: 208, height: 36, borderRadius: 999, background: 'var(--input-bg)', display: 'flex', alignItems: 'center' }}>
                <motion.button
                  aria-label={playing ? 'Pause' : 'Play'}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setPlaying(true)
                    setTimeout(() => setPlaying(false), 12000)
                  }}
                  style={{ width: 28, height: 28, marginLeft: 4, borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', display: 'grid', placeItems: 'center', flexShrink: 0 }}
                >
                  <PlayIcon />
                </motion.button>
                <Squiggle width={130} height={26} strokeWidth={1.5} paused={!playing} />
                <span className="t-label" style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>0:12</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
