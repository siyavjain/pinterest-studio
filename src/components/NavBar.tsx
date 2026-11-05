import { motion } from 'framer-motion'

type Key = 'home' | 'search' | 'studio' | 'profile'
type Props = { active: Key; onHome: () => void }

// Glyphs exported from the Figma "Nav Bar" component (20×20 icon frame, 1.5 stroke)
const GLYPHS: Record<Key, { w: number; h: number; d: string[] }> = {
  home: {
    w: 19.5,
    h: 19.5,
    d: [
      'M7.17857 12.0101V17.402C7.17857 18.1465 7.75421 18.75 8.46429 18.75H11.0357C11.7458 18.75 12.3214 18.1465 12.3214 17.402V12.0101C12.3214 11.2657 11.7458 10.6622 11.0357 10.6622H8.46429C7.75421 10.6622 7.17857 11.2657 7.17857 12.0101Z',
      'M8.06589 1.40865L1.63732 7.24985C1.07376 7.76192 0.75 8.50528 0.75 9.28715V16.0541C0.75 17.543 1.90127 18.75 3.32143 18.75H16.1786C17.5987 18.75 18.75 17.543 18.75 16.0541V9.28715C18.75 8.50528 18.4262 7.76192 17.8627 7.24985L11.4341 1.40865C10.4676 0.53045 9.0324 0.530451 8.06589 1.40865Z',
    ],
  },
  search: {
    w: 16.5,
    h: 21,
    d: ['M11.75 14.25L15.75 20.25M14.9815 7.82554C14.9815 11.7332 11.7956 14.9011 7.86574 14.9011C3.93587 14.9011 0.75 11.7332 0.75 7.82554C0.75 3.91788 3.93587 0.75 7.86574 0.75C11.7956 0.75 14.9815 3.91788 14.9815 7.82554Z'],
  },
  studio: {
    w: 19.5,
    h: 17.5,
    d: [
      'M10.2409 9.07C12.5906 9.07 14.4955 7.20747 14.4955 4.91C14.4955 2.61253 12.5906 0.75 10.2409 0.75C7.89122 0.75 5.98636 2.61253 5.98636 4.91C5.98636 7.20747 7.89122 9.07 10.2409 9.07Z',
      'M5.00455 16.75C7.35423 16.75 9.25909 14.8875 9.25909 12.59C9.25909 10.2925 7.35423 8.43 5.00455 8.43C2.65486 8.43 0.75 10.2925 0.75 12.59C0.75 14.8875 2.65486 16.75 5.00455 16.75Z',
      'M14.4955 16.75C16.8451 16.75 18.75 14.8875 18.75 12.59C18.75 10.2925 16.8451 8.43 14.4955 8.43C12.1458 8.43 10.2409 10.2925 10.2409 12.59C10.2409 14.8875 12.1458 16.75 14.4955 16.75Z',
    ],
  },
  profile: {
    w: 16,
    h: 17.5,
    d: ['M0.750177 16.75C1.25018 14.75 3.25018 11.25 7.75018 11.25C11.7502 11.25 14.4169 14.9167 15.2502 16.75M11.6252 4.625C11.6252 6.76507 9.89025 8.5 7.75018 8.5C5.6101 8.5 3.87518 6.76507 3.87518 4.625C3.87518 2.48493 5.6101 0.75 7.75018 0.75C9.89025 0.75 11.6252 2.48493 11.6252 4.625Z'],
  },
}

const ORDER: Key[] = ['home', 'search', 'studio', 'profile']

export default function NavBar({ active, onHome }: Props) {
  return (
    // 272×60 row, 24 gap, every slot 50×60; bubbles sit on the bottom edge
    <nav
      style={{
        position: 'absolute',
        left: 'calc(50% - 136px)',
        bottom: 42,
        width: 272,
        height: 60,
        display: 'flex',
        gap: 24,
        zIndex: 30,
      }}
    >
      {ORDER.map((key) => {
        const on = key === active
        const g = GLYPHS[key]
        return (
          <motion.button
            key={key}
            aria-label={key}
            whileTap={{ scale: 0.92 }}
            onClick={key === 'home' ? onHome : undefined}
            style={{ position: 'relative', width: 50, height: 60 }}
          >
            <motion.span
              initial={false}
              animate={{ height: on ? 60 : 50, backgroundColor: on ? '#151413' : '#e9e4df' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'absolute', left: 0, bottom: 0, width: 50, borderRadius: 999 }}
            />
            {/* icon frame: 20×20 at (15, 25) in every slot */}
            <span style={{ position: 'absolute', left: 15, top: 25, width: 20, height: 20, display: 'grid', placeItems: 'center' }}>
              <svg width={g.w} height={g.h} viewBox={`0 0 ${g.w} ${g.h}`} fill="none">
                {g.d.map((d) => (
                  <path key={d} d={d} stroke={on ? '#ddd6ce' : '#111111'} strokeWidth={1.5} strokeLinecap="round" />
                ))}
              </svg>
            </span>
          </motion.button>
        )
      })}
    </nav>
  )
}
