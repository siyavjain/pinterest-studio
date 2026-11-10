import { useLayoutEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import NavBar from './components/NavBar'
import Home from './screens/Home'
import Extract from './screens/Extract'
import Loading from './screens/Loading'
import Board from './screens/Board'
import Library from './screens/Library'
import { setFit } from './components/fit'
import WebNav from './components/WebNav'
import { ViewContext, WIDE, saveView, savedView } from './components/view'
import type { View } from './components/view'

export type Screen = 'home' | 'extract' | 'loading' | 'board' | 'library'

// the phone in its frame, and the breathing room kept around it
const DEVICE = { w: 402 + 24, h: 874 + 24 }
const MARGIN = 40

/** Scale the phone down (never up) so the whole frame fits the window with a margin. */
const measure = () =>
  innerWidth <= 500 ? 1 : Math.min(1, (innerWidth - MARGIN * 2) / DEVICE.w, (innerHeight - MARGIN * 2) / DEVICE.h)

/** The window's fit for the phone, and whether it's wide enough for the web layout. */
function useWindow() {
  const [w, setW] = useState(() => ({ k: measure(), wide: innerWidth >= WIDE }))
  useLayoutEffect(() => {
    const onResize = () => setW({ k: measure(), wide: innerWidth >= WIDE })
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  }, [])
  return w
}

const fade = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -24 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
}
// into the extract screen: it's there at once and its pins pour in over home as home fades
const pour = { ...fade, initial: { opacity: 1, y: 0 } }

export default function App() {
  // ?screen=board jumps straight to a screen while designing
  const [screen, setScreen] = useState<Screen>(
    () => (new URLSearchParams(location.search).get('screen') as Screen) || 'home',
  )
  // the app opens on the first-time carousel; after that the Studio tab is your project library
  const studio = () => setScreen('library')
  const [openDirection, setOpenDirection] = useState(false) // open the board straight onto its direction card
  const [fresh, setFresh] = useState(false) // the board was just made from the extract flow

  const win = useWindow()
  const [picked, setPicked] = useState<View | null>(savedView)
  const view: View = win.wide ? picked ?? 'web' : 'phone'
  const pick = (v: View) => {
    saveView(v)
    setPicked(v)
  }
  // drags divide by the phone's scale; the web layout is never scaled
  const fit = view === 'web' ? 1 : win.k
  setFit(fit)

  const openProject = (direction?: boolean) => {
    setOpenDirection(!!direction)
    setFresh(false)
    setScreen('board')
  }

  // the web is just the board, full window
  if (view === 'web')
    return (
      <ViewContext.Provider value="web">
        <div className="web-app">
          <WebNav onPhone={() => pick('phone')} />
          <main className="web-main">
            <Board onBack={studio} />
            {/* side panels open over the board's own buttons */}
            <div id="overlay" style={{ position: 'absolute', inset: 0, zIndex: 70, pointerEvents: 'none' }} />
          </main>
        </div>
      </ViewContext.Provider>
    )

  return (
    <ViewContext.Provider value="phone">
    <div className="stage">
      {win.wide && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => pick('web')}
          style={{ position: 'fixed', top: 20, right: 20, height: 40, padding: '0 16px', borderRadius: 999, background: 'var(--bg-inverse)', color: 'var(--bg-canvas)', fontSize: 14, zIndex: 10 }}
        >
          Switch to web
        </motion.button>
      )}
      {/* the box takes the scaled size so the page never scrolls; the device scales inside it */}
      <div className="fit" style={{ width: DEVICE.w * fit, height: DEVICE.h * fit }}>
      <div className="device" style={{ transform: `scale(${fit})` }}>
      <div className="phone">
        <AnimatePresence mode={screen === 'extract' ? 'sync' : 'wait'}>
          <motion.div key={screen} className="screen" {...(screen === 'extract' ? pour : fade)}>
            {screen === 'home' && <Home onTake={() => setScreen('extract')} />}
            {screen === 'extract' && (
              <Extract onBack={() => setScreen('home')} onExtract={() => setScreen('loading')} />
            )}
            {screen === 'loading' && <Loading onDone={() => { setFresh(true); setScreen('board') }} />}
            {screen === 'board' && <Board onBack={studio} openDirection={openDirection} fresh={fresh} />}
            {screen === 'library' && <Library onOpen={(_, direction) => openProject(direction)} onNew={() => setScreen('home')} />}
          </motion.div>
        </AnimatePresence>
        <NavBar active="studio" brand={screen !== 'library'} onHome={() => setScreen('home')} onStudio={studio} />
        <div id="overlay" style={{ position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none' }} />
        <div className="chrome" aria-hidden>
          <div className="status">
            <span>9:41</span>
            <StatusIcons />
          </div>
          <div className="island" />
          <div className="home-bar" />
        </div>
      </div>
      </div>
      </div>
    </div>
    </ViewContext.Provider>
  )
}

/** Signal, Wi-Fi and battery, drawn to sit beside the Dynamic Island */
function StatusIcons() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
        <rect x="0" y="8" width="3" height="4" rx="1" />
        <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
        <rect x="10" y="3" width="3" height="9" rx="1" />
        <rect x="15" y="0" width="3" height="12" rx="1" />
      </svg>
      <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
        <path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.2-1.3A10.2 10.2 0 0 0 8 .8C5.2.8 2.7 1.9.8 3.7L2 5c1.6-1.5 3.7-2.4 6-2.4Z" />
        <path d="M8 6.2c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.7 6.7 0 0 0 8 4.4c-1.8 0-3.4.7-4.6 1.8l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3Z" />
        <path d="M8 9.6 10 7.6a2.9 2.9 0 0 0-4 0l2 2Z" transform="translate(0 1.4)" />
      </svg>
      <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
        <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke="currentColor" opacity=".35" />
        <rect x="2" y="2" width="20" height="9" rx="2.5" fill="currentColor" />
        <path d="M25 4.5v4a2.2 2.2 0 0 0 0-4Z" fill="currentColor" opacity=".4" />
      </svg>
    </span>
  )
}
