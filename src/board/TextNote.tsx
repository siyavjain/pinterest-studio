import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Face from '../components/Face'
import { TrashIcon } from '../components/Icons'
import type { Reply } from './VoiceNote'

// A typed comment: a light card with the author's photo, their name, and the words, the
// same on the phone and the web. New ones open ready to type; double-click to edit; tap the
// photo to fold it down to just the photo. Replies stack under it as smaller cards.

const ease = [0.22, 1, 0.36, 1] as const
const CARD: React.CSSProperties = {
  background: 'rgba(252,250,247,.94)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  boxShadow: '0 8px 24px rgba(0,0,0,.10), 0 0 0 1px rgba(0,0,0,.04)',
}

/** One comment card: photo, name, words. */
function Card({ who, text, small, editing, folded, onToggle, onChange, onEditStart, onEditEnd, onGrab }: {
  who: string
  text: string
  small?: boolean // a reply
  editing?: boolean
  folded?: boolean
  onToggle?: () => void
  onChange?: (t: string) => void
  onEditStart?: () => void
  onEditEnd?: () => void
  onGrab?: (dx: number, dy: number) => void
}) {
  const box = useRef<HTMLTextAreaElement>(null)
  const face = small ? 32 : 40
  const dragged = useRef(false) // a drag that ends on the photo isn't a tap

  useEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
    if (editing && document.activeElement !== el) el.focus()
  }, [text, editing])

  return (
    // no layout animation here: inside the zoomed board it mis-measures and jumps on every hover
    <div
      style={{
        ...CARD, display: 'flex', alignItems: 'center', gap: small ? 10 : 12, boxSizing: 'border-box',
        padding: folded ? 4 : small ? '6px 16px 6px 6px' : '8px 20px 8px 8px', borderRadius: editing ? 26 : 999, maxWidth: small ? 260 : 320,
      }}
    >
      {/* the photo: tap to fold, drag to move */}
      <motion.span
        role={onToggle ? 'button' : undefined}
        aria-label={onToggle ? (folded ? `Open ${who}'s comment` : `Fold ${who}'s comment`) : undefined}
        onPointerDown={() => (dragged.current = false)}
        onPanStart={() => (dragged.current = true)}
        onPan={onGrab ? (_, info) => onGrab(info.delta.x, info.delta.y) : undefined}
        onTap={() => !dragged.current && onToggle?.()}
        title={onGrab ? 'Tap to fold, drag to move' : who}
        style={{ flex: 'none', alignSelf: editing ? 'flex-start' : 'center', cursor: onGrab ? 'grab' : 'default', touchAction: 'none', borderRadius: 999 }}
      >
        <Face who={who} size={face} />
      </motion.span>

      {!folded && (
        <div style={{ minWidth: 0, display: 'grid', gap: 1 }}>
          <span style={{ fontSize: small ? 12 : 13, lineHeight: small ? '16px' : '18px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{who}</span>
          {editing ? (
            <textarea
              ref={box}
              value={text}
              placeholder={small ? "Reply…" : "Add a comment…"}
              rows={1}
              onChange={(e) => onChange?.(e.target.value)}
              onBlur={onEditEnd}
              onKeyDown={(e) => {
                // Enter posts it, like a chat; Shift+Enter for a new line
                if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') {
                  e.preventDefault()
                  e.currentTarget.blur()
                }
              }}
              style={{ width: 240, border: 0, outline: 'none', resize: 'none', overflow: 'hidden', padding: 0, background: 'none', color: 'var(--text-primary)', font: 'inherit', fontSize: 17, lineHeight: '23px' }}
            />
          ) : (
            <span
              onDoubleClick={onEditStart}
              title={onEditStart ? 'Double-click to edit' : undefined}
              style={{ fontSize: small ? 14 : 17, lineHeight: small ? '19px' : '23px', color: text ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', cursor: onEditStart ? 'text' : 'default' }}
            >
              {text || 'Add a comment…'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function TextNote({ x, y, author = 'You', text, replies, editing: startEditing, typingBy, onChange, onDelete, onMove, onMeasure, onPost, onReply }: {
  x: number
  y: number
  author?: string
  text: string
  replies: Reply[]
  editing?: boolean // open with the cursor in it
  fromVoice?: boolean // was a voice note on the phone (shown the same way: it's words now)
  onChange: (text: string) => void
  onDelete: () => void
  onMove: (dx: number, dy: number) => void // window px; the board converts for zoom
  onMeasure?: (w: number, h: number) => void // the comment card's own size, for the line to it
  typingBy?: string // a teammate writing a reply right now
  onPost?: () => void // a new comment was posted (once), so teammates can pick it up
  onReply?: (text: string) => void // you answered the thread
}) {
  const posted = useRef(!startEditing)
  const [editing, setEditing] = useState(!!startEditing)
  const [hover, setHover] = useState(false)
  const [folded, setFolded] = useState(false)
  const [replying, setReplying] = useState(false) // your reply being typed under the thread
  const [draft, setDraft] = useState('')
  const showDelete = hover && !editing && !folded && !replying
  const sendReply = () => {
    if (draft.trim()) onReply?.(draft.trim())
    setDraft('')
    setReplying(false)
  }

  // tell the board how big the comment card is (not its replies), so its line meets the middle
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

  return (
    <motion.div
      onPointerDown={(e) => e.stopPropagation()}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0 }}
      transition={{ duration: 0.4, ease }}
      style={{ position: 'absolute', left: x, top: y, zIndex: 25, transformOrigin: '0 0', display: 'grid', gap: 6, justifyItems: 'start' }}
    >
      <div ref={card} style={{ display: 'flex' }}>
      <Card
        who={author}
        text={text}
        editing={editing}
        folded={folded}
        onToggle={() => !editing && setFolded((f) => !f)}
        onChange={onChange}
        onEditStart={() => setEditing(true)}
        onEditEnd={() => {
          setEditing(false)
          if (!text.trim()) return onDelete() // a comment left empty isn't kept
          if (!posted.current) {
            posted.current = true
            onPost?.()
          }
        }}
        onGrab={onMove}
      />
      </div>

      {/* folded: how many replies are tucked away */}
      {folded && replies.length > 0 && (
        <span style={{ position: 'absolute', left: 32, top: -4, minWidth: 18, height: 18, padding: '0 4px', boxSizing: 'border-box', borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', border: '2px solid var(--bg-canvas)', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
          {replies.length}
        </span>
      )}

      {/* the thread, smaller and tucked in under the comment */}
      <AnimatePresence initial={false}>
        {!folded && replies.map((r) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} style={{ marginLeft: 24 }}>
            <Card who={r.author} text={r.text} small />
          </motion.div>
        ))}
        {/* your reply, typed in a small card of its own; Enter sends, leaving it empty drops it */}
        {!folded && replying && (
          <motion.div key="reply" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} style={{ marginLeft: 24 }}>
            <Card who="You" text={draft} small editing onChange={setDraft} onEditEnd={sendReply} />
          </motion.div>
        )}
        {/* a teammate writing back */}
        {!folded && typingBy && typingBy !== 'You' && (
          <motion.div key="typing" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} style={{ marginLeft: 24, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 6px', borderRadius: 999, ...CARD }}>
            <Face who={typingBy} size={28} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{typingBy} is typing</span>
            <span style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2].map((i) => (
                <motion.span key={i} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }} style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--text-secondary)' }} />
              ))}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* reply, when you're over it */}
      {onReply && (
        <motion.button
          initial={false}
          animate={{ opacity: showDelete ? 1 : 0, scale: showDelete ? 1 : 0.8 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            setFolded(false)
            setReplying(true)
          }}
          style={{ position: 'absolute', top: -12, right: 22, height: 26, padding: '0 12px', borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', fontSize: 12, fontWeight: 500, boxShadow: '0 2px 8px rgba(0,0,0,.18)', pointerEvents: showDelete ? 'auto' : 'none' }}
        >
          Reply
        </motion.button>
      )}

      {/* delete, when you're over it */}
      <motion.button
        aria-label="Delete comment"
        initial={false}
        animate={{ opacity: showDelete ? 1 : 0, scale: showDelete ? 1 : 0.8 }}
        whileTap={{ scale: 0.9 }}
        onClick={onDelete}
        style={{ position: 'absolute', top: -10, right: -10, width: 26, height: 26, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--bg-canvas)', color: 'var(--text-secondary)', boxShadow: '0 2px 8px rgba(0,0,0,.18)', pointerEvents: showDelete ? 'auto' : 'none' }}
      >
        <TrashIcon />
      </motion.button>
    </motion.div>
  )
}
