import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls } from 'framer-motion'

/** Bottom sheet: slides up, swipe down (or tap the scrim) to close.
 *  With handleOnly, only the top strip starts the swipe so the content can scroll. */
export default function Sheet({ open, onClose, children, height, handleOnly }: {
  open: boolean
  onClose: () => void
  children: ReactNode
  height?: number
  handleOnly?: boolean
}) {
  const controls = useDragControls()
  const host = document.getElementById('overlay')
  if (!host) return null

  // rendered above the nav bar
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 40, pointerEvents: 'auto' }}
          />
          <motion.div
            key="sheet"
            drag="y"
            dragControls={controls}
            dragListener={!handleOnly}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.9 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose()
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height,
              background: 'var(--bg-canvas)',
              borderRadius: '32px 32px 0 0',
              boxShadow: '0 -8px 32px rgba(0,0,0,.12)',
              zIndex: 41,
              pointerEvents: 'auto',
              paddingBottom: 34,
              overflow: 'hidden',
            }}
          >
            {handleOnly && (
              <div
                onPointerDown={(e) => controls.start(e)}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, touchAction: 'none', zIndex: 1, cursor: 'grab' }}
              />
            )}
            <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(95,95,95,.3)', margin: '10px auto 0' }} />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    host,
  )
}
