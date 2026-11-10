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
  | { kind: 'direction' }
  | { kind: 'delete' }
  | { kind: 'unclear' }

export type Suggestion = { label: string; phrase: string }

/** What each piece is called when Studio talks about it, and its main colour. */
export const PIECES: Record<string, { label: string; colour: 'green' | 'pink' | 'purple' | 'neutral' }> = {
  'image 34': { label: 'leaf portrait', colour: 'green' },
  'image 35': { label: 'sky leaves', colour: 'green' },
  'image 36': { label: 'hanging leaves', colour: 'neutral' },
  'image 37': { label: 'veil', colour: 'neutral' },
  'image 38': { label: 'palm', colour: 'green' },
  'image 39': { label: 'ivy window', colour: 'green' },
  'image 40': { label: 'portrait', colour: 'neutral' },
  'image 41': { label: 'big leaf', colour: 'green' },
  'image 42': { label: 'dry leaf', colour: 'green' },
  'image 44': { label: 'light face', colour: 'neutral' },
  'image 45': { label: 'water face', colour: 'neutral' },
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
      { label: 'Concept card', phrase: 'Make a concept card for this board' },
    ]
  if (count === 1)
    return [
      { label: 'Add more', phrase: 'Find more like this' },
      { label: 'Add a note', phrase: 'Add a note, love the texture on this' },
      { label: 'Colour & material', phrase: 'Show the colours and materials in this' },
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
const VERBS = /^(delete|remove|bin|trash|merge|combine|blend|mix|mash|group|cluster|organi[sz]e|sort|put|add|note|remember|comment|remind|pull|extract|show|find|search|explore|get|give|what|which|how|make|create|summari[sz]e|wrap|done|finish)\b/

export function parse(raw: string): Intent {
  const t = raw.toLowerCase().trim()
  const lead = t.replace(POLITE, '')
  // describing a picture to be made ("I want a girl with…", "make an image of…") is a merge with a prompt
  if (/^(i want|i'?d like|generate|imagine)\b/.test(lead) || (/^(make|create)\b/.test(lead) && /\b(a|an|image|picture|photo)\b/.test(lead)))
    if (!/\b(note|comment|group|frame|direction|concept)\b/.test(lead)) return { kind: 'merge' }
  if (!VERBS.test(lead)) return { kind: 'unclear' }
  // only when it leads, so "add a note: remove the background" stays a note
  if (/^(delete|remove|bin|trash|get rid)\b/.test(lead)) return { kind: 'delete' }
  if (/\b(concept|direction|summar|wrap (it )?up|done|finish)/.test(t)) return { kind: 'direction' } // the concept card
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
  if (/\b(colou?rs?|palette|ingredients?|textures?|materials?|finish(es)?|cmf)\b/.test(t)) return { kind: 'colours' }
  if (/\b(share|common|alike|similar about)\b/.test(t)) return { kind: 'share' }
  if (/\b(similar|more like|explore|find|inspiration|search|show me)\b/.test(t)) return { kind: 'similar' }
  return { kind: 'unclear' }
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Actions that rearrange the board get a preview first. */
export const needsConfirm = (i: Intent) => i.kind === 'group' || i.kind === 'groupByColour' || i.kind === 'delete'
