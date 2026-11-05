import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconButton, Pill } from '../components/Button'
import { BackIcon, ShareIcon } from '../components/Icons'
import VoiceAssistant from '../board/VoiceAssistant'
import type { Command } from '../board/VoiceAssistant'
import ShareSheet from '../board/ShareSheet'
import ExploreSheet from '../board/ExploreSheet'
import Recommendation from '../board/Recommendation'
import VoiceNote from '../board/VoiceNote'
import { pinPattern } from '../components/pin'
import { ORIGIN, WORLD, useCanvas } from '../board/useCanvas'

type Item = { id: string; src: string; x: number; y: number; w: number; h: number; z: number; merged?: [string, string] }
type Group = { ids: string[]; name: string }
type Note = { id: string; x: number; y: number }
type Snapshot = { items: Item[]; groups: Group[]; notes: Note[] }

// Cut-outs exactly where they sit on the "Studio ads workspace" frame (full, uncropped)
const START: Item[] = [
  { id: 'meadow', src: 'board-meadow', x: 15, y: 31, w: 154, h: 134 },
  { id: 'ribbon', src: 'board-ribbon', x: 156, y: 119, w: 236, h: 236 },
  { id: 'scary', src: 'board-scary', x: 237, y: 345, w: 254, h: 254 },
  { id: 'hand', src: 'board-hand', x: 11, y: 223, w: 162, h: 216 },
  { id: 'cap', src: 'board-cap', x: 201, y: 511, w: 124, h: 155 },
  { id: 'flower', src: 'board-flower', x: 45, y: 480, w: 134, h: 134 },
  { id: 'blob', src: 'board-blob', x: -19, y: 638, w: 72, h: 129 },
  { id: 'gradient', src: 'board-gradient', x: 329, y: 19, w: 106, h: 204 },
  { id: 'bloom', src: 'board-bloom', x: 217, y: -24, w: 118, h: 135 },
  { id: 'hill', src: 'board-hill', x: 329, y: 666, w: 188, h: 97 },
  { id: 'bouquet', src: 'ws-14', x: 57, y: 688, w: 159, h: 186 },
].map((it, i) => ({ ...it, z: i + 1 }))

const DEFAULT_PAIR: [string, string] = ['flower', 'cap']
const ease = [0.22, 1, 0.36, 1] as const

function bounds(items: Item[]) {
  const x = Math.min(...items.map((i) => i.x)) - 14
  const y = Math.min(...items.map((i) => i.y)) - 14
  const r = Math.max(...items.map((i) => i.x + i.w)) + 14
  const b = Math.max(...items.map((i) => i.y + i.h)) + 14
  return { x, y, w: r - x, h: b - y }
}

export default function Board({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Item[]>(START)
  const [groups, setGroups] = useState<Group[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [shareOpen, setShareOpen] = useState(false)
  const [exploreOpen, setExploreOpen] = useState(false)
  const [rec, setRec] = useState(false)
  const [merging, setMerging] = useState<null | { a: Item; b: Item; ids: [string, string]; step: 'fly' | 'result'; flip: boolean }>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const didDrag = useRef(false) // a drag shouldn't also count as a tap-to-select
  const viewport = useRef<HTMLDivElement>(null)
  const canvas = useCanvas(viewport, () => setSelected([]))
  const history = useRef<Snapshot[]>([])
  const zTop = useRef(START.length + 1)

  useEffect(() => {
    const t = setTimeout(() => setRec(true), 6000)
    return () => clearTimeout(t)
  }, [])

  const snapshot = () => history.current.push({ items, groups, notes })
  const byId = (id: string) => items.find((i) => i.id === id)!
  const targets = (): [string, string] => (selected.length >= 2 ? [selected[0], selected[1]] : DEFAULT_PAIR)

  const move = (id: string, dx: number, dy: number) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, x: i.x + dx, y: i.y + dy } : i)))

  const doGroup = () => {
    snapshot()
    const ids = selected.length >= 2 ? selected : DEFAULT_PAIR
    const [first, ...rest] = ids.map(byId)
    // pull the pieces together, then frame them
    let cursor = first.x + first.w + 12
    setItems((list) =>
      list.map((i) => {
        const k = rest.findIndex((r) => r.id === i.id)
        if (k === -1) return i
        const nx = cursor
        cursor += i.w + 12
        return { ...i, x: nx, y: first.y + k * 20 }
      }),
    )
    setGroups((g) => [...g.filter((x) => !x.ids.some((id) => ids.includes(id))), { ids, name: 'Purple pop' }])
    setSelected([])
  }

  const doMerge = () => {
    const [a, b] = targets().map(byId)
    // fly from where the pieces sit on screen right now
    const at = (it: Item) => {
      const p = canvas.toScreen(it.x, it.y)
      const s = canvas.scale.get()
      return { ...it, x: p.x, y: p.y, w: it.w * s, h: it.h * s }
    }
    setMerging({ a: at(a), b: at(b), ids: [a.id, b.id], step: 'fly', flip: false })
    setSelected([])
    setTimeout(() => setMerging((m) => m && { ...m, step: 'result' }), 900)
  }

  const keepMerge = () => {
    if (!merging) return
    snapshot()
    const id = `merge-${Date.now()}`
    const c = canvas.viewCentre()
    setItems((list) => [...list, { id, src: merging.a.src, merged: [merging.a.src, merging.b.src], x: c.x - 85, y: c.y - 110, w: 170, h: 220, z: ++zTop.current }])
    setMerging(null)
  }

  const doNote = () => {
    snapshot()
    const f = byId(selected[0] ?? 'flower')
    setNotes((n) => [...n, { id: `note-${Date.now()}`, x: Math.min(f.x + f.w - 20, 150), y: Math.max(f.y - 40, 60) }])
    setSelected([])
  }

  const addItems = (srcs: string[]) => {
    snapshot()
    const c = canvas.viewCentre()
    setItems((list) => [
      ...list,
      ...srcs.map((src, i) => ({ id: `${src}-${Date.now()}-${i}`, src, x: c.x - 160 + i * 110, y: c.y - 120 + (i % 2) * 30, w: 96, h: 128, z: ++zTop.current })),
    ])
  }

  const onCommand = useCallback(
    (c: Command) => {
      if (c === 'group') doGroup()
      if (c === 'merge') doMerge()
      if (c === 'note') doNote()
      if (c === 'similar') setExploreOpen(true)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, groups, notes, selected],
  )

  const undo = () => {
    const prev = history.current.pop()
    if (!prev) return
    setItems(prev.items)
    setGroups(prev.groups)
    setNotes(prev.notes)
  }

  const hidden: string[] = merging ? merging.ids : []

  return (
    <div ref={viewport} className="screen" style={{ overflow: 'hidden', touchAction: 'none' }}>
      {/* the freeform board: drag empty space to move around, pinch or ctrl+scroll to zoom */}
      <motion.div
        {...canvas.handlers}
        style={{
          position: 'absolute', left: 0, top: 0, width: WORLD, height: WORLD,
          x: canvas.x, y: canvas.y, scale: canvas.scale, transformOrigin: '0 0',
          cursor: 'grab', ...pinPattern(),
        }}
      >
      {/* groups */}
      <AnimatePresence>
        {groups.map((g) => {
          const b = bounds(g.ids.map(byId))
          return (
            <motion.div
              key={g.ids.join()}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1, left: ORIGIN + b.x, top: ORIGIN + b.y, width: b.w, height: b.h }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease }}
              style={{ position: 'absolute', borderRadius: 28, background: 'rgba(173,0,26,.05)', border: '1.5px dashed rgba(173,0,26,.5)', pointerEvents: 'none' }}
            >
              <div style={{ position: 'absolute', left: 14, top: -14, padding: '5px 12px', borderRadius: 999, background: 'var(--red-700)', color: 'var(--bg-canvas)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {g.name} <span style={{ opacity: 0.7, fontWeight: 400 }}>{g.ids.length}</span>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* freeform items */}
      {items.map((it) => {
        const on = selected.includes(it.id)
        return (
          <motion.div
            key={it.id}
            onPointerDown={(e) => {
              e.stopPropagation()
              didDrag.current = false
            }}
            onPanStart={() => {
              didDrag.current = true
              setDragging(it.id)
              setItems((l) => l.map((i) => (i.id === it.id ? { ...i, z: ++zTop.current } : i)))
            }}
            onPan={(_, info) => move(it.id, info.delta.x / canvas.scale.get(), info.delta.y / canvas.scale.get())}
            onPanEnd={() => setDragging(null)}
            onTap={() => !didDrag.current && setSelected((s) => (s.includes(it.id) ? s.filter((x) => x !== it.id) : [...s, it.id]))}
            initial={{ x: ORIGIN + it.x, y: ORIGIN + it.y, scale: 0.6, opacity: 0 }}
            animate={{ x: ORIGIN + it.x, y: ORIGIN + it.y, scale: dragging === it.id ? 1.05 : 1, opacity: hidden.includes(it.id) ? 0 : 1 }}
            transition={dragging === it.id ? { x: { duration: 0 }, y: { duration: 0 }, scale: { duration: 0.2 } } : { duration: 0.6, ease }}
            style={{ position: 'absolute', left: 0, top: 0, width: it.w, height: it.h, zIndex: it.z, cursor: 'grab', touchAction: 'none' }}
          >
            {it.merged ? (
              <div style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', position: 'relative', background: 'var(--bg-default)' }}>
                <img src={`/img/${it.merged[0]}.png`} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <img src={`/img/${it.merged[1]}.png`} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
              </div>
            ) : (
              <img src={`/img/${it.src}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
            )}
            <motion.div
              initial={false}
              animate={{ opacity: on ? 1 : 0 }}
              style={{ position: 'absolute', inset: -6, borderRadius: 16, border: '2px solid var(--red-700)', pointerEvents: 'none' }}
            />
          </motion.div>
        )
      })}

      <AnimatePresence>{notes.map((n) => <VoiceNote key={n.id} x={ORIGIN + n.x} y={ORIGIN + n.y} />)}</AnimatePresence>
      </motion.div>

      {/* merge */}
      <AnimatePresence>
        {merging && (
          <motion.div key="merge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, zIndex: 60 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(252,250,247,.85)', backdropFilter: 'blur(6px)' }} />
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: merging.step === 'result' ? 1.2 : 1, opacity: 0.6 }}
              transition={{ duration: 0.9, ease }}
              style={{ position: 'absolute', left: 81, top: 220, width: 240, height: 240, borderRadius: 999, background: 'radial-gradient(var(--red-500), transparent 70%)', filter: 'blur(30px)' }}
            />
            {[merging.a, merging.b].map((it, k) => (
              <motion.img
                key={it.id}
                src={`/img/${it.src}.png`}
                alt=""
                initial={{ x: it.x, y: it.y, width: it.w, height: it.h, opacity: 1 }}
                animate={
                  merging.step === 'fly'
                    ? { x: 126 + k * 30, y: 250 + k * 16, width: 130, height: 160, opacity: 1 }
                    : { x: 116, y: 250, width: 170, height: 220, opacity: 0 }
                }
                transition={{ duration: 0.8, ease }}
                style={{ position: 'absolute', left: 0, top: 0, objectFit: 'contain' }}
              />
            ))}
            {merging.step === 'result' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease }}>
                <div style={{ position: 'absolute', left: 116, top: 250, width: 170, height: 220, borderRadius: 20, overflow: 'hidden', background: 'var(--bg-default)', boxShadow: '0 20px 40px rgba(0,0,0,.18)' }}>
                  <img src={`/img/${merging.flip ? merging.b.src : merging.a.src}.png`} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <img src={`/img/${merging.flip ? merging.a.src : merging.b.src}.png`} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 486, textAlign: 'center' }}>
                  <span style={{ padding: '5px 10px', borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', fontSize: 12, fontWeight: 600 }}>Flower × Cap</span>
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 524, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <Pill label="Try again" onClick={() => setMerging((m) => m && { ...m, flip: !m.flip })} />
                  <Pill label="Keep" selected onClick={keepMerge} />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* selection actions (tap fallback for voice) */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            style={{ position: 'absolute', left: 60, top: 70, height: 44, padding: '0 4px 0 14px', borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', display: 'flex', alignItems: 'center', gap: 6, zIndex: 50 }}
          >
            <span style={{ fontSize: 13, marginRight: 4 }}>{selected.length} selected</span>
            {selected.length >= 2 && <Pill label="Merge" onClick={doMerge} style={{ height: 36 }} />}
            {selected.length >= 2 && <Pill label="Group" onClick={doGroup} style={{ height: 36 }} />}
            {selected.length === 1 && <Pill label="Note" onClick={doNote} style={{ height: 36 }} />}
            {selected.length === 1 && <Pill label="Similar" onClick={() => setExploreOpen(true)} style={{ height: 36 }} />}
          </motion.div>
        )}
      </AnimatePresence>

      <IconButton label="Back" onClick={onBack} style={{ position: 'absolute', left: 8, top: 70, zIndex: 50 }}>
        <BackIcon />
      </IconButton>

      <IconButton label="Share board" selected={shareOpen} onClick={() => setShareOpen(true)} style={{ position: 'absolute', right: 8, top: 70, zIndex: 50 }}>
        <ShareIcon />
      </IconButton>

      <AnimatePresence>{rec && <Recommendation key="rec" onAdd={addItems} onDismiss={() => setRec(false)} />}</AnimatePresence>

      <VoiceAssistant onCommand={onCommand} onUndo={undo} />

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} cover="/img/p3-front.png" />
      <ExploreSheet open={exploreOpen} onClose={() => setExploreOpen(false)} onAdd={(src) => addItems([src])} />
    </div>
  )
}
