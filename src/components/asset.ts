/** URL for an image by name. Home screen images live in /home/assets, the rest in /img. */
export function asset(name: string) {
  return /^p\d-/.test(name) ? `/home/assets/${name}.png` : `/img/${name}.png`
}
