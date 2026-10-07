// A hand-drawn SVG Labubu-style creature: tall bunny ears, fuzzy body, toothy grin.

interface Props {
  size?: number
  fur?: string
  className?: string
  wave?: boolean
}

export default function Labubu({ size = 80, fur = '#ff4fa3', className = '', wave = false }: Props) {
  return (
    <svg
      className={`labubu ${wave ? 'labubu-wave' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Labubu creature"
    >
      {/* ears */}
      <ellipse cx="33" cy="22" rx="9" ry="20" fill={fur} transform="rotate(-12 33 22)" />
      <ellipse cx="67" cy="22" rx="9" ry="20" fill={fur} transform="rotate(12 67 22)" />
      <ellipse cx="33" cy="24" rx="4" ry="13" fill="#ffd1e6" transform="rotate(-12 33 24)" />
      <ellipse cx="67" cy="24" rx="4" ry="13" fill="#ffd1e6" transform="rotate(12 67 24)" />
      {/* fuzzy head */}
      <circle cx="50" cy="58" r="32" fill={fur} />
      {/* face */}
      <ellipse cx="50" cy="62" rx="23" ry="20" fill="#ffe4f0" />
      {/* eyes */}
      <ellipse cx="40" cy="56" rx="5" ry="6.5" fill="#111" />
      <ellipse cx="60" cy="56" rx="5" ry="6.5" fill="#111" />
      <circle cx="41.8" cy="53.5" r="1.8" fill="#fff" />
      <circle cx="61.8" cy="53.5" r="1.8" fill="#fff" />
      {/* blush */}
      <ellipse cx="32" cy="66" rx="4" ry="2.4" fill="#ff8cc2" opacity=".8" />
      <ellipse cx="68" cy="66" rx="4" ry="2.4" fill="#ff8cc2" opacity=".8" />
      {/* signature toothy grin */}
      <path d="M38 69 Q50 79 62 69 Z" fill="#111" />
      <path d="M40 69.5 L42.5 73 L45 70.5 L47.5 74 L50 71 L52.5 74 L55 70.5 L57.5 73 L60 69.5 Z" fill="#fff" />
      {/* tiny Yale "Y" badge */}
      <circle cx="78" cy="82" r="8" fill="#0f0f0f" stroke="#fff" strokeWidth="1.5" />
      <text x="78" y="86" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ff4fa3" fontFamily="Georgia, serif">
        Y
      </text>
    </svg>
  )
}
