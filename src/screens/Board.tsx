import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconButton, Pill } from '../components/Button'
import { BackIcon, ShareIcon, TrashIcon } from '../components/Icons'
import { Answer, Clarify, Confirm, Dock, Done, HoldTip, ListeningPanel, Mic, Thinking } from '../board/voice/VoiceUI'
import { COLOUR_GROUPS, PIECES, labelOf, parse, suggestionsFor } from '../board/voice/intent'
import type { Intent, Suggestion } from '../board/voice/intent'
import { useSpeech } from '../board/voice/useSpeech'
import type { Recording } from '../board/voice/useSpeech'
import ShareSheet from '../board/ShareSheet'
import ExploreSheet from '../board/ExploreSheet'
import Recommendation from '../board/Recommendation'
import DirectionCard from '../board/DirectionCard'
import { loadDirection, saveDirection } from '../board/directions'
import VoiceNote from '../board/VoiceNote'
import PieceContent from '../board/Piece'
import CreateNode, { NODE_W, PORT_Y } from '../board/CreateNode'
import MaterialWheel, { SIZE as WHEEL_SIZE, WHEEL_H } from '../board/MaterialWheel'
import type { Material } from '../board/Sphere'
import { pieceFor } from '../board/cutouts'
import { extractColours } from '../board/colours'
import type { CreateNodeData } from '../board/CreateNode'
import Face from '../components/Face'
import TextNote from '../board/TextNote'
import { useVisibleBoxes, visibleRect } from '../board/visible'
import { INKS, SelectionBar, Toolbar, WIDTHS } from '../board/WebTools'
import type { Pen, Tool } from '../board/WebTools'
import { loadNotes, saveNotes } from '../board/notes'
import type { Part } from '../board/Piece'
import type { Reply } from '../board/VoiceNote'
import { pinPattern } from '../components/pin'
import { ORIGIN, WORLD, useCanvas } from '../board/useCanvas'
import type { Draw } from '../board/useCanvas'
import { asset } from '../components/asset'
import { getFit } from '../components/fit'
import { useWeb } from '../components/view'
import type { Shape } from '../board/ingredients'

type Item = {
  id: string; src: string; x: number; y: number; w: number; h: number; z: number
  parts?: Part[] // a merge: the pieces it was made from, placed inside its box
  label?: string // ingredients pulled from a post name themselves
  crop?: { box: [number, number, number, number]; shape: Shape } // part of src, cut to a shape
  colour?: string // a colour chip
  material?: Material // a colour-and-material sphere from the wheel
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
type Note = {
  id: string; x: number; y: number; text: string; audio?: Recording
  author?: string // who left it; you, unless it came from a teammate
  kind?: 'voice' | 'text' // voice by default; the web adds typed notes
  on?: string // the piece it was left on
  fromVoice?: boolean // a text note converted from a voice note
  editing?: boolean // a new text note, waiting for words
  replies: Reply[]
  recordingBy?: string // who is recording a reply to it right now
  teammates: number // simulated replies it has had, so the chatter stops
}

// What teammates say back, in turn. A stand-in for other people on the shared board.
const TEAM = ['Maya', 'Jules', 'Ren']
const TEAM_LINES = [
  'Yes! Pair it with the lime type, it needs that pop.',
  'Agree. Could we try it on the warm pink instead?',
  'Love this. Pulling a few more like it into Explore.',
  'Keep it soft, but bump the grain a little.',
]
// a line drawn with the web's marker, in board coordinates
type Stroke = { id: string; points: [number, number][]; ink: string; width: number; kind: 'pen' | 'pencil' | 'highlighter' }
type Snapshot = { items: Item[]; groups: Group[]; notes: Note[]; strokes: Stroke[] }

// Cut-outs exactly where they sit on the "Studio ads workspace" frame, in its layer order
const START: Item[] = [
  { id: 'water', src: 'image 45', x: -71, y: 772, w: 116.12, h: 154.75 },
  { id: 'leaf-person', src: 'image 34', x: -80, y: 161, w: 124.71, h: 166.19 },
  { id: 'sky-leaves', src: 'image 35', x: 154, y: 64, w: 124.74, h: 165.61 },
  { id: 'hanging-leaves', src: 'image 36', x: 194, y: 276, w: 123.67, h: 98.93 },
  { id: 'veil', src: 'image 37', x: 53, y: 308, w: 132, h: 175 },
  { id: 'palm', src: 'image 38', x: 309, y: -23, w: 120.31, h: 163.99 },
  { id: 'window', src: 'image 39', x: 336.44, y: 308.45, w: 107.54, h: 161.31 },
  { id: 'portrait', src: 'image 40', x: 3, y: -32, w: 130, h: 150, crop: { box: [0, 0.0673, 1, 0.8654] as [number, number, number, number], shape: 'cut' as const } }, // filled and trimmed top and bottom, as in Figma
  { id: 'big-leaf', src: 'image 41', x: 277, y: 453, w: 63, h: 112 },
  { id: 'dry-leaf', src: 'image 42', x: -18, y: 517, w: 124.72, h: 156.1 },
  { id: 'light-face', src: 'image 44', x: 156, y: 567, w: 136, h: 170 },
  // the colours pulled from the pins, like any extraction: a row under all the pieces
  ...['#5f7f3a', '#a9c79a', '#6fa3c9', '#e9e2d3', '#2f4a2a'].map((colour, i) => ({
    id: `start-c${i}`, src: 'board-palette', label: 'colour', colour, x: 90 + i * 46, y: 960, w: 38, h: 38,
  })),
].map((it, i) => ({ ...it, z: i + 1 }))

// The same board on a wide screen: pieces 1.4× larger, scattered across a ~1360×780 area
// so the window looks full. [x, y, w, h]
const WEB_AT: Record<string, [number, number, number, number]> = {
  portrait: [40, 10, 182, 210],
  'sky-leaves': [280, 30, 175, 232],
  palm: [520, 0, 168, 230],
  'leaf-person': [760, 20, 175, 233],
  window: [1010, 10, 151, 226],
  veil: [1200, 40, 185, 245],
  'dry-leaf': [40, 300, 175, 219],
  'hanging-leaves': [280, 340, 173, 139],
  'light-face': [520, 300, 190, 238],
  'big-leaf': [790, 320, 88, 157],
  water: [960, 310, 163, 217],
}
const WEB_START: Item[] = START.map((it, i) => {
  if (it.colour) return { ...it, x: 40 + (i - 11) * 52, y: 600, w: 44, h: 44 } // the palette row, under the pieces, clear of the toolbar
  const [x, y, w, h] = WEB_AT[it.id]
  return { ...it, x, y, w, h }
})

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
// a few px in four directions, in white. Width 0 = no outline.
const outline = (w: number) => {
  // a thin line in text-brand red that follows the piece's own edge
  const c = `rgba(173, 0, 26, ${w ? 1 : 0})`
  return `drop-shadow(${w}px 0 0 ${c}) drop-shadow(-${w}px 0 0 ${c}) drop-shadow(0 ${w}px 0 ${c}) drop-shadow(0 -${w}px 0 ${c})`
}

// where a comment sits beside the piece it's on: off its right side (or left, for a second
// one), its middle level with the piece's middle, with room between for the line
const COMMENT_MID = 28 // half a one-line comment card's height
const besidePiece = (f: { x: number; y: number; w: number; h: number }, left = false) =>
  ({ x: left ? f.x - 380 : f.x + f.w + 64, y: f.y + f.h / 2 - COMMENT_MID })
// the phone has no room beside a piece, so its notes go under it, kept inside the screen
const underPiece = (f: { x: number; y: number; w: number; h: number }) =>
  ({ x: Math.min(Math.max(f.x + f.w / 2 - 128, 8), 402 - 264), y: f.y + f.h + 40 })
const ease = [0.22, 1, 0.36, 1] as const

function bounds(items: Item[]) {
  const x = Math.min(...items.map((i) => i.x)) - 14
  const y = Math.min(...items.map((i) => i.y)) - 14
  const r = Math.max(...items.map((i) => i.x + i.w)) + 14
  const b = Math.max(...items.map((i) => i.y + i.h)) + 14
  return { x, y, w: r - x, h: b - y }
}

// How merged pieces sit together. Each "Try again" moves on: every piece gets a turn as
// the hero, then the next arrangement.
const ARRANGE = ['overlap', 'stack', 'orbit'] as const
const MERGE_H = 200 // the hero's height in a merge

/** Parts for a merge of these pieces, as boxes around (0, 0). */
function mergeLayout(pieces: Item[], variant: number): Part[] {
  const n = pieces.length
  const heroAt = variant % n
  const arrange = ARRANGE[Math.floor(variant / n) % ARRANGE.length]
  const order = [...pieces.slice(heroAt), ...pieces.slice(0, heroAt)]
  const sized = (it: Item, h: number) => (it.colour ? { w: 44, h: 44 } : { w: (it.w / it.h) * h, h })
  const [hero, ...rest] = order
  const H = sized(hero, MERGE_H)
  const box = (it: Item, cx: number, cy: number, h: number, r: number): Part => {
    const s = sized(it, h)
    return { id: it.id, src: it.src, label: it.label, crop: it.crop, colour: it.colour, parts: it.parts, x: cx - s.w / 2, y: cy - s.h / 2, w: s.w, h: s.h, r }
  }
  const others = rest.map((it, k) => {
    if (arrange === 'overlap') return box(it, H.w * 0.4 + k * 26, H.h * 0.18 + k * 30, MERGE_H * 0.72, 7 - k * 5)
    if (arrange === 'stack') return box(it, (k % 2 ? -1 : 1) * H.w * 0.18, H.h * (0.42 + k * 0.36), MERGE_H * 0.66, k % 2 ? -6 : 5)
    const a = [-0.75, 2.4, 0.75, -2.4][k % 4] // orbit: small pieces at the corners
    return box(it, Math.cos(a) * H.w * 0.55, Math.sin(a) * H.h * 0.55, MERGE_H * 0.48, k % 2 ? -8 : 8)
  })
  const parts = [box(hero, 0, 0, MERGE_H, arrange === 'overlap' ? -4 : 0), ...others]
  // centre the whole thing on (0, 0)
  const l = Math.min(...parts.map((p) => p.x)), r = Math.max(...parts.map((p) => p.x + p.w))
  const t = Math.min(...parts.map((p) => p.y)), b = Math.max(...parts.map((p) => p.y + p.h))
  return parts.map((p) => ({ ...p, x: p.x - (l + r) / 2, y: p.y - (t + b) / 2 }))
}

// Images the prototype "generates": the right pieces wired into a node, asked for in the right
// words, make a finished picture instead of a collage of the pieces.
const RECIPES = [
  { needs: ['image 44', 'image 45'], words: /frozen|ice|underwater|flower/i, src: 'image 50', aspect: 1133 / 2022 }, // two underwater faces → a girl with flowers frozen in ice
]

/** Is the point inside the loop? (even–odd: count crossings of a ray to the right) */
function inside([x, y]: [number, number], poly: [number, number][]) {
  let yes = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) yes = !yes
  }
  return yes
}

// the board's project in the Studio library, where its concept card is kept
const PROJECT = 'Ads'

export default function Board({ onBack, openDirection = false, fresh = false }: { onBack: () => void; openDirection?: boolean; fresh?: boolean /* just created: nobody has left a note yet */ }) {
  const web = useWeb()
  const [items, setItems] = useState<Item[]>(web ? WEB_START : START)
  const [groups, setGroups] = useState<Group[]>([])
  // notes carry over between phone and web; a note left on a piece is placed beside it in this layout.
  // A board that was just created starts with none (and clears the last board's).
  const [notes, setNotes] = useState<Note[]>(() =>
    (fresh ? [] : loadNotes() ?? []).map((n) => {
      const f = n.on && (web ? WEB_START : START).find((i) => i.id === n.on)
      // beside the piece; on the web, pulled in so a 256-wide note stays inside the 1360 layout
      return f ? { ...n, ...(web ? besidePiece(f) : underPiece(f)) } : n
    }),
  )
  useEffect(() => saveNotes(notes), [notes])
  const [tool, setTool] = useState<Tool>('select') // web only
  useVisibleBoxes() // redraw comment lines once the stickers' real edges are known
  const [cardSize, setCardSize] = useState<Record<string, { w: number; h: number }>>({}) // each comment card, for its line
  const [ink, setInk] = useState(INKS[1])
  const [pen, setPen] = useState<Pen>('pen')
  const [penWidth, setPenWidth] = useState(WIDTHS[1])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const drawing = useRef<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [shareOpen, setShareOpen] = useState(false)
  const [cmf, setCmf] = useState<string | null>(null) // the piece whose colour & material wheel is open
  const [explore, setExplore] = useState<null | { subject: string; tab: 'similar' | 'ingredients' }>(null)
  const lastExplore = useRef({ subject: 'this board', tab: 'similar' as 'similar' | 'ingredients' })
  if (explore) lastExplore.current = explore // keep content while the sheet slides away
  const [rec, setRec] = useState(false)
  // a merge being tried out on the board, centred on `at`, before it's kept
  const [merging, setMerging] = useState<null | { ids: string[]; pieces: Item[]; at: { x: number; y: number }; variant: number }>(null)
  // Flora-style create nodes: pieces are wired in and the node makes one image from them
  const [nodes, setNodes] = useState<CreateNodeData[]>([])
  const [nodeH, setNodeH] = useState<Record<string, number>>({})
  const [wiring, setWiring] = useState<null | { from: string; x: number; y: number; to?: string }>(null) // a wire being dragged out of a piece; to: the piece it's over
  const [direction, setDirection] = useState(openDirection) // the board summed up into a direction card
  const [savedDirection, setSavedDirection] = useState(() => loadDirection(PROJECT))
  const [dragging, setDragging] = useState<string | null>(null)
  const [movingGroup, setMovingGroup] = useState<string | null>(null) // key of the frame being dragged
  const [palette, setPalette] = useState<string | null>(null) // key of the frame showing colour swatches
  const didDrag = useRef(false) // a drag shouldn't also count as a tap-to-select
  const viewport = useRef<HTMLDivElement>(null)
  const lassoDraw = useRef<Draw | null>(null) // the phone: one finger on empty board draws a lasso
  const canvas = useCanvas(viewport, () => {
    setSelected([])
    setPalette(null)
  }, lassoDraw)
  // the lasso being drawn, in board coordinates
  const [lasso, setLasso] = useState<[number, number][] | null>(null)
  const lassoPts = useRef<[number, number][]>([])
  const toWorld = (p: { x: number; y: number }): [number, number] => [
    (p.x - canvas.x.get()) / canvas.scale.get() - ORIGIN,
    (p.y - canvas.y.get()) / canvas.scale.get() - ORIGIN,
  ]
  lassoDraw.current = web ? null : {
    start: (p) => {
      lassoPts.current = [toWorld(p)]
      setLasso(lassoPts.current)
      setSelected([])
    },
    move: (p) => {
      const q = toWorld(p)
      const last = lassoPts.current[lassoPts.current.length - 1]
      if (Math.hypot(q[0] - last[0], q[1] - last[1]) < 3) return
      lassoPts.current = [...lassoPts.current, q]
      setLasso(lassoPts.current)
    },
    // whatever the loop goes round is selected, ready to merge, group or delete
    end: () => {
      const poly = lassoPts.current
      setLasso(null)
      if (poly.length < 3) return
      const hit = items.filter((it) => {
        const f = visibleRect(it)
        return inside([f.x + f.w / 2, f.y + f.h / 2], poly)
      })
      setSelected(hit.map((i) => i.id))
    },
    cancel: () => setLasso(null),
  }
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
  const replyTo = useRef<string | null>(null) // the note a hold is replying to
  const notesMade = useRef(0) // varies what teammates say from note to note
  const lastAudio = useRef<Recording | undefined>(undefined) // the sound of the last hold, kept for notes
  const press = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPress = useRef(false)
  const [vp, setVp] = useState({ w: 402, h: 874 })
  useEffect(() => {
    const el = viewport.current
    if (el) setVp({ w: el.offsetWidth, h: el.offsetHeight })
    // centre the wide layout in the window
    if (web) canvas.panTo(680, 380) // centred, nudged up so the toolbar sits under the pieces
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const snapshot = () => history.current.push({ items, groups, notes, strokes })
  const byId = (id: string) => items.find((i) => i.id === id)!
  const nameOf = (it: Item) => it.label ?? labelOf(it.src)
  const names = (ids: string[]) => {
    const l = ids.map((id) => nameOf(byId(id)))
    return l.length <= 2 ? l.join(' + ') : `${l.length} pieces`
  }

  const move = (id: string, dx: number, dy: number) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, x: i.x + dx, y: i.y + dy } : i)))

  // drag a corner of the selected piece to resize it; it keeps its shape and the opposite corner stays put
  const [resizing, setResizing] = useState(false)
  const startResize = (id: string, corner: 'nw' | 'ne' | 'sw' | 'se', e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    snapshot()
    setResizing(true)
    const it = byId(id)
    const from = { x: e.clientX, y: e.clientY }
    const aspect = it.h / it.w
    const left = corner.endsWith('w'), top = corner.startsWith('n')
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - from.x) / zoom()
      // the width follows the pointer; the height follows the width
      const w = Math.max(24, it.w + (left ? -dx : dx))
      const h = w * aspect
      setItems((list) => list.map((i) => (i.id === id ? { ...i, w, h, x: left ? it.x + it.w - w : it.x, y: top ? it.y + it.h - h : it.y } : i)))
    }
    const onUp = () => {
      setResizing(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

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

  // merge makes a create node beside the pieces, already wired to them
  const doMerge = (ids: string[], prompt = '') => {
    const pieces = ids.map(byId).filter(Boolean)
    if (!pieces.length) return
    const b = bounds(pieces)
    const at = web
      ? { x: b.x + b.w + 120, y: b.y + b.h / 2 - PORT_Y }
      : { x: b.x + b.w / 2 - NODE_W / 2, y: b.y + b.h + 70 }
    const id = addNode(at, ids, prompt)
    if (prompt) setTimeout(() => makeImage(id), 500) // asked out loud: it starts making straight away
    setSelected([])
  }
  const addNode = (at: { x: number; y: number }, inputs: string[], prompt = '') => {
    const id = `node-${Date.now()}`
    setNodes((n) => [...n, { id, ...at, inputs, prompt, status: 'idle', variant: 0 }])
    canvas.panTo(at.x + NODE_W / 2, at.y + 200)
    return id
  }
  const editNode = (id: string, f: (n: CreateNodeData) => CreateNodeData) => setNodes((list) => list.map((n) => (n.id === id ? f(n) : n)))
  const wireIn = (nodeId: string, itemId: string) => editNode(nodeId, (n) => (n.inputs.includes(itemId) ? n : { ...n, inputs: [...n.inputs, itemId] }))
  const makeImage = (id: string, again = false) => {
    editNode(id, (n) => ({ ...n, status: 'making' }))
    setTimeout(() => editNode(id, (n) => ({ ...n, status: 'done', variant: again || n.status === 'done' ? n.variant + 1 : n.variant })), 3200) // long enough to feel like it's making something
  }
  const recipeFor = (n: CreateNodeData) =>
    RECIPES.find((rc) => rc.words.test(n.prompt) && rc.needs.every((src) => n.inputs.some((id) => items.find((i) => i.id === id)?.src === src)))
  const nodeImage = (n: CreateNodeData) => {
    const pics = n.inputs.map((i) => items.find((x) => x.id === i)).filter((i): i is Item => !!i && !i.colour)
    return pics.length ? mergeLayout(pics.slice(0, 5), n.variant) : null
  }
  // the made image joins the board as a piece of its own, beside its node
  const addMade = (n: CreateNodeData) => {
    const rc = recipeFor(n)
    if (rc) {
      snapshot()
      const w = 170, h = w / rc.aspect
      setItems((list) => [...list, {
        id: `made-${Date.now()}`, src: rc.src, label: n.prompt.trim(), z: ++zTop.current, w, h,
        x: web ? n.x + NODE_W + 60 : n.x + (NODE_W - w) / 2, y: web ? n.y : n.y + (nodeH[n.id] ?? 420) + 40,
        from: { x: n.x + NODE_W / 2, y: n.y + PORT_Y },
      }])
      setPhase({ k: 'done', text: 'Added the new image to the board', undo: true })
      return
    }
    const parts = nodeImage(n)
    if (!parts) return
    snapshot()
    const l = Math.min(...parts.map((p) => p.x)), t = Math.min(...parts.map((p) => p.y))
    const w = Math.max(...parts.map((p) => p.x + p.w)) - l, h = Math.max(...parts.map((p) => p.y + p.h)) - t
    const k = Math.min(1, 220 / Math.max(w, h))
    const made: Item = {
      id: `made-${Date.now()}`, src: parts[0].src, label: n.prompt.trim() || 'new image', z: ++zTop.current,
      x: web ? n.x + NODE_W + 60 : n.x, y: web ? n.y : n.y + (nodeH[n.id] ?? 420) + 40, w: w * k, h: h * k,
      from: { x: n.x + NODE_W / 2, y: n.y + PORT_Y },
      parts: parts.map((p) => ({ ...p, x: (p.x - l) * k, y: (p.y - t) * k, w: p.w * k, h: p.h * k })),
    }
    setItems((list) => [...list, made])
    setPhase({ k: 'done', text: 'Added the new image to the board', undo: true })
  }
  // a pointer on the screen, in board coordinates (the phone is drawn scaled)
  const toBoard = (e: { clientX: number; clientY: number }) => {
    const r = viewport.current!.getBoundingClientRect()
    const k = canvas.scale.get()
    return { x: ((e.clientX - r.left) / getFit() - canvas.x.get()) / k - ORIGIN, y: ((e.clientY - r.top) / getFit() - canvas.y.get()) / k - ORIGIN }
  }
  // drag a wire out of a piece: drop it on a node to plug in, or on empty board for a new node
  const wire = useRef<typeof wiring>(null) // the same, readable before React re-renders on a fast drag
  const setWire = (w: typeof wiring) => {
    wire.current = w
    setWiring(w)
  }
  const startWire = (from: string, e: React.PointerEvent) => {
    e.stopPropagation()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* a synthetic pointer */
    }
    setWire({ from, ...toBoard(e) })
  }
  // the piece under a point (topmost first), not counting the one the wire comes from
  const pieceAt = (p: { x: number; y: number }, not: string) =>
    [...items].sort((a, b) => b.z - a.z).find((it) => {
      if (it.id === not) return false
      const f = visibleRect(it)
      return p.x >= f.x && p.x <= f.x + f.w && p.y >= f.y && p.y <= f.y + f.h
    })?.id
  const moveWire = (e: React.PointerEvent) => {
    if (!wire.current) return
    const p = toBoard(e)
    setWire({ ...wire.current, ...p, to: pieceAt(p, wire.current.from) })
  }
  const endWire = (e: React.PointerEvent) => {
    const wiring = wire.current
    if (!wiring) return
    const onNode = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-node]')?.getAttribute('data-node')
    const onPiece = !onNode ? pieceAt(toBoard(e), wiring.from) : undefined
    if (onNode) wireIn(onNode, wiring.from)
    else if (onPiece) {
      // dropped on another piece: merge them, into the node the first already feeds if there is one
      const feeding = nodes.find((n) => n.inputs.includes(wiring.from))
      if (feeding) {
        wireIn(feeding.id, onPiece)
        setPhase({ k: 'done', text: `Added the ${nameOf(byId(onPiece))} to the merge`, undo: false })
      } else doMerge([wiring.from, onPiece])
    } else {
      const p = toBoard(e)
      const piece = byId(wiring.from)
      if (Math.hypot(p.x - (piece.x + piece.w), p.y - (piece.y + piece.h / 2)) > 60) addNode({ x: p.x, y: p.y - PORT_Y }, [wiring.from])
    }
    setWire(null)
    setSelected([]) // the handles would sit over the node otherwise
  }

  const mergeName = (pieces: Item[]) => (pieces.length === 2 ? `${nameOf(pieces[0])} × ${nameOf(pieces[1])}` : `${pieces.length} pieces`)

  const keepMerge = () => {
    if (!merging) return
    snapshot()
    const parts = mergeLayout(merging.pieces, merging.variant)
    const l = Math.min(...parts.map((p) => p.x)), t = Math.min(...parts.map((p) => p.y))
    const w = Math.max(...parts.map((p) => p.x + p.w)) - l, h = Math.max(...parts.map((p) => p.y + p.h)) - t
    const id = `merge-${Date.now()}`
    const label = mergeName(merging.pieces)
    const made: Item = {
      id, src: merging.pieces[0].src, label, x: merging.at.x + l, y: merging.at.y + t, w, h, z: ++zTop.current,
      parts: parts.map((p) => ({ ...p, x: p.x - l, y: p.y - t })),
    }
    // the pieces become the merge
    setItems((list) => [...list.filter((i) => !merging.ids.includes(i.id)), made])
    setGroups((g) => g.map((x) => ({ ...x, ids: x.ids.filter((i) => !merging.ids.includes(i)) })).filter((x) => x.ids.length > 1))
    setMerging(null)
    setPhase({ k: 'done', text: `Merged ${label}`, undo: true })
  }

  const doNote = (id: string | undefined, text: string) => {
    snapshot()
    const c = canvas.viewCentre()
    const f = id ? byId(id) : null
    const half = vp.w / 2 / canvas.scale.get()
    // under the piece, inside the view (notes open 256 wide), with room for the line to it
    const at = f ? { ...underPiece(f), x: Math.min(underPiece(f).x, c.x + half - 264) } : { x: c.x - 128, y: c.y - 75 }
    const noteId = `note-${Date.now()}`
    notesMade.current++
    setNotes((n) => [...n, { id: noteId, ...at, text, audio: lastAudio.current, on: id, replies: [], teammates: 0 }])
    setSelected([])
    teammateReplies(noteId)
  }

  /* ---------- web: typed notes ---------- */
  const addTextNote = (id?: string) => {
    snapshot()
    const c = canvas.viewCentre()
    const f = id ? byId(id) : null
    // beside the piece; if it already has a note, on its other side
    const taken = !!id && notes.some((n) => n.on === id)
    const at = f ? (web ? besidePiece(f, taken) : underPiece(f)) : { x: c.x - 120, y: c.y - 60 }
    setNotes((n) => [...n, { id: `note-${Date.now()}`, ...at, text: '', kind: 'text', on: id, editing: true, replies: [], teammates: 0 }])
    setSelected([])
    setTool('select')
  }
  // the marker: a layer over the board catches the drag and draws in board coordinates
  const boardPoint = (e: React.PointerEvent): [number, number] => {
    const r = viewport.current!.getBoundingClientRect()
    const k = canvas.scale.get()
    return [(e.clientX - r.left - canvas.x.get()) / k - ORIGIN, (e.clientY - r.top - canvas.y.get()) / k - ORIGIN]
  }
  // the eraser takes away any line that passes near the pointer
  const erase = (p: [number, number]) => {
    const r = 14 / canvas.scale.get()
    setStrokes((l) => l.filter((st) => !st.points.some(([x, y]) => Math.hypot(x - p[0], y - p[1]) < r + st.width)))
  }
  const penDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    snapshot()
    const id = `s-${Date.now()}`
    drawing.current = id
    if (pen === 'eraser') return erase(boardPoint(e))
    // the highlighter is broad and see-through; the pencil a touch finer, with grain
    const width = pen === 'highlighter' ? penWidth * 4 : pen === 'pencil' ? Math.max(1.5, penWidth * 0.75) : penWidth
    setStrokes((l) => [...l, { id, ink, width, kind: pen, points: [boardPoint(e)] }])
  }
  const penMove = (e: React.PointerEvent) => {
    const id = drawing.current
    if (!id) return
    const p = boardPoint(e)
    if (pen === 'eraser') return erase(p)
    setStrokes((l) => l.map((st) => (st.id === id ? { ...st, points: [...st.points, p] } : st)))
  }
  const penUp = () => (drawing.current = null)

  // the web's arrow drags a selection box over empty board (shift adds to what's selected);
  // the board itself moves with the Hand, space-drag, or scrolling
  const [marquee, setMarquee] = useState<null | { x0: number; y0: number; x1: number; y1: number; add: boolean }>(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const boxDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = boardPoint(e)
    setMarquee({ x0: x, y0: y, x1: x, y1: y, add: e.shiftKey })
    setPalette(null)
  }
  const boxMove = (e: React.PointerEvent) => {
    if (!marquee) return
    const [x, y] = boardPoint(e)
    setMarquee({ ...marquee, x1: x, y1: y })
  }
  const boxUp = () => {
    if (!marquee) return
    const l = Math.min(marquee.x0, marquee.x1), r = Math.max(marquee.x0, marquee.x1)
    const t = Math.min(marquee.y0, marquee.y1), b = Math.max(marquee.y0, marquee.y1)
    // a click without a drag just clears the selection, like tapping empty board
    const hit = r - l < 4 && b - t < 4 ? [] : items.filter((i) => i.x < r && i.x + i.w > l && i.y < b && i.y + i.h > t).map((i) => i.id)
    setSelected((s) => (marquee.add ? [...new Set([...s, ...hit])] : hit))
    setMarquee(null)
  }
  const boxing = web && tool === 'select' && !spaceHeld

  // hold space to pan for a moment, whatever the tool
  useEffect(() => {
    if (!web) return
    const typing = (e: KeyboardEvent) => (e.target as Element)?.closest?.('input, textarea, [contenteditable]')
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !typing(e)) {
        e.preventDefault()
        setSpaceHeld(true)
      }
    }
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceHeld(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [web])
  const pathOf = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x + ORIGIN).toFixed(1)} ${(y + ORIGIN).toFixed(1)}`).join(' ')

  const openPins = () => setExplore({ subject: selected.length ? `the ${names(selected)}` : 'this board', tab: 'similar' })
  const setNoteText = (id: string, text: string) => setNotes((list) => list.map((n) => (n.id === id ? { ...n, text } : n)))
  // a voice note from the phone becomes words you can edit; its thread comes along
  const convertNote = (id: string) => {
    snapshot()
    setNotes((list) => list.map((n) => (n.id === id ? { ...n, kind: 'text', fromVoice: true, audio: undefined } : n)))
    setPhase({ k: 'done', text: 'Converted to a text note', undo: true })
  }

  // someone else on the board picks up the note: "is recording…", then their reply lands
  const teammateReplies = (noteId: string) => {
    const note = (fn: (n: Note) => Note) => setNotes((list) => list.map((n) => (n.id === noteId ? fn(n) : n)))
    let who = ''
    setTimeout(() => note((n) => {
      if (n.teammates >= 2 || n.recordingBy) return n // a couple of replies is plenty for a demo
      who = TEAM[n.teammates % TEAM.length] // a different teammate each time
      return { ...n, recordingBy: who }
    }), 2500)
    setTimeout(() => note((n) => {
      if (!who || n.recordingBy !== who) return n
      const text = TEAM_LINES[(n.teammates + notesMade.current) % TEAM_LINES.length]
      return { ...n, recordingBy: undefined, teammates: n.teammates + 1, replies: [...n.replies, { id: `r-${Date.now()}`, author: who, text }] }
    }), 6000)
  }

  const addReply = (noteId: string, text: string, audio?: Recording) => {
    snapshot()
    const reply: Reply = { id: `r-${Date.now()}`, author: 'You', text: text.charAt(0).toUpperCase() + text.slice(1), audio }
    setNotes((list) => list.map((n) => (n.id === noteId ? { ...n, recordingBy: undefined, replies: [...n.replies, reply] } : n)))
    setPhase({ k: 'done', text: 'Reply added', undo: true })
    teammateReplies(noteId)
  }

  // nearest patch of board, w × h, with nothing on it; glides the view there if it isn't the middle
  const freeSpot = (w: number, h: number, lift = 0) => {
    // lift: how far above the middle of the view to look (the phone's sheet covers the lower part)
    const m = canvas.viewCentre()
    const v = { x: m.x, y: m.y - lift }
    const clear = (cx: number, cy: number) =>
      items.every((i) => i.x > cx + w / 2 || i.x + i.w < cx - w / 2 || i.y > cy + h / 2 || i.y + i.h < cy - h / 2)
    const spots = [[0, 0]]
    for (let ring = 1; ring <= 4; ring++)
      for (let dx = -ring; dx <= ring; dx++)
        for (let dy = -ring; dy <= ring; dy++) if (Math.max(Math.abs(dx), Math.abs(dy)) === ring) spots.push([dx * (w + 20), dy * (h + 20)])
    const [ox, oy] = spots.find(([dx, dy]) => clear(v.x + dx, v.y + dy)) ?? [0, 0]
    const at = { x: v.x + ox, y: v.y + oy }
    if (ox || oy) canvas.panTo(at.x, at.y + lift)
    return at
  }

  // the suggestion card's picks go straight on as cut-outs, side by side

  // Studio's suggested pins drop in as a loose row in the nearest clear space
  const addPicks = (picks: { src: string; aspect: number }[]) => {
    snapshot()
    const H = 130
    const widths = picks.map((p) => H * p.aspect)
    // rows of four, in the nearest clear patch big enough for them all
    const perRow = Math.min(4, picks.length)
    const rows = Math.ceil(picks.length / perRow)
    const c = freeSpot(perRow * (H * 0.8 + 20), rows * (H + 20))
    setItems((list) => [
      ...list,
      ...picks.map((p, i) => {
        const row = Math.floor(i / perRow), col = i % perRow
        const rowWidths = widths.slice(row * perRow, row * perRow + perRow)
        const rowTotal = rowWidths.reduce((a, b) => a + b, 0) + (rowWidths.length - 1) * 20
        const x = c.x - rowTotal / 2 + rowWidths.slice(0, col).reduce((a, b) => a + b + 20, 0)
        const y = c.y - (rows * (H + 20) - 20) / 2 + row * (H + 20)
        return { id: `${p.src}-${Date.now()}-${i}`, src: p.src, x, y, w: widths[i], h: H, z: ++zTop.current, from: { x: c.x, y: c.y } }
      }),
    ])
    setPhase({ k: 'done', text: `Added ${picks.length} cut-outs`, undo: true })
  }

  // a pin from Add more lands as the photo, gets scanned, and turns into Studio's cut-out of it;
  // a whole photo (from another board or the device) stays a photo, as a soft-cornered sticker
  // a sphere picked off the colour & material wheel lands in a row under its piece
  const addMaterial = (pieceId: string, m: Material) => {
    const p = items.find((i) => i.id === pieceId)
    if (!p) return
    snapshot()
    const made = items.filter((i) => i.id.startsWith(`${pieceId}-m`)).length
    const f = visibleRect(p)
    const S = 56
    setItems((list) => [...list, {
      id: `${pieceId}-m${made}-${Date.now()}`, src: p.src, label: m.name, material: m, w: S, h: S, z: ++zTop.current,
      x: f.x + made * (S + 8), y: f.y + f.h + 16, from: { x: f.x + f.w / 2 - S / 2, y: f.y + f.h / 2 - S / 2 },
    }])
  }
  // the wheel belongs to its piece: it closes once that piece isn't the one selected
  useEffect(() => {
    if (cmf && !(selected.length === 1 && selected[0] === cmf)) setCmf(null)
  }, [selected, cmf])

  // Adding a pin always extracts it: the photo lands and is scanned, then lifts into its cut-out
  // (a soft sticker when Studio has none) and its main colours drop in as chips underneath.
  // The Add more sheet stays open, so its + can turn to × (and back, to take it all off again).
  const addSimilar = (photo: string, photoAspect: number) => {
    const { src, aspect } = pieceFor(photo, photoAspect)
    const whole = !photo.startsWith('image ')
    snapshot()
    const h = web ? 190 : 150
    // on the phone the sheet covers the lower board, so the pin and its colours land in the strip
    // still showing above it
    const c = freeSpot(h * Math.max(aspect, photoAspect) + 40, h + 110, web ? 0 : 300 / canvas.scale.get())
    const id = `${photo}-${Date.now()}`
    const at = (a: number) => ({ x: c.x - (h * a) / 2, y: c.y - h / 2 - 30, w: h * a, h })
    setItems((list) => [...list, { id, src: photo, ...at(photoAspect), z: ++zTop.current, extracting: true }])
    const colours = extractColours(asset(photo), 3)
    setTimeout(async () => {
      const cut = { ...at(aspect), extracting: false, ...(whole && { crop: { box: [0, 0, 1, 1] as [number, number, number, number], shape: 'soft' as const } }) }
      const found = await colours
      setItems((list) => {
        if (!list.some((i) => i.id === id)) return list // taken off again while it was scanning
        const centre = { x: c.x, y: cut.y + cut.h / 2 }
        const chips: Item[] = found.map((colour, i) => ({
          id: `${id}-c${i}`, src, label: 'colour', colour, w: 44, h: 44, z: ++zTop.current,
          x: c.x - (found.length * 52 - 8) / 2 + i * 52, y: cut.y + cut.h + 18,
          from: { x: centre.x - 22, y: centre.y - 22 },
        }))
        return [...list.map((i) => (i.id === id ? { ...i, src, ...cut } : i)), ...chips]
      })
    }, 1600)
    return id
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
      case 'direction':
        return think('Reading the board…', () => {
          setPhase({ k: 'idle' })
          setSelected([])
          setDirection(true)
        })
      case 'merge':
        if (ids.length < 2) return setPhase({ k: 'clarify', heard })
        return think(`Merging ${names(ids.slice(0, 4))}…`, () => {
          setPhase({ k: 'idle' })
          doMerge(ids.slice(0, 4), /^(i want|i'?d like|generate|imagine|make|create)\b/i.test(heard.trim()) ? heard.trim() : '')
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
        // one piece: break it down into its colours and materials on the wheel
        if (intent.kind === 'colours' && ids.length === 1)
          return think('Reading its colours and materials…', () => {
            setPhase({ k: 'idle' })
            setCmf(ids[0])
          })
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
    speech.start(
      replyTo.current ? 'Yes, and maybe a softer pink beside it'
        : noteMode ? 'Love the texture on this, keep it soft'
        // the demo voice for the two underwater faces asks for the picture they make
        : RECIPES[0].needs.every((src) => ids.some((id) => items.find((i) => i.id === id)?.src === src)) ? 'I want a girl with flower frozen underwater'
        : suggestionsFor(ids.length)[0].phrase,
    )
  }

  // hold the mic on a note: your words become a reply in its thread
  const startReply = (noteId: string) => {
    replyTo.current = noteId
    setNotes((list) => list.map((n) => (n.id === noteId ? { ...n, recordingBy: 'You' } : n)))
    startListening([])
  }

  const endListening = async (how: 'send' | 'cancel' | 'tap') => {
    setArmed(false)
    const replying = replyTo.current
    replyTo.current = null
    if (replying) setNotes((list) => list.map((n) => (n.id === replying && n.recordingBy === 'You' ? { ...n, recordingBy: undefined } : n)))
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
    if (replying) return addReply(replying, heard, audio)
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

  // Delete / Backspace removes the selection on a keyboard; on the web, letters pick tools
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as Element)?.closest?.('input, textarea, [contenteditable]')
      if (typing) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected.length && phase.k === 'idle') deletePieces(selected)
      if (!web || e.altKey) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
        return
      }
      if (e.metaKey || e.ctrlKey) return
      const k = e.key.toLowerCase()
      if (k === 'v') setTool('select')
      if (k === 'h') setTool('hand')
      if (k === 't' || k === 'n') addTextNote(selected.length === 1 ? selected[0] : undefined)
      if (k === 'p') openPins()
      if (k === 'd') setTool((t) => (t === 'pen' ? 'select' : 'pen'))
      if (k === 'f' && selected.length > 1) webSuggest({ label: 'Group', phrase: 'Group these' })
      if (k === 'escape') setTool('select')
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

  // the web's buttons: "Add a note" types one instead of recording it
  const webSuggest = (s: Suggestion) => (s.label === 'Add a note' ? addTextNote(selected[0]) : suggest(s))

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
    if (web) return // no voice on the web: a long press is just a press
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
    setStrokes(prev.strokes)
  }

  const hidden: string[] = merging ? merging.ids : []

  return (
    <div ref={viewport} className="screen" style={{ overflow: 'clip' }}>
      {/* the freeform board: drag empty space to move around, pinch or ctrl+scroll to zoom */}
      <motion.div
        {...(boxing ? { onPointerDown: boxDown, onPointerMove: boxMove, onPointerUp: boxUp, onPointerCancel: boxUp } : canvas.handlers)}
        style={{
          position: 'absolute', left: 0, top: 0, width: WORLD, height: WORLD,
          x: canvas.x, y: canvas.y, scale: canvas.scale, transformOrigin: '0 0',
          cursor: boxing ? 'default' : 'grab', touchAction: 'none', ...pinPattern(),
        }}
      >
      {/* the lasso being drawn: a dashed red loop with a light red wash inside */}
      {lasso && lasso.length > 1 && (
        <svg width={WORLD} height={WORLD} style={{ position: 'absolute', left: 0, top: 0, zIndex: 960, pointerEvents: 'none', overflow: 'visible' }}>
          <path
            d={`M ${lasso.map(([x, y]) => `${(x + ORIGIN).toFixed(1)} ${(y + ORIGIN).toFixed(1)}`).join(' L ')} Z`}
            fill="rgba(173, 0, 26, .06)"
            stroke="var(--red-700)"
            strokeWidth={2 / canvas.scale.get()}
            strokeDasharray={`${6 / canvas.scale.get()} ${6 / canvas.scale.get()}`}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {/* the selection box being dragged */}
      {marquee && (
        <div
          style={{
            position: 'absolute', zIndex: 960, pointerEvents: 'none', borderRadius: 4,
            left: ORIGIN + Math.min(marquee.x0, marquee.x1), top: ORIGIN + Math.min(marquee.y0, marquee.y1),
            width: Math.abs(marquee.x1 - marquee.x0), height: Math.abs(marquee.y1 - marquee.y0),
            background: 'rgba(173, 0, 26, .06)', border: `${1.5 / canvas.scale.get()}px solid rgba(173, 0, 26, .7)`, boxSizing: 'border-box',
          }}
        />
      )}
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
        const on = selected.includes(it.id) || wiring?.to === it.id // a wire hovering over it lights it up too
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
            transition={dragging === it.id || resizing || (movingGroup && movingGroup.split(',').includes(it.id)) ? { x: { duration: 0 }, y: { duration: 0 }, scale: { duration: 0.2 } } : { duration: 0.6, ease }}
            // the hand tool reaches past the pieces to move the board
            style={{ position: 'absolute', left: 0, top: 0, width: it.w, height: it.h, zIndex: it.z, cursor: 'grab', touchAction: 'none', pointerEvents: tool === 'hand' || spaceHeld ? 'none' : undefined }}
          >
            {/* selected pieces get a red outline that hugs their shape, and it breathes while Studio listens */}
            <motion.div
              initial={false}
              animate={{
                filter:
                  on && phase.k === 'listening'
                    ? [outline(1), outline(0.4), outline(1)]
                    : outline(on ? 1 : 0),
              }}
              transition={on && phase.k === 'listening' ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
              style={{ width: '100%', height: '100%' }}
            >
              {it.extracting ? (
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
                <PieceContent it={it} />
              )}
            </motion.div>
          </motion.div>
        )
      })}
      </AnimatePresence>

      {/* a selected piece offers a handle on its right edge: drag a wire from it into a create node */}
      {phase.k !== 'listening' && selected.map((id) => {
        const it = items.find((i) => i.id === id)
        if (!it || it.colour) return null
        const f = visibleRect(it)
        const k = 1 / canvas.scale.get()
        return (
          <div
            key={`port-${id}`}
            aria-label="Drag to connect to a create node"
            title="Drag to connect"
            onPointerDown={(e) => startWire(id, e)}
            onPointerMove={moveWire}
            onPointerUp={endWire}
            onPointerCancel={() => setWire(null)}
            style={{
              position: 'absolute', zIndex: 958, width: 30 * k, height: 30 * k, display: 'grid', placeItems: 'center', cursor: 'crosshair', touchAction: 'none',
              left: ORIGIN + f.x + f.w - 15 * k, top: ORIGIN + f.y + f.h / 2 - 15 * k,
            }}
          >
            <span style={{ width: 16 * k, height: 16 * k, borderRadius: 999, background: 'var(--bg-inverse)', border: `${2.5 * k}px solid var(--bg-canvas)`, boxShadow: '0 1px 4px rgba(0,0,0,.25)' }} />
          </div>
        )
      })}

      {/* the colour & material wheel hovers beside its piece, on whichever side has room */}
      <AnimatePresence>
        {cmf && items.some((i) => i.id === cmf) && (() => {
          const f = visibleRect(byId(cmf))
          const v = canvas.viewCentre()
          const half = { w: vp.w / 2 / canvas.scale.get(), h: vp.h / 2 / canvas.scale.get() }
          const left = v.x - half.w + 8, rightEdge = v.x + half.w - 8, top = v.y - half.h + 120, bottom = v.y + half.h - 190
          const clampX = (x: number) => Math.min(Math.max(x, left), rightEdge - WHEEL_SIZE)
          const clampY = (y: number) => Math.min(Math.max(y, top), bottom - WHEEL_H)
          // beside the piece if a side has room, else under it (or over it), level with its middle
          const side: 'right' | 'left' | 'below' | 'above' =
            f.x + f.w + 12 + WHEEL_SIZE <= rightEdge ? 'right'
              : f.x - 12 - WHEEL_SIZE >= left ? 'left'
              : f.y + f.h + 12 + WHEEL_H <= bottom ? 'below' : 'above'
          const x = side === 'right' ? f.x + f.w + 12 : side === 'left' ? f.x - 12 - WHEEL_SIZE : clampX(f.x + f.w / 2 - WHEEL_SIZE / 2)
          const y = side === 'below' ? f.y + f.h + 12 : side === 'above' ? f.y - 12 - WHEEL_H : clampY(f.y + f.h / 2 - WHEEL_H / 2)
          return (
            <MaterialWheel key={cmf} src={byId(cmf).src} name={nameOf(byId(cmf))} at={{ x: ORIGIN + x, y: ORIGIN + y }} side={side}
              onAdd={(m) => addMaterial(cmf, m)} onClose={() => setCmf(null)} />
          )
        })()}
      </AnimatePresence>

      {/* resize handles on a single selected piece, above everything so they can always be caught */}
      {selected.length === 1 && !merging && (phase.k === 'idle' || phase.k === 'done') && (() => {
        const it = items.find((i) => i.id === selected[0])
        if (!it) return null
        const k = 1 / canvas.scale.get() // handles stay the same size on screen at any zoom
        return (['nw', 'ne', 'sw', 'se'] as const).map((c) => (
          <div
            key={c}
            aria-label={`Resize from the ${c} corner`}
            onPointerDown={(e) => startResize(it.id, c, e)}
            style={{
              position: 'absolute', zIndex: 955, width: 28 * k, height: 28 * k, display: 'grid', placeItems: 'center',
              left: ORIGIN + (c.endsWith('w') ? it.x : it.x + it.w) - 14 * k, top: ORIGIN + (c.startsWith('n') ? it.y : it.y + it.h) - 14 * k,
              cursor: c === 'nw' || c === 'se' ? 'nwse-resize' : 'nesw-resize', touchAction: 'none',
            }}
          >
            <span style={{ width: 12 * k, height: 12 * k, borderRadius: 3 * k, background: '#fff', border: `${1.5 * k}px solid #151413`, boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
          </div>
        ))
      })()}

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

      {/* wires: every piece plugged into a node, and the one being dragged out */}
      <svg width={WORLD} height={WORLD} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 29, overflow: 'visible' }}>
        {(() => {
          const wire = (sx: number, sy: number, ex: number, ey: number, key: string, live = false) => {
            const h = Math.max(50, Math.abs(ex - sx) * 0.5)
            const dir = ex >= sx ? 1 : -1
            const d = `M ${sx + ORIGIN} ${sy + ORIGIN} C ${sx + ORIGIN + h * dir} ${sy + ORIGIN}, ${ex + ORIGIN - h} ${ey + ORIGIN}, ${ex + ORIGIN} ${ey + ORIGIN}`
            return (
              <g key={key}>
                <path d={d} fill="none" stroke="var(--bg-inverse)" strokeWidth={2} strokeLinecap="round" strokeDasharray={live ? '6 6' : undefined} opacity={live ? 0.6 : 0.55} />
                <circle cx={sx + ORIGIN} cy={sy + ORIGIN} r={4} fill="var(--bg-inverse)" />
              </g>
            )
          }
          const from = (it: Item, toX: number) => {
            const f = visibleRect(it)
            return f.x + f.w / 2 < toX ? { x: f.x + f.w + 4, y: f.y + f.h / 2 } : { x: f.x - 4, y: f.y + f.h / 2 }
          }
          return (
            <>
              {nodes.flatMap((n) =>
                n.inputs.map((id) => {
                  const it = items.find((i) => i.id === id)
                  if (!it) return null
                  const s0 = from(it, n.x)
                  return wire(s0.x, s0.y, n.x - 7, n.y + PORT_Y, `${n.id}-${id}`)
                }),
              )}
              {wiring && (() => {
                const it = items.find((i) => i.id === wiring.from)
                if (!it) return null
                const target = wiring.to ? items.find((i) => i.id === wiring.to) : undefined
                const t = target ? visibleRect(target) : null
                // over a piece, the wire lands on its nearest side; otherwise it follows the pointer
                const src = visibleRect(it)
                const end = t ? { x: src.x + src.w / 2 < t.x + t.w / 2 ? t.x - 4 : t.x + t.w + 4, y: t.y + t.h / 2 } : { x: wiring.x, y: wiring.y }
                const s0 = from(it, end.x)
                return wire(s0.x, s0.y, end.x, end.y, 'live', true)
              })()}
            </>
          )
        })()}
      </svg>

      {/* create nodes */}
      <AnimatePresence>
        {nodes.map((n) => {
          const wired = n.inputs.map((i) => items.find((x) => x.id === i)).filter((i): i is Item => !!i)
          const chip = wired.find((i) => i.colour)?.colour
          return (
            <div key={n.id} style={{ position: 'absolute', left: ORIGIN + n.x, top: ORIGIN + n.y, zIndex: 30 }}>
              <CreateNode
                node={n}
                inputs={wired}
                result={nodeImage(n)}
                generated={recipeFor(n)?.src}
                backdrop={chip ? `color-mix(in srgb, ${chip} 35%, var(--bg-canvas))` : undefined}
                onMove={(dx, dy) => editNode(n.id, (m) => ({ ...m, x: m.x + dx / zoom(), y: m.y + dy / zoom() }))}
                onPrompt={(prompt) => editNode(n.id, (m) => ({ ...m, prompt }))}
                onCreate={() => makeImage(n.id)}
                onAgain={() => makeImage(n.id, true)}
                onAdd={() => addMade(n)}
                onUnwire={(id) => editNode(n.id, (m) => ({ ...m, inputs: m.inputs.filter((x) => x !== id), status: m.inputs.length > 1 ? m.status : 'idle' }))}
                onDelete={() => setNodes((list) => list.filter((m) => m.id !== n.id))}
                onMeasure={(h) => setNodeH((m) => (m[n.id] === h ? m : { ...m, [n.id]: h }))}
              />
            </div>
          )
        })}
      </AnimatePresence>

      {/* a comment left on a piece is tied to it by a line, dot to dot */}
      <svg width={WORLD} height={WORLD} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 24, overflow: 'visible' }}>
        {notes.map((n) => {
          const piece = n.on ? items.find((i) => i.id === n.on) : undefined
          if (!piece) return null
          const f = visibleRect(piece) // the sticker itself, not its transparent box
          // The line leaves the middle of the comment's side that faces the piece, and lands on
          // the piece's facing side wherever is nearest; it stops short of both. Side by side it
          // runs across, one above the other it runs down. Too close to fit a line, there's none.
          const GAP = 6
          const c = { x: n.x, y: n.y, ...(cardSize[n.id] ?? { w: 256, h: COMMENT_MID * 2 }) }
          const across = Math.max(f.x - (c.x + c.w), c.x - (f.x + f.w))
          const down = Math.max(f.y - (c.y + c.h), c.y - (f.y + f.h))
          if (across < GAP * 3 && down < GAP * 3) return null
          let d: string, ends: [number, number][]
          if (across >= down) {
            const right = c.x >= f.x + f.w
            const ax = (right ? c.x - GAP : c.x + c.w + GAP) + ORIGIN, ay = c.y + c.h / 2 + ORIGIN
            const bx = (right ? f.x + f.w + GAP : f.x - GAP) + ORIGIN
            const by = Math.min(Math.max(ay - ORIGIN, f.y + f.h * 0.1), f.y + f.h * 0.9) + ORIGIN
            const mx = (ax + bx) / 2
            d = `M${bx} ${by} C${mx} ${by}, ${mx} ${ay}, ${ax} ${ay}`
            ends = [[bx, by], [ax, ay]]
          } else {
            const below = c.y >= f.y + f.h
            const ax = c.x + c.w / 2 + ORIGIN, ay = (below ? c.y - GAP : c.y + c.h + GAP) + ORIGIN
            const by = (below ? f.y + f.h + GAP : f.y - GAP) + ORIGIN
            const bx = Math.min(Math.max(ax - ORIGIN, f.x + f.w * 0.1), f.x + f.w * 0.9) + ORIGIN
            const my = (ay + by) / 2
            d = `M${bx} ${by} C${bx} ${my}, ${ax} ${my}, ${ax} ${ay}`
            ends = [[bx, by], [ax, ay]]
          }
          return (
            <g key={n.id} stroke="var(--bg-default)" fill="var(--bg-default)">
              <path d={d} strokeWidth={2.5} fill="none" /* a touch heavier: the light colour needs it to read */ />
              {ends.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5} stroke="none" />)}
            </g>
          )
        })}
      </svg>

      {/* marker lines */}
      {strokes.length > 0 && (
        <svg width={WORLD} height={WORLD} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 20, overflow: 'visible' }}>
          <defs>
            {/* pencil grain: the line's edge roughened and its body flecked */}
            <filter id="pencil" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="grain" />
              <feDisplacementMap in="SourceGraphic" in2="grain" scale="2.5" result="rough" />
              <feComposite in="rough" in2="grain" operator="in" />
            </filter>
          </defs>
          {strokes.map((st) => (
            <path
              key={st.id}
              d={pathOf(st.points)}
              stroke={st.ink}
              strokeWidth={st.width}
              strokeOpacity={st.kind === 'highlighter' ? 0.4 : st.kind === 'pencil' ? 0.85 : 1}
              filter={st.kind === 'pencil' ? 'url(#pencil)' : undefined}
              strokeLinecap={st.kind === 'highlighter' ? 'square' : 'round'}
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </svg>
      )}

      <AnimatePresence>{notes.map((n) => n.kind === 'text' ? (
        <TextNote key={n.id} x={ORIGIN + n.x} y={ORIGIN + n.y} author={n.author} text={n.text} replies={n.replies} editing={n.editing} fromVoice={n.fromVoice}
          onChange={(t) => setNoteText(n.id, t)} onDelete={() => deleteNote(n.id)} onMove={(dx, dy) => moveNote(n.id, dx, dy)}
          typingBy={n.recordingBy} onPost={() => teammateReplies(n.id)} onReply={(t) => addReply(n.id, t)}
          onMeasure={(w, h) => setCardSize((m) => (m[n.id]?.w === w && m[n.id]?.h === h ? m : { ...m, [n.id]: { w, h } }))} />
      ) : (
        <VoiceNote key={n.id} x={ORIGIN + n.x} y={ORIGIN + n.y} author={n.author} text={n.text} audio={n.audio} replies={n.replies} recordingBy={n.recordingBy}
            // the web has no mic: replies come from the phone, and a note can become text instead
            replyMic={web ? undefined : <Mic size={28} holding={phase.k === 'listening' && n.recordingBy === 'You'} onHoldStart={() => startReply(n.id)} onHoldEnd={endListening} onArm={setArmed} />}
            onConvert={web ? () => convertNote(n.id) : undefined}
            onDelete={() => deleteNote(n.id)} onMove={(dx, dy) => moveNote(n.id, dx, dy)}
            onMeasure={(w, h) => setCardSize((m) => (m[n.id]?.w === w && m[n.id]?.h === h ? m : { ...m, [n.id]: { w, h } }))} />
      ))}</AnimatePresence>

      {/* a merge being tried: the pieces fly in from where they sat and settle together */}
      <AnimatePresence>
        {merging && (() => {
          const parts = mergeLayout(merging.pieces, merging.variant)
          const bottom = Math.max(...parts.map((p) => p.y + p.h))
          return (
            <motion.div key="merging" exit={{ opacity: 0, transition: { duration: 0.2 } }} style={{ position: 'absolute', left: ORIGIN + merging.at.x, top: ORIGIN + merging.at.y, zIndex: 950 }}>
              {/* a quick flash where they meet */}
              <motion.div
                initial={{ scale: 0.2, opacity: 0.7 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.9, delay: 0.35, ease }}
                key={`flash-${merging.variant}`}
                style={{ position: 'absolute', left: -110, top: -110, width: 220, height: 220, borderRadius: 999, border: '2px solid rgba(173,0,26,.5)', pointerEvents: 'none' }}
              />
              <div style={{ filter: 'drop-shadow(0 12px 18px rgba(0,0,0,.18))' }}>
                {parts.map((p) => {
                  const was = merging.pieces.find((i) => i.id === p.id)!
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ x: was.x - merging.at.x, y: was.y - merging.at.y, width: was.w, height: was.h, rotate: 0 }}
                      animate={{ x: p.x, y: p.y, width: p.w, height: p.h, rotate: p.r }}
                      transition={{ type: 'spring', stiffness: 170, damping: 20 }}
                      style={{ position: 'absolute', left: 0, top: 0 }}
                    >
                      <PieceContent it={p} />
                    </motion.div>
                  )
                })}
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4, ease }}
                onPointerDown={(e) => e.stopPropagation()}
                style={{ position: 'absolute', left: -150, width: 300, top: bottom + 18, display: 'grid', justifyItems: 'center', gap: 10 }}
              >
                <span style={{ padding: '5px 10px', borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{mergeName(merging.pieces)}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Pill label="Cancel" onClick={() => setMerging(null)} />
                  <Pill label="Try again" onClick={() => setMerging((m) => m && { ...m, variant: m.variant + 1 })} />
                  <Pill label="Keep" selected onClick={keepMerge} />
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
      </motion.div>

      {/* on the web, the board's name and who's on it sit top left where Back would be */}
      {web && (
        <div style={{ position: 'absolute', left: 16, top: 'var(--ui-top)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 12, height: 44, padding: '0 14px 0 6px', borderRadius: 999, background: 'rgba(252,250,247,.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <span style={{ display: 'flex' }}>
            {['You', 'Maya', 'Jules', 'Ren'].map((who, i) => (
              <span key={who} style={{ marginLeft: i ? -10 : 0, borderRadius: 999, boxShadow: '0 0 0 2px var(--bg-canvas)' }}>
                <Face who={who} size={32} />
              </span>
            ))}
          </span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>Ads</span>
          <span className="t-label" style={{ color: 'var(--text-secondary)' }}>14 pins · 3 collaborators</span>
        </div>
      )}
      {/* the web is only the board, so there's nowhere to go back to */}
      {!web && (
        <IconButton label="Back" onClick={onBack} style={{ position: 'absolute', left: 8, top: 'var(--ui-top)', zIndex: 50 }}>
          <BackIcon />
        </IconButton>
      )}

      <IconButton label="Share board" selected={shareOpen} onClick={() => setShareOpen(true)} style={{ position: 'absolute', right: 8, top: 'var(--ui-top)', zIndex: 50 }}>
        <ShareIcon />
      </IconButton>

      {/* when the board feels done: sum it up as a concept card (phone and web) */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => { setSelected([]); setDirection(true) }}
        style={{ position: 'absolute', right: 60, top: 'var(--ui-top)', zIndex: 50, height: 44, padding: '0 16px', borderRadius: 999, background: '#111', color: '#fff', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        Concept card
      </motion.button>

      <AnimatePresence>
        {direction && (
          <DirectionCard
            key="direction"
            items={items}
            saved={savedDirection}
            onClose={() => {
              setDirection(false)
              if (savedDirection) setPhase({ k: 'done', text: `“${savedDirection.title}” is saved in ${PROJECT}`, undo: false })
            }}
            onSave={(d) => {
              saveDirection(PROJECT, d)
              setSavedDirection(d)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{rec && <Recommendation key="rec" onAdd={addPicks} onDismiss={() => setRec(false)} />}</AnimatePresence>

      {/* the phone: the mic in the bottom right, and the selection's suggestions beside it */}
      {!web && phase.k !== 'thinking' && !explore && !shareOpen && !merging && !direction /* sheets cover the tools */ && (
        <>
          {selected.length > 0 && (phase.k === 'idle' || phase.k === 'listening') && (
            <Dock
              open
              right={68}
              bottom={106} // its middle level with the mic's (44px tall, 110 up): 6 + 40 + 6 tall
              suggestions={suggestionsFor(selected.length)}
              onSuggest={suggest}
              onDelete={() => deletePieces(selected)}
              tip={false}
              active={noteMode ? 'Add a note' : undefined}
              mic={null}
            />
          )}
          {/* one dark mic near where Figma's + sits, 8px further in so its halo (up to ~7.5px out) stays inside the margin */}
          <div onPointerDown={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 16, bottom: 110, zIndex: 47 }}>
            <HoldTip show={tip} align="right">{noteMode ? 'Hold the mic and say your note' : selected.length ? 'Hold and say what to do' : undefined}</HoldTip>
            <Mic dark size={44} holding={phase.k === 'listening'} onHoldStart={() => startListening(selected)} onHoldEnd={endListening} onArm={setArmed} />
          </div>
        </>
      )}

      {/* the web: tools along the bottom, and what you can do with the selection above them */}
      {web && !merging && !direction && (
        <>
          <SelectionBar count={phase.k === 'idle' ? selected.length : 0} suggestions={suggestionsFor(selected.length)} onSuggest={webSuggest} onDelete={() => deletePieces(selected)} />
          {/* while the marker is out, drags draw instead of moving things */}
          {tool === 'pen' && (
            <div onPointerDown={penDown} onPointerMove={penMove} onPointerUp={penUp} onPointerCancel={penUp} style={{ position: 'absolute', inset: 0, zIndex: 45, cursor: pen === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }} />
          )}
          <Toolbar
            tool={tool}
            onTool={(t) => {
              setTool(t)
              if (t === 'pen') setSelected([])
            }}
            pen={pen}
            onPen={setPen}
            ink={ink}
            onInk={setInk}
            width={penWidth}
            onWidth={setPenWidth}
            selected={selected.length}
            onNote={() => addTextNote(selected.length === 1 ? selected[0] : undefined)}
            onPins={openPins}
            onFrame={() => webSuggest({ label: 'Group', phrase: 'Group these' })}
            onMerge={() => webSuggest({ label: 'Merge', phrase: 'Merge these together' })}
            onColours={() => webSuggest({ label: 'Colour & material', phrase: 'Show the colours and materials in this' })}
            onDirection={() => { setSelected([]); setDirection(true) }}
            onUndo={undo}
          />
        </>
      )}

      <div style={{ position: 'absolute', left: 'var(--ui-x)', right: 'var(--ui-x)', zIndex: 46, pointerEvents: 'none', ...(slot === 'top' && phase.k !== 'done' ? { top: 'var(--ui-top2)' } : { bottom: 'var(--ui-low)' }) /* small confirmations always sit low */ }}>
      <AnimatePresence mode="wait">
        {phase.k === 'listening' && (
          <ListeningPanel key="listen" transcript={speech.transcript} heard={speech.heard} armed={armed} thumbs={targets.current.map((id) => byId(id).src)} title={replyTo.current ? 'Recording your reply…' : noteMode ? 'Recording your note…' : undefined} />
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
        onAdd={addSimilar}
        onRemove={(id) => setItems((list) => list.filter((i) => i.id !== id && !i.id.startsWith(`${id}-c`)))} // the pin and its colours
      />
    </div>
  )
}
