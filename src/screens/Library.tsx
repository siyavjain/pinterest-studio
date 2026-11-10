import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PlusIcon } from '../components/Icons'
import { asset } from '../components/asset'
import { loadDirection } from '../board/directions'

// The Studio tab once you've worked on a board: every project as a small fanned stack.
type Project = { name: string; img: number; posts: number; ingredients: number; creator: string; avatar?: string; locked?: boolean }

// img n = the p{n} image set in home/assets; names match what's in each set
const PROJECTS: Project[] = [
  { name: 'Ads', img: 3, posts: 4, ingredients: 16, creator: 'mira.okafor', avatar: 'p3-avatar' },
  { name: 'Sport', img: 5, posts: 6, ingredients: 12, creator: 'elle.reyes', locked: true },
  { name: 'Interiors', img: 2, posts: 5, ingredients: 9, creator: 'theo.marsh', avatar: 'p2-avatar' },
  { name: 'Shoes', img: 4, posts: 3, ingredients: 8, creator: 'jun.park', avatar: 'p4-avatar', locked: true },
  { name: 'Collage', img: 1, posts: 4, ingredients: 6, creator: 'nora.lane' },
]
const FILTERS = ['All', 'In Progress', 'Locked'] as const
type Filter = (typeof FILTERS)[number]
const ease = [0.22, 1, 0.36, 1] as const

const Lock = () => (
  <svg width="16" height="21" viewBox="0 0 16 20.75" fill="none" aria-label="Locked">
    <rect y="7.42" width="16" height="13.33" rx="2.67" fill="#AD001A" />
    <path d="M3.33 8.09V3.48c0-.04 0-.09.01-.13C3.6 2.23 4.86.23 8 .75" stroke="#AD001A" strokeWidth="1.33" strokeLinecap="round" />
    <path d="M12 8.09V3.42" stroke="#AD001A" strokeWidth="1.33" strokeLinecap="round" />
  </svg>
)

/** Figma "Project Stack" (Studio home, 862:553): 181 × 267, back and middle fanned behind the front card. */
const STACK = { w: 181, h: 267 }
const CARD = { w: 161.6, h: 230.2, r: 16.8 }
function Stack({ p }: { p: Project }) {
  // back and middle are placed by their centres, then turned, as in the frame
  const card = (name: string, cx: number, cy: number, turn: number) => (
    <img
      src={asset(`p${p.img}-${name}`)}
      alt=""
      style={{ position: 'absolute', left: cx - CARD.w / 2, top: cy - CARD.h / 2, width: CARD.w, height: CARD.h, borderRadius: CARD.r, objectFit: 'cover', transform: `rotate(${turn}deg)` }}
    />
  )
  return (
    // fanning turns the back cards wider than the stack, so the whole stack eases down a touch
    // while it fans: it stays inside its own box and never crosses the screen's margin
    <motion.div whileHover="fan" whileTap="press" variants={{ fan: { scale: 0.9 } }} transition={{ duration: 0.3, ease }} style={{ position: 'relative', width: STACK.w, height: STACK.h }}>
      <motion.div variants={{ fan: { rotate: -3, x: -4 }, press: { rotate: 0 } }} style={{ position: 'absolute', inset: 0 }}>
        {card('back', 90, 125.2, -4.39)}
      </motion.div>
      <motion.div variants={{ fan: { rotate: 3, x: 4 }, press: { rotate: 0 } }} style={{ position: 'absolute', inset: 0 }}>
        {card('middle', 93.8, 135.2, 2.34)}
      </motion.div>
      <motion.div
        variants={{ press: { scale: 0.97 } }}
        style={{ position: 'absolute', left: 4.5, top: 28.8, width: 162.1, height: 230.2, borderRadius: CARD.r, overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,.1)' }}
      >
        <img src={asset(`p${p.img}-front`)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: 53.3, borderRadius: `0 0 ${CARD.r}px ${CARD.r}px`,
            backdropFilter: 'blur(4.9px)', WebkitBackdropFilter: 'blur(4.9px)',
            background: 'linear-gradient(to bottom, rgba(0,0,0,.01), rgba(0,0,0,.55))',
          }}
        />
        <div style={{ position: 'absolute', left: 8.4, bottom: 8.6, display: 'flex', alignItems: 'center', gap: 4.2, color: 'var(--bg-canvas)' }}>
          {p.avatar ? (
            <img src={asset(p.avatar)} alt="" style={{ width: 14, height: 14, borderRadius: 999 }} />
          ) : (
            <span style={{ width: 14, height: 14, borderRadius: 999, background: 'var(--bg-default)' }} />
          )}
          <span style={{ fontSize: 8.4, lineHeight: '12.6px', fontWeight: 300 }}>{p.creator}</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Library({ onOpen, onNew }: { onOpen: (project: string, direction?: boolean) => void; onNew: () => void }) {
  const [filter, setFilter] = useState<Filter>('All')
  const shown = PROJECTS.filter((p) => filter === 'All' || (filter === 'Locked' ? p.locked : !p.locked))
  const kept = PROJECTS.reduce((n, p) => n + p.ingredients, 0)
  // the stacks are Figma size on the 402-wide screen; a narrower real phone shrinks them to fit two across
  const k = innerWidth <= 500 ? Math.min(1, (innerWidth - 40) / (STACK.w * 2)) : 1

  return (
    // the grid scrolls under the header; the nav floats over the bottom
    <div className="screen" style={{ overflowY: 'auto', touchAction: 'pan-y', scrollbarWidth: 'none' }}>
      {/* the title and filters stay pinned while the projects scroll under them */}
      {/* 16px above (below the 54px status bar) and 16px below */}
      <div style={{ position: 'sticky', top: 0, zIndex: 3, padding: `${54 + 16}px 8px 16px`, background: 'var(--bg-canvas)' }}>
        <div style={{ fontSize: 36, lineHeight: '44px', fontWeight: 600 }}>Studio</div>
        <div style={{ fontSize: 16, lineHeight: '24px', color: 'var(--text-secondary)' }}>
          {PROJECTS.length} projects · {kept} ingredients kept
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
          <div style={{ display: 'flex', gap: 8, height: 44 }}>
            {FILTERS.map((f) => (
              <motion.button
                key={f}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(f)}
                animate={{ backgroundColor: filter === f ? '#151413' : '#e9e4df', color: filter === f ? '#e9e4df' : '#111111' }}
                transition={{ duration: 0.25 }}
                style={{ padding: '0 18px', borderRadius: 30, fontSize: 16, whiteSpace: 'nowrap' }}
              >
                {f}
              </motion.button>
            ))}
          </div>
          <motion.button
            aria-label="New project"
            whileTap={{ scale: 0.9 }}
            onClick={onNew}
            style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--bg-default)', display: 'grid', placeItems: 'center' }}
          >
            <PlusIcon size={20} />
          </motion.button>
        </div>
      </div>

      <motion.div layout style={{ display: 'grid', gridTemplateColumns: `${STACK.w * k}px ${STACK.w * k}px`, columnGap: 22, rowGap: 16, padding: '0 8px 150px 10px' }}>
        <AnimatePresence mode="popLayout">
          {shown.map((p) => {
            const direction = loadDirection(p.name)
            return (
            <motion.div
              role="button"
              tabIndex={0}
              key={p.name}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.35, ease }}
              onClick={() => onOpen(p.name)}
              style={{ display: 'grid', justifyItems: 'center', alignContent: 'start', gap: 2, textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ width: STACK.w * k, height: STACK.h * k }}>
                <div style={{ zoom: k }}>
                  <Stack p={p} />
                </div>
              </div>
              <div style={{ position: 'relative', width: STACK.w * k }}>
                <div style={{ fontSize: 18, lineHeight: '26px' }}>{p.name}</div>
                <div style={{ fontSize: 12, lineHeight: '18px', fontWeight: 300, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {p.posts} posts · {p.ingredients} ingredients
                </div>
                {p.locked && (
                  <span style={{ position: 'absolute', left: STACK.w * k - 36, top: -14 }}>
                    <Lock />
                  </span>
                )}
              </div>
              {/* a saved concept card: tap to open the board on it */}
              {direction && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpen(p.name, true)
                  }}
                  style={{ marginTop: 6, maxWidth: 160, height: 26, padding: '0 10px 0 4px', borderRadius: 999, background: '#111', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ display: 'flex', flex: 'none' }}>
                    {direction.palette.slice(0, 3).map((c, i) => (
                      <span key={c} style={{ width: 16, height: 16, borderRadius: 999, background: c, border: '1.5px solid #111', marginLeft: i ? -7 : 0 }} />
                    ))}
                  </span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{direction.title}</span>
                </motion.button>
              )}
            </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
