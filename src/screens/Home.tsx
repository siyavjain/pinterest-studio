import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import type { MotionValue, PanInfo } from 'framer-motion'
import { ArrowUpIcon } from '../components/Icons'

type Project = { name: string; pins: string; creators: string; age: string; creator?: string; avatar?: string }

const PROJECTS: Project[] = [
  { name: 'Interiors', pins: '18 pins', creators: '5 creators', age: '2 days', creator: 'nora.lane' },
  { name: 'Kitchen', pins: '22 pins', creators: '4 creators', age: '3 days', creator: 'theo.marsh', avatar: 'p2-avatar' },
  { name: 'Ads', pins: '14 pins', creators: '7 creators', age: '1 day', creator: 'mira.okafor', avatar: 'p3-avatar' },
  { name: 'Shoes', pins: '9 pins', creators: '3 creators', age: '5 days', creator: 'jun.park', avatar: 'p4-avatar' },
  { name: 'Florals', pins: '11 pins', creators: '2 creators', age: '1 week', creator: 'elle.reyes' },
]

const SPACING = 256 // distance between stack centres
const SIDE_SCALE = 0.79
const spring = { type: 'spring', stiffness: 220, damping: 28 } as const

function Stack({ i, project, focused }: { i: number; project: Project; focused: boolean }) {
  // Back / middle / front fanned exactly like the Figma stack (offsets relative to the 231×328 front card)
  const layer = (name: string, style: React.CSSProperties) => (
    <motion.img
      src={`/img/p${i + 1}-${name}.png`}
      alt=""
      style={{ position: 'absolute', borderRadius: 24, objectFit: 'cover', ...style }}
    />
  )
  return (
    <div style={{ position: 'relative', width: 231, height: 328 }}>
      {layer('back', { left: -6, top: -35, width: 255, height: 345, transform: 'rotate(4deg)' })}
      {layer('middle', { left: 5, top: -17, width: 244, height: 337, transform: 'rotate(-2deg)' })}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 24, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,.12)' }}>
        <img src={`/img/p${i + 1}-front.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {/* progressive blur + dark fade so the creator label always reads */}
        <div
          style={{
            // backdrop-filter ignores the parent's rounded clip, so round the blur itself
            position: 'absolute', left: 0, right: 0, bottom: 0, height: 90, borderRadius: '0 0 24px 24px',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            maskImage: 'linear-gradient(to top, black 30%, transparent)',
            WebkitMaskImage: 'linear-gradient(to top, black 30%, transparent)',
            background: 'linear-gradient(to top, rgba(0,0,0,.55), transparent)',
          }}
        />
        {project.creator && (
          <motion.div
            animate={{ opacity: focused ? 1 : 0.8 }}
            style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--bg-canvas)' }}
          >
            {project.avatar ? (
              <img src={`/img/${project.avatar}.png`} alt="" style={{ width: 20, height: 20, borderRadius: 999 }} />
            ) : (
              <span style={{ width: 20, height: 20, borderRadius: 999, background: 'var(--bg-default)' }} />
            )}
            <span style={{ fontSize: 13 }}>{project.creator}</span>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Project name + meta riding along with the swipe: it slides at the same speed
// as the cards and fades out as the next project's text slides in.
function Info({ i, project, pos, hidden }: { i: number; project: Project; pos: MotionValue<number>; hidden: boolean }) {
  const x = useTransform(pos, (p) => i * SPACING + p)
  const opacity = useTransform(x, (v) => Math.max(0, 1 - Math.abs(v) / (SPACING * 0.6)))
  return (
    <motion.div style={{ position: 'absolute', left: 0, right: 0, x, opacity }}>
      <motion.div animate={{ opacity: hidden ? 0 : 1 }}>
        <div style={{ fontSize: 28, fontWeight: 600, lineHeight: '34px' }}>{project.name}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 4 }} className="t-body">
          <span>{project.pins}</span>
          <span>{project.creators}</span>
          <span>{project.age}</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Home({ onTake }: { onTake: () => void }) {
  const [index, setIndex] = useState(2)
  const [taking, setTaking] = useState(false)
  // carousel position = settled index (sprung) + live finger offset
  const dragX = useMotionValue(0)
  const track = useMotionValue(-index * SPACING)
  const pos = useTransform(() => track.get() + dragX.get())

  useEffect(() => {
    const controls = animate(track, -index * SPACING, spring)
    return () => controls.stop()
  }, [index, track])

  // One gesture, routed by direction: sideways swipes the whole carousel,
  // upward lifts only the focused stack.
  const liftY = useMotionValue(0)
  const axis = useRef<'x' | 'y' | null>(null)

  const onPan = (_: unknown, { offset }: PanInfo) => {
    if (!axis.current) {
      if (Math.abs(offset.x) < 6 && Math.abs(offset.y) < 6) return
      axis.current = Math.abs(offset.x) > Math.abs(offset.y) ? 'x' : 'y'
    }
    if (axis.current === 'x') {
      const atEdge = (offset.x > 0 && index === 0) || (offset.x < 0 && index === PROJECTS.length - 1)
      dragX.set(atEdge ? offset.x * 0.3 : offset.x)
    } else {
      liftY.set(offset.y < 0 ? offset.y : offset.y * 0.2)
    }
  }

  const onPanEnd = (_: unknown, { offset, velocity }: PanInfo) => {
    if (axis.current === 'y') {
      if (offset.y < -110 || velocity.y < -600) {
        setTaking(true)
        setTimeout(onTake, 450)
      } else animate(liftY, 0, spring)
    } else if (axis.current === 'x') {
      if (offset.x < -60 || velocity.x < -400) setIndex((v) => Math.min(v + 1, PROJECTS.length - 1))
      else if (offset.x > 60 || velocity.x > 400) setIndex((v) => Math.max(v - 1, 0))
      animate(dragX, 0, spring)
    }
    axis.current = null
  }

  return (
    <div className="screen">
      {/* drag hint */}
      <motion.div
        animate={{ opacity: taking ? 0 : 1 }}
        style={{ position: 'absolute', top: 72, width: '100%', display: 'grid', justifyItems: 'center', gap: 6, color: 'var(--text-secondary)' }}
      >
        <span className="t-label">Drag to take into studio</span>
        <ArrowUpIcon size={22} color="#b9b2ab" />
      </motion.div>

      {/* carousel */}
      <motion.div
        onPan={onPan}
        onPanEnd={onPanEnd}
        style={{ x: dragX, position: 'absolute', top: 132, left: 0, width: '100%', height: 360, cursor: 'grab' }}
      >
        {PROJECTS.map((proj, i) => {
          const d = i - index
          const focused = d === 0
          return (
            <motion.div
              key={proj.name}
              onClick={() => !focused && setIndex(i)}
              initial={false}
              animate={{
                x: 201 - 115.5 + d * SPACING,
                y: focused ? (taking ? -700 : 35) : 66,
                scale: focused ? 1 : SIDE_SCALE,
                opacity: taking && !focused ? 0 : 1,
              }}
              transition={taking && focused ? { duration: 0.55, ease: [0.55, 0, 0.75, 0.2] } : spring}
              style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '50% 0%', zIndex: focused ? 2 : 1 }}
            >
              <motion.div style={{ y: focused ? liftY : 0 }}>
                <Stack i={i} project={proj} focused={focused} />
              </motion.div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* project info */}
      <div style={{ position: 'absolute', top: 512, width: '100%', textAlign: 'center' }}>
        {PROJECTS.map((proj, i) => (
          <Info key={proj.name} i={i} project={proj} pos={pos} hidden={taking} />
        ))}
      </div>

      {/* welcome */}
      <motion.div animate={{ opacity: taking ? 0 : 1 }} style={{ position: 'absolute', top: 604, left: 16, right: 16, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 36, lineHeight: '42px', fontWeight: 600 }}>Welcome to Pinterest Studio!</h1>
        <p className="t-body" style={{ margin: '14px 12px 0' }}>
          Your personalised digital inspiration hub, to take ideas beyond a pin.
        </p>
      </motion.div>
    </div>
  )
}
