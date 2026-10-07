import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchChatHistory, formatPrice, sendChat, type ChatMessage, type PageContext } from '../api'
import { useAuth } from '../auth'
import { useChatResults } from '../chatResults'
import Labubu from './Labubu'
import { ASK_EVENT } from '../askBoola'

const greeting = (name?: string): ChatMessage => ({
  role: 'assistant',
  content: `Hi${name ? ` ${name}` : ''}! I'm Boola, your Campus Customs shopping buddy. Ask me about hoodies, sizes, colours or gifts for the family.`,
})

// Render **bold** safely (no innerHTML).
function renderText(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  )
}

export default function ChatWidget() {
  const { user } = useAuth()
  const { results, setResults } = useChatResults()
  const navigate = useNavigate()
  const location = useLocation()

  // Page context for the agent: which product is open, or which cards are on screen.
  function pageContext(): PageContext {
    const path = location.pathname
    const detail = path.match(/^\/products\/([^/]+)\/?$/)
    const ctx: PageContext = { path, product_id: detail ? decodeURIComponent(detail[1]) : null }
    if (path === '/products') {
      const q = new URLSearchParams(location.search).get('q')
      if (results) {
        ctx.results_title = results.title
        ctx.visible_product_ids = results.products.map((p) => p.product_id).slice(0, 60)
      } else if (q) {
        ctx.search_query = q
      }
    }
    return ctx
  }
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([greeting()])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [teaser, setTeaser] = useState(false)

  // One friendly nudge per browser session, a few seconds after arriving.
  useEffect(() => {
    if (sessionStorage.getItem('cc_teased')) return
    const t = setTimeout(() => {
      setTeaser(true)
      sessionStorage.setItem('cc_teased', '1')
    }, 4000)
    return () => clearTimeout(t)
  }, [])
  const endRef = useRef<HTMLDivElement>(null)

  // Reset on login/logout; logged-in shoppers get their saved conversation back.
  useEffect(() => {
    if (!user) {
      setMessages([greeting()])
      return
    }
    fetchChatHistory()
      .then(({ messages: saved }) => setMessages([greeting(user.first_name), ...saved]))
      .catch(() => setMessages([greeting(user.first_name)]))
  }, [user])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, sending])

  function showOnPage(r: NonNullable<ChatMessage['pageResults']>) {
    setResults(r)
    navigate('/products')
  }

  // Context-aware starter prompts: what's useful depends on the page the shopper is on.
  function suggestions(): string[] {
    const path = location.pathname
    if (/^\/products\/[^/]+/.test(path)) return ['Is this in stock in M?', 'Do you have this in another colour?', 'Show me similar items', 'How much is this?']
    if (path === '/products' && results) return ['Only show navy ones', 'Which are under $60?', 'Which are in stock in XL?', 'Compare the first two']
    return ['Which hoodies do you have?', 'Gift ideas for my mom', 'Show me Saybrook gear', 'Tees under $40']
  }

  // Questions sent from buttons elsewhere on the site (e.g. "Ask Boola" on a product page).
  useEffect(() => {
    const onAsk = (e: Event) => {
      const text = (e as CustomEvent<string>).detail
      setOpen(true)
      if (text) void send(text)
    }
    window.addEventListener(ASK_EVENT, onAsk)
    return () => window.removeEventListener(ASK_EVENT, onAsk)
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await send(input)
  }

  async function send(raw: string) {
    const text = raw.trim()
    if (!text || sending) return
    const history = messages.slice(1) // skip the local greeting
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setSending(true)
    try {
      const { reply, products, page_results } = await sendChat(text, history, pageContext())
      setMessages((m) => [...m, { role: 'assistant', content: reply, products, pageResults: page_results }])
      // API contract: structured matches from the agent -> product cards on the page.
      if (page_results && page_results.products.length > 0) showOnPage(page_results)
    } catch (err) {
      const msg = err instanceof Error && !/^\d{3}/.test(err.message) ? err.message : "I can't reach the Campus Customs server right now. Please try again in a moment!"
      setMessages((m) => [...m, { role: 'assistant', content: msg }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat">
      {open && (
        <section className="chat-panel" aria-label="Campus Customs chat">
          <header className="chat-head">
            <Labubu size={34} />
            <div>
              <strong>Boola</strong>
              <small><span className="live-dot" aria-hidden /> Online · checks live stock</small>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </header>
          <div className="chat-msgs">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="bubble-row">
                  {m.role === 'assistant' && (
                    <span className="avatar" aria-hidden>
                      <Labubu size={26} />
                    </span>
                  )}
                  <div className={`bubble ${m.role}`}>{renderText(m.content)}</div>
                </div>
                {m.pageResults && (
                  <button className="page-link" onClick={() => showOnPage(m.pageResults!)}>
                    ▸ {m.pageResults.total} {m.pageResults.title} shown on the page
                  </button>
                )}
                {m.products && m.products.length > 0 && (
                  <div className="chat-cards">
                    {m.products.map((p) => (
                      <Link key={p.product_id} to={`/products/${p.product_id}`} className="chat-card">
                        <img src={p.image_url} alt={p.name} />
                        <div>
                          <strong>{p.name}</strong>
                          <span className="pink">{formatPrice(p.price)}</span>
                          <small>{p.in_stock_sizes?.length ? `In stock: ${p.in_stock_sizes.join(', ')}` : 'Sold out'}</small>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="bubble assistant typing" aria-live="polite">
                <span className="paws" aria-hidden>
                  <i>🐾</i>
                  <i>🐾</i>
                  <i>🐾</i>
                </span>
                Boola is checking the racks…
              </div>
            )}
            {!sending && (
              <div className="suggest" aria-label="Suggested questions">
                {suggestions().map((s) => (
                  <button key={s} className="suggest-chip" onClick={() => void send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form className="chat-input" onSubmit={onSubmit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products, sizes, colours…"
              aria-label="Chat message"
              maxLength={2000}
            />
            <button type="submit" disabled={sending || !input.trim()}>
              Send
            </button>
          </form>
        </section>
      )}
      {!open && teaser && (
        <button className="chat-teaser" onClick={() => { setOpen(true); setTeaser(false) }}>
          Need a size or a gift idea? <b>Ask me!</b>
        </button>
      )}
      <button className="chat-fab" onClick={() => { setOpen((o) => !o); setTeaser(false) }} aria-label={open ? 'Close chat' : 'Open chat'}>
        <Labubu size={52} wave={!open} />
      </button>
    </div>
  )
}
