import type { Reply } from './VoiceNote'

// Notes are shared between the phone and the web: kept in this browser, so a voice note
// recorded on the phone is waiting on the web board (and the other way round).
// Recordings don't travel; a carried-over voice note is read aloud from its words.

export type StoredNote = {
  id: string; x: number; y: number; text: string
  author?: string
  kind?: 'voice' | 'text'
  on?: string // the piece it was left on, so each layout can place it beside that piece
  fromVoice?: boolean // a text note that started as a voice note
  replies: Reply[]
  teammates: number
}

const KEY = 'studio-notes'

export const loadNotes = (): StoredNote[] | null => {
  try {
    const raw = localStorage.getItem(KEY)
    // drop the sample notes an earlier version started the web board with: only real notes carry over
    return raw ? (JSON.parse(raw) as StoredNote[]).filter((n) => !n.id.startsWith('phone-')) : null
  } catch {
    return null
  }
}

export const saveNotes = (notes: StoredNote[]) => {
  try {
    const plain = notes.map(({ id, x, y, text, author, kind, on, fromVoice, replies, teammates }) => ({
      id, x, y, text, author, kind, on, fromVoice, teammates,
      replies: replies.map(({ id, author, text }) => ({ id, author, text })),
    }))
    localStorage.setItem(KEY, JSON.stringify(plain))
  } catch {
    // storage blocked: notes last this visit
  }
}
