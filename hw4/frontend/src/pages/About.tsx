import Labubu from '../components/Labubu'

const values = [
  { title: 'Every Bulldog counts', text: "Undergrads, grad students, alumni, parents, the cousin who visits for The Game. If you love Yale, there's a sweatshirt with your name on it." },
  { title: 'Small communities, big pride', text: 'Yale is fourteen residential colleges, a dozen-plus schools and dozens of teams. We make gear for each corner, not just the logo.' },
  { title: 'Tradition, worn casually', text: 'Vintage bulldogs, classic crests and arched lettering, cut into soft fleece and easy tees for lecture, library or tailgate.' },
  { title: 'Help that knows the shelf', text: 'Our chat assistant Boola looks at real stock, so it tells you what is actually there in your size instead of guessing.' },
]

export default function About() {
  return (
    <>
      <section className="section about-hero">
        <div>
          <span className="eyebrow">About us</span>
          <h1>
            Made in New Haven, <span className="pink">made for you</span>.
          </h1>
          <p>
            Campus Customs is a student-built Yale apparel shop. We think school spirit is personal. Pride in Branford
            feels different from pride in Pierson, and a Yale Grandma hoodie carries more love than any mascot. So we
            built a store around the places and people that make Yale feel like home.
          </p>
          <p>
            We started at the Yale School of Management, where a course on AI pushed us to rethink online shopping. The
            result is a small, friendly store with a helper that actually reads the inventory.
          </p>
        </div>
        <figure className="about-photo">
          <img src="/som/evans-front.jpg" alt="Front of Evans Hall at Yale SOM" />
          <figcaption>
            <img src="/som/som-logo.jpg" alt="Yale SOM logo" />
            Edward P. Evans Hall, home of Yale SOM
          </figcaption>
        </figure>
      </section>

      <section className="section">
        <h2>What we stand for</h2>
        <div className="collections">
          {values.map((v) => (
            <div key={v.title} className="collection">
              <h3>{v.title}</h3>
              <p>{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section crew">
        <h2>Meet the crew</h2>
        <div className="crew-row">
          {[
            ['Boola', '#ff4fa3', 'Chat assistant & size whisperer'],
            ['Handsome Dan-bu', '#d6006f', 'Head of Gameday Morale'],
            ['Pinky Pierson', '#ff86c0', 'Residential College Liaison'],
          ].map(([name, fur, role]) => (
            <div key={name} className="crew-card">
              <Labubu size={110} fur={fur} wave={name === 'Boola'} />
              <strong>{name}</strong>
              <small>{role}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
