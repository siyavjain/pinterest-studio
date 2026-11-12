import { useState } from 'react'
import { motion } from 'framer-motion'
import Sheet from './Sheet'
import { ActionButton, Pill, SHARE_GLYPH } from '../components/Button'
import Face from '../components/Face'
import { DownloadIcon, LinkIcon, MailIcon, MessageIcon, PlusIcon, QrIcon } from '../components/Icons'

const PEOPLE = ['Maya', 'Jules', 'Ren', 'Ari']
const VIA = [
  { label: 'Message', Icon: MessageIcon },
  { label: 'Email', Icon: MailIcon },
  { label: 'QR code', Icon: QrIcon },
  { label: 'Save', Icon: DownloadIcon },
  { label: 'More', Icon: () => <span style={{ fontSize: 20, lineHeight: 1 }}>···</span> },
]

const Circle = ({ children, dashed }: { children?: React.ReactNode; dashed?: boolean }) => (
  <motion.div
    whileTap={{ scale: 0.92 }}
    style={{
      width: 56, height: 56, borderRadius: 999, display: 'grid', placeItems: 'center',
      background: dashed ? 'transparent' : 'var(--bg-default)',
      border: dashed ? '1.5px dashed rgba(95,95,95,.5)' : 'none',
    }}
  >
    {children}
  </motion.div>
)

function Row({ title, items }: { title: string; items: { label: string; node: React.ReactNode; onClick?: () => void }[] }) {
  return (
    <div style={{ padding: '0 12px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {items.map((it) => (
          <button key={it.label} onClick={it.onClick} style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
            {it.node}
            <span className="t-label" style={{ color: 'var(--text-secondary)' }}>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ShareSheet({
  open, onClose, cover, title = 'Organic Forms', subtitle = '14 pins · 3 collaborators', link = 'pin.it/studio/organic-forms',
  note = 'Anyone with the link can view. Collaborators can add pins.', action = 'Share board', onSave, hostId,
}: {
  open: boolean
  onClose: () => void
  cover: string
  title?: string
  subtitle?: string
  link?: string
  note?: string
  action?: string
  onSave?: () => void // the Save tile keeps a copy; once tapped it reads "Saved"
  hostId?: string
}) {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  return (
    <Sheet open={open} onClose={onClose} hostId={hostId}>
      <div style={{ padding: '12px 8px 0', display: 'grid', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 12px' }}>
          <img src={cover} alt="" style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'cover', background: 'var(--bg-default)' }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{title}</div>
            <div className="t-body">{subtitle}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ height: 56, borderRadius: 999, background: 'var(--input-bg)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 0 18px' }}>
            <LinkIcon color="var(--text-secondary)" />
            <span className="t-body" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link}</span>
            <Pill
              label={copied ? 'Link copied' : 'Copy link'}
              selected={copied}
              onClick={() => {
                navigator.clipboard?.writeText(`https://${link}`).catch(() => {})
                setCopied(true)
                setTimeout(() => setCopied(false), 1600)
              }}
            />
          </div>
          <div className="t-label" style={{ color: 'var(--text-secondary)', padding: '0 12px' }}>
            {note}
          </div>
        </div>

        <Row
          title="Send to collaborators"
          items={[
            ...PEOPLE.map((p) => ({ label: p, node: <Circle><Face who={p} size={56} /></Circle> })),
            { label: 'Invite', node: <Circle dashed><PlusIcon /></Circle> },
          ]}
        />
        <Row
          title="Share via"
          items={VIA.map(({ label, Icon }) =>
            label === 'Save' && onSave
              ? { label: saved ? 'Saved' : 'Save', node: <Circle><Icon /></Circle>, onClick: () => { onSave(); setSaved(true) } }
              : { label, node: <Circle><Icon /></Circle> },
          )}
        />

        <ActionButton label={action} icon={SHARE_GLYPH} onClick={onClose} />
      </div>
    </Sheet>
  )
}
