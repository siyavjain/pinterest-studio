import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PIN_PATH } from '../components/pin'
import { asset } from '../components/asset'

// Same slots and shuffle order as the "Loading Animation" component
const SLOTS: [number, number][] = [[143, 198], [164, 620], [29, 79], [274, 121], [296, 458], [23, 543]]
const PERMS = [
  [0, 1, 2, 3, 4, 5],
  [3, 2, 5, 4, 0, 1],
  [1, 4, 0, 5, 3, 2],
  [5, 0, 4, 1, 2, 3],
]
const FRAMES = ['load-c5764c37', 'pin-1', 'load-64c37143', 'load-c310ce34', 'load-cc8b23f2', 'pin-3']
const STEP_MS = 1600 // 1s move + 0.6s hold


function Logo() {
  return (
    <svg width="118" height="118" viewBox="0 0 119 119">
      <defs>
        <clipPath id="pin-clip"><path d={PIN_PATH} /></clipPath>
        <linearGradient id="sheen" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath="url(#pin-clip)">
        <rect x="-2" y="-2" width="123" height="123" fill="var(--red-600)" />
        {/* sheen sweeps across in step with the frames */}
        <motion.rect
          y="-2"
          width="90"
          height="123"
          fill="url(#sheen)"
          animate={{ x: [-90, 118] }}
          transition={{ duration: 1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.6 }}
        />
      </g>
    </svg>
  )
}

export default function Loading({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const tick = setInterval(() => setStep((s) => s + 1), STEP_MS)
    const done = setTimeout(onDone, STEP_MS * 4 + 400)
    return () => {
      clearInterval(tick)
      clearTimeout(done)
    }
  }, [onDone])

  const perm = PERMS[step % PERMS.length]

  return (
    <div className="screen">
      {FRAMES.map((src, i) => {
        const [x, y] = SLOTS[perm[i]]
        return (
          <motion.img
            key={src}
            src={asset(src)}
            alt=""
            initial={{ x, y, opacity: 0, scale: 0.8 }}
            animate={{ x, y, opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
            style={{ position: 'absolute', left: 0, top: 0, width: 92, height: 128, borderRadius: 24, objectFit: 'cover' }}
          />
        )
      })}
      <div style={{ position: 'absolute', top: 362, width: '100%', display: 'grid', justifyItems: 'center', gap: 12 }}>
        <Logo />
        <span style={{ fontSize: 18 }}>Extracting Ingredients…</span>
      </div>
    </div>
  )
}
