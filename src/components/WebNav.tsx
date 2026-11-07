import { motion } from 'framer-motion'
import { GLYPHS } from './NavBar'
import { PIN_PATH } from './pin'
import { asset } from './asset'

// The web's top bar: Studio and the board's name, search, and a way back to the phone app.
export default function WebNav({ onPhone }: { onPhone: () => void }) {
  const g = GLYPHS.search
  return (
    <header style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 72, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', zIndex: 60, background: 'var(--bg-canvas)' }}>
      <svg width="30" height="30" viewBox="0 0 119 119"><path d={PIN_PATH} fill="var(--red-600)" /></svg>
      <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>Studio</span>
      <span style={{ fontSize: 20, color: 'var(--text-secondary)' }}>/ Ads</span>

      <label style={{ flex: 1, maxWidth: 420, marginLeft: 'auto', height: 44, borderRadius: 999, background: 'var(--bg-default)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
        <svg width={g.w * 0.85} height={g.h * 0.85} viewBox={`0 0 ${g.w} ${g.h}`} fill="none">
          {g.d.map((d) => <path key={d} d={d} stroke="#111" strokeWidth={1.6} strokeLinecap="round" />)}
        </svg>
        <input placeholder="Search pins and ingredients" style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'none', font: 'inherit', fontSize: 15, color: 'var(--text-primary)' }} />
      </label>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onPhone}
        style={{ height: 44, padding: '0 16px', borderRadius: 999, background: 'var(--bg-default)', fontSize: 14, whiteSpace: 'nowrap' }}
      >
        Phone view
      </motion.button>
      <img src={asset('p3-avatar')} alt="You" style={{ width: 40, height: 40, borderRadius: 999, objectFit: 'cover' }} />
    </header>
  )
}
