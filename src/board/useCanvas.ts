import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { animate, useMotionValue } from 'framer-motion'
import { getFit } from '../components/fit'

/** Size of the freeform board, and where the original 402×874 layout sits inside it. */
export const WORLD = 3000
export const ORIGIN = 1300
const MIN_SCALE = 0.45
const MAX_SCALE = 2.5

/**
 * Pan (one finger / mouse drag / trackpad scroll) and zoom (pinch / ctrl+scroll)
 * for the board. Returns motion values for the world layer plus pointer handlers.
 */
export function useCanvas(viewport: RefObject<HTMLDivElement | null>, onTapEmpty: () => void) {
  const x = useMotionValue(-ORIGIN)
  const y = useMotionValue(-ORIGIN)
  const scale = useMotionValue(1)

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; mx: number; my: number } | null>(null)
  const velocity = useRef({ x: 0, y: 0, t: 0 })
  const moved = useRef(false)

  const rect = () => viewport.current!.getBoundingClientRect()
  // the viewport's own size, unaffected by the phone being scaled to fit the window
  const size = () => ({ width: viewport.current!.offsetWidth, height: viewport.current!.offsetHeight })

  const bounds = (s: number) => {
    const r = size()
    return { minX: r.width - WORLD * s, minY: r.height - WORLD * s }
  }

  const set = (px: number, py: number, s = scale.get()) => {
    const { minX, minY } = bounds(s)
    scale.set(s)
    x.set(Math.min(0, Math.max(minX, px)))
    y.set(Math.min(0, Math.max(minY, py)))
  }

  // zoom keeping the point under (fx, fy) fixed on screen
  const zoomAt = (fx: number, fy: number, next: number) => {
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next))
    const k = s / scale.get()
    set(fx - (fx - x.get()) * k, fy - (fy - y.get()) * k, s)
  }

  const local = (e: { clientX: number; clientY: number }) => {
    const r = rect()
    const k = getFit()
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* pointer already gone */
    }
    x.stop()
    y.stop()
    moved.current = false
    pointers.current.set(e.pointerId, local(e))
    velocity.current = { x: 0, y: 0, t: performance.now() }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const p = local(e)
    pointers.current.set(e.pointerId, p)

    if (pointers.current.size === 1) {
      const dx = p.x - prev.x
      const dy = p.y - prev.y
      if (Math.abs(dx) + Math.abs(dy) > 0.5) moved.current = true
      set(x.get() + dx, y.get() + dy)
      const now = performance.now()
      const dt = Math.max(1, now - velocity.current.t)
      velocity.current = { x: (dx / dt) * 1000, y: (dy / dt) * 1000, t: now }
    } else if (pointers.current.size === 2 && pinch.current) {
      moved.current = true
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      set(x.get() + mx - pinch.current.mx, y.get() + my - pinch.current.my)
      zoomAt(mx, my, scale.get() * (dist / pinch.current.dist))
      pinch.current = { dist, mx, my }
    }
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    // ignore releases that began on a piece (they bubble up here)
    if (!pointers.current.delete(e.pointerId)) return
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size > 0) return
    if (!moved.current) {
      onTapEmpty()
      return
    }
    // glide to a stop
    const { minX, minY } = bounds(scale.get())
    const stale = performance.now() - velocity.current.t > 80
    const inertia = { type: 'inertia', power: 0.35, timeConstant: 260 } as const
    animate(x, x.get(), { ...inertia, velocity: stale ? 0 : velocity.current.x, min: minX, max: 0 })
    animate(y, y.get(), { ...inertia, velocity: stale ? 0 : velocity.current.y, min: minY, max: 0 })
  }

  // trackpad: two-finger scroll pans, pinch (ctrl+wheel) zooms
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if ((e.target as Element).closest?.('[data-scroll]')) return // let rows of chips scroll themselves
      e.preventDefault()
      x.stop()
      y.stop()
      if (e.ctrlKey) {
        const p = local(e)
        zoomAt(p.x, p.y, scale.get() * Math.exp(-e.deltaY * 0.01))
      } else set(x.get() - e.deltaX / getFit(), y.get() - e.deltaY / getFit())
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** board coords → screen coords inside the viewport */
  const toScreen = (bx: number, by: number) => ({
    x: (ORIGIN + bx) * scale.get() + x.get(),
    y: (ORIGIN + by) * scale.get() + y.get(),
  })

  /** board coords of the middle of the current view */
  const viewCentre = () => {
    const r = size()
    return {
      x: (r.width / 2 - x.get()) / scale.get() - ORIGIN,
      y: (r.height / 2 - y.get()) / scale.get() - ORIGIN,
    }
  }

  /** glide so board point (bx, by) sits in the middle of the view */
  const panTo = (bx: number, by: number) => {
    const r = size()
    const s = scale.get()
    const { minX, minY } = bounds(s)
    const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v))
    const ease = { duration: 0.7, ease: [0.22, 1, 0.36, 1] } as const
    animate(x, clamp(r.width / 2 - (ORIGIN + bx) * s, minX), ease)
    animate(y, clamp(r.height / 2 - (ORIGIN + by) * s, minY), ease)
  }

  return {
    x,
    y,
    scale,
    toScreen,
    viewCentre,
    panTo,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  }
}
