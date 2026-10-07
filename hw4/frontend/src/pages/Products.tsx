import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchProducts, type Product } from '../api'
import ProductCard from '../components/ProductCard'
import Labubu from '../components/Labubu'
import { useChatResults } from '../chatResults'

const PENNANTS = [
  { cat: 'all', label: 'All' },
  { cat: 'hoodie', label: 'Hoodies' },
  { cat: 'crewneck', label: 'Crewnecks' },
  { cat: 'tee', label: 'Tees' },
  { cat: 'quarter-zip', label: 'Quarter-zips' },
  { cat: 'jacket', label: 'Jackets' },
  { cat: 'long-sleeve', label: 'Long sleeve' },
]

export default function Products() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState('')
  const [params, setParams] = useSearchParams()
  const { results: chatResults, setResults: setChatResults } = useChatResults()
  const q = params.get('q') ?? ''
  const cat = params.get('cat') ?? 'all'
  const sort = params.get('sort') ?? 'featured'

  function setParam(key: string, value: string, fallback: string) {
    const next = new URLSearchParams(params)
    if (value && value !== fallback) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setError('Could not load products. Is the backend running on port 8000?'))
  }, [])

  // New chat search -> jump back to the top so the shopper sees the fresh cards.
  useEffect(() => {
    if (chatResults) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [chatResults])

  const filtered = useMemo(() => {
    if (!products) return []
    const needle = q.toLowerCase().trim()
    let list = products.filter((p) => cat === 'all' || p.categories?.includes(cat))
    if (needle)
      list = list.filter((p) =>
        [p.product_id, p.name, p.garment_type, p.description, ...p.search_tags, ...p.colors].join(' ').toLowerCase().includes(needle),
      )
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    return list
  }, [products, q, cat, sort])

  const pennants = useMemo(() => {
    const count = (c: string) => (products ?? []).filter((p) => c === 'all' || p.categories?.includes(c)).length
    return PENNANTS.map((p) => ({ ...p, n: count(p.cat) }))
  }, [products])

  return (
    <section className="section">
      {chatResults && (
        <div className="chat-results" aria-live="polite">
          <div className="chat-results-head">
            <Labubu size={48} wave />
            <div>
              <span className="eyebrow">Boola found {chatResults.total} {chatResults.total === 1 ? 'item' : 'items'}</span>
              <h2>{chatResults.title}</h2>
            </div>
            <button className="btn-ghost" onClick={() => setChatResults(null)}>
              Show all products
            </button>
          </div>
          <div className="grid">
            {chatResults.products.map((p) => (
              <ProductCard key={p.product_id} product={p} fromChat />
            ))}
          </div>
        </div>
      )}

      {!chatResults && (
        <>
          <div className="page-head">
            <div>
              <h1>
                Shop <span className="pink">Campus Customs</span>
              </h1>
              <p className="muted">{products ? `${filtered.length} of ${products.length} items` : 'Loading the racks…'}</p>
            </div>
            <div className="shop-tools">
              <input
                className="search"
                value={q}
                onChange={(e) => setParam('q', e.target.value, '')}
                placeholder="Search Branford, navy, Dad…"
                aria-label="Search products"
              />
              <select className="sort" value={sort} onChange={(e) => setParam('sort', e.target.value, 'featured')} aria-label="Sort products">
                <option value="featured">Sort: A–Z</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </div>
          </div>

          <nav className="pennants" aria-label="Filter by category">
            {pennants.map((p) => (
              <button
                key={p.cat}
                className={`pennant ${cat === p.cat ? 'on' : ''}`}
                onClick={() => setParam('cat', p.cat, 'all')}
                aria-pressed={cat === p.cat}
              >
                <span>{p.label}</span>
                <small>{p.n}</small>
              </button>
            ))}
          </nav>

          {error && <p className="page-msg">{error}</p>}

          {products && filtered.length === 0 && (
            <div className="empty">
              <Labubu size={90} />
              <p>No matches for "{q}". Try another word, or ask Boola in the chat!</p>
            </div>
          )}

          <div className="grid">
            {filtered.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
