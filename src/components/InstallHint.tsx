import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// In a phone's browser, a one-time note on adding Studio to the home screen: opened from there
// it runs full screen with no browser bars, which is how the prototype is meant to be seen.

const KEY = 'studio-install-hint'
const installed = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const seen = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export default function InstallHint() {
  const [open, setOpen] = useState(() => !installed() && !seen())
  const close = () => {
    setOpen(false)
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // storage blocked: it shows again next visit
    }
  }
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { delay: 1.2, type: 'spring', stiffness: 380, damping: 32 } }}
          exit={{ y: 80, opacity: 0 }}
          onClick={close}
          style={{
            position: 'fixed', left: 12, right: 12, bottom: 'calc(12px + env(safe-area-inset-bottom))', zIndex: 1000,
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 20,
            background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', fontSize: 14, lineHeight: '19px',
            boxShadow: '0 12px 32px rgba(0,0,0,.24)',
          }}
        >
          <img src={`${import.meta.env.BASE_URL}app/icon-180.png`} alt="" style={{ width: 36, height: 36, borderRadius: 9, flex: 'none' }} />
          <span style={{ flex: 1 }}>
            <b style={{ fontWeight: 600 }}>Open Studio full screen.</b>{' '}
            {ios ? 'Tap Share, then Add to Home Screen.' : 'Open the browser menu, then Add to Home screen.'}
          </span>
          <span aria-label="Dismiss" style={{ fontSize: 20, opacity: 0.6, padding: '0 4px' }}>×</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
