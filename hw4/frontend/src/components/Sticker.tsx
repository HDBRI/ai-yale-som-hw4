// Spinning chenille-patch style sticker with text on a circle.
export default function Sticker({ text, center = 'Y', size = 130 }: { text: string; center?: string; size?: number }) {
  return (
    <div className="sticker" style={{ width: size, height: size }} aria-label={text}>
      <svg viewBox="0 0 120 120" className="sticker-ring" aria-hidden>
        <defs>
          <path id="ring" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
        </defs>
        <circle cx="60" cy="60" r="58" fill="#ff4fa3" />
        <circle cx="60" cy="60" r="53" fill="none" stroke="#0a0a0a" strokeWidth="1.5" strokeDasharray="3 3" />
        <text fontSize="10.5" letterSpacing="2.2" fill="#0a0a0a" fontFamily="Graduate, serif">
          <textPath href="#ring">{text}</textPath>
        </text>
      </svg>
      <span className="sticker-center">{center}</span>
    </div>
  )
}
