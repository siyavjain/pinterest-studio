import { useId, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'framer-motion'

/** Universal "Button" from the Figma library: Type=Action | Pill, State=Default | Selected */

type ActionProps = { label: string; onClick?: () => void; width?: number; icon?: ReactNode /* in the round end; the two dots by default */ }

/** Share: two soft blobs stacked, one handing over to the other (Figma "Frame 103") */
export const SHARE_GLYPH = (
  <svg width="22" height="20" viewBox="0 0 105.942 96.27" aria-hidden>
    <path fill="var(--input-bg)" d="M20.69 0.23C37.46 -0.4 37.54 7.22 46.44 14.86C59.28 25.88 63.36 0.93 80.74 0.02C87.19 -0.27 93.48 2.03 98.24 6.39C109.36 16.65 107.67 30.72 97.7 41.1C95.57 42.67 91.56 45.33 88.69 45.66C67.74 47.32 42.38 47.5 21.54 46.45C-4.28 45.15 -9.63 6.66 20.69 0.23Z" />
    <path fill="var(--input-bg)" d="M21.21 49.65C33.88 49.41 82.42 47.81 91.58 51.52C97.23 53.81 101.61 58.04 103.96 63.68C106.4 69.6 106.34 76.25 103.79 82.12C101.29 87.9 96.57 92.41 90.7 94.67C83.51 97.37 77.6 96.12 70.96 93.05C64.28 88.57 57.38 74.32 48.74 80.05C40.92 85.25 37.88 93.87 27.3 95.9C15.2 98.23 2.65 89.34 0.41 77.4C-0.76 71.26 0.59 64.9 4.15 59.77C8.56 53.39 13.87 50.95 21.21 49.65Z" />
  </svg>
)

export function ActionButton({ label, onClick, width = 386, icon }: ActionProps) {
  const [selected, setSelected] = useState(false)
  const goo = useId().replace(/:/g, '')
  const pillW = width - 76
  const color = selected ? 'var(--red-700)' : 'var(--bg-inverse)' // an action turns red once tapped

  return (
    <motion.button
      aria-label={label}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        setSelected(true)
        setTimeout(() => onClick?.(), 350)
      }}
      style={{ position: 'relative', width, height: 56, display: 'block' }}
    >
      {/* gooey join between the pill and the circle, like the boolean shape in Figma */}
      <svg width={width} height={56} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <filter id={goo}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
          </filter>
        </defs>
        <g filter={`url(#${goo})`} style={{ fill: color, transition: 'fill .3s' }}>
          <rect width={pillW} height={56} rx={28} />
          <motion.circle
            cy={28}
            r={28}
            initial={false}
            animate={{ cx: selected ? width - 28 + 6 : width - 28 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          />
          <rect x={pillW - 24} y={20} width={52} height={16} />
        </g>
      </svg>
      <span style={{ position: 'absolute', left: 24, top: 0, height: 56, display: 'flex', alignItems: 'center', fontSize: 18, lineHeight: 1, color: '#fff' }}>{label}</span>
      <motion.span
        style={icon ? { position: 'absolute', right: 0, top: 0, width: 56, height: 56, display: 'grid', placeItems: 'center' } : { position: 'absolute', right: 11, top: 19, display: 'flex' }}
        initial={false}
        animate={{ x: selected ? 6 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        {icon ?? (
          <svg width="34" height="18" viewBox="0 0 34 18">
            <circle cx="9" cy="9" r="9" fill="var(--input-bg)" />
            <circle cx="28" cy="9" r="6" fill="var(--input-bg)" />
            <rect x="16" y="6" width="8" height="7" fill="var(--input-bg)" />
          </svg>
        )}
      </motion.span>
    </motion.button>
  )
}

type PillProps = {
  label: ReactNode
  selected?: boolean
  onClick?: () => void
  style?: CSSProperties
}

export function Pill({ label, selected, onClick, style }: PillProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      animate={{
        backgroundColor: selected ? '#151413' : '#e9e4df',
        color: selected ? '#fcfaf7' : '#000000',
      }}
      transition={{ duration: 0.3 }}
      style={{
        height: 36,
        padding: '0 16px',
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {label}
    </motion.button>
  )
}

type IconButtonProps = {
  children: ReactNode
  onClick?: () => void
  selected?: boolean
  size?: number
  label: string
  style?: CSSProperties
}

export function IconButton({ children, onClick, selected, size = 44, label, style }: IconButtonProps) {
  return (
    <motion.button
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      animate={{ backgroundColor: selected ? '#151413' : '#e9e4df', color: selected ? '#fcfaf7' : '#111111' }}
      style={{ width: size, height: size, borderRadius: 999, display: 'grid', placeItems: 'center', ...style }}
    >
      {children}
    </motion.button>
  )
}
