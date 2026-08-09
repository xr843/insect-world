/**
 * 线性图标集 —— 全部手写 SVG，不引外部图标库。
 * 统一 24 视窗、1.6 描边、圆头圆角，与纸感界面的细线条一致。
 */
type P = { size?: number; className?: string; strokeWidth?: number }

const base = (size = 16, sw = 1.6) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const IconSun = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
  </svg>
)

export const IconMoon = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
)

export const IconCompass = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2.2 5.3-5.3 2.2 2.2-5.3z" />
  </svg>
)

export const IconLayers = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
)

export const IconBook = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 17.5h15" />
  </svg>
)

export const IconLibrary = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 4v16M8.5 4v16" />
    <path d="m13 5 4.5-1 3 15.5-4.5 1z" />
  </svg>
)

export const IconNote = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z" />
    <path d="M14.5 6.5 17.5 9.5" />
  </svg>
)

export const IconSearch = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
)

export const IconRotate = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3.5 9.5a9 9 0 1 1 .4 5.5" />
    <path d="M3 4.5v5h5" />
  </svg>
)

export const IconZoom = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4M8.5 11h5M11 8.5v5" />
  </svg>
)

export const IconIsolate = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="8.5" strokeDasharray="3 3" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const IconSection = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
    <path d="M12 4v16" strokeDasharray="2.5 2.5" />
  </svg>
)

export const IconBox = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z" />
    <path d="M3.5 7 12 11.5 20.5 7M12 11.5v10" />
  </svg>
)

export const IconReset = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M20.5 9.5a9 9 0 1 0-.4 5.5" />
    <path d="M21 4.5v5h-5" />
  </svg>
)

export const IconBookmark = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />
  </svg>
)

export const IconArrowRight = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </svg>
)

export const IconPlay = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
)

export const IconQuiz = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3 2.5v1.5" />
    <path d="M12 17h.01" />
  </svg>
)

export const IconShare = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="17.5" cy="6" r="2.5" />
    <circle cx="17.5" cy="18" r="2.5" />
    <path d="m8.3 10.8 6.9-3.6M8.3 13.2l6.9 3.6" />
  </svg>
)

export const IconSparkle = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 3.5c.6 4 1.9 5.3 5.9 5.9-4 .6-5.3 1.9-5.9 5.9-.6-4-1.9-5.3-5.9-5.9 4-.6 5.3-1.9 5.9-5.9Z" />
    <path d="M18.5 15.5c.3 1.9.9 2.5 2.8 2.8-1.9.3-2.5.9-2.8 2.8-.3-1.9-.9-2.5-2.8-2.8 1.9-.3 2.5-.9 2.8-2.8Z" />
  </svg>
)

export const IconMicroscope = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M9 3.5h3.5v7H9zM10.75 10.5v3" />
    <path d="M7 20.5h13" />
    <path d="M6.5 17.5a6 6 0 0 0 10.8-3.6" />
    <path d="M4.5 20.5h4" />
  </svg>
)

export const IconGrid = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </svg>
)

export const IconLeaf = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 20c0-8 5-13 16-13 0 9-5 13-13 13H4Z" />
    <path d="M4 20c3.5-4.5 7-7 12-9" />
  </svg>
)

export const IconDocument = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M6 3.5h8L18.5 8v12.5h-12.5z" />
    <path d="M13.5 3.5V8.5H18.5M9 13h6M9 16.5h4" />
  </svg>
)

export const IconGlobe = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.2 9.5h17.6M3.2 14.5h17.6" />
    <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" />
  </svg>
)

export const IconChevronDown = ({ size, className, strokeWidth }: P) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="m6 9.5 6 6 6-6" />
  </svg>
)

/**
 * 实心叶片 —— 本站的标记。
 *
 * 与 IconLeaf（描边版）不同，这个是填充的：它要么很小（左栏选中项 15px），
 * 要么压在饱和的珊瑚色圆底上（顶栏 18px），描边版在这两种场合都会糊掉。
 */
export const IconLeafSolid = ({ size = 16, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M4.2 20.2c-.5-7.8 4.6-13.3 15.6-13.6.5 8.9-4.4 13.6-12.4 13.6h-2c1.9-3.4 4.6-5.8 8.2-7.4-4.1 1.1-7.2 3.6-9.4 7.4Z" />
  </svg>
)

// ---- KEY FACTS 行首的小标记，比导航图标更细，视觉上像手绘符号

export const FactIcon = ({ kind, size = 13 }: { kind: string; size?: number }) => {
  const p = base(size, 1.5)
  switch (kind) {
    case 'size':
      return (
        <svg {...p}>
          <path d="M3 12h18M3 9v6M21 9v6" />
        </svg>
      )
    case 'weight':
      return (
        <svg {...p}>
          <path d="M12 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
          <path d="M7 8h10l2.5 12.5h-15z" />
        </svg>
      )
    case 'time':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5.2l3.2 2" />
        </svg>
      )
    case 'place':
      return (
        <svg {...p}>
          <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
      )
    case 'food':
      return (
        <svg {...p}>
          <path d="M4 20c0-8 5-13 16-13 0 9-5 13-13 13H4Z" />
          <path d="M4.5 19.5c3.5-4.5 7-7 12-9" />
        </svg>
      )
    default:
      return (
        <svg {...p}>
          <path d="M13 2.5 5 13.5h5.5L10 21.5l8-11h-5.5z" />
        </svg>
      )
  }
}
