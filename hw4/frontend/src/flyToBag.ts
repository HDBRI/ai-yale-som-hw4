// "Fly to bag": a copy of the product image arcs into the nav bag icon, which then bounces.
export function flyToBag(img: HTMLImageElement | null) {
  const bag = document.querySelector<HTMLElement>('.bag-btn')
  if (!img || !bag || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const from = img.getBoundingClientRect()
  const to = bag.getBoundingClientRect()
  const ghost = img.cloneNode() as HTMLImageElement
  Object.assign(ghost.style, {
    position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`,
    objectFit: 'contain', background: '#fff', borderRadius: '18px', zIndex: '300', pointerEvents: 'none',
    boxShadow: '0 20px 50px rgba(255,79,163,.5)',
  })
  document.body.appendChild(ghost)
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  ghost
    .animate(
      [
        { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 120}px) scale(.45) rotate(-12deg)`, opacity: 0.95 },
        { transform: `translate(${dx}px, ${dy}px) scale(.06) rotate(8deg)`, opacity: 0.4 },
      ],
      { duration: 750, easing: 'cubic-bezier(.5,-0.2,.4,1)' },
    )
    .finished.then(() => {
      ghost.remove()
      bag.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35) rotate(-8deg)' }, { transform: 'scale(1)' }], { duration: 380 })
    })
}
