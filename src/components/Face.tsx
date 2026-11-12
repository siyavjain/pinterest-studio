import { asset } from './asset'

// Teammates' profile pictures in /img: a round photo with the name set under it (56×76),
// so only the top 56×56 circle is shown. "You" is the signed-in avatar.
const TEAM = ['Maya', 'Jules', 'Ren', 'Ari']

/** A person's round profile picture, or nothing if they don't have one. */
export default function Face({ who, size, ring }: { who: string; size: number; ring?: string }) {
  const you = who === 'You'
  if (!you && !TEAM.includes(who)) return null
  return (
    <span
      role="img"
      aria-label={who}
      style={{
        width: size, height: size, borderRadius: 999, flexShrink: 0, display: 'block', boxSizing: 'border-box',
        backgroundImage: `url(${asset(you ? 'p3-avatar' : who)})`,
        // the labelled files are as wide as their circle: fit the width, keep the top
        backgroundSize: you ? 'cover' : `${size}px auto`,
        backgroundPosition: you ? 'center' : 'top center',
        backgroundRepeat: 'no-repeat',
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
    />
  )
}
