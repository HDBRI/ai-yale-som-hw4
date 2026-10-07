import { useRef, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice, shortDescription, type CardProduct } from '../api'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const CATEGORY_LABEL: Record<string, string> = {
  hoodie: 'Hoodie', crewneck: 'Crewneck', tee: 'Tee', 'quarter-zip': 'Quarter-zip', jacket: 'Jacket',
  'long-sleeve': 'Long sleeve', mockneck: 'Mockneck', 'full-zip': 'Full-zip',
}

// One card component for both the catalogue grid and chat search results,
// so every card opens the same single-item page (/products/:id).
// Styled as a store swing-tag: varsity category label, price tag, and live size dots.
export default function ProductCard({ product, fromChat = false }: { product: CardProduct; fromChat?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const blurb = product.short_description || shortDescription(product.description ?? '')
  const cat = product.categories?.find((c) => CATEGORY_LABEL[c])
  const label = cat ? CATEGORY_LABEL[cat] : product.garment_type

  // Per-size stock: from /api/products (sizes) or chat cards (in_stock_sizes).
  const stock = new Map<string, number | null>()
  if (product.sizes) product.sizes.forEach((s) => stock.set(s.size, s.quantity))
  else if (product.in_stock_sizes) SIZES.forEach((s) => stock.set(s, product.in_stock_sizes!.includes(s) ? null : 0))
  const low = product.sizes?.find((s) => s.quantity > 0 && s.quantity <= 2) // only flag truly scarce sizes

  // Gentle 3D tilt that follows the cursor.
  function onMove(e: MouseEvent) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -6}deg`)
    el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`)
  }
  function onLeave() {
    ref.current?.style.setProperty('--rx', '0deg')
    ref.current?.style.setProperty('--ry', '0deg')
  }

  return (
    <Link
      ref={ref}
      to={`/products/${product.product_id}`}
      className={`card ${fromChat ? 'chat-result' : ''}`}
      data-product-id={product.product_id}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="card-img">
        <span className="card-cat">{label}</span>
        {low && <span className="card-low">Only {low.quantity} left in {low.size}</span>}
        <img src={product.image_url} alt={product.name} loading="lazy" />
        <span className="card-tag" aria-label={`Price ${formatPrice(product.price)}`}>
          <i aria-hidden />
          {formatPrice(product.price).replace('.00', '')}
        </span>
      </div>
      <div className="card-body">
        <h3>{product.name}</h3>
        {blurb && <p>{blurb}</p>}
        {stock.size > 0 && (
          <div className="size-dots" aria-label="Sizes in stock">
            {SIZES.map((s) => {
              const q = stock.get(s)
              const out = q === 0
              return (
                <span key={s} className={`dot ${out ? 'out' : ''} ${q !== null && q !== undefined && q > 0 && q <= 5 ? 'low' : ''}`} title={out ? `${s} sold out` : `${s} in stock`}>
                  {s}
                </span>
              )
            })}
          </div>
        )}
        <span className="card-cta">View details →</span>
      </div>
    </Link>
  )
}
