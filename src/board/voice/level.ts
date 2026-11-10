// How loud the voice is right now, 0 (silence) to 1 (loud), for the wave to draw from.
// While the mic is live it's measured from the sound itself; without a mic, the demo voice
// "speaks" each word as a burst so the wave still moves with it.

export const voice = { level: 0 }

let ctx: AudioContext | null = null
let frame = 0
let target = 0 // the demo voice's loudness, which `level` eases towards

/** Measure a live microphone stream until `stopLevel`. */
export function startLevel(stream: MediaStream) {
  stopLevel()
  try {
    ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    ctx.createMediaStreamSource(stream).connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    const tick = () => {
      analyser.getFloatTimeDomainData(buf)
      let sum = 0
      for (const v of buf) sum += v * v
      const rms = Math.sqrt(sum / buf.length)
      // speech sits around 0.02–0.2 rms: lift the quiet end so soft talk still shows
      const loud = Math.min(1, Math.sqrt(Math.max(0, rms - 0.008) * 9))
      // rise quickly with the voice, fall away a little slower
      voice.level += (loud - voice.level) * (loud > voice.level ? 0.6 : 0.18)
      frame = requestAnimationFrame(tick)
    }
    tick()
  } catch {
    /* no Web Audio: the wave stays calm */
  }
}

/** One spoken word from the demo voice: a burst of sound that fades. */
export function sayWord() {
  if (ctx) return // a real mic is speaking for itself
  target = 0.45 + Math.random() * 0.55
  cancelAnimationFrame(frame)
  const tick = () => {
    voice.level += (target - voice.level) * (target > voice.level ? 0.5 : 0.15)
    target *= 0.9 // each word dies away until the next
    if (voice.level > 0.005 || target > 0.005) frame = requestAnimationFrame(tick)
  }
  tick()
}

export function stopLevel() {
  cancelAnimationFrame(frame)
  ctx?.close().catch(() => {})
  ctx = null
  target = 0
  voice.level = 0
}
