import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import type { MotionValue, PanInfo } from 'framer-motion'
import { asset } from '../components/asset'
import { getFit } from '../components/fit'
import Grain from '../components/Grain'
import { POUR_PINS } from './Extract'

type Project = { name: string; pins: string; creators: string; age: string; creator?: string; avatar?: string; images?: Partial<Record<'back' | 'middle' | 'front', string>>; bg?: string }

// one project per image set in home/assets (p1 … p5), named for what's in it
const PROJECTS: Project[] = [
  { name: 'Collage', pins: '18 pins', creators: '5 creators', age: '2 days', creator: 'nora.lane' },
  { name: 'Interiors', pins: '22 pins', creators: '4 creators', age: '3 days', creator: 'theo.marsh', avatar: 'p2-avatar' },
  { name: 'Organic Forms', pins: '14 pins', creators: '7 creators', age: '1 day', creator: 'mira.okafor', avatar: 'p3-avatar', images: { front: 'Sky leaves' }, bg: 'organic forms bg home' },
  { name: 'Shoes', pins: '9 pins', creators: '3 creators', age: '5 days', creator: 'jun.park', avatar: 'p4-avatar' },
  { name: 'Sport', pins: '11 pins', creators: '2 creators', age: '1 week', creator: 'elle.reyes' },
]

const SPACING = 256 // distance between stack centres
const CENTRE = 195 // the focused stack's centre line, a touch left of the screen's middle as in Figma
const SIDE_SCALE = 0.79
const spring = { type: 'spring', stiffness: 220, damping: 28 } as const

function Stack({ i, project, focused }: { i: number; project: Project; focused: boolean }) {
  // Back / middle / front fanned exactly like the Figma stack (offsets relative to the 231×328 front card)
  const src = (name: 'back' | 'middle' | 'front') => asset(project.images?.[name] ?? `p${i + 1}-${name}`)
  const layer = (name: 'back' | 'middle', dx: number, dy: number, deg: number) => (
    <img
      src={src(name)}
      alt=""
      style={{ position: 'absolute', left: (231 - 230.31) / 2 + dx, top: dy, width: 230.31, height: 328.04, borderRadius: 24, objectFit: 'cover', transform: `rotate(${deg}deg)` }}
    />
  )
  return (
    <div style={{ position: 'relative', width: 231, height: 328 }}>
      {layer('back', 6.29, -26.67, -4.39)}
      {layer('middle', 11.67, -12.42, 2.34)}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 24, overflow: 'hidden' }}>
        <img src={src('front')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {/* progressive blur + dark fade so the creator label always reads */}
        <div
          style={{
            // backdrop-filter ignores the parent's rounded clip, so round the blur itself
            // taller than the label needs, so the blur eases in from nothing instead of starting on a hard line
            position: 'absolute', left: 0, right: 0, bottom: 0, height: 96, borderRadius: '0 0 24px 24px',
            backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
            maskImage: 'linear-gradient(to bottom, transparent, black 65%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 65%)',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,.45))',
          }}
        />
        {project.creator && (
          <motion.div
            animate={{ opacity: focused ? 1 : 0.8 }}
            style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--bg-canvas)' }}
          >
            {project.avatar ? (
              <img src={asset(project.avatar)} alt="" style={{ width: 20, height: 20, borderRadius: 999 }} />
            ) : (
              <span style={{ width: 20, height: 20, borderRadius: 999, background: 'var(--bg-default)' }} />
            )}
            <span style={{ fontSize: 12, lineHeight: '18px', fontWeight: 300 }}>{project.creator}</span>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// The screen behind the carousel: the focused stack's front photo, blurred and fading into the
// canvas two thirds down. A project can bring its own finished background instead.
function Backdrop({ i, project }: { i: number; project: Project }) {
  if (project.bg) return <img src={asset(project.bg)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'var(--bg-canvas)' }}>
      {/* Figma's frame: the photo overhangs the screen, and the fade is measured on it */}
      <div style={{ position: 'absolute', left: -263, top: -179, width: 928, height: 1232 }}>
        <img src={asset(project.images?.front ?? `p${i + 1}-front`)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px)' }} />
        <Grain />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(252,250,247,0) 32.845%, var(--bg-canvas) 62.771%)' }} />
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
        <div style={{ fontSize: 28, fontWeight: 600, lineHeight: '36px' }}>{project.name}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 25 }} className="t-body">
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

  // the next screen's pins, fetched and decoded now so they pour in without a stutter
  useEffect(() => {
    POUR_PINS.forEach((src) => {
      const img = new Image()
      img.src = src
      img.decode?.().catch(() => {})
    })
  }, [])

  // One gesture, routed by direction: sideways swipes the whole carousel,
  // upward lifts only the focused stack.
  const liftY = useMotionValue(0)
  const axis = useRef<'x' | 'y' | null>(null)

  const onPan = (_: unknown, info: PanInfo) => {
    const offset = { x: info.offset.x / getFit(), y: info.offset.y / getFit() }
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
        setTimeout(onTake, 120) // the pins start pouring while the stack is still lifting away
      } else animate(liftY, 0, spring)
    } else if (axis.current === 'x') {
      if (offset.x < -60 || velocity.x < -400) setIndex((v) => Math.min(v + 1, PROJECTS.length - 1))
      else if (offset.x > 60 || velocity.x > 400) setIndex((v) => Math.max(v - 1, 0))
      animate(dragX, 0, spring)
    }
    axis.current = null
  }

  return (
    <div className="screen" style={{ overflow: 'hidden' }}>
      {/* the centre project's photo, blurred and fading into the canvas (baked into the image) */}
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <Backdrop i={index} project={PROJECTS[index]} />
        </motion.div>
      </AnimatePresence>

      {/* swipe hint */}
      <motion.div
        animate={{ opacity: taking ? 0 : 1 }}
        style={{ position: 'absolute', top: 70, left: CENTRE - 150, width: 300, height: 48, display: 'grid', justifyItems: 'center', alignContent: 'start', gap: 8, color: 'var(--text-primary)' }}
      >
        <span style={{ fontSize: 12, lineHeight: '18px', fontWeight: 300 }}>Swipe up to add to Studio</span>
        <svg width="17.5" height="27.5" viewBox="0 0 17.5 27.5" fill="none" style={{ margin: '-0.75px 0' }}>
          <path d="M8.75 1.75V26.75M0.75 8.75L8.75 0.75L16.75 8.75" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
                x: CENTRE - 115.5 + d * SPACING,
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
      <div style={{ position: 'absolute', top: 514, left: CENTRE - 201, width: 402, textAlign: 'center' }}>
        {PROJECTS.map((proj, i) => (
          <Info key={proj.name} i={i} project={proj} pos={pos} hidden={taking} />
        ))}
      </div>

      {/* welcome */}
      <motion.div animate={{ opacity: taking ? 0 : 1 }} style={{ position: 'absolute', top: 588, left: 8, width: 386, display: 'grid', gap: 8, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 36, lineHeight: '44px', fontWeight: 600, color: 'var(--text-primary)' }}>Welcome to<br />Pinterest Studio!</h1>
        <p className="t-body" style={{ margin: 0 }}>
          Your creative space to discover inspiration,<br />bring ideas to life, and take them beyond the Pin.
        </p>
      </motion.div>
    </div>
  )
}
