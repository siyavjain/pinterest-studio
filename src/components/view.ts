import { createContext, useContext } from 'react'

// Phone: the app in its device frame. Web: the same app laid out for a desktop browser.
export type View = 'phone' | 'web'
export const ViewContext = createContext<View>('phone')
export const useWeb = () => useContext(ViewContext) === 'web'

/** Wide windows open on the web layout unless the viewer picked the phone; phones always get the phone. */
export const WIDE = 900
const KEY = 'studio-view'
export const savedView = (): View | null => {
  // a shared link can name its view (?view=phone or ?view=web), and that wins
  const asked = new URLSearchParams(location.search).get('view')
  if (asked === 'phone' || asked === 'web') return asked
  try {
    return localStorage.getItem(KEY) as View | null
  } catch {
    return null
  }
}
export const saveView = (v: View) => {
  try {
    localStorage.setItem(KEY, v)
  } catch {
    // storage blocked: the choice lasts this visit
  }
}
