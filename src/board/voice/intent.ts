// Turns what someone said into an action on the board.
// "these" / "this" always mean the current selection.

export type Intent =
  | { kind: 'merge' }
  | { kind: 'group'; name?: string }
  | { kind: 'groupByColour' }
  | { kind: 'note'; text: string }
  | { kind: 'similar' }
  | { kind: 'colours' }
  | { kind: 'share' }
  | { kind: 'delete' }
  | { kind: 'unclear' }

export type Suggestion = { label: string; phrase: string }

/** What each piece is called when Studio talks about it, and its main colour. */
export const PIECES: Record<string, { label: string; colour: 'green' | 'pink' | 'purple' | 'neutral' }> = {
  'board-meadow': { label: 'meadow', colour: 'green' },
  'board-ribbon': { label: 'ribbon', colour: 'pink' },
  'board-scary': { label: 'lime type', colour: 'green' },
  'board-hand': { label: 'hand', colour: 'neutral' },
  'board-cap': { label: 'purple cap', colour: 'purple' },
  'board-flower': { label: 'flower', colour: 'pink' },
  'board-blob': { label: 'gradient pill', colour: 'pink' },
  'board-gradient': { label: 'swirl', colour: 'purple' },
  'board-bloom': { label: 'bloom', colour: 'green' },
  'board-hill': { label: 'hill', colour: 'green' },
  'ws-14': { label: 'bouquet', colour: 'neutral' },
}
export const labelOf = (src: string) => PIECES[src]?.label ?? 'piece'

export const COLOUR_GROUPS: Record<string, string> = {
  green: 'Fresh greens',
  pink: 'Warm pinks',
  purple: 'Purple pop',
  neutral: 'Soft neutrals',
}

/** The 2–3 suggestions shown beside the mic, by what's selected. */
export function suggestionsFor(count: number): Suggestion[] {
  if (count === 0)
    return [
      { label: 'More inspiration', phrase: 'Find more inspiration for this board' },
      { label: 'Group by colour', phrase: 'Group everything by colour' },
    ]
  if (count === 1)
    return [
      { label: 'More like this', phrase: 'Find more like this' },
      { label: 'Add a note', phrase: 'Add a note, love the texture on this' },
      { label: 'Pull colours', phrase: 'Pull the colours from this' },
    ]
  return [
    { label: 'Merge', phrase: 'Merge these together' },
    { label: 'Group', phrase: 'Group these' },
    { label: 'What do they share?', phrase: 'What do these have in common?' },
  ]
}

// Commands start with a doing word ("merge…", "find…", "can you group…").
// Anything else ("love the texture on this") is a thought, so it's offered as a note.
const POLITE = /^(hey studio[,]?\s+|please\s+|can you\s+|could you\s+|let'?s\s+|i want to\s+|i'?d like to\s+)+/
const VERBS = /^(delete|remove|bin|trash|merge|combine|blend|mix|mash|group|cluster|organi[sz]e|sort|put|add|note|remember|comment|remind|pull|extract|show|find|search|explore|get|give|what|which|how)\b/

export function parse(raw: string): Intent {
  const t = raw.toLowerCase().trim()
  const lead = t.replace(POLITE, '')
  if (!VERBS.test(lead)) return { kind: 'unclear' }
  // only when it leads, so "add a note: remove the background" stays a note
  if (/^(delete|remove|bin|trash|get rid)\b/.test(lead)) return { kind: 'delete' }
  if (/\b(merge|combine|blend|mix|mash)\b/.test(t)) return { kind: 'merge' }
  if (/\b(group|cluster|organi[sz]e|sort)\b|put .* together/.test(t)) {
    if (/colou?r/.test(t)) return { kind: 'groupByColour' }
    const named = t.match(/\b(?:as|called|named|into)\s+["“']?([a-z0-9 ]{2,24})/)
    return { kind: 'group', name: named ? titleCase(named[1].trim()) : undefined }
  }
  if (/\b(note|remember|comment|remind)\b/.test(t)) {
    const text = raw.replace(/^.*?\b(note|remember|comment|remind me)\b[:,]?\s*(that\s+)?/i, '').trim()
    return { kind: 'note', text: text ? capitalise(text) : 'Voice note' }
  }
  if (/\b(colou?rs?|palette|ingredients?|textures?)\b/.test(t)) return { kind: 'colours' }
  if (/\b(share|common|alike|similar about)\b/.test(t)) return { kind: 'share' }
  if (/\b(similar|more like|explore|find|inspiration|search|show me)\b/.test(t)) return { kind: 'similar' }
  return { kind: 'unclear' }
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Actions that rearrange the board get a preview first. */
export const needsConfirm = (i: Intent) => i.kind === 'group' || i.kind === 'groupByColour' || i.kind === 'delete'
