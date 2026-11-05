import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DotsIcon, MicIcon, StopIcon } from '../components/Icons'
import { Pill } from '../components/Button'
import Squiggle from './Squiggle'

export type Command = 'group' | 'similar' | 'merge' | 'note'

const SPOKEN: Record<Command, string> = {
  group: 'Group the purple pieces together',
  similar: 'Find more textures like the flower',
  merge: 'Merge the flower with the purple cap',
  note: 'Add a note, love the grain on this flower',
}
const WORKING: Record<Command, string> = {
  group: 'Grouping 2 pieces…',
  similar: 'Looking for similar pins…',
  merge: 'Merging flower × cap…',
  note: 'Pinning your note…',
}
const DONE: Record<Command, string> = {
  group: 'Grouped 2 pieces into “Purple pop”',
  similar: 'Found 12 more like the flower',
  merge: 'Merged flower × cap',
  note: 'Added a voice note to the flower',
}
const HINTS: { label: string; cmd: Command }[] = [
  { label: 'Find similar', cmd: 'similar' },
  { label: 'Make a group', cmd: 'group' },
  { label: 'Merge', cmd: 'merge' },
  { label: 'Add note', cmd: 'note' },
]

type Phase = 'idle' | 'listening' | 'thinking' | 'done'
const ease = [0.22, 1, 0.36, 1] as const

export default function VoiceAssistant({ onCommand, onUndo }: { onCommand: (c: Command) => void; onUndo: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [cmd, setCmd] = useState<Command>('group')
  const [words, setWords] = useState(0)

  // live transcript, word by word
  useEffect(() => {
    if (phase !== 'listening') return
    setWords(0)
    const total = SPOKEN[cmd].split(' ').length
    const id = setInterval(() => setWords((w) => (w >= total ? w : w + 1)), 220)
    return () => clearInterval(id)
  }, [phase, cmd])

  useEffect(() => {
    if (phase === 'thinking') {
      const t = setTimeout(() => {
        onCommand(cmd)
        setPhase('done')
      }, 1200)
      return () => clearTimeout(t)
    }
    if (phase === 'done') {
      const t = setTimeout(() => setPhase('idle'), 2400)
      return () => clearTimeout(t)
    }
  }, [phase, cmd, onCommand])

  const listening = phase === 'listening'
  const pill = phase === 'thinking' || phase === 'done'
  const panel = listening
    ? { left: 8, top: 0, width: 386, height: 292, borderRadius: 28 }
    : pill
      ? { left: 8, top: 228, width: 386, height: 64, borderRadius: 32 }
      : { left: 342, top: 236, width: 56, height: 56, borderRadius: 28 }

  return (
    <div style={{ position: 'absolute', left: 0, top: 464, width: 402, height: 300, pointerEvents: 'none', zIndex: 35 }}>
      <motion.div
        initial={false}
        animate={{ ...panel, opacity: phase === 'idle' ? 0 : 1 }}
        transition={{ duration: 0.55, ease }}
        style={{
          position: 'absolute',
          background: 'var(--bg-canvas)',
          boxShadow: '0 10px 30px rgba(0,0,0,.12)',
          overflow: 'hidden',
          pointerEvents: phase === 'idle' ? 'none' : 'auto',
        }}
      >
        <AnimatePresence mode="popLayout">
          {listening && (
            <motion.div key="listen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div className="t-body" style={{ position: 'absolute', left: 20, top: 20 }}>Listening…</div>
              <div style={{ position: 'absolute', left: 20, top: 48, width: 346, fontSize: 20, fontWeight: 600, lineHeight: '26px' }}>
                {SPOKEN[cmd].split(' ').map((w, i) => (
                  <motion.span key={cmd + i} animate={{ opacity: i < words ? 1 : 0.18 }} transition={{ duration: 0.2 }}>
                    {w}{' '}
                  </motion.span>
                ))}
              </div>
              <div style={{ position: 'absolute', left: 0, top: 136 }}>
                <Squiggle height={48} />
              </div>
              <div style={{ position: 'absolute', left: 20, top: 240, width: 290, display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', maskImage: 'linear-gradient(to right, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent)' }}>
                {HINTS.map((h) => (
                  <Pill key={h.cmd} label={h.label} selected={h.cmd === cmd} onClick={() => setCmd(h.cmd)} />
                ))}
              </div>
            </motion.div>
          )}
          {pill && (
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              style={{ position: 'absolute', left: 20, right: 12, top: 0, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span style={{ fontSize: 14, fontWeight: phase === 'done' ? 600 : 400, color: phase === 'done' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {phase === 'done' ? DONE[cmd] : WORKING[cmd]}
              </span>
              {phase === 'done' && (
                <Pill
                  label="Undo"
                  onClick={() => {
                    onUndo()
                    setPhase('idle')
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* the orb: mic → stop → thinking */}
      <motion.button
        aria-label={listening ? 'Stop listening' : 'Talk to Studio'}
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          if (phase === 'idle' || phase === 'done') setPhase('listening')
          else if (phase === 'listening') setPhase('thinking')
        }}
        initial={false}
        animate={
          listening
            ? { left: 322, top: 220, width: 56, height: 56, opacity: 1 }
            : pill
              ? { left: 330, top: 236, width: 48, height: 48, opacity: phase === 'done' ? 0 : 1 }
              : { left: 342, top: 236, width: 56, height: 56, opacity: 1 }
        }
        transition={{ duration: 0.55, ease }}
        style={{
          position: 'absolute',
          borderRadius: 999,
          background: 'var(--red-700)',
          color: 'var(--bg-canvas)',
          display: 'grid',
          placeItems: 'center',
          pointerEvents: phase === 'done' ? 'none' : 'auto',
          boxShadow: '0 8px 20px rgba(173,0,26,.3)',
        }}
      >
        {listening && (
          <motion.span
            style={{ position: 'absolute', inset: -6, borderRadius: 999, background: 'var(--red-700)', opacity: 0.2 }}
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {phase === 'idle' && <MicIcon />}
        {listening && <StopIcon />}
        {phase === 'thinking' && (
          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}>
            <DotsIcon />
          </motion.span>
        )}
      </motion.button>
    </div>
  )
}
