type P = { size?: number; color?: string }

const base = (size: number, color: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const HomeIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></svg>
)
export const SearchIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></svg>
)
export const StudioIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><circle cx="12" cy="8" r="3.6" /><circle cx="8" cy="15" r="3.6" /><circle cx="16" cy="15" r="3.6" /></svg>
)
export const ProfileIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><circle cx="12" cy="8.5" r="3.8" /><path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" /></svg>
)
export const BackIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><path d="M10 6 4 12l6 6M4.5 12H20" /></svg>
)
export const ArrowUpIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size, color)} strokeWidth={1}><path d="M12 21V3M5 10l7-7 7 7" /></svg>
)
export const ShareIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v5.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V13" /></svg>
)
export const MicIcon = ({ size = 24, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>
)
export const StopIcon = ({ size = 24, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><rect x="7.5" y="7.5" width="9" height="9" rx="2" /></svg>
)
export const DotsIcon = ({ size = 24, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><circle cx="6" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="18" cy="12" r="1.2" /></svg>
)
export const LinkIcon = ({ size = 20, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></svg>
)
export const MessageIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4z" /></svg>
)
export const MailIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5 12 13l8.5-6.5" /></svg>
)
export const QrIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" /></svg>
)
export const DownloadIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" /></svg>
)
export const PlusIcon = ({ size = 22, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><path d="M12 5v14M5 12h14" /></svg>
)
export const CloseIcon = ({ size = 18, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const SparkIcon = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>
)
export const PlayIcon = ({ size = 14, color = 'currentColor' }: P) => (
  <svg {...base(size, color)} fill={color}><path d="M8 5.5v13l10-6.5z" /></svg>
)
export const TrashIcon = ({ size = 16, color = 'currentColor' }: P) => (
  <svg {...base(size, color)}><path d="M4.5 7h15M10 7V5h4v2M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12M10 11v6M14 11v6" /></svg>
)
export const PauseIcon = ({ size = 14, color = 'currentColor' }: P) => (
  <svg {...base(size, color)} fill={color}><rect x="6.5" y="5.5" width="3.5" height="13" rx="1" /><rect x="14" y="5.5" width="3.5" height="13" rx="1" /></svg>
)
