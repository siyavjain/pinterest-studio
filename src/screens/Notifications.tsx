import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { asset } from '../components/asset'
import { PIN_PATH } from '../components/pin'
import { GLYPHS } from '../components/NavBar'

// Live notifications, from the Figma "Live notifications · ideation" section (939:629), played as
// one sequence over Studio home: the phone is asleep, wakes on Maya's note (A), the note becomes the
// board's Live Activity (B), you unlock into Pinterest and the island holds the board (C), and
// long-pressing the island opens the whole note (D). N, Space, → or a tap steps on; Esc leaves.

export type Step = 'off' | 'note' | 'live' | 'island' | 'open'
const ORDER: Step[] = ['off', 'note', 'live', 'island', 'open']

const SF = '-apple-system, "SF Pro Text", "SF Pro Display", system-ui, sans-serif'
const ease = [0.22, 1, 0.36, 1] as const
const spring = { type: 'spring', stiffness: 420, damping: 34 } as const

const avatar = (name: string, size: number, ring?: string) => (
  // the teammate photos are 56×76 with an empty strip below, so show the top square
  <span style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flex: 'none', display: 'block', boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}>
    <img src={asset(name)} alt="" style={{ width: '100%', height: `${(76 / 56) * 100}%`, objectFit: 'cover', objectPosition: 'top' }} />
  </span>
)

const PinBadge = ({ size = 16 }: { size?: number }) => (
  <span style={{ width: size, height: size, borderRadius: size * 0.28, background: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>
    <svg width={size * 0.78} height={size * 0.78} viewBox="0 0 119 119"><path d={PIN_PATH} fill="#e60023" /></svg>
  </span>
)

function StatusBar({ dark }: { dark?: boolean }) {
  const c = dark ? '#111' : '#fff'
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 34px 0 50px', fontFamily: SF, fontSize: 17, fontWeight: 600, color: c, zIndex: 5 }}>
      <span>9:41</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="18" height="12" viewBox="0 0 18 12" fill={c}><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill={c}><path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.2-1.3A10.2 10.2 0 0 0 8 .8C5.2.8 2.7 1.9.8 3.7L2 5c1.6-1.5 3.7-2.4 6-2.4Z" /><path d="M8 6.2c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.7 6.7 0 0 0 8 4.4c-1.8 0-3.4.7-4.6 1.8l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3Z" /><path d="M8 9.6 10 7.6a2.9 2.9 0 0 0-4 0l2 2Z" transform="translate(0 1.4)" /></svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke={c} opacity=".35" /><rect x="2" y="2" width="20" height="9" rx="2.5" fill={c} /><path d="M25 4.5v4a2.2 2.2 0 0 0 0-4Z" fill={c} opacity=".4" /></svg>
      </span>
    </div>
  )
}

/** A · the note on the lock screen, with more notes from the board stacked underneath */
function NoteCard() {
  return (
    <motion.div
      key="note"
      initial={{ y: 120, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.25 } }}
      transition={{ ...spring, delay: 0.55 }}
      style={{ position: 'absolute', left: 16, right: 16, top: 596 }}
    >
      {/* the stack: two more notes from Organic Forms tucked underneath */}
      <div style={{ position: 'absolute', left: 14, right: 14, top: 18, height: 112, borderRadius: 22, background: 'rgba(242,242,247,.38)', backdropFilter: 'blur(20px)' }} />
      <div style={{ position: 'absolute', left: 7, right: 7, top: 9, height: 112, borderRadius: 22, background: 'rgba(242,242,247,.5)', backdropFilter: 'blur(20px)' }} />
      <div style={{ position: 'relative', display: 'flex', gap: 10, padding: '13px 14px', borderRadius: 22, background: 'rgba(242,242,247,.78)', backdropFilter: 'blur(24px)', fontFamily: SF, color: '#111' }}>
        <span style={{ position: 'relative', flex: 'none', alignSelf: 'flex-start' }}>
          {avatar('Maya', 40)}
          <span style={{ position: 'absolute', right: -3, bottom: -3 }}><PinBadge size={17} /></span>
        </span>
        <div style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: '19px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <b style={{ fontWeight: 600 }}>Maya</b>
            <span style={{ color: 'rgba(60,60,67,.6)' }}>now</span>
          </div>
          <div style={{ fontWeight: 600 }}>Added a note on Organic Forms</div>
          <div style={{ paddingRight: 62 }}>Love the underwater one. Could we push the blues further?</div>
        </div>
        <img src={asset('image 44')} alt="" style={{ position: 'absolute', right: 14, top: 37, width: 53, height: 62, borderRadius: 9, objectFit: 'cover', background: '#d9e4ea' }} />
      </div>
    </motion.div>
  )
}

/** B · the board, live on the lock screen */
function LiveCard() {
  const added = ['image 34', 'image 35', 'image 40', 'image 45']
  return (
    <motion.div
      key="live"
      initial={{ y: 40, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={spring}
      style={{ position: 'absolute', left: 14, right: 14, top: 540, padding: '14px 16px 14px', borderRadius: 26, background: 'rgba(28,28,30,.62)', backdropFilter: 'blur(28px)', color: '#fff', fontFamily: SF }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600 }}>
        <span style={{ width: 20, height: 20, borderRadius: 6, background: '#e60023', display: 'grid', placeItems: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 119 119"><path d={PIN_PATH} fill="#fff" /></svg>
        </span>
        Organic Forms
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <span style={{ display: 'flex' }}>
          {['Maya', 'Jules', 'Ren'].map((n, i) => (
            <motion.span key={n} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.15 + i * 0.08 }} style={{ marginLeft: i ? -15 : 0 }}>
              {avatar(n, 40, 'rgba(28,28,30,1)')}
            </motion.span>
          ))}
        </span>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, lineHeight: '22px' }}>Maya, Jules and Ren</div>
          <div style={{ fontSize: 13, color: 'rgba(235,235,245,.6)' }}>on the board · 12 mins ago</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '6px 10px 6px 6px', borderRadius: 999, background: 'rgba(255,255,255,.12)', fontSize: 13 }}>
        {avatar('Maya', 20)}
        Could we push the blues further?
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, fontSize: 13 }}>
        <span style={{ display: 'flex', gap: 6 }}>
          {added.map((n, i) => (
            <motion.img key={n} src={asset(n)} alt="" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.07, duration: 0.3 }} style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover', background: 'rgba(255,255,255,.15)' }} />
          ))}
        </span>
        <span style={{ marginLeft: 10, fontWeight: 500, color: 'rgba(235,235,245,.6)' }}>4 pieces added</span>
        <span style={{ marginLeft: 'auto', fontWeight: 600 }}>Open board</span>
      </div>
    </motion.div>
  )
}

function LockScreen({ step }: { step: Step }) {
  const awake = step !== 'off'
  return (
    <motion.div
      key="lock"
      exit={{ y: '-100%', transition: { duration: 0.55, ease } }}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000' }}
    >
      {/* the screen lights up: the wallpaper eases in from black */}
      <motion.img
        src={asset('notify/wallpaper.png')}
        alt=""
        initial={{ opacity: 0, scale: 1.06 }}
        animate={awake ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.06 }}
        transition={{ duration: 0.7, ease }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <motion.div animate={{ opacity: awake ? 1 : 0 }} transition={{ duration: 0.5, delay: awake ? 0.15 : 0 }} style={{ position: 'absolute', inset: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.18) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,.22) 100%)' }} />
        <StatusBar />
        <svg style={{ position: 'absolute', left: 'calc(50% - 7px)', top: 64 }} width="14" height="19" viewBox="0 0 14 19" fill="#fff">
          <rect x="0" y="8" width="14" height="11" rx="2.4" /><path d="M3 8.5V5a4 4 0 0 1 8 0v3.5" fill="none" stroke="#fff" strokeWidth="2" />
        </svg>
        <div style={{ position: 'absolute', top: 88, left: 0, right: 0, textAlign: 'center', fontFamily: SF, color: '#fff' }}>
          <div style={{ fontSize: 21, fontWeight: 600 }}>Monday 9 November</div>
          <div style={{ fontSize: 104, fontWeight: 700, lineHeight: '104px', letterSpacing: -2, marginTop: 2 }}>9:41</div>
        </div>
        <AnimatePresence>
          {step === 'note' && <NoteCard />}
          {step === 'live' && <LiveCard />}
        </AnimatePresence>
        {/* torch and camera */}
        {[{ left: 46 }, { right: 46 }].map((side, i) => (
          <span key={i} style={{ position: 'absolute', ...side, bottom: 52, width: 50, height: 50, borderRadius: '50%', background: 'rgba(0,0,0,.28)', backdropFilter: 'blur(12px)', display: 'grid', placeItems: 'center' }}>
            {i === 0 ? (
              <svg width="14" height="22" viewBox="0 0 14 22" fill="none" stroke="#fff" strokeWidth="1.6"><path d="M2 1h10v4l-2 4v11H4V9L2 5z" /><path d="M7 12v3" /></svg>
            ) : (
              <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke="#fff" strokeWidth="1.6"><path d="M2 5h4l2-3h6l2 3h4v11H2z" /><circle cx="11" cy="10" r="3.5" /></svg>
            )}
          </span>
        ))}
        <div style={{ position: 'absolute', bottom: 8, left: '50%', width: 140, height: 5, marginLeft: -70, borderRadius: 999, background: '#fff' }} />
      </motion.div>
    </motion.div>
  )
}

/** C and D · back in Pinterest; the feed sits under the island */
const FEED = [
  { src: 'notify/feed-1.png', x: 8, y: 100, h: 236 },
  { src: 'notify/feed-2.png', x: 205, y: 140, h: 236 },
  { src: 'notify/feed-3.png', x: 8, y: 370, h: 272 },
  { src: 'notify/feed-4.png', x: 205, y: 410, h: 236 },
  { src: 'notify/feed-5.png', x: 8, y: 676, h: 198 },
  { src: 'notify/feed-6.png', x: 205, y: 680, h: 194 },
]

function Feed({ dim }: { dim: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 64, left: 16, display: 'flex', gap: 22, fontSize: 16 }}>
        {['All', 'Organic Forms', 'Interiors', 'Shoes'].map((t, i) => (
          <span key={t} style={{ fontWeight: i ? 400 : 600, color: i ? '#5f5f5f' : '#111', borderBottom: i ? undefined : '2.5px solid #111', paddingBottom: 4 }}>{t}</span>
        ))}
      </div>
      {FEED.map((p) => (
        <div key={p.src} style={{ position: 'absolute', left: p.x, top: p.y, width: 189 }}>
          <img src={asset(p.src)} alt="" style={{ width: 189, height: p.h, borderRadius: 16, objectFit: 'cover', objectPosition: 'top' }} />
          {p.y + p.h + 20 < 874 && <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, letterSpacing: 1, color: '#111', marginTop: 2 }}>•••</div>}
        </div>
      ))}
      {/* Pinterest's own nav, on Home */}
      <nav style={{ position: 'absolute', left: 'calc(50% - 136px)', bottom: 42, width: 272, height: 60, display: 'flex', gap: 24 }}>
        {(['home', 'search', 'studio', 'profile'] as const).map((k) => {
          const on = k === 'home', g = GLYPHS[k]
          return (
            <span key={k} style={{ position: 'relative', width: 50, height: 60 }}>
              <span style={{ position: 'absolute', left: 0, bottom: 0, width: 50, height: on ? 60 : 50, borderRadius: 999, background: on ? '#ad001a' : '#e9e4df' }} />
              <span style={{ position: 'absolute', left: 15, top: 25, width: 20, height: 20, display: 'grid', placeItems: 'center' }}>
                <svg width={g.w} height={g.h} viewBox={`0 0 ${g.w} ${g.h}`} fill="none">{g.d.map((d) => <path key={d} d={d} stroke={on ? '#fcfaf7' : '#111'} strokeWidth={1.5} strokeLinecap="round" />)}</svg>
              </span>
            </span>
          )
        })}
      </nav>
      <div style={{ position: 'absolute', bottom: 8, left: '50%', width: 140, height: 5, marginLeft: -70, borderRadius: 999, background: '#000', opacity: 0.85 }} />
      <motion.div initial={false} animate={{ opacity: dim ? 1 : 0 }} transition={{ duration: 0.35 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.32)', pointerEvents: 'none' }} />
    </div>
  )
}

/** The Dynamic Island: resting, holding the board (compact), or opened on the note */
function Island({ step, onView, onReply }: { step: Step; onView: () => void; onReply: () => void }) {
  const open = step === 'open', compact = step === 'island'
  const size = open ? { width: 386, height: 214, borderRadius: 44, top: 8 } : compact ? { width: 196, height: 37, borderRadius: 999, top: 11 } : { width: 124, height: 36, borderRadius: 999, top: 11 }
  const [pulse, setPulse] = useState(0)
  // it pulses once when the note lands
  useEffect(() => {
    if (!compact) return
    const t = setTimeout(() => setPulse((p) => p + 1), 650)
    return () => clearTimeout(t)
  }, [compact])
  return (
    <motion.div
      initial={false}
      animate={{ ...size, marginLeft: -size.width / 2 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      style={{ position: 'absolute', left: '50%', background: '#000', overflow: 'hidden', zIndex: 10, fontFamily: SF, color: '#fff' }}
    >
      <motion.div key={pulse} initial={pulse ? { scale: 1.08 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }} style={{ position: 'absolute', inset: 0 }}>
        <AnimatePresence>
          {compact && (
            <motion.div key="compact" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 7px' }}>
              {avatar('Maya', 24)}
              <span style={{ minWidth: 30, height: 22, padding: '0 8px', borderRadius: 999, background: '#e60023', fontSize: 13, fontWeight: 600, display: 'grid', placeItems: 'center' }}>3</span>
            </motion.div>
          )}
          {open && (
            <motion.div key="open" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1, transition: { delay: 0.12, duration: 0.3 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }} style={{ position: 'absolute', inset: 0, padding: '22px 20px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ position: 'relative' }}>
                  {avatar('Maya', 52)}
                  <span style={{ position: 'absolute', right: -2, bottom: -2 }}><PinBadge size={18} /></span>
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>Maya</div>
                  <div style={{ fontSize: 13, color: 'rgba(235,235,245,.6)' }}>Organic Forms · now</div>
                </div>
                <img src={asset('image 44')} alt="" style={{ width: 48, height: 60, borderRadius: 10, objectFit: 'cover', background: '#2c3a40' }} />
              </div>
              <div style={{ fontSize: 17, lineHeight: '22px', marginTop: 12 }}>Love the underwater one. Could we push the blues further?</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <motion.button whileTap={{ scale: 0.96 }} onClick={(e) => { e.stopPropagation(); onView() }} style={{ flex: 1, height: 42, borderRadius: 999, background: '#3a3a3c', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: SF }}>View note</motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={(e) => { e.stopPropagation(); onReply() }} style={{ flex: 1, height: 42, borderRadius: 999, background: '#e60023', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: SF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <svg width="12" height="17" viewBox="0 0 12 17" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="1" width="6" height="10" rx="3" /><path d="M1 8a5 5 0 0 0 10 0M6 13v3" /></svg>
                  Reply by voice
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

export default function Notifications({ onClose, onOpenBoard }: { onClose: () => void; onOpenBoard: () => void }) {
  const [step, setStep] = useState<Step>('off')
  const next = () => {
    const i = ORDER.indexOf(step)
    if (i === ORDER.length - 1) onOpenBoard()
    else setStep(ORDER[i + 1])
  }
  // asleep for a beat, then the note wakes the screen
  useEffect(() => {
    if (step !== 'off') return
    const t = setTimeout(() => setStep('note'), 1100)
    return () => clearTimeout(t)
  }, [step])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') onClose()
      else if (e.key.toLowerCase() === 'n' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); next() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const inPinterest = step === 'island' || step === 'open'
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      transition={{ duration: 0.35 }}
      onClick={next}
      style={{ position: 'absolute', inset: 0, zIndex: 120, background: '#000', overflow: 'hidden' }}
    >
      {inPinterest && <Feed dim={step === 'open'} />}
      {inPinterest && <StatusBar dark />}
      <AnimatePresence>{!inPinterest && <LockScreen step={step} />}</AnimatePresence>
      <Island step={step} onView={onOpenBoard} onReply={onClose} />
    </motion.div>
  )
}
