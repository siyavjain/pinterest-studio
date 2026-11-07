import { useState } from 'react'
import { motion } from 'framer-motion'
import Sheet from './Sheet'
import { ActionButton, Pill } from '../components/Button'
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

function Row({ title, items }: { title: string; items: { label: string; node: React.ReactNode }[] }) {
  return (
    <div style={{ padding: '0 12px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {items.map((it) => (
          <button key={it.label} style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
            {it.node}
            <span className="t-label" style={{ color: 'var(--text-secondary)' }}>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ShareSheet({ open, onClose, cover }: { open: boolean; onClose: () => void; cover: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ padding: '12px 8px 0', display: 'grid', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 12px' }}>
          <img src={cover} alt="" style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'cover', background: 'var(--bg-default)' }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>Ads</div>
            <div className="t-body">14 pins · 3 collaborators</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ height: 56, borderRadius: 999, background: 'var(--input-bg)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 0 18px' }}>
            <LinkIcon color="var(--text-secondary)" />
            <span className="t-body" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>pin.it/studio/ads</span>
            <Pill
              label={copied ? 'Link copied' : 'Copy link'}
              selected={copied}
              onClick={() => {
                navigator.clipboard?.writeText('https://pin.it/studio/ads').catch(() => {})
                setCopied(true)
                setTimeout(() => setCopied(false), 1600)
              }}
            />
          </div>
          <div className="t-label" style={{ color: 'var(--text-secondary)', padding: '0 12px' }}>
            Anyone with the link can view. Collaborators can add pins.
          </div>
        </div>

        <Row
          title="Send to collaborators"
          items={[
            ...PEOPLE.map((p) => ({ label: p, node: <Circle><Face who={p} size={56} /></Circle> })),
            { label: 'Invite', node: <Circle dashed><PlusIcon /></Circle> },
          ]}
        />
        <Row title="Share via" items={VIA.map(({ label, Icon }) => ({ label, node: <Circle><Icon /></Circle> }))} />

        <ActionButton label="Share board" onClick={onClose} />
      </div>
    </Sheet>
  )
}
