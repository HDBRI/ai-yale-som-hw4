import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../api'
import { useBag } from '../bag'
import Labubu from './Labubu'

export default function BagDrawer() {
  const { items, count, subtotal, open, setOpen, setQty, remove } = useBag()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  if (!open) return null

  return (
    <div className="bag-overlay" onClick={() => setOpen(false)}>
      <aside className="bag" role="dialog" aria-label="Shopping bag" onClick={(e) => e.stopPropagation()}>
        <header className="bag-head">
          <h2>
            Your bag <span className="pink">({count})</span>
          </h2>
          <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close bag">
            ×
          </button>
        </header>

        {items.length === 0 ? (
          <div className="bag-empty">
            <Labubu size={90} />
            <p>Your bag is empty. Time to rep your college!</p>
            <Link to="/products" className="btn-pink" onClick={() => setOpen(false)}>
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <ul className="bag-items">
              {items.map((i) => (
                <li key={`${i.product_id}-${i.size}`} className="bag-item">
                  <Link to={`/products/${i.product_id}`} onClick={() => setOpen(false)}>
                    <img src={i.image_url} alt={i.name} />
                  </Link>
                  <div className="bag-info">
                    <Link to={`/products/${i.product_id}`} onClick={() => setOpen(false)}>
                      <strong>{i.name}</strong>
                    </Link>
                    <small>
                      Size {i.size} · {formatPrice(i.price)}
                    </small>
                    <div className="qty">
                      <button onClick={() => setQty(i.product_id, i.size, i.qty - 1)} aria-label={`Decrease ${i.name} quantity`}>
                        −
                      </button>
                      <span aria-live="polite">{i.qty}</span>
                      <button
                        onClick={() => setQty(i.product_id, i.size, i.qty + 1)}
                        disabled={i.qty >= i.max}
                        aria-label={`Increase ${i.name} quantity`}
                        title={i.qty >= i.max ? `Only ${i.max} in stock` : ''}
                      >
                        +
                      </button>
                      {i.qty >= i.max && <small className="pink">max in stock</small>}
                    </div>
                  </div>
                  <div className="bag-right">
                    <strong>{formatPrice(i.price * i.qty)}</strong>
                    <button className="link-btn" onClick={() => remove(i.product_id, i.size)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="bag-foot">
              <div className="bag-total">
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <p className="muted small">Your bag is saved on this device. Questions about sizes? Ask Boola in the chat.</p>
              <button className="btn-pink bag-checkout" disabled title="Checkout is coming soon">
                Checkout (coming soon)
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
