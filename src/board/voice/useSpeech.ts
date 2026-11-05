import { useRef, useState } from 'react'

// Minimal typing for the Web Speech API (Chrome / Safari)
type Recognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

const Ctor: RecognitionCtor | undefined =
  (window as unknown as { SpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition

/** A saved clip of what was said, for playing back a voice note. */
export type Recording = { url: string; seconds: number }

/**
 * Hold-to-talk transcription. Uses the browser's speech recognition when it's
 * available and allowed; otherwise it "hears" a suggested phrase word by word,
 * so the prototype still demos without a microphone.
 */
export function useSpeech() {
  const [transcript, setTranscript] = useState('')
  const [heard, setHeard] = useState(false) // has any speech come in yet
  const rec = useRef<Recognition | null>(null)
  const sim = useRef<ReturnType<typeof setInterval> | null>(null)
  const text = useRef('')
  const blocked = useRef(!Ctor)

  // the actual sound, recorded alongside the words so notes can be played back
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const startedAt = useRef(0)
  const holding = useRef(false) // the mic permission can arrive after the hold has ended

  const record = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!holding.current) return stream.getTracks().forEach((t) => t.stop()) // let go already: release the mic
      const m = new MediaRecorder(stream)
      chunks.current = []
      m.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      m.start()
      startedAt.current = performance.now()
      recorder.current = m
    } catch {
      /* no microphone: notes fall back to being read aloud */
    }
  }

  const finishRecording = (keep: boolean): Promise<Recording | undefined> => {
    holding.current = false
    const m = recorder.current
    recorder.current = null
    if (!m) return Promise.resolve(undefined)
    const seconds = Math.max(1, Math.round((performance.now() - startedAt.current) / 1000))
    return new Promise((resolve) => {
      m.onstop = () => {
        m.stream.getTracks().forEach((t) => t.stop())
        resolve(keep && chunks.current.length ? { url: URL.createObjectURL(new Blob(chunks.current, { type: m.mimeType })), seconds } : undefined)
      }
      m.stop()
    })
  }

  const simulate = (phrase: string) => {
    const words = phrase.split(' ')
    let n = 0
    sim.current = setInterval(() => {
      n = Math.min(n + 1, words.length)
      text.current = words.slice(0, n).join(' ')
      setTranscript(text.current)
      setHeard(true)
      if (n === words.length && sim.current) clearInterval(sim.current)
    }, 190)
  }

  const start = (fallbackPhrase: string) => {
    text.current = ''
    setTranscript('')
    setHeard(false)
    holding.current = true
    record()
    if (blocked.current || !Ctor) return simulate(fallbackPhrase)
    try {
      const r = new Ctor()
      r.continuous = true
      r.interimResults = true
      r.lang = 'en-US'
      r.onresult = (e) => {
        text.current = Array.from(e.results).map((res) => res[0].transcript).join(' ').trim()
        setTranscript(text.current)
        if (text.current) setHeard(true)
      }
      r.onerror = (e) => {
        // no mic permission or no service: fall back to the demo voice from now on
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'network') {
          blocked.current = true
          simulate(fallbackPhrase)
        }
      }
      rec.current = r
      r.start()
    } catch {
      blocked.current = true
      simulate(fallbackPhrase)
    }
  }

  /** Stop listening; resolves with what was said (may be empty) and the recording, if any. */
  const stop = async (): Promise<{ text: string; audio?: Recording }> => {
    if (sim.current) clearInterval(sim.current)
    const audio = finishRecording(true)
    const r = rec.current
    rec.current = null
    if (r)
      await new Promise<void>((resolve) => {
        r.onend = () => resolve()
        setTimeout(resolve, 700) // don't wait forever for the final result
        r.stop()
      })
    return { text: text.current, audio: await audio }
  }

  const cancel = () => {
    if (sim.current) clearInterval(sim.current)
    rec.current?.abort()
    rec.current = null
    finishRecording(false)
    text.current = ''
    setTranscript('')
    setHeard(false)
  }

  return { transcript, heard, start, stop, cancel, live: !blocked.current }
}
