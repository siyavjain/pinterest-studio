import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import NavBar from './components/NavBar'
import Home from './screens/Home'
import Extract from './screens/Extract'
import Loading from './screens/Loading'
import Board from './screens/Board'

export type Screen = 'home' | 'extract' | 'loading' | 'board'

const fade = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -24 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
}

export default function App() {
  // ?screen=board jumps straight to a screen while designing
  const [screen, setScreen] = useState<Screen>(
    () => (new URLSearchParams(location.search).get('screen') as Screen) || 'home',
  )

  return (
    <div className="stage">
      <div className="phone">
        <AnimatePresence mode="wait">
          <motion.div key={screen} className="screen" {...fade}>
            {screen === 'home' && <Home onTake={() => setScreen('extract')} />}
            {screen === 'extract' && (
              <Extract onBack={() => setScreen('home')} onExtract={() => setScreen('loading')} />
            )}
            {screen === 'loading' && <Loading onDone={() => setScreen('board')} />}
            {screen === 'board' && <Board onBack={() => setScreen('home')} />}
          </motion.div>
        </AnimatePresence>
        <NavBar active="studio" onHome={() => setScreen('home')} />
        <div id="overlay" style={{ position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none' }} />
      </div>
    </div>
  )
}
