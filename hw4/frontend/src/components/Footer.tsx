import { Link } from 'react-router-dom'
import Labubu from './Labubu'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-giant" aria-hidden>
        BOOLA BOOLA
      </div>
      <div className="footer-row">
        <div className="footer-som">
          <img src="/som/som-logo.jpg" alt="Yale School of Management logo" />
        </div>
        <div>
          <strong>
            Campus <em>Customs</em>
          </strong>
          <p>Built with Bulldog pride by a Yale SOM student · New Haven, CT</p>
        </div>
        <nav>
          <Link to="/products">Shop</Link>
          <Link to="/about">About</Link>
          <Link to="/signup">Join</Link>
        </nav>
        <Labubu size={56} fur="#d6006f" wave />
      </div>
    </footer>
  )
}
