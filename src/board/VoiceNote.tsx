import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PauseIcon, PlayIcon, TrashIcon } from '../components/Icons'
import type { Recording } from './voice/useSpeech'
import Squiggle from './Squiggle'
import Face from '../components/Face'

export type Reply = { id: string; author: string; text: string; audio?: Recording }

/** The people on this board, and how each one looks. `voice` picks their read-aloud voice. */
export const PEOPLE: Record<string, { colour: string; voice: number }> = {
  You: { colour: 'var(--red-700)', voice: 0 },
  Maya: { colour: '#7b5cff', voice: 1 },
  Jules: { colour: '#e2651a', voice: 2 },
  Ren: { colour: '#3a8c40', voice: 3 },
}

// Natural-sounding female voices, best first: neural and premium ones where the device has them,
// then the standard system voices. Each person gets the next one that's installed.
const FEMALE = [
  /aria.*natural/i, /jenny.*natural/i, /ava.*natural/i, /michelle.*natural/i, /sonia.*natural/i,
  /ava \((premium|enhanced)\)/i, /zoe \((premium|enhanced)\)/i, /allison \((premium|enhanced)\)/i, /samantha \((premium|enhanced)\)/i,
  /google us english/i, /google uk english female/i,
  /^samantha/i, /^ava/i, /^zoe/i, /^allison/i, /^karen/i, /^moira/i, /^tessa/i, /^serena/i, /^martha/i, /^catherine/i, /^flo/i,
]
let voices: SpeechSynthesisVoice[] = []
const loadVoices = () => {
  const all = speechSynthesis.getVoices()
  voices = FEMALE.map((re) => all.find((v) => re.test(v.name) && v.lang.startsWith('en'))).filter((v): v is SpeechSynthesisVoice => !!v)
}
if (typeof speechSynthesis !== 'undefined') {
  loadVoices()
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices) // they arrive late in Chrome
}
const voiceFor = (author: string) => voices.length ? voices[(PEOPLE[author]?.voice ?? 0) % voices.length] : undefined

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const ease = [0.22, 1, 0.36, 1] as const

/** Play/pause one clip: the recording if there is one, otherwise the words read aloud in that person's voice. */
function useClip(text: string, audio: Recording | undefined, author: string) {
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const player = useRef<HTMLAudioElement | null>(null)
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)
  const length = audio?.seconds ?? Math.max(2, Math.round(text.split(/\s+/).length / 2.6))

  const stop = () => {
    player.current?.pause()
    if (!audio) speechSynthesis.cancel()
    if (tick.current) clearInterval(tick.current)
    setPlaying(false)
    setElapsed(0)
  }

  const toggle = () => {
    if (playing) return stop()
    setPlaying(true)
    const began = performance.now()
    tick.current = setInterval(() => setElapsed(Math.min(length, (performance.now() - began) / 1000)), 200)
    if (audio) {
      const a = (player.current ??= new Audio(audio.url))
      a.currentTime = 0
      a.onended = stop
      a.play().catch(stop)
    } else {
      const u = new SpeechSynthesisUtterance(text)
      const v = voiceFor(author)
      if (v) {
        u.voice = v
        u.lang = v.lang
      }
      u.rate = 0.96 // a touch slower reads more like someone talking
      u.onend = stop
      speechSynthesis.cancel()
      speechSynthesis.speak(u)
    }
  }

  // stop sound if the clip goes away mid-play
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => stop, [])

  return { playing, toggle, left: clock(playing ? length - elapsed : length) }
}

// profile pictures, with each teammate's colour as a thin ring so threads stay easy to follow
const Avatar = ({ who, size = 28 }: { who: string; size?: number }) => (
  <Face who={who} size={size} ring={who === 'You' ? undefined : PEOPLE[who]?.colour} />
)

const PlayButton = ({ playing, onClick, size = 28 }: { playing: boolean; onClick: () => void; size?: number }) => (
  <motion.button
    aria-label={playing ? 'Pause' : 'Play'}
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    style={{ width: size, height: size, borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', display: 'grid', placeItems: 'center', flexShrink: 0 }}
  >
    {playing ? <PauseIcon /> : <PlayIcon />}
  </motion.button>
)

/** One reply in the thread: who, what they said, and a small player. */
function ReplyRow({ reply }: { reply: Reply }) {
  const clip = useClip(reply.text, reply.audio, reply.author)
  const [full, setFull] = useState(false) // tap the name to read the whole transcript
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
      style={{ display: 'flex', alignItems: full ? 'flex-start' : 'center', gap: 8, minWidth: 0 }}
    >
      <Avatar who={reply.author} size={24} />
      <button
        aria-expanded={full}
        aria-label={`${full ? 'Hide' : 'Show'} ${reply.author === 'You' ? 'your' : `${reply.author}'s`} full reply`}
        onClick={() => setFull((f) => !f)}
        style={{ flex: 1, minWidth: 0, textAlign: 'left' }}
      >
        <div style={{ fontSize: 12, fontWeight: 600 }}>{reply.author}</div>
        <div
          style={{
            fontSize: 12, lineHeight: '15px', color: 'var(--text-secondary)',
            ...(full ? { whiteSpace: 'normal' } : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
          }}
        >
          {reply.text}
        </div>
      </button>
      <span className="t-label" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{clip.left}</span>
      <PlayButton playing={clip.playing} onClick={clip.toggle} size={24} />
    </motion.div>
  )
}

/** Board Note: a pinned avatar that opens into a voice note thread anyone on the board can reply to. */
export default function VoiceNote({ x, y, author = 'You', text, audio, replies, recordingBy, replyMic, onConvert, onDelete, onMove, onMeasure }: {
  x: number
  y: number
  author?: string
  text: string
  audio?: Recording // the recorded voice; without it the note is read aloud
  replies: Reply[]
  recordingBy?: string // someone is recording a reply right now
  replyMic?: ReactNode // hold to reply; the web has no mic
  onConvert?: () => void // the web: turn it into a text note
  onDelete: () => void
  onMove: (dx: number, dy: number) => void // window px; the board converts for zoom
  onMeasure?: (w: number, h: number) => void // the card's size, for the line to its piece
}) {
  const [open, setOpen] = useState(true)
  const card = useRef<HTMLDivElement>(null)
  const measure = useRef(onMeasure)
  measure.current = onMeasure
  useEffect(() => {
    const el = card.current
    if (!el) return
    const report = () => measure.current?.(el.offsetWidth, el.offsetHeight)
    report()
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const [full, setFull] = useState(false) // whole transcript instead of two lines
  const clip = useClip(text, audio, author)

  return (
    <motion.div
      onPointerDown={(e) => e.stopPropagation()}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      style={{ position: 'absolute', left: x, top: y, zIndex: 25, transformOrigin: '0 0', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* reply count on the folded note; outside the card so its rounded clip can't cut it */}
      <AnimatePresence>
        {!open && replies.length > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            style={{
              position: 'absolute', left: 26, top: -6, zIndex: 1, minWidth: 18, height: 18, padding: '0 4px', boxSizing: 'border-box',
              borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', border: '2px solid var(--bg-canvas)',
              fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', pointerEvents: 'none',
            }}
          >
            {replies.length}
          </motion.span>
        )}
      </AnimatePresence>
      <motion.div
        ref={card}
        initial={false}
        animate={{ width: open ? 256 : 36, borderRadius: open ? '6px 20px 20px 20px' : '6px 18px 18px 18px' }}
        transition={{ duration: 0.45, ease }}
        style={{ background: 'var(--bg-canvas)', boxShadow: '0 6px 20px rgba(0,0,0,.12)', overflow: 'hidden', position: 'relative' }}
      >
        {/* the header is the handle: drag it to move the note, tap the avatar to fold it */}
        <motion.div
          onPan={(_, info) => onMove(info.delta.x, info.delta.y)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 4, height: 36, boxSizing: 'border-box', touchAction: 'none', cursor: 'grab' }}
        >
          <button aria-label={open ? 'Collapse note' : 'Open note'} onClick={() => setOpen((o) => !o)} style={{ position: 'relative' }}>
            <Avatar who={author} />
          </button>
          {open && (
            <>
              <button
                aria-expanded={full}
                aria-label={`${full ? 'Hide' : 'Show'} the full note`}
                onClick={() => setFull((f) => !f)}
                style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                {author} · voice note
              </button>
              <motion.button
                aria-label="Delete note"
                whileTap={{ scale: 0.9 }}
                onClick={onDelete}
                style={{ width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}
              >
                <TrashIcon />
              </motion.button>
            </>
          )}
        </motion.div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease }}
            >
              <div style={{ padding: '4px 14px 12px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }}>
                {/* two lines and an ellipsis; tap the name above to read it all */}
                <div style={{ fontSize: 14, lineHeight: '19px', ...(full ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>{text}</div>
                <div style={{ height: 36, borderRadius: 999, background: 'var(--input-bg)', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                  <PlayButton playing={clip.playing} onClick={clip.toggle} />
                  <Squiggle width={150} height={26} strokeWidth={1.5} paused={!clip.playing} />
                  <span className="t-label" style={{ color: 'var(--text-secondary)', marginLeft: 6, fontVariantNumeric: 'tabular-nums' }}>{clip.left}</span>
                </div>

                {/* the thread */}
                {(replies.length > 0 || recordingBy) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,.08)' }}>
                    {replies.map((r) => <ReplyRow key={r.id} reply={r} />)}
                    <AnimatePresence>
                      {recordingBy && (
                        <motion.div
                          key="recording"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}
                        >
                          <Avatar who={recordingBy} size={24} />
                          <span style={{ whiteSpace: 'nowrap' }}>{recordingBy === 'You' ? 'Recording your reply…' : `${recordingBy} is recording…`}</span>
                          <Squiggle width={60} height={18} strokeWidth={1.5} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {onConvert ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span className="t-label" style={{ color: 'var(--text-secondary)' }}>
                      {replies.length ? `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'} · from the phone` : 'From the phone'}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ backgroundColor: '#ddd6ce' }}
                      onClick={onConvert}
                      style={{ height: 30, padding: '0 12px', borderRadius: 999, background: 'var(--bg-default)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      Convert to text
                    </motion.button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {replyMic}
                    <span className="t-label" style={{ color: 'var(--text-secondary)' }}>
                      {replies.length ? `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'} · hold to reply` : 'Hold to reply'}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
