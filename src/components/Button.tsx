import { useId, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'framer-motion'

/** Universal "Button" from the Figma library: Type=Action | Pill, State=Default | Selected */

type ActionProps = { label: string; onClick?: () => void; width?: number }

export function ActionButton({ label, onClick, width = 386 }: ActionProps) {
  const [selected, setSelected] = useState(false)
  const goo = useId().replace(/:/g, '')
  const pillW = width - 76
  const color = selected ? 'var(--red-700)' : 'var(--bg-inverse)'

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
        style={{ position: 'absolute', right: 11, top: 19, display: 'flex' }}
        initial={false}
        animate={{ x: selected ? 6 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <svg width="34" height="18" viewBox="0 0 34 18">
          <circle cx="9" cy="9" r="9" fill="var(--input-bg)" />
          <circle cx="28" cy="9" r="6" fill="var(--input-bg)" />
          <rect x="16" y="6" width="8" height="7" fill="var(--input-bg)" />
        </svg>
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
        backgroundColor: selected ? '#ad001a' : '#e9e4df',
        color: selected ? '#ffffff' : '#000000',
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
      animate={{ backgroundColor: selected ? '#ad001a' : '#e9e4df', color: selected ? '#fcfaf7' : '#111111' }}
      style={{ width: size, height: size, borderRadius: 999, display: 'grid', placeItems: 'center', ...style }}
    >
      {children}
    </motion.button>
  )
}
