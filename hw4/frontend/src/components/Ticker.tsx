// Scrolling varsity ticker under the nav. Every line is true for this store.
const ITEMS = [
  'Boola Boola',
  '102 styles',
  '14 residential colleges',
  'Ask Boola for your size',
  'Born at Yale SOM',
  'Gifts for Mom, Dad & Grandpa',
  'Live stock on every size',
]

export default function Ticker() {
  const row = ITEMS.map((t) => (
    <span key={t} className="tick">
      {t} <b aria-hidden>✦</b>
    </span>
  ))
  return (
    <div className="ticker" aria-label={ITEMS.join(', ')}>
      <div className="ticker-track" aria-hidden>
        {row}
        {row}
      </div>
    </div>
  )
}
