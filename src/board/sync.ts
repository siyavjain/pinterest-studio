// Live sync between the phone and the web through the dev server's little store (/api/sync).
// Content is shared (which pieces are on the board, comments, Create nodes, groups, the concept
// card); placement isn't: phone and web lay the board out differently, so everything placed
// carries a box for each view, and moving a piece only moves it in the view you moved it in.

export type View = 'phone' | 'web'
export type Box = [number, number, number, number] // x, y, w, h
type Placed = { id: string; x: number; y: number; w?: number; h?: number }
export type Packed<T> = T & { at: Partial<Record<View, Box>> }

export type SyncState = {
  items: Packed<Placed>[]
  notes: Packed<Placed>[]
  nodes: Packed<Placed>[]
  groups: unknown[]
  concepts: Record<string, unknown>
}
export type Doc = { rev: number; by: string; state: SyncState | null }

/** This tab, so it can ignore its own writes when they come back. */
export const ME = Math.random().toString(36).slice(2)

// only the dev server has the store; the shared build gives each visitor their own board
const LIVE = import.meta.env.DEV

export async function pull(): Promise<Doc | null> {
  if (!LIVE) return null
  try {
    const r = await fetch('/api/sync', { cache: 'no-store' })
    return r.ok ? await r.json() : null
  } catch {
    return null // no dev server (a static build): each device keeps its own board
  }
}

export async function push(state: SyncState): Promise<number | null> {
  if (!LIVE) return null
  try {
    const r = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ by: ME, state }) })
    return r.ok ? (await r.json()).rev : null
  } catch {
    return null
  }
}

const other = (v: View): View => (v === 'web' ? 'phone' : 'web')
const strip = <T extends Placed>(p: T) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { x, y, w, h, ...rest } = p
  return rest
}

/** This view's list, ready to share: each thing keeps the other view's box from what was shared before. */
export function pack<T extends Placed>(list: T[], view: View, before: Packed<Placed>[] | undefined): Packed<T>[] {
  const prev = new Map((before ?? []).map((p) => [p.id, p.at]))
  return list.map((p) => {
    const box: Box = [p.x, p.y, p.w ?? 0, p.h ?? 0]
    return { ...(p as T), at: { ...prev.get(p.id), [view]: box } }
  })
}

/**
 * A shared list laid out for this view: its own box when it has one, else `guess` from the
 * other view's box (a piece added on the other device), else where it was here before.
 */
export function unpack<T extends Placed>(list: Packed<Placed>[], view: View, here: T[], guess: (p: Packed<Placed>, theirs: Box) => Box): T[] {
  const mine = new Map(here.map((p) => [p.id, p]))
  return list.map((p) => {
    const rest = strip({ ...p, at: undefined })
    const b = p.at[view] ?? (mine.get(p.id) ? [mine.get(p.id)!.x, mine.get(p.id)!.y, mine.get(p.id)!.w ?? 0, mine.get(p.id)!.h ?? 0] as Box : null) ?? guess(p, p.at[other(view)] ?? [0, 0, 0, 0])
    const placed = { ...rest, x: b[0], y: b[1] } as Record<string, unknown>
    if ('w' in p) placed.w = b[2]
    if ('h' in p) placed.h = b[3]
    delete placed.at
    return placed as T
  })
}
