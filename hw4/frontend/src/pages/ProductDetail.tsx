import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProduct, formatPrice, type ProductDetail as Detail } from '../api'
import { useBag } from '../bag'
import { askBoola } from '../askBoola'
import { flyToBag } from '../flyToBag'

function stockLabel(q: number) {
  if (q === 0) return 'Sold out'
  if (q <= 5) return `Only ${q} left`
  return 'In stock'
}

export default function ProductDetail() {
  const { productId = '' } = useParams()
  const [product, setProduct] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  const [size, setSize] = useState('')
  const [added, setAdded] = useState('')
  const bag = useBag()
  const imgRef = useRef<HTMLImageElement>(null)

  // Hover-to-zoom: the photo scales up around the cursor so shoppers can inspect the print.
  function onZoom(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    imgRef.current?.style.setProperty('transform-origin', `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`)
  }

  useEffect(() => {
    setProduct(null)
    setError('')
    setSize('')
    setAdded('')
    fetchProduct(productId)
      .then(setProduct)
      .catch(() => setError("We couldn't find that item."))
  }, [productId])

  if (error)
    return (
      <p className="page-msg">
        {error} <Link to="/products">Back to products</Link>
      </p>
    )
  if (!product) return <p className="page-msg">Loading…</p>

  const selected = product.sizes.find((s) => s.size === size)
  const soldOut = product.sizes.filter((s) => s.quantity === 0).map((s) => s.size)
  const inBag = selected ? bag.items.find((i) => i.product_id === product.product_id && i.size === selected.size)?.qty ?? 0 : 0
  const atMax = !!selected && inBag >= selected.quantity

  function addToBag() {
    if (!product || !selected || atMax) return
    flyToBag(imgRef.current)
    bag.add({ product_id: product.product_id, name: product.name, price: product.price, image_url: product.image_url, size: selected.size, max: selected.quantity })
    setAdded(`Added ${product.name} (${selected.size}) to your bag`)
  }

  return (
    <section className="section detail">
      <Link to="/products" className="back">← All products</Link>
      <div className="detail-grid">
        <div className="detail-img zoomable" onMouseMove={onZoom}>
          <img ref={imgRef} src={product.image_url} alt={product.name} />
          <span className="zoom-hint">Hover to zoom</span>
        </div>
        <div className="detail-info">
          <span className="tag">{product.garment_type}</span>
          <h1>{product.name}</h1>
          <div className="detail-price">{formatPrice(product.price)}</div>
          <p className="detail-desc">{product.description}</p>

          {product.colors.length > 0 && (
            <>
              <h4>Colours</h4>
              <div className="chips">
                {product.colors.map((c) => (
                  <span key={c} className="chip">{c}</span>
                ))}
              </div>
            </>
          )}

          <h4>Sizes & stock</h4>
          <div className="sizes">
            {product.sizes.map((s) => (
              <button
                key={s.size}
                className={`size ${s.quantity === 0 ? 'out' : ''} ${size === s.size ? 'picked' : ''}`}
                disabled={s.quantity === 0}
                onClick={() => setSize(s.size)}
                title={stockLabel(s.quantity)}
              >
                <strong>{s.size}</strong>
                <small>{stockLabel(s.quantity)}</small>
              </button>
            ))}
          </div>

          <button className="btn-pink add" disabled={!selected || atMax} onClick={addToBag}>
            {!selected ? 'Pick a size' : atMax ? `All ${selected.quantity} in ${selected.size} are in your bag` : `Add ${selected.size} to bag`}
          </button>
          {added && (
            <div className="added-toast" role="status">
              ✓ {added} ·{' '}
              <button className="link-btn" onClick={() => bag.setOpen(true)}>
                View bag
              </button>
            </div>
          )}

          <div className="ask-row">
            <span className="ask-label">Ask Boola:</span>
            <button className="ask-chip" onClick={() => askBoola('Do you have this in another colour?')}>Other colours?</button>
            <button className="ask-chip" onClick={() => askBoola('Show me similar items to this one')}>Similar items</button>
            {soldOut.length > 0 && (
              <button className="ask-chip hot" onClick={() => askBoola(`This is sold out in ${soldOut.join(', ')}. Can you suggest similar items in stock in ${soldOut[0]}?`)}>
                Sold out in {soldOut[0]}? Find alternatives
              </button>
            )}
          </div>

          <div className="chips tags">
            {product.search_tags.map((t) => (
              <Link key={t} to={`/products?q=${encodeURIComponent(t)}`} className="chip ghost">#{t}</Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
