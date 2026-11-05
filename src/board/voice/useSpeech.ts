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

  /** Stop listening and resolve with whatever was said (may be empty). */
  const stop = (): Promise<string> => {
    if (sim.current) clearInterval(sim.current)
    const r = rec.current
    rec.current = null
    if (!r) return Promise.resolve(text.current)
    return new Promise((resolve) => {
      const done = () => resolve(text.current)
      r.onend = done
      setTimeout(done, 700) // don't wait forever for the final result
      r.stop()
    })
  }

  const cancel = () => {
    if (sim.current) clearInterval(sim.current)
    rec.current?.abort()
    rec.current = null
    text.current = ''
    setTranscript('')
    setHeard(false)
  }

  return { transcript, heard, start, stop, cancel, live: !blocked.current }
}
