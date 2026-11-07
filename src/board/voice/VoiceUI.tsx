import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DotsIcon, MicIcon, TrashIcon } from '../../components/Icons'
import { Pill } from '../../components/Button'
import { asset } from '../../components/asset'
import Squiggle from '../Squiggle'
import type { Suggestion } from './intent'

const ease = [0.22, 1, 0.36, 1] as const
const CANCEL_DISTANCE = 70 // px the thumb slides off the mic to arm cancel
const TAP_MS = 250 // shorter than this is a tap, not a hold

/* ---------------------------------------------------------------- mic */

type MicProps = {
  size?: number
  holding: boolean
  onHoldStart: () => void
  onHoldEnd: (how: 'send' | 'cancel' | 'tap') => void
  onArm: (armed: boolean) => void
}

/** Press and hold to talk. Slide away before letting go to cancel. */
export function Mic({ size = 56, holding, onHoldStart, onHoldEnd, onArm }: MicProps) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null)
  const armed = useRef(false)

  return (
    <motion.button
      aria-label="Hold to talk"
      onPointerDown={(e) => {
        e.stopPropagation()
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* synthetic or already-released pointer */
        }
        start.current = { x: e.clientX, y: e.clientY, t: performance.now() }
        armed.current = false
        navigator.vibrate?.(10)
        onHoldStart()
      }}
      onPointerMove={(e) => {
        if (!start.current) return
        const far = Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > CANCEL_DISTANCE
        if (far !== armed.current) {
          armed.current = far
          onArm(far)
        }
      }}
      onPointerUp={() => {
        if (!start.current) return
        const quick = performance.now() - start.current.t < TAP_MS
        start.current = null
        onHoldEnd(armed.current ? 'cancel' : quick ? 'tap' : 'send')
      }}
      onPointerCancel={() => {
        start.current = null
        onHoldEnd('cancel')
      }}
      animate={{ scale: holding ? 1.18 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      style={{
        position: 'relative', width: size, height: size, borderRadius: 999, flexShrink: 0,
        background: 'var(--red-700)', color: 'var(--bg-canvas)', display: 'grid', placeItems: 'center',
        boxShadow: '0 8px 20px rgba(173,0,26,.3)', touchAction: 'none',
      }}
    >
      {holding && (
        <motion.span
          style={{ position: 'absolute', inset: -8, borderRadius: 999, background: 'var(--red-700)', opacity: 0.18 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <MicIcon size={size > 48 ? 24 : size > 32 ? 20 : 14} />
    </motion.button>
  )
}

/** Shown after a quick tap on the mic. */
export function HoldTip({ show, children, align = 'right' }: { show: boolean; children?: ReactNode; align?: 'left' | 'right' }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'absolute', bottom: '100%', [align]: 0, marginBottom: 10, padding: '7px 12px',
            borderRadius: 12, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)',
            fontSize: 13, whiteSpace: 'nowrap', pointerEvents: 'none',
          }}
        >
          {children ?? 'Hold to talk'}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------------------------------------------------------- dock */

/**
 * Bottom-right, always in the same place. Nothing selected: just the mic.
 * Something selected: the mic opens into a bar with suggestions and delete.
 */
export function Dock({ open, suggestions, onSuggest, onDelete, mic, tip, tipText, active }: {
  open: boolean
  suggestions: Suggestion[]
  onSuggest: (s: Suggestion) => void
  onDelete: () => void
  mic: ReactNode
  tip: boolean
  tipText?: string
  active?: string // label of the suggestion currently in use
}) {
  const chips = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ left: false, right: false })
  const drag = useRef<{ x: number; scroll: number; moved: boolean } | null>(null)

  const measure = () => {
    const c = chips.current
    if (c) setFade({ left: c.scrollLeft > 2, right: c.scrollLeft + c.clientWidth < c.scrollWidth - 2 })
  }
  useLayoutEffect(measure, [suggestions, open])

  const mask = `linear-gradient(to right, ${fade.left ? 'transparent, black 20px' : 'black'}, ${fade.right ? 'black calc(100% - 20px), transparent' : 'black'})`

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{ position: 'absolute', left: 'var(--ui-x)', right: 'var(--ui-x)', bottom: 'var(--ui-dock)', zIndex: 47, display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}
    >
      <motion.div
        layout
        transition={{ duration: 0.35, ease }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%', pointerEvents: 'auto',
          padding: open ? 6 : 0, borderRadius: 999,
          background: open ? 'var(--bg-canvas)' : 'transparent', boxShadow: open ? '0 10px 30px rgba(0,0,0,.14)' : 'none',
        }}
      >
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}
            >
              <motion.button
                aria-label="Delete"
                whileTap={{ scale: 0.9 }}
                onClick={onDelete}
                style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--bg-default)', color: 'var(--text-primary)' }}
              >
                <TrashIcon size={18} />
              </motion.button>
              {/* suggestions scroll sideways: swipe, trackpad, or drag with a mouse */}
              <div
                ref={chips}
                data-scroll
                onScroll={measure}
                onWheel={(e) => {
                  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY // a plain mouse wheel scrolls sideways too
                }}
                onPointerDown={(e) => {
                  if (e.pointerType === 'mouse') drag.current = { x: e.clientX, scroll: e.currentTarget.scrollLeft, moved: false }
                }}
                onPointerMove={(e) => {
                  if (!drag.current) return
                  const dx = e.clientX - drag.current.x
                  if (Math.abs(dx) > 4) drag.current.moved = true
                  e.currentTarget.scrollLeft = drag.current.scroll - dx
                }}
                onPointerUp={() => setTimeout(() => (drag.current = null))}
                onPointerLeave={() => (drag.current = null)}
                onClickCapture={(e) => drag.current?.moved && e.stopPropagation()} // a drag isn't a tap
                style={{
                  display: 'flex', gap: 6, minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none',
                  touchAction: 'pan-x', overscrollBehavior: 'contain', maskImage: mask, WebkitMaskImage: mask,
                }}
              >
                {suggestions.map((s) => (
                  <Pill key={s.label} label={s.label} selected={s.label === active} onClick={() => onSuggest(s)} style={{ flexShrink: 0 }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div layout="position" style={{ position: 'relative', flexShrink: 0 }}>
          {mic}
          <HoldTip show={tip}>{tipText}</HoldTip>
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ----------------------------------------------------- listening panel */

export function ListeningPanel({ transcript, heard, armed, thumbs, title = 'Listening…' }: { transcript: string; heard: boolean; armed: boolean; thumbs: string[]; title?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      transition={{ duration: 0.4, ease }}
      style={{
        borderRadius: 28, padding: '16px 20px 14px',
        background: armed ? 'var(--red-100)' : 'var(--bg-canvas)', boxShadow: '0 10px 30px rgba(0,0,0,.14)',
        transition: 'background .2s', pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="t-body">{armed ? 'Release to cancel' : title}</span>
        <span style={{ flex: 1 }} />
        {thumbs.length ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex' }}>
              {thumbs.slice(0, 3).map((t, i) => (
                <img key={t + i} src={asset(t)} alt="" style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 6, background: 'var(--bg-default)', marginLeft: i ? -6 : 0, border: '1.5px solid var(--bg-canvas)' }} />
              ))}
            </span>
            {thumbs.length === 1 ? 'This piece' : `${thumbs.length} pieces`}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Whole board</span>
        )}
      </div>
      <div style={{ minHeight: 52, marginTop: 8, fontSize: 20, fontWeight: 600, lineHeight: '26px', color: heard ? 'var(--text-primary)' : 'rgba(17,17,17,.25)' }}>
        {heard ? transcript : 'Say what to do…'}
      </div>
      <div style={{ margin: '4px -20px 0', opacity: armed ? 0.3 : 1, transition: 'opacity .2s' }}>
        <Squiggle height={40} width={386} />
      </div>
      <div className="t-label" style={{ textAlign: 'center', color: armed ? 'var(--red-700)' : 'var(--text-secondary)', marginTop: 2 }}>
        {armed ? 'Let go to cancel' : 'Let go to send · slide away to cancel'}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------- status cards */

// cards sit in a slot the board places above or below the selection
const card = {
  borderRadius: 24, background: 'var(--bg-canvas)', boxShadow: '0 10px 30px rgba(0,0,0,.14)', pointerEvents: 'auto',
} as const

export function Thinking({ heard, working }: { heard: string; working: string }) {
  return (
    <motion.div key="thinking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.3, ease }} style={{ ...card, padding: '14px 18px' }}>
      <div className="t-label" style={{ color: 'var(--text-secondary)' }}>“{heard}”</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 15, fontWeight: 600 }}>
        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} style={{ color: 'var(--red-700)', display: 'flex' }}>
          <DotsIcon size={20} />
        </motion.span>
        {working}
      </div>
    </motion.div>
  )
}

export function Done({ text, onUndo }: { text: string; onUndo?: () => void }) {
  return (
    <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.3, ease }} style={{ ...card, borderRadius: 999, height: 56, padding: '0 8px 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-inverse)', color: 'var(--bg-canvas)' }}>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{text}</span>
      {onUndo && <Pill label="Undo" onClick={onUndo} />}
    </motion.div>
  )
}

export function Answer({ heard, text, onClose }: { heard: string; text: string; onClose: () => void }) {
  return (
    <motion.div key="answer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.3, ease }} style={{ ...card, padding: '16px 18px' }}>
      <div className="t-label" style={{ color: 'var(--text-secondary)' }}>“{heard}”</div>
      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 600, lineHeight: '22px' }}>{text}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <Pill label="Got it" onClick={onClose} />
      </div>
    </motion.div>
  )
}

export function Confirm({ heard, title, thumbs, name, onCancel, onConfirm }: {
  heard: string
  title: string
  thumbs: string[]
  name?: string // when set, a name field to edit before confirming
  onCancel: () => void
  onConfirm: (name?: string) => void
}) {
  const [typed, setTyped] = useState(name ?? '')
  const confirm = () => onConfirm(name === undefined ? undefined : typed)
  return (
    <motion.div key="confirm" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.35, ease }} style={{ ...card, padding: '16px 18px' }}>
      <div className="t-label" style={{ color: 'var(--text-secondary)' }}>“{heard}”</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 600 }}>{title}</div>
      {name !== undefined && (
        <input
          aria-label="Group name"
          value={typed}
          maxLength={28}
          placeholder={name}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation() // Backspace here shouldn't delete pieces
            if (e.key === 'Enter') confirm()
          }}
          onFocus={(e) => e.currentTarget.select()}
          style={{ width: '100%', height: 40, marginTop: 10, padding: '0 14px', borderRadius: 999, border: 'none', outline: 'none', background: 'var(--input-bg)', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', color: 'var(--text-primary)' }}
        />
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {thumbs.slice(0, 6).map((t, i) => (
          <img key={t + i} src={asset(t)} alt="" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 10, background: 'var(--bg-default)' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <Pill label="Cancel" onClick={onCancel} />
        <Pill label={name !== undefined ? 'Group' : 'Do it'} selected onClick={confirm} />
      </div>
    </motion.div>
  )
}

export function Clarify({ heard, options, onPick, onSaveNote, onCancel }: {
  heard: string
  options: Suggestion[]
  onPick: (s: Suggestion) => void
  onSaveNote: () => void
  onCancel: () => void
}) {
  return (
    <motion.div key="clarify" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.35, ease }} style={{ ...card, padding: '16px 18px' }}>
      <div className="t-label" style={{ color: 'var(--text-secondary)' }}>{heard ? `“${heard}”` : 'Nothing heard'}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 600 }}>Save this as a note, or did you mean something else?</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <Pill label="Save as note" selected onClick={onSaveNote} />
        {options.map((o) => <Pill key={o.label} label={o.label} onClick={() => onPick(o)} />)}
        <Pill label="Cancel" onClick={onCancel} style={{ background: 'transparent' }} />
      </div>
    </motion.div>
  )
}
