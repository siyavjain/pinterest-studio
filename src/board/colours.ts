// The few colours a photo is really made of, for the chips Studio drops under an extracted pin.

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/** Up to `n` distinct, common colours in the image at `url` (skipping see-through pixels). */
export function extractColours(url: string, n = 3): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const S = 48 // a thumbnail is plenty
      const c = document.createElement('canvas')
      c.width = S
      c.height = S
      const g = c.getContext('2d', { willReadFrequently: true })
      if (!g) return resolve([])
      g.drawImage(img, 0, 0, S, S)
      const data = g.getImageData(0, 0, S, S).data
      // count pixels in coarse colour buckets, keeping each bucket's average
      const buckets = new Map<number, { n: number; r: number; g: number; b: number }>()
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue
        const [r, gg, b] = [data[i], data[i + 1], data[i + 2]]
        const key = ((r >> 5) << 6) | ((gg >> 5) << 3) | (b >> 5)
        const k = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
        k.n++
        k.r += r
        k.g += gg
        k.b += b
        buckets.set(key, k)
      }
      const ranked = [...buckets.values()].sort((a, b) => b.n - a.n).map((k) => [k.r / k.n, k.g / k.n, k.b / k.n])
      // the most common, each clearly different from the ones already picked
      const picked: number[][] = []
      for (const col of ranked) {
        if (picked.every((p) => Math.hypot(p[0] - col[0], p[1] - col[1], p[2] - col[2]) > 70)) picked.push(col)
        if (picked.length === n) break
      }
      resolve(picked.map(([r, gg, b]) => hex(r, gg, b)))
    }
    img.onerror = () => resolve([])
    img.src = url
  })
}
