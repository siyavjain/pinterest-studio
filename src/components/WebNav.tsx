import { motion } from 'framer-motion'
import { GLYPHS } from './NavBar'
import { PIN_PATH } from './pin'

// The phone's nav bar as a column for the web: the same four 50×60 slots and glyphs,
// beige when idle, and the active bubble black and 10px taller, just like on the phone.
// The board fills the rest.

type Key = 'home' | 'search' | 'studio' | 'profile'
const ORDER: Key[] = ['home', 'search', 'studio', 'profile']
const LABEL: Record<Key, string> = { home: 'Home', search: 'Explore', studio: 'Studio', profile: 'Profile' }
const ease = [0.22, 1, 0.36, 1] as const

function Bubble({ k, on, label, onClick }: { k: Key | 'phone'; on?: boolean; label: string; onClick?: () => void }) {
  return (
    <motion.button aria-label={label} title={label} whileTap={{ scale: 0.92 }} onClick={onClick} style={{ position: 'relative', width: 50, height: 60 }}>
      {/* the phone's slot exactly: the bubble sits on the bottom edge and grows up when active */}
      <motion.span
        initial={false}
        animate={{ height: on ? 60 : 50, backgroundColor: on ? '#151413' : '#e9e4df' }}
        transition={{ duration: 0.35, ease }}
        style={{ position: 'absolute', left: 0, bottom: 0, width: 50, borderRadius: 999 }}
      />
      {/* icon frame: 20×20 at (15, 25) in every slot */}
      <span style={{ position: 'absolute', left: 15, top: 25, width: 20, height: 20, display: 'grid', placeItems: 'center' }}>
        {k === 'phone' ? (
          <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
            <rect x="0.75" y="0.75" width="12.5" height="18.5" rx="3" stroke="#111" strokeWidth={1.5} />
            <path d="M5.5 16h3" stroke="#111" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
        ) : (
          <svg width={GLYPHS[k].w} height={GLYPHS[k].h} viewBox={`0 0 ${GLYPHS[k].w} ${GLYPHS[k].h}`} fill="none">
            {GLYPHS[k].d.map((d) => <path key={d} d={d} stroke={on ? '#ddd6ce' : '#111111'} strokeWidth={1.5} strokeLinecap="round" />)}
          </svg>
        )}
      </span>
    </motion.button>
  )
}

export default function WebNav({ onPhone }: { onPhone: () => void }) {
  const active: Key = 'studio'
  return (
    <nav aria-label="Main" style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 72, zIndex: 60, background: 'var(--bg-canvas)' }}>
      <svg width="28" height="28" viewBox="0 0 119 119" aria-label="Pinterest" style={{ position: 'absolute', top: 24, left: 22 }}><path d={PIN_PATH} fill="var(--red-600)" /></svg>
      {/* the four tabs, 24 apart, at the top under the logo */}
      <div style={{ position: 'absolute', top: 72, left: 11, display: 'grid', gap: 24 }}>
        {ORDER.map((k) => <Bubble key={k} k={k} on={k === active} label={LABEL[k]} />)}
      </div>
      {/* back to the phone app, out of the way at the foot */}
      <div style={{ position: 'absolute', bottom: 24, left: 11 }}>
        <Bubble k="phone" label="Phone view" onClick={onPhone} />
      </div>
    </nav>
  )
}
