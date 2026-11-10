// The new pins and the cut-out Studio extracts from each: the photo is what you see in a
// suggestion or in More like this; adding it puts the cut-out on the board. [cut-out, w, h]
export const CUT_OF: Record<string, { src: string; aspect: number }> = Object.fromEntries(
  ([
    ['image 47', 'image 64', 1080, 1346], // green gown on the shore
    ['image 48', 'image 65', 928, 1232], // fabric in the wind
    ['image 49', 'image 66', 1454, 1818], // white crinkled sleeves
    ['image 51', 'image 67', 1002, 1440], // face in the sky
    ['image 53', 'image 69', 928, 1232], // a leaf across a face
    ['image 54', 'image 70', 736, 909], // pale leaf
    ['image 55', 'image 71', 1080, 1350], // calla leaves
    ['image 57', 'image 73', 715, 1430], // green glass drop
    ['image 59', 'image 75', 1000, 1500], // limes and blossom
    ['image 60', 'image 76', 1440, 1440], // white flower
    ['image 61', 'image 77', 1080, 1350], // lime leaves
    ['image 62', 'image 78', 736, 1104], // stacked olives
  ] as const).map(([photo, src, w, h]) => [photo, { src, aspect: w / h }]),
)

/** What goes on the board for a pin: its cut-out when Studio has one, otherwise the pin itself. */
export const pieceFor = (photo: string, aspect: number) => CUT_OF[photo] ?? { src: photo, aspect }
