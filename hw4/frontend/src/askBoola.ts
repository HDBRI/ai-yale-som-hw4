// Lets any page open the chat and send a question (e.g. the "Ask Boola" buttons on a product page).
export const ASK_EVENT = 'boola:ask'

export function askBoola(text: string) {
  window.dispatchEvent(new CustomEvent<string>(ASK_EVENT, { detail: text }))
}
