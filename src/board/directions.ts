import type { Direction } from './DirectionCard'

// Saved concept cards (once called direction cards), one per project. Kept in this browser so
// they survive leaving the board and reloading; the prototype has no server.
const KEY = 'studio-concepts'

const read = (): Record<string, Direction> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export const loadDirection = (project: string): Direction | undefined => read()[project]

export const saveDirection = (project: string, d: Direction) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [project]: d }))
  } catch {
    // storage blocked: the direction still lives for this visit
  }
}
