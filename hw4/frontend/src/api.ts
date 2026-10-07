// Thin client for the FastAPI backend (proxied by Vite in dev).

export interface Product {
  product_id: string
  name: string
  garment_type: string
  description: string
  colors: string[]
  search_tags: string[]
  image_url: string
  price: number
  total_stock?: number
  categories?: string[]
  sizes?: SizeStock[]
}

export interface SizeStock {
  size: string
  quantity: number
}

export interface ProductDetail extends Product {
  sizes: SizeStock[]
}

export interface ProductCardData {
  product_id: string
  name: string
  garment_type: string
  price: number
  image_url: string
  short_description?: string
  colors: string[]
  in_stock_sizes: string[]
}

export interface SearchFilters {
  query: string
  garment: string | null
  color: string | null
  max_price: number | null
  size: string | null
}

// API contract: chat search results the website renders on the page (built from the DB by FastAPI).
export interface PageResults {
  title: string
  searches: SearchFilters[]
  total: number
  products: ProductCardData[]
}

export interface ChatReply {
  reply: string
  products: ProductCardData[]
  page_results?: PageResults | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  products?: ProductCardData[]
  pageResults?: PageResults | null
}

// Anything a ProductCard can render: catalogue products (Problem 3) or chat cards (Problem 7).
export type CardProduct = Pick<Product, 'product_id' | 'name' | 'garment_type' | 'price' | 'image_url'> & {
  description?: string
  short_description?: string
  categories?: string[]
  sizes?: SizeStock[]
  in_stock_sizes?: string[]
}

export interface User {
  id: number
  first_name: string
  last_name: string
  name: string
  email: string
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin', ...init })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(typeof body?.detail === 'string' ? body.detail : `${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

const postJson = <T>(url: string, data?: unknown) =>
  getJson<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  })

export const fetchMe = () => getJson<{ user: User | null }>('/api/auth/me')

export const login = (email: string, password: string) =>
  postJson<{ user: User }>('/api/auth/login', { email, password })

export const signup = (data: {
  first_name: string
  last_name: string
  email: string
  password: string
  confirm_password: string
}) => postJson<{ user: User }>('/api/auth/signup', data)

export const logout = () => postJson<{ ok: boolean }>('/api/auth/logout')

export const fetchProducts = () => getJson<Product[]>('/api/products')

export const fetchProduct = (id: string) =>
  getJson<ProductDetail>(`/api/products/${encodeURIComponent(id)}`)

// What the shopper is looking at; sent with every chat message (the backend re-checks ids against the DB).
export interface PageContext {
  path: string
  product_id?: string | null
  search_query?: string | null
  results_title?: string | null
  visible_product_ids?: string[]
}

// history is only used by the backend for guests; logged-in history comes from the DB.
export const sendChat = (message: string, history: ChatMessage[], page?: PageContext) =>
  postJson<ChatReply>('/api/chat', {
    message,
    history: history.slice(-12).map(({ role, content }) => ({ role, content: content.slice(0, 4000) })),
    page,
  })

export const fetchChatHistory = () => getJson<{ messages: ChatMessage[] }>('/api/chat/history')

export const formatPrice = (p: number) => `$${p.toFixed(2)}`

export const shortDescription = (text: string, max = 95) => {
  const firstSentence = text.split(/(?<=\.)\s/)[0]
  const s = firstSentence.length <= max ? firstSentence : text
  return s.length > max ? s.slice(0, max).trimEnd() + '…' : s
}
