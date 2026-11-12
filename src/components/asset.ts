/** URL for an image by name. Home screen images live in /home/assets, the rest in /img.
 *  A name with its own extension ("finds/poppy.jpg") is used as given, and a full URL
 *  (a photo picked from the device) is passed straight through. */
export function asset(name: string) {
  if (/^(blob:|data:|https?:)/.test(name)) return name
  // BASE_URL is "/" in dev and the hosting subpath in the shared build
  const base = import.meta.env.BASE_URL
  if (/\.\w+$/.test(name)) return `${base}img/${name}`
  return /^p\d-/.test(name) ? `${base}home/assets/${name}.png` : `${base}img/${name}.png`
}
