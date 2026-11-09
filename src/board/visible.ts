import { useEffect, useState } from 'react'
import { asset } from '../components/asset'

// Cut-outs sit in boxes with transparent margins. For lines that should meet the sticker itself,
// this finds where each image is actually opaque, as fractions of its box: [left, top, right, bottom].

type Frac = [number, number, number, number]
type Crop = { box: [number, number, number, number]; shape: string } | undefined
const cache = new Map<string, Frac>()
const pending = new Set<string>()
const listeners = new Set<() => void>()

const keyOf = (src: string, crop: Crop) => (crop ? `${src}|${crop.box.join(',')}` : src)

function measure(src: string, crop: Crop) {
  const key = keyOf(src, crop)
  if (cache.has(key) || pending.has(key)) return
  pending.add(key)
  const img = new Image()
  img.onload = () => {
    // the part of the file that fills the piece: the whole image, or the crop of it
    const [cx, cy, cw, ch] = crop ? crop.box : [0, 0, 1, 1]
    const sx = cx * img.naturalWidth, sy = cy * img.naturalHeight, sw = cw * img.naturalWidth, sh = ch * img.naturalHeight
    const scale = Math.min(1, 160 / Math.max(sw, sh)) // a small copy is plenty to find the edges
    const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d', { willReadFrequently: true })
    let frac: Frac = [0, 0, 1, 1]
    if (g) {
      g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
      const a = g.getImageData(0, 0, w, h).data
      let l = w, t = h, r = -1, b = -1
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (a[(y * w + x) * 4 + 3] > 40) {
            if (x < l) l = x
            if (x > r) r = x
            if (y < t) t = y
            if (y > b) b = y
          }
      if (r >= 0) frac = [l / w, t / h, (r + 1) / w, (b + 1) / h]
    }
    cache.set(key, frac)
    pending.delete(key)
    listeners.forEach((f) => f())
  }
  img.onerror = () => pending.delete(key)
  img.src = asset(src)
}

/** The opaque part of a piece, in board coordinates. Pieces drawn as filled shapes are their box. */
export function visibleRect(it: { src: string; x: number; y: number; w: number; h: number; crop?: Crop; colour?: string; parts?: unknown[] }) {
  // a crop with a sticker shape or a colour chip fills its box; so does a merge, near enough
  if (it.colour || it.parts || (it.crop && it.crop.shape !== 'cut')) return it
  const f = cache.get(keyOf(it.src, it.crop))
  if (!f) {
    measure(it.src, it.crop)
    return it
  }
  return { x: it.x + f[0] * it.w, y: it.y + f[1] * it.h, w: (f[2] - f[0]) * it.w, h: (f[3] - f[1]) * it.h }
}

/** Re-render when a measurement lands. */
export function useVisibleBoxes() {
  const [, bump] = useState(0)
  useEffect(() => {
    const f = () => bump((n) => n + 1)
    listeners.add(f)
    return () => {
      listeners.delete(f)
    }
  }, [])
}
