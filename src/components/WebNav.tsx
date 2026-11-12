import { motion } from 'framer-motion'
import { GLYPHS } from './NavBar'
import { PIN_PATH } from './pin'

// The web's nav rail: Pinterest's tabs (Home, Boards, then Studio under them, Create,
// Notifications with an unread dot, Messages, Filters; Settings at the foot) in the phone nav's
// shape: beige 50px bubbles, and the active one a red pill 10px longer. 20px glyphs, 1.5 stroke.

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const ICONS: Record<string, React.ReactNode> = {
  boards: (
    // Pinterest's boards glyph, outlined: a rounded square split down the middle, its right half split again
    <g {...S}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      <path d="M12 3.5v17M12 10.5h8.5" />
    </g>
  ),
  create: (
    <g {...S}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      <path d="M12 8v8M8 12h8" />
    </g>
  ),
  notifications: (
    <g {...S}>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </g>
  ),
  messages: (
    <g>
      <path {...S} d="M12 3.5a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5z" />
      <circle cx="8" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="16" cy="12" r="1.2" fill="currentColor" />
    </g>
  ),
  filters: <path {...S} d="M6 3.5v4M6 12.5v8M4 9.5h4M12 3.5v9M12 16.5v4M10 14.5h4M18 3.5v2M18 10.5v10M16 7.5h4" />,
  settings: (
    <g {...S}>
      <path d="M10.3 3.5h3.4l.5 2.4 1.6.9 2.3-.8 1.7 2.9-1.8 1.6v1.9l1.8 1.6-1.7 2.9-2.3-.8-1.6.9-.5 2.4h-3.4l-.5-2.4-1.6-.9-2.3.8-1.7-2.9 1.8-1.6v-1.9L4.2 8.9l1.7-2.9 2.3.8 1.6-.9z" />
      <circle cx="12" cy="12" r="2.6" />
    </g>
  ),
}

// the phone's own glyphs where it has them
const phoneGlyph = (k: 'home' | 'studio') => {
  const g = GLYPHS[k]
  return <svg width={g.w} height={g.h} viewBox={`0 0 ${g.w} ${g.h}`} fill="none">{g.d.map((d) => <path key={d} d={d} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />)}</svg>
}

const TABS = [
  { k: 'home', label: 'Home' },
  { k: 'boards', label: 'Boards' },
  { k: 'studio', label: 'Studio', on: true },
  { k: 'create', label: 'Create' },
  { k: 'notifications', label: 'Notifications', dot: true },
  { k: 'messages', label: 'Messages' },
  { k: 'filters', label: 'Filters' },
]

const ease = [0.22, 1, 0.36, 1] as const

function Tab({ k, label, on, dot, onClick }: { k: string; label: string; on?: boolean; dot?: boolean; onClick?: () => void }) {
  return (
    <motion.button
      aria-label={label}
      aria-current={on ? 'page' : undefined}
      title={label}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      style={{ position: 'relative', width: 50, height: on ? 60 : 50, color: on ? '#fcfaf7' : '#111' }}
    >
      {/* the phone's bubble: beige, or the active red pill */}
      <motion.span
        initial={false}
        animate={{ backgroundColor: on ? '#ad001a' : '#e9e4df' }}
        transition={{ duration: 0.35, ease }}
        style={{ position: 'absolute', inset: 0, borderRadius: 999 }}
      />
      <span style={{ position: 'absolute', left: 15, top: '50%', marginTop: -10, width: 20, height: 20, display: 'grid', placeItems: 'center' }}>
        {k === 'home' || k === 'studio' ? phoneGlyph(k) : <svg width="20" height="20" viewBox="0 0 24 24">{ICONS[k]}</svg>}
      </span>
      {dot && <span style={{ position: 'absolute', top: 11, right: 12, width: 8, height: 8, borderRadius: 999, background: '#e60023', boxShadow: '0 0 0 2px #e9e4df' }} />}
    </motion.button>
  )
}

export default function WebNav() {
  return (
    <nav aria-label="Main" style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 72, zIndex: 60, background: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0 20px' }}>
      <svg width="28" height="28" viewBox="0 0 119 119" aria-label="Pinterest" style={{ marginBottom: 22 }}><path d={PIN_PATH} fill="var(--red-600)" /></svg>
      <div style={{ display: 'grid', gap: 14 }}>
        {TABS.map((t) => <Tab key={t.k} {...t} />)}
      </div>
      {/* settings at the foot (M switches to the phone view) */}
      <div style={{ marginTop: 'auto' }}>
        <Tab k="settings" label="Settings" />
      </div>
    </nav>
  )
}
