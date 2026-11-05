// What Studio pulls out of a post added from Explore: shaped crops of the
// interesting bits, plus its colours. Boxes are fractions of the image (x, y, w, h).

export type Shape = 'soft' | 'round' | 'arch' | 'cut' // cut: already a transparent cut-out
export type Ingredient =
  | { kind: 'crop'; label: string; box: [number, number, number, number]; shape: Shape }
  | { kind: 'colour'; label: string; colour: string }

export const POST_ASPECT = 0.703 // every Explore post is roughly 364 × 517

export const INGREDIENTS: Record<string, Ingredient[]> = {}

export const RADIUS: Record<Shape, string> = { soft: '18px', round: '50%', arch: '999px 999px 18px 18px', cut: '0' }

/* -------- finds: real posts with a cut-out version, in /img/finds -------- */

export type Find = {
  id: string
  label: string
  photo: string // the post as pinned
  cut: string // the same image with the background removed
  cutSize: [number, number] // cut-out file size in px
  box: [number, number, number, number] // where the visible cut-out sits in that file
  photoAspect: number
  colours: string[]
  shape?: Shape // 'cut' (default) for a transparent cut-out; a sticker shape when it's a crop of the photo
}

const find = (id: string, label: string, cut: string, cutSize: [number, number], box: Find['box'], photoAspect: number, colours: string[]): Find => ({
  id, label, photo: `finds/${id}.jpg`, cut: `finds/${cut}.png`, cutSize, box, photoAspect, colours,
})

export const FINDS: Record<string, Find> = {
  // cleaned copies of these two: the originals came with a flat background
  poppy: find('poppy', 'poppy', 'poppy-clean', [540, 882], [0, 0.286, 0.778, 0.714], 0.667, ['#d8342a', '#8fb4d9', '#6f8a3a']),
  peony: find('peony', 'peony', 'peony-clean', [579, 825], [0.005, 0.167, 0.718, 0.829], 0.753, ['#e59a72', '#f4d9cf', '#4a5a35']),
  wanderlust: find('wanderlust', 'wanderlust leaves', 'wanderlust-cut', [569, 848], [0.035, 0.081, 0.817, 0.864], 0.708, ['#f08fae', '#2f5a33', '#c9d6dc']),
  gardener: find('gardener', 'gardener bouquet', 'gardener-cut', [1200, 1799], [0.044, 0.051, 0.956, 0.949], 0.667, ['#ef8b9d', '#e7ddd0', '#5f7a3a']),
  traffic: find('traffic', 'fruit lights', 'traffic-cut', [736, 1308], [0, 0.123, 0.766, 0.877], 0.563, ['#d93a2c', '#e3c95a', '#4f8a3a']),
  phone: find('phone', 'phone bouquet', 'phone-cut', [816, 1456], [0, 0.326, 0.762, 0.636], 0.56, ['#f2c12e', '#d73a2a', '#cfd8de']),
  bags: find('bags', 'paper bag flowers', 'bags-cut', [1000, 1500], [0.026, 0.272, 0.848, 0.626], 0.667, ['#f07a3a', '#f06aa8', '#9cc4ec']),
  tulip: find('tulip', 'tulip pin', 'tulip-cut', [577, 888], [0.113, 0.413, 0.766, 0.464], 0.849, ['#b58ee6', '#7aa04a', '#e8e8ea']),
}
// pins from the "ads nature" search. Three have clean backgrounds and were cut out;
// the rest become a shaped sticker of their best part.
const pin = (id: string, label: string, size: [number, number], box: Find['box'], colours: string[], crop?: Shape): Find => ({
  id, label, photo: `finds/pin-${id}.jpg`, cut: crop ? `finds/pin-${id}.jpg` : `finds/pin-${id}-cut.png`,
  cutSize: size, box, photoAspect: size[0] / size[1], colours, shape: crop,
})

export const PINS: Record<string, Find> = {
  'be-with-nature': pin('be-with-nature', 'nature road', [736, 1104], [0.113, 0.121, 0.769, 0.877], ['#5a8bc7', '#4f7a2e', '#efe7d8']),
  'touch-grass': pin('touch-grass', 'touch some grass', [736, 905], [0.003, 0.009, 0.995, 0.989], ['#b3b85a', '#5d7a3a', '#e9e3d2']),
  'tree-hand': pin('tree-hand', 'tree hand', [675, 900], [0.003, 0.002, 0.994, 0.944], ['#4d6b2d', '#8a6a4a', '#1a1a1a']),
  carrots: pin('carrots', 'carrots', [736, 914], [0.05, 0.33, 0.87, 0.6], ['#e8792f', '#6e4a33', '#8fc3ee'], 'soft'),
  lamb: pin('lamb', 'lamb poster', [736, 920], [0.12, 0.12, 0.73, 0.87], ['#f0e6cf', '#7a9a3a', '#3f4a2a'], 'soft'),
  'head-hill': pin('head-hill', 'head hill', [620, 877], [0, 0.4, 1, 0.6], ['#9cc4e4', '#e3b8a0', '#5a7a3a'], 'arch'),
  'take-a-sit': pin('take-a-sit', 'take a sit', [736, 920], [0.2, 0.36, 0.44, 0.42], ['#6f9a3a', '#c9d9c0', '#2a2a20'], 'soft'),
  'let-nature-in': pin('let-nature-in', 'forest tear', [600, 849], [0, 0.33, 0.86, 0.28], ['#3aa45a', '#e6e6e6', '#4a6a3a'], 'soft'),
}
Object.assign(FINDS, PINS)

export const findByPhoto = (photo: string) => Object.values(FINDS).find((f) => f.photo === photo)

/** width ÷ height of a find's visible cut-out */
export const cutAspect = (f: Find) => (f.box[2] * f.cutSize[0]) / (f.box[3] * f.cutSize[1])
