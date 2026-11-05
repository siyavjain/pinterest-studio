import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconButton, Pill } from '../components/Button'
import { BackIcon, ShareIcon, TrashIcon } from '../components/Icons'
import { Answer, Clarify, Confirm, Dock, Done, ListeningPanel, Mic, Thinking } from '../board/voice/VoiceUI'
import { COLOUR_GROUPS, PIECES, labelOf, parse, suggestionsFor } from '../board/voice/intent'
import type { Intent, Suggestion } from '../board/voice/intent'
import { useSpeech } from '../board/voice/useSpeech'
import type { Recording } from '../board/voice/useSpeech'
import ShareSheet from '../board/ShareSheet'
import ExploreSheet from '../board/ExploreSheet'
import Recommendation from '../board/Recommendation'
import VoiceNote from '../board/VoiceNote'
import { pinPattern } from '../components/pin'
import { ORIGIN, WORLD, useCanvas } from '../board/useCanvas'
import { asset } from '../components/asset'
import { getFit } from '../components/fit'
import { FINDS, INGREDIENTS, POST_ASPECT, RADIUS, cutAspect, findByPhoto } from '../board/ingredients'
import type { Find, Shape } from '../board/ingredients'

type Item = {
  id: string; src: string; x: number; y: number; w: number; h: number; z: number
  merged?: [string, string]
  label?: string // ingredients pulled from a post name themselves
  crop?: { box: [number, number, number, number]; shape: Shape } // part of src, cut to a shape
  colour?: string // a colour chip
  from?: { x: number; y: number } // where it flies out from when it appears
  extracting?: boolean // a post being broken into ingredients
}
type Group = { ids: string[]; name: string; colour?: FrameColour }

// Frame colours a group can wear; red is the default
const FRAMES = {
  red: '173, 0, 26',
  orange: '226, 101, 20',
  green: '58, 140, 64',
  blue: '36, 99, 200',
  purple: '122, 64, 200',
  ink: '17, 17, 17',
} as const
type FrameColour = keyof typeof FRAMES
const FRAME_FOR: Record<string, FrameColour> = { green: 'green', pink: 'red', purple: 'purple', neutral: 'ink' }
type Note = { id: string; x: number; y: number; text: string; audio?: Recording }
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
  // the colours pulled from the original pins, like any extraction: a row under all the pieces
  ...['#7b5cff', '#c8f02e', '#f4a6c4', '#ff7a3d', '#3e5c2a'].map((colour, i) => ({
    id: `start-c${i}`, src: 'board-palette', label: 'colour', colour, x: 90 + i * 46, y: 896, w: 38, h: 38,
  })),
].map((it, i) => ({ ...it, z: i + 1 }))

type Phase =
  | { k: 'idle' }
  | { k: 'listening' }
  | { k: 'thinking'; heard: string; working: string }
  | { k: 'confirm'; heard: string; title: string; thumbs: string[]; name?: string; run: (name?: string) => void } // name: editable, for new groups
  | { k: 'clarify'; heard: string }
  | { k: 'done'; text: string; undo: boolean }
  | { k: 'answer'; heard: string; text: string }

const LONG_PRESS_MS = 450

// An outline that follows a cut-out's transparent edges: the same shape shadowed
// a few px in four directions, in Red/700. Width 0 = no outline.
const outline = (w: number) => {
  const c = `rgba(173, 0, 26, ${w ? 1 : 0})`
  return `drop-shadow(${w}px 0 0 ${c}) drop-shadow(-${w}px 0 0 ${c}) drop-shadow(0 ${w}px 0 ${c}) drop-shadow(0 -${w}px 0 ${c})`
}
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
  const [explore, setExplore] = useState<null | { subject: string; tab: 'similar' | 'ingredients' }>(null)
  const lastExplore = useRef({ subject: 'this board', tab: 'similar' as 'similar' | 'ingredients' })
  if (explore) lastExplore.current = explore // keep content while the sheet slides away
  const [rec, setRec] = useState(false)
  const [merging, setMerging] = useState<null | { a: Item; b: Item; ids: [string, string]; step: 'fly' | 'result'; flip: boolean }>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [movingGroup, setMovingGroup] = useState<string | null>(null) // key of the frame being dragged
  const [palette, setPalette] = useState<string | null>(null) // key of the frame showing colour swatches
  const didDrag = useRef(false) // a drag shouldn't also count as a tap-to-select
  const viewport = useRef<HTMLDivElement>(null)
  const canvas = useCanvas(viewport, () => {
    setSelected([])
    setPalette(null)
  })
  const history = useRef<Snapshot[]>([])
  const zoom = () => canvas.scale.get() * getFit() // window px per board px
  const zTop = useRef(START.length + 1)

  // voice
  const speech = useSpeech()
  const [phase, setPhase] = useState<Phase>({ k: 'idle' })
  const [armed, setArmed] = useState(false)
  const [tip, setTip] = useState(false)
  const [noteMode, setNoteMode] = useState(false) // next hold records a note word for word
  useEffect(() => setNoteMode(false), [selected])
  const [slot, setSlot] = useState<'top' | 'bottom'>('bottom') // keep voice cards off the selection
  const targets = useRef<string[]>([]) // what "these" meant when the hold started
  const lastAudio = useRef<Recording | undefined>(undefined) // the sound of the last hold, kept for notes
  const press = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPress = useRef(false)
  const [vp, setVp] = useState({ w: 402, h: 874 })
  useEffect(() => {
    const el = viewport.current
    if (el) setVp({ w: el.offsetWidth, h: el.offsetHeight })
  }, [])

  // a finished action shows briefly, then gets out of the way
  useEffect(() => {
    if (phase.k !== 'done') return
    const t = setTimeout(() => setPhase({ k: 'idle' }), 2800)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    const t = setTimeout(() => setRec(true), 6000)
    return () => clearTimeout(t)
  }, [])

  const snapshot = () => history.current.push({ items, groups, notes })
  const byId = (id: string) => items.find((i) => i.id === id)!
  const nameOf = (it: Item) => it.label ?? labelOf(it.src)
  const names = (ids: string[]) => {
    const l = ids.map((id) => nameOf(byId(id)))
    return l.length <= 2 ? l.join(' + ') : `${l.length} pieces`
  }

  const move = (id: string, dx: number, dy: number) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, x: i.x + dx, y: i.y + dy } : i)))

  // drag a frame: everything in it travels together
  const moveGroup = (ids: string[], dx: number, dy: number) =>
    setItems((list) => list.map((i) => (ids.includes(i.id) ? { ...i, x: i.x + dx, y: i.y + dy } : i)))

  // a frame and its label share these: drag to move the group, tap to recolour
  const frameDrag = (g: Group) => {
    const key = g.ids.join()
    return {
      onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
      onPanStart: () => {
        snapshot()
        setMovingGroup(key)
        setPalette(null)
      },
      onPan: (_: unknown, info: { delta: { x: number; y: number } }) => moveGroup(g.ids, info.delta.x / zoom(), info.delta.y / zoom()),
      onPanEnd: () => setTimeout(() => setMovingGroup(null)), // after the tap that ends a drag
      onClick: () => !movingGroup && setPalette((p) => (p === key ? null : key)),
    }
  }

  // the frame goes, the pieces stay where they are
  const ungroup = (key: string) => {
    snapshot()
    setGroups((g) => g.filter((x) => x.ids.join() !== key))
    setPalette(null)
    setPhase({ k: 'done', text: 'Ungrouped', undo: true })
  }

  const recolour = (key: string, colour: FrameColour) => {
    snapshot()
    setGroups((g) => g.map((x) => (x.ids.join() === key ? { ...x, colour } : x)))
    setPalette(null)
  }

  const groupName = (ids: string[]) => {
    const colours = new Set(ids.map((id) => PIECES[byId(id).src]?.colour ?? 'neutral'))
    if (colours.size === 1) return COLOUR_GROUPS[[...colours][0]]
    const l = ids.map((id) => nameOf(byId(id)))
    return l.length === 2 ? `${l[0].charAt(0).toUpperCase() + l[0].slice(1)} & ${l[1]}` : 'Mixed moodboard'
  }

  const doGroup = (ids: string[], name: string) => {
    snapshot()
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
    setGroups((g) => [...g.filter((x) => !x.ids.some((id) => ids.includes(id))), { ids, name }])
    setSelected([])
  }

  const colourClusters = (ids: string[]) => {
    const pool = (ids.length ? ids : items.map((i) => i.id)).filter((id) => PIECES[byId(id).src])
    const by: Record<string, string[]> = {}
    for (const id of pool) (by[PIECES[byId(id).src].colour] ??= []).push(id)
    return Object.entries(by).filter(([, list]) => list.length > 1)
  }

  const doGroupByColour = (ids: string[]) => {
    snapshot()
    const clusters = colourClusters(ids)
    const c = canvas.viewCentre()
    let y = c.y - 300
    const pos: Record<string, { x: number; y: number }> = {}
    for (const [, list] of clusters) {
      let x = c.x - 180
      let rowH = 0
      for (const id of list) {
        const it = byId(id)
        pos[id] = { x, y }
        x += it.w * 0.7 + 14
        rowH = Math.max(rowH, it.h)
      }
      y += rowH + 60
    }
    setItems((list) => list.map((i) => (pos[i.id] ? { ...i, ...pos[i.id] } : i)))
    setGroups((g) => [
      ...g.filter((x) => !x.ids.some((id) => pos[id])),
      ...clusters.map(([colour, list]) => ({ ids: list, name: COLOUR_GROUPS[colour], colour: FRAME_FOR[colour] })),
    ])
    setSelected([])
  }

  const doMerge = (ids: string[]) => {
    const [a, b] = ids.map(byId)
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
    setPhase({ k: 'done', text: `Merged ${nameOf(merging.a)} × ${nameOf(merging.b)}`, undo: true })
  }

  const doNote = (id: string | undefined, text: string) => {
    snapshot()
    const c = canvas.viewCentre()
    const f = id ? byId(id) : null
    const at = f ? { x: f.x + f.w - 24, y: f.y - 30 } : { x: c.x - 120, y: c.y - 75 }
    setNotes((n) => [...n, { id: `note-${Date.now()}`, ...at, text, audio: lastAudio.current }])
    setSelected([])
  }

  // a find's cut-out as a board piece, its longest side `size`, centred on `at`
  const stickerOf = (f: Find, size: number, at: { x: number; y: number }): Item => {
    const a = cutAspect(f)
    const w = Math.round(a >= 1 ? size : size * a)
    const h = Math.round(a >= 1 ? size / a : size)
    return {
      id: `${f.id}-${Date.now()}`, src: f.cut, label: f.label, crop: { box: f.box, shape: f.shape ?? 'cut' },
      x: at.x - w / 2, y: at.y - h / 2, w, h, z: ++zTop.current, from: { x: at.x - w / 2, y: at.y - h / 2 },
    }
  }

  // nearest patch of board, w × h, with nothing on it; glides the view there if it isn't the middle
  const freeSpot = (w: number, h: number) => {
    const v = canvas.viewCentre()
    const clear = (cx: number, cy: number) =>
      items.every((i) => i.x > cx + w / 2 || i.x + i.w < cx - w / 2 || i.y > cy + h / 2 || i.y + i.h < cy - h / 2)
    const spots = [[0, 0]]
    for (let ring = 1; ring <= 4; ring++)
      for (let dx = -ring; dx <= ring; dx++)
        for (let dy = -ring; dy <= ring; dy++) if (Math.max(Math.abs(dx), Math.abs(dy)) === ring) spots.push([dx * (w + 20), dy * (h + 20)])
    const [ox, oy] = spots.find(([dx, dy]) => clear(v.x + dx, v.y + dy)) ?? [0, 0]
    const at = { x: v.x + ox, y: v.y + oy }
    if (ox || oy) canvas.panTo(at.x, at.y)
    return at
  }

  // the suggestion card's picks go straight on as cut-outs, side by side
  const addFinds = (ids: string[]) => {
    snapshot()
    const c = freeSpot(ids.length * 130 + 40, 240)
    const gap = 130
    setItems((list) => [
      ...list,
      ...ids.map((id, i) => ({ ...stickerOf(FINDS[id], 150, { x: c.x + (i - (ids.length - 1) / 2) * gap, y: c.y + (i % 2) * 40 - 20 }), id: `${id}-${Date.now()}-${i}` })),
    ])
  }

  // a post from Explore lands, gets scanned, then breaks into its ingredients
  const extractPost = (src: string) => {
    snapshot()
    setExplore(null)
    const found = findByPhoto(src)
    const w = 150
    const h = Math.round(w / (found?.photoAspect ?? POST_ASPECT))
    // the ingredients spread about 360 × 430 around the post
    const spot = freeSpot(360, 430)
    const c = { x: spot.x, y: spot.y + 40 }
    const post: Item = { id: `${src}-${Date.now()}`, src, x: c.x - w / 2, y: c.y - h / 2 - 40, w, h, z: ++zTop.current, extracting: true }
    setItems((list) => [...list, post])
    setTimeout(() => {
      const centre = { x: post.x + w / 2, y: post.y + h / 2 }
      if (found) {
        // a find has a real cut-out: the subject lifts off the post, its colours drop below
        const sticker = stickerOf(found, 230, centre)
        const row = sticker.y + sticker.h + 24
        const chips: Item[] = found.colours.map((colour, i) => ({
          id: `${post.id}-c${i}`, src, label: 'colour', colour,
          x: centre.x - (found.colours.length * 52) / 2 + i * 52, y: row, w: 44, h: 44, z: ++zTop.current,
          from: { x: centre.x - 22, y: centre.y - 22 },
        }))
        setItems((list) => (list.some((i) => i.id === post.id) ? [...list.filter((i) => i.id !== post.id), { ...sticker, id: `${post.id}-cut` }, ...chips] : list))
        setPhase({ k: 'done', text: `Cut out the ${found.label} and ${chips.length} colours`, undo: true })
        return
      }
      const parts = INGREDIENTS[src] ?? []
      const crops = parts.filter((p) => p.kind === 'crop')
      const chips = parts.filter((p) => p.kind === 'colour')
      const pieces: Item[] = crops.map((p, i) => {
        if (p.kind !== 'crop') throw 0
        const aspect = (p.box[2] * POST_ASPECT) / p.box[3]
        const size = 120 + (i === 0 ? 30 : 0) // the main subject a touch bigger
        const pw = Math.round(aspect >= 1 ? size : size * aspect)
        const ph = Math.round(aspect >= 1 ? size / aspect : size)
        const a = -Math.PI / 2 + (i / crops.length) * Math.PI * 2 // around the post
        const r = 95
        return {
          id: `${post.id}-${i}`, src, label: p.label, crop: { box: p.box, shape: p.shape },
          x: centre.x + Math.cos(a) * r - pw / 2, y: centre.y + Math.sin(a) * r * 1.2 - ph / 2,
          w: pw, h: ph, z: ++zTop.current, from: { x: centre.x - pw / 2, y: centre.y - ph / 2 },
        }
      })
      // colour chips line up underneath
      const row = centre.y + h / 2 + 70
      chips.forEach((p, i) => {
        if (p.kind !== 'colour') return
        pieces.push({
          id: `${post.id}-c${i}`, src, label: 'colour', colour: p.colour,
          x: centre.x - (chips.length * 52) / 2 + i * 52, y: row, w: 44, h: 44, z: ++zTop.current,
          from: { x: centre.x - 22, y: centre.y - 22 },
        })
      })
      // undone mid-scan: the post is gone, so nothing to break apart
      setItems((list) => (list.some((i) => i.id === post.id) ? [...list.filter((i) => i.id !== post.id), ...pieces] : list))
      setPhase({ k: 'done', text: `Pulled ${crops.length} pieces and ${chips.length} colours from the post`, undo: true })
    }, 1700)
  }

  const shared = (ids: string[]) => {
    const colours = [...new Set(ids.map((id) => PIECES[byId(id).src]?.colour ?? 'neutral'))]
    if (colours.length === 1 && colours[0] !== 'neutral')
      return `They all lean ${colours[0]}. Same colour story, different textures: a natural group.`
    return `Soft, rounded shapes and one loud colour each. Together they read playful and hand-made.`
  }

  /* ---------- what a sentence does ---------- */
  const act = (heard: string, ids: string[], intent: Intent = parse(heard)) => {
    const thumbs = ids.map((id) => byId(id).src)
    const think = (working: string, then: () => void) => {
      setPhase({ k: 'thinking', heard, working })
      setTimeout(then, 800)
    }
    switch (intent.kind) {
      case 'merge':
        if (ids.length < 2) return setPhase({ k: 'clarify', heard })
        return think(`Merging ${names(ids.slice(0, 2))}…`, () => {
          setPhase({ k: 'idle' })
          doMerge(ids.slice(0, 2))
        })
      case 'group': {
        if (ids.length < 2) return setPhase({ k: 'clarify', heard })
        const name = intent.name ?? groupName(ids)
        return setPhase({
          k: 'confirm', heard, thumbs, title: `Group ${names(ids)}`, name,
          run: (typed) => {
            const final = typed?.trim() || name
            doGroup(ids, final)
            setPhase({ k: 'done', text: `Grouped into “${final}”`, undo: true })
          },
        })
      }
      case 'groupByColour': {
        const clusters = colourClusters(ids)
        if (!clusters.length) return setPhase({ k: 'clarify', heard })
        return setPhase({
          k: 'confirm', heard, thumbs: clusters.flatMap(([, l]) => l.map((id) => byId(id).src)),
          title: `Arrange into ${clusters.length} colour groups?`,
          run: () => {
            doGroupByColour(ids)
            setPhase({ k: 'done', text: `Made ${clusters.length} colour groups`, undo: true })
          },
        })
      }
      case 'note':
        return think('Pinning your note…', () => {
          doNote(ids[0], intent.text)
          setPhase({ k: 'done', text: ids[0] ? `Note added to the ${nameOf(byId(ids[0]))}` : 'Note added', undo: true })
        })
      case 'similar':
      case 'colours':
        return think(intent.kind === 'similar' ? 'Finding more like it…' : 'Pulling the colours…', () => {
          setPhase({ k: 'idle' })
          setExplore({ subject: ids.length ? `the ${names(ids)}` : 'this board', tab: intent.kind === 'similar' ? 'similar' : 'ingredients' })
        })
      case 'delete':
        if (!ids.length) return setPhase({ k: 'clarify', heard })
        return setPhase({
          k: 'confirm', heard, thumbs, title: ids.length === 1 ? `Delete the ${nameOf(byId(ids[0]))}?` : `Delete ${names(ids)}?`,
          run: () => deletePieces(ids),
        })
      case 'share':
        if (ids.length < 2) return setPhase({ k: 'clarify', heard })
        return think('Looking at them together…', () => setPhase({ k: 'answer', heard, text: shared(ids) }))
      default:
        return setPhase({ k: 'clarify', heard })
    }
  }

  /* ---------- hold to talk ---------- */
  const placeCards = (ids: string[]) => {
    if (!ids.length) return setSlot('bottom')
    const b = bounds(ids.map(byId))
    const mid = canvas.toScreen(b.x + b.w / 2, b.y + b.h / 2).y
    setSlot(mid > vp.h * 0.45 ? 'top' : 'bottom')
  }

  const startListening = (ids: string[]) => {
    targets.current = ids
    placeCards(ids)
    setArmed(false)
    setTip(false)
    setPhase({ k: 'listening' })
    speech.start(noteMode ? 'Love the texture on this, keep it soft' : suggestionsFor(ids.length)[0].phrase)
  }

  const endListening = async (how: 'send' | 'cancel' | 'tap') => {
    setArmed(false)
    if (how !== 'send') {
      speech.cancel()
      setPhase({ k: 'idle' })
      if (how === 'tap') {
        setTip(true)
        setTimeout(() => setTip(false), 1800)
      }
      return
    }
    const { text: heard, audio } = await speech.stop()
    lastAudio.current = audio
    if (!heard.trim()) return setPhase({ k: 'idle' }) // let go before saying anything
    if (noteMode) {
      setNoteMode(false)
      return saveNote(heard, targets.current)
    }
    act(heard, targets.current)
  }

  const saveNote = (heard: string, ids: string[]) => {
    const text = heard.charAt(0).toUpperCase() + heard.slice(1)
    doNote(ids[0], text)
    setPhase({ k: 'done', text: ids[0] ? `Note added to the ${nameOf(byId(ids[0]))}` : 'Note added', undo: true })
  }

  const deletePieces = (ids: string[]) => {
    snapshot()
    setItems((list) => list.filter((i) => !ids.includes(i.id)))
    // groups lose the deleted pieces; a group of one isn't a group
    setGroups((g) => g.map((x) => ({ ...x, ids: x.ids.filter((id) => !ids.includes(id)) })).filter((x) => x.ids.length > 1))
    setSelected([])
    setPhase({ k: 'done', text: ids.length === 1 ? `Deleted the ${nameOf(byId(ids[0]))}` : `Deleted ${ids.length} pieces`, undo: true })
  }

  // Delete / Backspace removes the selection on a keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected.length && phase.k === 'idle') deletePieces(selected)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const moveNote = (id: string, dx: number, dy: number) =>
    setNotes((list) => list.map((n) => (n.id === id ? { ...n, x: n.x + dx / zoom(), y: n.y + dy / zoom() } : n)))

  const deleteNote = (id: string) => {
    snapshot()
    setNotes((n) => n.filter((x) => x.id !== id))
    setPhase({ k: 'done', text: 'Note deleted', undo: true })
  }

  const suggest = (s: Suggestion) => {
    // "Add a note" doesn't guess the words: the next hold records them
    if (s.label === 'Add a note') {
      setNoteMode((m) => !m)
      setTip(true)
      setTimeout(() => setTip(false), 2400)
      return
    }
    targets.current = selected
    lastAudio.current = undefined // a tapped suggestion has no recording
    placeCards(selected)
    act(s.phrase, selected)
  }

  // long-press a piece: select it and start listening in one go
  const onItemDown = (id: string, e: React.PointerEvent) => {
    const from = { x: e.clientX, y: e.clientY }
    longPress.current = false
    press.current = setTimeout(() => {
      longPress.current = true
      didDrag.current = true // the release isn't a tap
      navigator.vibrate?.(10)
      const ids = selected.includes(id) ? selected : [id]
      setSelected(ids)
      startListening(ids)
      let far = false
      const move = (ev: PointerEvent) => {
        const f = Math.hypot(ev.clientX - from.x, ev.clientY - from.y) > 70
        if (f !== far) setArmed((far = f))
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        longPress.current = false
        endListening(far ? 'cancel' : 'send')
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    }, LONG_PRESS_MS)
  }
  const clearPress = () => press.current && clearTimeout(press.current)

  const undo = () => {
    const prev = history.current.pop()
    if (!prev) return
    setItems(prev.items)
    setGroups(prev.groups)
    setNotes(prev.notes)
  }

  const hidden: string[] = merging ? merging.ids : []

  return (
    <div ref={viewport} className="screen" style={{ overflow: 'clip' }}>
      {/* the freeform board: drag empty space to move around, pinch or ctrl+scroll to zoom */}
      <motion.div
        {...canvas.handlers}
        style={{
          position: 'absolute', left: 0, top: 0, width: WORLD, height: WORLD,
          x: canvas.x, y: canvas.y, scale: canvas.scale, transformOrigin: '0 0',
          cursor: 'grab', touchAction: 'none', ...pinPattern(),
        }}
      >
      {/* groups */}
      <AnimatePresence>
        {groups.map((g) => {
          const b = bounds(g.ids.map(byId))
          const key = g.ids.join()
          const rgb = FRAMES[g.colour ?? 'red']
          const moving = movingGroup === key
          return (
            <motion.div
              key={key}
              {...frameDrag(g)}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1, left: ORIGIN + b.x, top: ORIGIN + b.y, width: b.w, height: b.h }}
              exit={{ opacity: 0 }}
              transition={moving ? { duration: 0 } : { duration: 0.6, ease }}
              style={{
                position: 'absolute', borderRadius: 28, cursor: moving ? 'grabbing' : 'grab', touchAction: 'none',
                background: `rgba(${rgb}, ${moving ? 0.09 : 0.05})`, border: `1.5px dashed rgba(${rgb}, .5)`,
                transition: 'background .2s, border-color .2s',
              }}
            />
          )
        })}
      </AnimatePresence>

      {/* freeform items */}
      <AnimatePresence>
      {items.map((it) => {
        const on = selected.includes(it.id)
        return (
          <motion.div
            key={it.id}
            onPointerDown={(e) => {
              e.stopPropagation()
              didDrag.current = false
              onItemDown(it.id, e)
            }}
            onPointerUp={clearPress}
            onPanStart={() => {
              clearPress()
              if (longPress.current) return
              didDrag.current = true
              setDragging(it.id)
              setItems((l) => l.map((i) => (i.id === it.id ? { ...i, z: ++zTop.current } : i)))
            }}
            onPan={(_, info) => !longPress.current && move(it.id, info.delta.x / zoom(), info.delta.y / zoom())}
            onPanEnd={() => setDragging(null)}
            onTap={() => !didDrag.current && setSelected((s) => (s.includes(it.id) ? s.filter((x) => x !== it.id) : [...s, it.id]))}
            initial={{ x: ORIGIN + (it.from ?? it).x, y: ORIGIN + (it.from ?? it).y, scale: 0.6, opacity: 0 }}
            exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.3 } }}
            animate={{ x: ORIGIN + it.x, y: ORIGIN + it.y, scale: dragging === it.id ? 1.05 : 1, opacity: hidden.includes(it.id) ? 0 : 1 }}
            transition={dragging === it.id || (movingGroup && movingGroup.split(',').includes(it.id)) ? { x: { duration: 0 }, y: { duration: 0 }, scale: { duration: 0.2 } } : { duration: 0.6, ease }}
            style={{ position: 'absolute', left: 0, top: 0, width: it.w, height: it.h, zIndex: it.z, cursor: 'grab', touchAction: 'none' }}
          >
            {/* selected pieces get a red outline that hugs their shape, and it breathes while Studio listens */}
            <motion.div
              initial={false}
              animate={{
                filter:
                  on && phase.k === 'listening'
                    ? [outline(2.5), outline(1), outline(2.5)]
                    : outline(on ? 2.5 : 0),
              }}
              transition={on && phase.k === 'listening' ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
              style={{ width: '100%', height: '100%' }}
            >
              {it.merged ? (
                <div style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', position: 'relative', background: 'var(--bg-default)' }}>
                  <img src={asset(it.merged[0])} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <img src={asset(it.merged[1])} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                </div>
              ) : it.colour ? (
                <div style={{ width: '100%', height: '100%', borderRadius: 999, background: it.colour, border: '3px solid #fff', boxSizing: 'border-box', boxShadow: '0 4px 12px rgba(0,0,0,.12)' }} />
              ) : it.crop ? (
                <div
                  style={{
                    width: '100%', height: '100%', borderRadius: RADIUS[it.crop.shape], overflow: 'hidden', position: 'relative',
                    // cut-outs already have their own edge; crops get a white sticker border
                    ...(it.crop.shape !== 'cut' && { border: '3px solid #fff', boxSizing: 'border-box', boxShadow: '0 6px 16px rgba(0,0,0,.14)' }),
                  }}
                >
                  <img
                    src={asset(it.src)}
                    alt=""
                    style={{
                      position: 'absolute', pointerEvents: 'none', maxWidth: 'none',
                      width: `${100 / it.crop.box[2]}%`, height: `${100 / it.crop.box[3]}%`,
                      left: `${(-it.crop.box[0] / it.crop.box[2]) * 100}%`, top: `${(-it.crop.box[1] / it.crop.box[3]) * 100}%`,
                    }}
                  />
                </div>
              ) : it.extracting ? (
                <div style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden', position: 'relative', boxShadow: '0 12px 30px rgba(0,0,0,.18)' }}>
                  <img src={asset(it.src)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                  {/* a red scan sweeps the post while Studio finds its ingredients */}
                  <motion.div
                    initial={{ top: '-30%' }}
                    animate={{ top: '100%' }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ position: 'absolute', left: 0, right: 0, height: '30%', background: 'linear-gradient(to bottom, transparent, rgba(173,0,26,.35) 85%, rgba(255,255,255,.9))' }}
                  />
                  <div style={{ position: 'absolute', left: 8, bottom: 8, padding: '4px 10px', borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', fontSize: 11, fontWeight: 600 }}>
                    Extracting…
                  </div>
                </div>
              ) : (
                <img src={asset(it.src)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
              )}
            </motion.div>
          </motion.div>
        )
      })}
      </AnimatePresence>

      {/* frame labels ride above the pieces so they can always be grabbed or tapped */}
      <AnimatePresence>
        {groups.map((g) => {
          const b = bounds(g.ids.map(byId))
          const key = g.ids.join()
          const rgb = FRAMES[g.colour ?? 'red']
          return (
            <motion.div
              key={key}
              {...frameDrag(g)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, left: ORIGIN + b.x + 14, top: ORIGIN + b.y - 14 }}
              exit={{ opacity: 0 }}
              transition={movingGroup === key ? { duration: 0 } : { duration: 0.6, ease }}
              style={{ position: 'absolute', zIndex: 900, touchAction: 'none', cursor: 'grab', userSelect: 'none', WebkitUserSelect: 'none' }}
            >
              <div style={{ padding: '5px 12px', borderRadius: 999, background: `rgb(${rgb})`, color: 'var(--bg-canvas)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', transition: 'background .2s' }}>
                {g.name} <span style={{ opacity: 0.7, fontWeight: 400 }}>{g.ids.length}</span>
              </div>
              <AnimatePresence>
                {palette === key && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()} // clicks inside stay inside
                    style={{ position: 'absolute', left: -6, bottom: '100%', marginBottom: 8, width: 220, padding: 10, borderRadius: 20, background: 'var(--bg-canvas)', boxShadow: '0 8px 24px rgba(0,0,0,.14)', cursor: 'default' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {(Object.keys(FRAMES) as FrameColour[]).map((c) => (
                      <motion.button
                        key={c}
                        aria-label={`${c} frame`}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => recolour(key, c)}
                        style={{
                          width: 28, height: 28, borderRadius: 999, background: `rgb(${FRAMES[c]})`,
                          boxShadow: (g.colour ?? 'red') === c ? `0 0 0 2px var(--bg-canvas), 0 0 0 4px rgb(${FRAMES[c]})` : 'none',
                        }}
                      />
                    ))}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => ungroup(key)}
                      style={{ width: '100%', height: 36, marginTop: 10, borderRadius: 999, background: 'var(--bg-default)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <TrashIcon size={16} /> Ungroup
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </AnimatePresence>

      <AnimatePresence>{notes.map((n) => <VoiceNote key={n.id} x={ORIGIN + n.x} y={ORIGIN + n.y} text={n.text} audio={n.audio} onDelete={() => deleteNote(n.id)} onMove={(dx, dy) => moveNote(n.id, dx, dy)} />)}</AnimatePresence>
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
                src={asset(it.src)}
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
                  <img src={asset(merging.flip ? merging.b.src : merging.a.src)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <img src={asset(merging.flip ? merging.a.src : merging.b.src)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 486, textAlign: 'center' }}>
                  <span style={{ padding: '5px 10px', borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', fontSize: 12, fontWeight: 600 }}>{nameOf(merging.a)} × {nameOf(merging.b)}</span>
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 524, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <Pill label="Cancel" onClick={() => setMerging(null)} />
                  <Pill label="Try again" onClick={() => setMerging((m) => m && { ...m, flip: !m.flip })} />
                  <Pill label="Keep" selected onClick={keepMerge} />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <IconButton label="Back" onClick={onBack} style={{ position: 'absolute', left: 8, top: 70, zIndex: 50 }}>
        <BackIcon />
      </IconButton>

      <IconButton label="Share board" selected={shareOpen} onClick={() => setShareOpen(true)} style={{ position: 'absolute', right: 8, top: 70, zIndex: 50 }}>
        <ShareIcon />
      </IconButton>

      <AnimatePresence>{rec && <Recommendation key="rec" onAdd={addFinds} onDismiss={() => setRec(false)} />}</AnimatePresence>

      {/* one mic, always bottom right: with nothing selected it talks to the whole board,
          with pieces selected it opens into their suggestions */}
      {phase.k !== 'thinking' && !explore && !shareOpen /* sheets cover the dock */ && (
        <Dock
          open={selected.length > 0 && (phase.k === 'idle' || phase.k === 'listening')}
          suggestions={suggestionsFor(selected.length)}
          onSuggest={suggest}
          onDelete={() => deletePieces(selected)}
          tip={tip}
          tipText={noteMode ? 'Hold the mic and say your note' : selected.length ? 'Hold and say what to do' : undefined}
          active={noteMode ? 'Add a note' : undefined}
          mic={<Mic size={selected.length ? 44 : 56} holding={phase.k === 'listening'} onHoldStart={() => startListening(selected)} onHoldEnd={endListening} onArm={setArmed} />}
        />
      )}

      <div style={{ position: 'absolute', left: 8, right: 8, zIndex: 46, pointerEvents: 'none', ...(slot === 'top' && phase.k !== 'done' ? { top: 124 } : { bottom: 186 }) /* small confirmations always sit low */ }}>
      <AnimatePresence mode="wait">
        {phase.k === 'listening' && (
          <ListeningPanel key="listen" transcript={speech.transcript} heard={speech.heard} armed={armed} thumbs={targets.current.map((id) => byId(id).src)} title={noteMode ? 'Recording your note…' : undefined} />
        )}
        {phase.k === 'thinking' && <Thinking key="think" heard={phase.heard} working={phase.working} />}
        {phase.k === 'confirm' && (
          <Confirm key="confirm" heard={phase.heard} title={phase.title} thumbs={phase.thumbs} name={phase.name} onCancel={() => setPhase({ k: 'idle' })} onConfirm={phase.run} />
        )}
        {phase.k === 'clarify' && (
          <Clarify
            key="clarify"
            heard={phase.heard}
            options={suggestionsFor(targets.current.length)}
            onPick={(o) => act(o.phrase, targets.current)}
            onSaveNote={() => saveNote(phase.heard, targets.current)}
            onCancel={() => setPhase({ k: 'idle' })}
          />
        )}
        {phase.k === 'done' && (
          <Done
            key="done"
            text={phase.text}
            onUndo={
              phase.undo
                ? () => {
                    undo()
                    setPhase({ k: 'idle' })
                  }
                : undefined
            }
          />
        )}
        {phase.k === 'answer' && <Answer key="answer" heard={phase.heard} text={phase.text} onClose={() => setPhase({ k: 'idle' })} />}
      </AnimatePresence>
      </div>

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} cover={asset('p3-front')} />
      <ExploreSheet
        key={lastExplore.current.subject + lastExplore.current.tab}
        open={!!explore}
        subject={lastExplore.current.subject}
        initialTab={lastExplore.current.tab}
        onClose={() => setExplore(null)}
        onAdd={extractPost}
      />
    </div>
  )
}
