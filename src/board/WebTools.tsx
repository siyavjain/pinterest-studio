import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Suggestion } from './voice/intent'
import { CloseIcon, TrashIcon } from '../components/Icons'

// The web board is tool-first: a floating bar of tools along the bottom (after Canva's),
// instead of the phone's mic, and an action bar above it for whatever is selected.
// Picking the pen opens its drawer above it: pens, highlighter, eraser, colour and width.

export type Tool = 'select' | 'hand' | 'pen'
export type Pen = 'pen' | 'pencil' | 'highlighter' | 'eraser'
export const INKS = ['#151413', '#ad001a', '#7b5cff', '#c8f02e'] // ink, Pinterest red, and two from the board
export const WIDTHS = [2, 4, 8]
const ease = [0.22, 1, 0.36, 1] as const
const line = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const

// 24×24 tool icons; the coloured ones say what they make
const ICON = {
  select: <svg width="24" height="24" viewBox="0 0 24 24"><path {...line} d="M5 4.5 19 11l-6.2 1.8L10 19 5 4.5Z" /></svg>,
  hand: <svg width="24" height="24" viewBox="0 0 24 24"><path {...line} d="M8.5 12V5.8a1.5 1.5 0 0 1 3 0V11m0-.6V4.5a1.5 1.5 0 0 1 3 0V11m0-.7V5.8a1.5 1.5 0 0 1 3 0v7.6c0 4-2.8 6.9-6.6 6.9-2.4 0-3.9-1-5.2-3L4 13.2a1.5 1.5 0 0 1 2.5-1.8L8.5 13.6" /></svg>,
  pins: <svg width="24" height="24" viewBox="0 0 24 24"><path {...line} strokeDasharray="3 3" d="M4 4h16v16H4z" /><path {...line} d="M12 8.5v7M8.5 12h7" /></svg>,
  pen: (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path d="M15.5 3.5 19 7l-9.3 9.3-4.4 1 1-4.4L15.5 3.5Z" fill="#e60023" />
      <path d="m6.3 13 3.7 3.7-4.6 1.1L6.3 13Z" fill="#151413" />
      <path d="M8 21c2-1.2 3.4-1.4 4.6-.6 1.4.9 2.6.8 4.4-.6" stroke="#e60023" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  ),
  sticky: (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path d="M5.5 3.5h13a2 2 0 0 1 2 2v9l-6 6h-9a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" fill="#c8f02e" />
      <path d="M14.5 20.5v-4a2 2 0 0 1 2-2h4l-6 6Z" fill="#ff7a3d" />
    </svg>
  ),
  frame: <svg width="24" height="24" viewBox="0 0 24 24"><path stroke="#7b5cff" strokeWidth="2" strokeLinecap="round" fill="none" d="M7.5 3v18M16.5 3v18M3 7.5h18M3 16.5h18" /></svg>,
  merge: (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <circle cx="9" cy="9" r="5.5" fill="#8a857e" />
      <rect x="9.5" y="9.5" width="11" height="11" rx="2.5" fill="#151413" />
    </svg>
  ),
  colours: (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path {...line} d="M12 3.5c4.6 0 8.5 3.4 8.5 7.5 0 2.7-2.1 4-4.2 4h-1.8c-1.1 0-1.7 1.2-1.1 2.1.8 1.1.2 3.4-1.9 3.4A8.5 8.5 0 0 1 12 3.5Z" />
      <circle cx="8" cy="10.5" r="1.5" fill="#ad001a" /><circle cx="11.2" cy="7" r="1.5" fill="#7b5cff" /><circle cx="15.5" cy="8" r="1.5" fill="#9fc21f" />
    </svg>
  ),
  direction: (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <rect x="4" y="3" width="16" height="18" rx="3" fill="#151413" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="#fcfaf7" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  undo: <svg width="24" height="24" viewBox="0 0 24 24"><path {...line} d="M9 6 5 10l4 4" /><path {...line} d="M5.5 10H14a5 5 0 0 1 0 10h-3" /></svg>,
}

function ToolButton({ label, keyHint, on, off, onClick, children }: { label: string; keyHint?: string; on?: boolean; off?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      aria-label={label}
      aria-pressed={on}
      aria-disabled={!!off}
      // a disabled action says what it needs instead of doing nothing silently
      title={off ? `${label}: ${off}` : keyHint ? `${label}  ${keyHint}` : label}
      whileTap={off ? undefined : { scale: 0.92 }}
      onClick={off ? undefined : onClick}
      animate={{ backgroundColor: on ? '#e9e4df' : 'rgba(233,228,223,0)', opacity: off ? 0.35 : 1 }}
      whileHover={on || off ? undefined : { backgroundColor: 'rgba(233,228,223,.6)' }}
      style={{ width: 52, height: 52, borderRadius: 16, display: 'grid', placeItems: 'center', color: '#111', cursor: off ? 'default' : 'pointer' }}
    >
      {children}
    </motion.button>
  )
}

const Rule = () => <span style={{ width: 1, height: 28, background: 'var(--bg-default)', margin: 'auto 4px' }} />

/* ---------- the pen drawer ---------- */

/* The writing things, drawn lying down with the tip to the right (the drawer stands them up).
   Each tip shows the colour in use. */
const PenSide = ({ ink }: { ink: string }) => (
  <svg width="104" height="22" viewBox="0 0 104 22">
    <rect x="0" y="4" width="70" height="14" rx="3" fill="#151413" />
    <rect x="58" y="4" width="5" height="14" fill="#8a857e" />
    <path d="M70 4h8l16 6v2l-16 6h-8V4Z" fill="#e9e4df" />
    <path d="M94 9.6 102 10.8a.2.2 0 0 1 0 .4L94 12.4V9.6Z" fill={ink} />
  </svg>
)
const PencilSide = ({ ink }: { ink: string }) => (
  <svg width="104" height="22" viewBox="0 0 104 22">
    <rect x="0" y="3" width="8" height="16" rx="2" fill="#f4a6c4" />
    <rect x="8" y="3" width="6" height="16" fill="#cfc7bd" />
    <path d="M14 3h58v16H14V3Z" fill="#f2c94c" />
    <path d="M14 11h58" stroke="#d9ad2b" strokeWidth="1.2" />
    <path d="M72 3 92 10v2L72 19V3Z" fill="#e8c9a0" />
    <path d="M86 8 101 10.6a.5.5 0 0 1 0 .8L86 14V8Z" fill={ink} />
  </svg>
)
const HighlighterSide = ({ ink }: { ink: string }) => (
  <svg width="104" height="30" viewBox="0 0 104 30">
    <rect x="0" y="5" width="64" height="20" rx="3" fill="#fcfaf7" stroke="#ddd6ce" />
    <rect x="10" y="5" width="6" height="20" fill={ink} opacity=".6" />
    <path d="M64 7h14l8 4v8l-8 4H64V7Z" fill="#fcfaf7" stroke="#ddd6ce" />
    <path d="M86 9h8l4 3v6l-12 3V9Z" fill={ink} opacity=".7" />
  </svg>
)
const EraserSide = () => (
  <svg width="104" height="30" viewBox="0 0 104 30">
    <rect x="0" y="4" width="96" height="22" rx="4" fill="#f4a6c4" />
    <rect x="72" y="4" width="10" height="22" fill="#e886ab" />
    <rect x="86" y="4" width="10" height="22" fill="#e886ab" />
  </svg>
)

function DrawerItem({ label, on, onClick, children }: { label: string; on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      aria-label={label}
      aria-pressed={on}
      title={label}
      onClick={onClick}
      initial={false}
      // standing up, tucked into the drawer's bottom edge; the one in hand rises
      animate={{ y: on ? 4 : 24 }}
      whileHover={{ y: on ? 2 : 16 }}
      transition={{ duration: 0.3, ease }}
      style={{ position: 'relative', display: 'block', width: 36, height: 104 }}
    >
      {/* drawn lying down, tip right: turn them tip up */}
      <span style={{ position: 'absolute', left: '50%', top: '50%', width: 104, height: 30, display: 'grid', placeItems: 'center', transform: 'translate(-50%, -50%) rotate(-90deg)' }}>
        {children}
      </span>
    </motion.button>
  )
}

/* ---------- the colour wheel ---------- */

const hslToHex = (h: number, s: number, l: number) => {
  const k = (n: number) => (n + h / 30) % 12
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n: number) => l / 100 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
}

const WHEEL = 168

/** Hue round the rim, white in the middle; drag to pick, then set how bright. */
function ColourWheel({ ink, onInk }: { ink: string; onInk: (c: string) => void }) {
  const [at, setAt] = useState({ h: 0, d: 1 }) // hue in degrees, distance from the middle 0–1
  const [bright, setBright] = useState(100)
  const pick = (h: number, d: number, b = bright) => {
    setAt({ h, d })
    onInk(hslToHex(h, 100, (100 - 50 * d) * (b / 100)))
  }
  const fromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
    // the conic gradient starts at the top and runs clockwise, like the angle here
    const h = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360
    pick(h, Math.min(1, Math.hypot(dx, dy) / (r.width / 2)))
  }
  const rad = (at.h * Math.PI) / 180
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, x: '-50%' }}
      animate={{ opacity: 1, scale: 1, x: '-50%' }}
      exit={{ opacity: 0, scale: 0.92, x: '-50%' }}
      transition={{ duration: 0.25, ease }}
      style={{ position: 'absolute', left: '50%', bottom: 56, width: WHEEL + 32, padding: 16, boxSizing: 'border-box', borderRadius: 24, background: 'var(--bg-canvas)', boxShadow: '0 12px 36px rgba(0,0,0,.16), 0 0 0 1px rgba(0,0,0,.04)', display: 'grid', gap: 14, transformOrigin: '50% 100%' }}
    >
      <div
        role="slider"
        aria-label="Colour wheel"
        aria-valuetext={ink}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          fromPointer(e)
        }}
        onPointerMove={(e) => e.buttons && fromPointer(e)}
        style={{
          position: 'relative', width: WHEEL, height: WHEEL, borderRadius: 999, cursor: 'crosshair', touchAction: 'none',
          background: 'radial-gradient(circle closest-side, #fff, rgba(255,255,255,0)), conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
          filter: `brightness(${bright}%)`,
        }}
      >
        <span style={{ position: 'absolute', left: WHEEL / 2 + Math.sin(rad) * at.d * (WHEEL / 2) - 9, top: WHEEL / 2 - Math.cos(rad) * at.d * (WHEEL / 2) - 9, width: 18, height: 18, borderRadius: 999, background: ink, boxShadow: '0 0 0 3px #fff, 0 1px 4px rgba(0,0,0,.4)', pointerEvents: 'none' }} />
      </div>
      <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
        Brightness
        <input
          type="range"
          min={10}
          max={100}
          value={bright}
          onChange={(e) => {
            const b = Number(e.target.value)
            setBright(b)
            pick(at.h, at.d, b)
          }}
          style={{ width: '100%', accentColor: '#151413' }}
        />
      </label>
      {/* quick picks: the board's own inks */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {INKS.map((c) => (
          <button key={c} aria-label={`Colour ${c}`} onClick={() => onInk(c)} style={{ width: 28, height: 28, borderRadius: 999, background: c, boxShadow: ink === c ? '0 0 0 2px var(--bg-canvas), 0 0 0 3px #151413' : 'inset 0 0 0 1px rgba(0,0,0,.08)' }} />
        ))}
      </div>
    </motion.div>
  )
}

function PenDrawer({ pen, onPen, ink, onInk, width, onWidth }: {
  pen: Pen; onPen: (p: Pen) => void
  ink: string; onInk: (c: string) => void
  width: number; onWidth: (w: number) => void
}) {
  const [wheel, setWheel] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 12, x: '-50%' }}
      transition={{ duration: 0.3, ease }}
      // above the bar, centred on the pen
      style={{ position: 'absolute', bottom: 'calc(100% + 20px)', left: '50%', height: 104, padding: '0 14px', borderRadius: 26, background: 'var(--bg-canvas)', boxShadow: '0 12px 36px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.04)', display: 'flex', alignItems: 'center', gap: 8 }}
    >
      {/* the slot clips them at the drawer's bottom edge */}
      <div style={{ display: 'flex', gap: 8, height: 104, overflow: 'hidden', alignSelf: 'end' }}>
        <DrawerItem label="Pen" on={pen === 'pen'} onClick={() => onPen('pen')}><PenSide ink={ink} /></DrawerItem>
        <DrawerItem label="Pencil" on={pen === 'pencil'} onClick={() => onPen('pencil')}><PencilSide ink={ink} /></DrawerItem>
        <DrawerItem label="Highlighter" on={pen === 'highlighter'} onClick={() => onPen('highlighter')}><HighlighterSide ink={ink} /></DrawerItem>
        <DrawerItem label="Eraser" on={pen === 'eraser'} onClick={() => onPen('eraser')}><EraserSide /></DrawerItem>
      </div>

      {/* the colour in use; tap for the wheel */}
      <div style={{ position: 'relative', marginLeft: 8 }}>
        <motion.button
          aria-label="Pen colour"
          aria-expanded={wheel}
          whileTap={{ scale: 0.9 }}
          onClick={() => setWheel((o) => !o)}
          style={{ width: 40, height: 40, borderRadius: 999, background: ink, boxShadow: '0 0 0 3px var(--bg-canvas), 0 0 0 4px #ddd6ce' }}
        />
        <AnimatePresence>{wheel && <ColourWheel key="wheel" ink={ink} onInk={onInk} />}</AnimatePresence>
      </div>

      {/* stroke width: tap to step through thin, medium, thick */}
      <motion.button
        aria-label={`Stroke width ${width}`}
        title="Stroke width"
        whileTap={{ scale: 0.9 }}
        onClick={() => onWidth(WIDTHS[(WIDTHS.indexOf(width) + 1) % WIDTHS.length])}
        style={{ width: 44, height: 44, display: 'grid', alignContent: 'center', gap: 4, justifyItems: 'center' }}
      >
        {WIDTHS.map((w) => (
          <span key={w} style={{ width: 30, height: w === 8 ? 5 : w === 4 ? 3.5 : 2, borderRadius: 2, background: '#151413', opacity: w === width ? 1 : 0.25 }} />
        ))}
      </motion.button>
    </motion.div>
  )
}

/* ---------- the bar ---------- */

export function Toolbar({ tool, onTool, pen, onPen, ink, onInk, width, onWidth, selected, onNote, onPins, onFrame, onMerge, onColours, onDirection, onUndo }: {
  tool: Tool
  onTool: (t: Tool) => void
  pen: Pen; onPen: (p: Pen) => void
  ink: string; onInk: (c: string) => void
  width: number; onWidth: (w: number) => void
  selected: number // how many pieces, so actions that need some can say so
  onNote: () => void
  onPins: () => void
  onFrame: () => void
  onMerge: () => void
  onColours: () => void
  onDirection: () => void
  onUndo: () => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div onPointerDown={(e) => e.stopPropagation()} style={{ position: 'absolute', left: '50%', bottom: 20, transform: 'translateX(-50%)', zIndex: 47, display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* the close button folds the bar away; the same spot opens it again */}
      <motion.button
        aria-label={open ? 'Hide tools' : 'Show tools'}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((o) => !o)}
        style={{ width: 48, height: 48, borderRadius: 999, background: 'var(--bg-canvas)', boxShadow: '0 6px 20px rgba(0,0,0,.1), 0 0 0 1px rgba(0,0,0,.04)', display: 'grid', placeItems: 'center' }}
      >
        {open ? <CloseIcon /> : ICON.pen}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="tools"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3, ease }}
            style={{ position: 'relative', display: 'flex', gap: 4, padding: 8, borderRadius: 28, background: 'var(--bg-canvas)', boxShadow: '0 12px 36px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.04)' }}
          >
            <ToolButton label="Select" keyHint="V" on={tool === 'select'} onClick={() => onTool('select')}>{ICON.select}</ToolButton>
            <ToolButton label="Hand" keyHint="H" on={tool === 'hand'} onClick={() => onTool('hand')}>{ICON.hand}</ToolButton>
            <ToolButton label="Add pins" keyHint="P" onClick={onPins}>{ICON.pins}</ToolButton>
            <div style={{ position: 'relative' }}>
              <ToolButton label="Draw" keyHint="D" on={tool === 'pen'} onClick={() => onTool(tool === 'pen' ? 'select' : 'pen')}>{ICON.pen}</ToolButton>
              <AnimatePresence>{tool === 'pen' && <PenDrawer key="drawer" pen={pen} onPen={onPen} ink={ink} onInk={onInk} width={width} onWidth={onWidth} />}</AnimatePresence>
            </div>
            <ToolButton label="Sticky note" keyHint="N" onClick={onNote}>{ICON.sticky}</ToolButton>
            <Rule />
            <ToolButton label="Frame" keyHint="F" off={selected < 2 ? 'select two or more pieces' : undefined} onClick={onFrame}>{ICON.frame}</ToolButton>
            <ToolButton label="Merge" off={selected < 2 ? 'select two or more pieces' : undefined} onClick={onMerge}>{ICON.merge}</ToolButton>
            <ToolButton label="Colour & material" off={selected !== 1 ? 'select one piece' : undefined} onClick={onColours}>{ICON.colours}</ToolButton>
            <ToolButton label="Concept card" onClick={onDirection}>{ICON.direction}</ToolButton>
            <Rule />
            <ToolButton label="Undo" keyHint="⌘Z" onClick={onUndo}>{ICON.undo}</ToolButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** What you can do with the selection, as buttons: the phone's spoken suggestions, made clickable. */
export function SelectionBar({ count, suggestions, onSuggest, onDelete }: {
  count: number
  suggestions: Suggestion[]
  onSuggest: (s: Suggestion) => void
  onDelete: () => void
}) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="selection"
          onPointerDown={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 12, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 12, x: '-50%' }}
          transition={{ duration: 0.3, ease }}
          style={{ position: 'absolute', left: '50%', bottom: 110, zIndex: 47, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 6px 6px 16px', borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', boxShadow: '0 10px 30px rgba(0,0,0,.18)', whiteSpace: 'nowrap' }}
        >
          <span style={{ fontSize: 13, marginRight: 6, opacity: 0.7 }}>{count} selected</span>
          {suggestions.map((s) => (
            <motion.button
              key={s.label}
              whileTap={{ scale: 0.95 }}
              whileHover={{ backgroundColor: 'rgba(252,250,247,.22)' }}
              onClick={() => onSuggest(s)}
              style={{ height: 36, padding: '0 14px', borderRadius: 999, background: 'rgba(252,250,247,.12)', fontSize: 14 }}
            >
              {s.label}
            </motion.button>
          ))}
          <motion.button
            aria-label="Delete selection"
            title="Delete  ⌫"
            whileTap={{ scale: 0.92 }}
            onClick={onDelete}
            style={{ width: 36, height: 36, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'rgba(252,250,247,.12)' }}
          >
            <TrashIcon />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
