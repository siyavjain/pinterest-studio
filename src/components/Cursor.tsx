import { useEffect, useRef } from 'react'

// The pointer, drawn as a see-through red dot so it reads clearly in recordings and on a projector
// without hiding what's under it.
// Only on mouse and trackpad: a phone on touch keeps its own behaviour. While it's mounted the
// system cursor is hidden (the red-cursor class in index.css).

const SIZE = 22

export default function Cursor() {
  const pos = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches) return
    const el = pos.current!
    const root = document.documentElement
    root.classList.add('red-cursor') // hides the system cursor (index.css)
    let shown = false
    // the position follows the pointer exactly; only the press squeeze is eased
    const move = (e: PointerEvent) => {
      el.style.transform = `translate(${e.clientX - SIZE / 2}px, ${e.clientY - SIZE / 2}px)`
      if (!shown) el.style.opacity = '1'
      shown = true
    }
    const press = () => (dot.current!.style.transform = 'scale(0.78)')
    const release = () => (dot.current!.style.transform = 'scale(1)')
    const leave = () => { el.style.opacity = '0'; shown = false }
    // a native image drag or text selection brings the system arrow back mid-drag (Safari
    // especially), so neither may start outside a field you're typing in
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    const noNative = (e: Event) => { if (!typing(e.target)) e.preventDefault() }
    addEventListener('pointermove', move)
    addEventListener('pointerdown', press)
    addEventListener('pointerup', release)
    addEventListener('dragstart', noNative, true)
    addEventListener('selectstart', noNative, true)
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      root.classList.remove('red-cursor')
      removeEventListener('pointermove', move)
      removeEventListener('pointerdown', press)
      removeEventListener('pointerup', release)
      removeEventListener('dragstart', noNative, true)
      removeEventListener('selectstart', noNative, true)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <div
      ref={pos}
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0, width: SIZE, height: SIZE, pointerEvents: 'none',
        zIndex: 2147483647, opacity: 0, transition: 'opacity 0.15s', willChange: 'transform',
      }}
    >
      <div ref={dot} style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(173, 0, 26, 0.45)', transition: 'transform 0.12s var(--ease-out)' }} />
    </div>
  )
}
