import { createContext, useContext, useState, type ReactNode } from 'react'
import type { PageResults } from './api'

// Holds the latest chat-driven search so the Products page can render it.
// Persisted in sessionStorage so it survives opening a product and pressing Back (or a refresh).

const KEY = 'cc_chat_results'

interface ChatResultsState {
  results: PageResults | null
  setResults: (r: PageResults | null) => void
}

const Ctx = createContext<ChatResultsState | null>(null)

function load(): PageResults | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PageResults) : null
  } catch {
    return null
  }
}

export function ChatResultsProvider({ children }: { children: ReactNode }) {
  const [results, setState] = useState<PageResults | null>(load)

  function setResults(r: PageResults | null) {
    setState(r)
    if (r) sessionStorage.setItem(KEY, JSON.stringify(r))
    else sessionStorage.removeItem(KEY)
  }

  return <Ctx.Provider value={{ results, setResults }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChatResults() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useChatResults must be used inside ChatResultsProvider')
  return ctx
}
