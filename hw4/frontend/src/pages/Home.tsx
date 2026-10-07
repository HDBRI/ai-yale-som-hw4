import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts, type Product } from '../api'
import ProductCard from '../components/ProductCard'
import Labubu from '../components/Labubu'
import Sticker from '../components/Sticker'
import Reveal from '../components/Reveal'
import { askBoola } from '../askBoola'

const collections = [
  { title: 'Residential Colleges', blurb: 'Berkeley to Trumbull. Rep the courtyard you call home.', q: 'college', patch: 'RC' },
  { title: 'Grad & Professional', blurb: 'SOM, Law, Med, Art, Nursing and more. Your school, your crest.', q: 'school', patch: 'GS' },
  { title: 'Bulldog Athletics', blurb: 'Squash courts to the Yale Bowl. Gameday gear for every sport.', q: 'sports', patch: 'YB' },
  { title: 'The Whole Family', blurb: 'Mom, Dad, Grandpa, Aunt. Everyone gets to be a Bulldog.', q: 'yale-', patch: 'FAM' },
]

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([])

  useEffect(() => {
    fetchProducts()
      .then((ps) => setFeatured(ps.filter((p) => /school-of-management|yale-vs-harvard|big-yale|vintage-bulldog/.test(p.product_id)).slice(0, 4)))
      .catch(() => setFeatured([]))
  }, [])

  return (
    <>
      <section className="hero2">
        <div className="hero2-text">
          <span className="eyebrow">Yale gear · made personal</span>
          <h1>
            Wear your
            <br />
            <span className="varsity outline">corner</span> of
            <br />
            <span className="script pink">Yale.</span>
          </h1>
          <p>
            Your college, your school, your team, your family's first Yale sweatshirt. Cozy fleece, crisp tees and
            quarter-zips, with a shopping buddy who checks real stock for your size.
          </p>
          <div className="hero-ctas">
            <Link to="/products" className="btn-pink btn-big">Shop the collection</Link>
            <button className="btn-ghost btn-big" onClick={() => askBoola('Gift ideas for my mom')}>
              Ask Boola for a gift idea
            </button>
          </div>
        </div>

        <div className="hero2-art" aria-hidden>
          <figure className="polaroid">
            <span className="tape" />
            <img src="/som/evans-front.jpg" alt="" />
            <figcaption>Evans Hall · Yale SOM</figcaption>
          </figure>
          <div className="hero2-sticker">
            <Sticker text="BORN AT YALE SOM ✦ MADE FOR NEW HAVEN ✦ " />
          </div>
          <div className="hero2-critters">
            <Labubu size={150} wave />
            <Labubu size={96} fur="#ff86c0" />
            <Labubu size={72} fur="#d6006f" />
          </div>
        </div>
      </section>

      <section className="section">
        <Reveal>
          <div className="sec-head">
            <span className="sec-num">01</span>
            <h2>Find your people</h2>
          </div>
        </Reveal>
        <div className="patches">
          {collections.map((c, i) => (
            <Reveal key={c.title} delay={i * 90}>
              <Link to={`/products?q=${encodeURIComponent(c.q)}`} className="patch-card">
                <span className="patch">{c.patch}</span>
                <h3>{c.title}</h3>
                <p>{c.blurb}</p>
                <span className="pink">Browse →</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="section som-band">
          <img src="/som/evans-hall.jpg" alt="Edward P. Evans Hall, Yale School of Management" />
          <div>
            <div className="sec-head">
              <span className="sec-num">02</span>
              <img className="som-logo-badge" src="/som/som-logo.jpg" alt="Yale School of Management logo" />
            </div>
            <h2>
              Born at <span className="pink">Yale SOM</span>
            </h2>
            <p>
              Campus Customs started as a class project in the glass halls of Evans Hall. We wanted gear that feels as
              smart as the people wearing it, and shopping help that actually answers your questions.
            </p>
          </div>
        </section>
      </Reveal>

      {featured.length > 0 && (
        <section className="section">
          <Reveal>
            <div className="sec-head">
              <span className="sec-num">03</span>
              <h2>Fan favourites</h2>
              <Link to="/products" className="sec-link">See all 102 →</Link>
            </div>
          </Reveal>
          <div className="grid">
            {featured.map((p, i) => (
              <Reveal key={p.product_id} delay={i * 80}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
