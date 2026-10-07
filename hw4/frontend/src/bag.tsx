import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Shopping bag, saved in localStorage so it survives refreshes and coming back later.

export interface BagItem {
  product_id: string
  name: string
  price: number
  image_url: string
  size: string
  qty: number
  max: number // units in stock for that size when added (can't add more than exist)
}

interface BagState {
  items: BagItem[]
  count: number
  subtotal: number
  open: boolean
  setOpen: (o: boolean) => void
  add: (item: Omit<BagItem, 'qty'>, qty?: number) => void
  setQty: (product_id: string, size: string, qty: number) => void
  remove: (product_id: string, size: string) => void
  clear: () => void
}

const KEY = 'cc_bag'
const Ctx = createContext<BagState | null>(null)

function load(): BagItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as BagItem[]) : []
  } catch {
    return []
  }
}

export function BagProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BagItem[]>(load)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  const same = (a: Pick<BagItem, 'product_id' | 'size'>, id: string, size: string) => a.product_id === id && a.size === size

  function add(item: Omit<BagItem, 'qty'>, qty = 1) {
    setItems((cur) => {
      const existing = cur.find((i) => same(i, item.product_id, item.size))
      if (existing) {
        return cur.map((i) => (same(i, item.product_id, item.size) ? { ...i, max: item.max, qty: Math.min(i.qty + qty, item.max) } : i))
      }
      return [...cur, { ...item, qty: Math.min(qty, item.max) }]
    })
  }

  function setQty(product_id: string, size: string, qty: number) {
    setItems((cur) =>
      cur.flatMap((i) => (same(i, product_id, size) ? (qty <= 0 ? [] : [{ ...i, qty: Math.min(qty, i.max) }]) : [i])),
    )
  }

  const remove = (product_id: string, size: string) => setItems((cur) => cur.filter((i) => !same(i, product_id, size)))

  const count = items.reduce((n, i) => n + i.qty, 0)
  const subtotal = items.reduce((n, i) => n + i.qty * i.price, 0)

  return (
    <Ctx.Provider value={{ items, count, subtotal, open, setOpen, add, setQty, remove, clear: () => setItems([]) }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBag() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBag must be used inside BagProvider')
  return ctx
}
