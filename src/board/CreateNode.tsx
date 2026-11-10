import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PieceContent from './Piece'
import type { Look, Part } from './Piece'
import { TrashIcon } from '../components/Icons'
import { asset } from '../components/asset'

// A node on the board, like Flora's: pieces are wired into it, you say what you want, and it makes
// one new image from them. The prototype composes the wired-in pieces rather than calling a model.

export type CreateNodeData = {
  id: string
  x: number
  y: number
  inputs: string[] // piece ids wired in, in the order they were connected
  prompt: string
  status: 'idle' | 'making' | 'done'
  variant: number // which take of the image is showing
}

export const NODE_W = 232
export const FRAME = 208 // the image square inside the node
export const PORT_Y = 12 + 28 + 10 + FRAME / 2 // the input port sits level with the middle of the image

const ease = [0.22, 1, 0.36, 1] as const

function Sparkle() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0.5C8.4 4.6 11.4 7.6 15.5 8C11.4 8.4 8.4 11.4 8 15.5C7.6 11.4 4.6 8.4 0.5 8C4.6 7.6 7.6 4.6 8 0.5Z" />
    </svg>
  )
}

export default function CreateNode({ node, inputs, result, generated, backdrop, onMove, onPrompt, onCreate, onAgain, onAdd, onUnwire, onDelete, onMeasure }: {
  node: CreateNodeData
  inputs: (Look & { id: string; label?: string })[] // the wired-in pieces
  result: Part[] | null // the image, as parts laid out around (0, 0)
  generated?: string // a finished picture to show instead of the parts
  backdrop?: string // a wired-in colour chip tints the image's background
  onMove: (dx: number, dy: number) => void // window px; the board converts for zoom
  onPrompt: (text: string) => void
  onCreate: () => void
  onAgain: () => void
  onAdd: () => void
  onUnwire: (id: string) => void
  onDelete: () => void
  onMeasure: (h: number) => void
}) {
  const card = useRef<HTMLDivElement>(null)
  const measure = useRef(onMeasure)
  measure.current = onMeasure
  useEffect(() => {
    const el = card.current
    if (!el) return
    const ro = new ResizeObserver(() => measure.current(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // fit the composed image into the frame with a little air
  let fit: { scale: number; dx: number; dy: number } | null = null
  if (result?.length) {
    const l = Math.min(...result.map((p) => p.x)), r = Math.max(...result.map((p) => p.x + p.w))
    const t = Math.min(...result.map((p) => p.y)), b = Math.max(...result.map((p) => p.y + p.h))
    const scale = Math.min((FRAME - 28) / (r - l), (FRAME - 28) / (b - t))
    fit = { scale, dx: FRAME / 2 - ((l + r) / 2) * scale, dy: FRAME / 2 - ((t + b) / 2) * scale }
  }
  const pictures = inputs.filter((i) => !i.colour)
  const ready = pictures.length > 0 || !!generated

  return (
    <motion.div
      ref={card}
      data-node={node.id}
      onPointerDown={(e) => e.stopPropagation()}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.35, ease }}
      style={{
        position: 'absolute', left: 0, top: 0, width: NODE_W, padding: 12, boxSizing: 'border-box', borderRadius: 24, zIndex: 30,
        background: 'var(--bg-canvas)', boxShadow: '0 10px 30px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.04)', display: 'grid', gap: 10,
      }}
    >
      {/* the input port, where wires land */}
      <span aria-hidden style={{ position: 'absolute', left: -7, top: PORT_Y - 7, width: 14, height: 14, borderRadius: 999, background: 'var(--bg-canvas)', border: '2.5px solid var(--bg-inverse)', boxSizing: 'border-box' }} />

      {/* header: drag it to move the node */}
      <motion.div
        onPan={(_, info) => onMove(info.delta.x, info.delta.y)}
        style={{ height: 28, display: 'flex', alignItems: 'center', gap: 6, cursor: 'grab', touchAction: 'none' }}
      >
        <Sparkle />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Create</span>
        <span className="t-label" style={{ color: 'var(--text-secondary)', flex: 1 }}>
          {inputs.length ? `${inputs.length} ${inputs.length === 1 ? 'input' : 'inputs'}` : 'no inputs yet'}
        </span>
        <motion.button aria-label="Delete node" whileTap={{ scale: 0.9 }} onClick={onDelete} style={{ width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}>
          <TrashIcon />
        </motion.button>
      </motion.div>

      {/* the image */}
      <div style={{ position: 'relative', width: FRAME, height: FRAME, borderRadius: 16, overflow: 'hidden', background: backdrop ?? 'var(--bg-default)', transition: 'background .4s' }}>
        <AnimatePresence mode="wait">
          {node.status === 'done' && generated ? (
            <motion.img
              key={`made-${node.variant}`}
              src={asset(generated)}
              alt={node.prompt}
              initial={{ opacity: 0, scale: 1.06, filter: 'blur(12px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : node.status === 'done' && fit && result ? (
            <motion.div
              key={`take-${node.variant}`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              style={{ position: 'absolute', inset: 0, filter: 'drop-shadow(0 8px 12px rgba(0,0,0,.14))' }}
            >
              {result.map((p) => (
                <div key={p.id} style={{ position: 'absolute', left: fit!.dx + p.x * fit!.scale, top: fit!.dy + p.y * fit!.scale, width: p.w * fit!.scale, height: p.h * fit!.scale, transform: `rotate(${p.r}deg)` }}>
                  <PieceContent it={p} />
                </div>
              ))}
            </motion.div>
          ) : node.status === 'making' ? (
            <motion.div key="making" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              {/* a light sweep while it works */}
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%)' }}
              />
              <span className="t-label" style={{ position: 'relative', color: 'var(--text-secondary)' }}>Creating…</span>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
              <span className="t-label" style={{ color: 'var(--text-secondary)' }}>
                {ready ? 'Describe what you want, then create' : 'Drag a wire from a piece into this node'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* what's wired in: tap one to unplug it */}
      {inputs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {inputs.map((i) => (
            <motion.button
              key={i.id}
              aria-label={`Unplug ${i.label ?? 'piece'}`}
              title="Tap to unplug"
              whileTap={{ scale: 0.9 }}
              onClick={() => onUnwire(i.id)}
              style={{ width: 32, height: 32, borderRadius: 10, padding: 3, boxSizing: 'border-box', background: 'var(--bg-default)' }}
            >
              <PieceContent it={i} />
            </motion.button>
          ))}
        </div>
      )}

      <input
        value={node.prompt}
        onChange={(e) => onPrompt(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && ready && onCreate()}
        placeholder="Describe the image…"
        style={{ height: 36, padding: '0 14px', borderRadius: 999, border: 0, outline: 'none', background: 'var(--bg-default)', font: 'inherit', fontSize: 14, color: 'var(--text-primary)', minWidth: 0 }}
      />

      {node.status === 'done' ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onAgain} style={{ flex: 1, height: 36, borderRadius: 999, background: 'var(--bg-default)', fontSize: 14, fontWeight: 500 }}>
            Try again
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onAdd} style={{ flex: 1, height: 36, borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', fontSize: 14, fontWeight: 500 }}>
            Add to board
          </motion.button>
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={!ready || node.status === 'making'}
          onClick={onCreate}
          style={{ height: 36, borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', fontSize: 14, fontWeight: 500, opacity: ready ? 1 : 0.4, transition: 'opacity .2s' }}
        >
          {node.status === 'making' ? 'Creating…' : 'Create'}
        </motion.button>
      )}
    </motion.div>
  )
}
