import { NavLink, Link, useNavigate } from 'react-router-dom'
import Labubu from './Labubu'
import { useAuth } from '../auth'
import { useBag } from '../bag'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Products' },
  { to: '/about', label: 'About Us' },
]

export default function NavBar() {
  const { user, logout } = useAuth()
  const { count, setOpen } = useBag()
  const navigate = useNavigate()

  return (
    <header className="nav">
      <Link to="/" className="brand">
        <Labubu size={38} />
        <span>
          Campus <em>Customs</em>
        </span>
      </Link>
      <nav className="nav-links">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.label}
          </NavLink>
        ))}
        {user ? (
          <>
            <span className="nav-hi">Hi, {user.first_name}!</span>
            <button
              className="btn-ghost nav-btn"
              onClick={async () => {
                await logout()
                navigate('/')
              }}
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : '')}>
              Log In
            </NavLink>
            <NavLink to="/signup" className={({ isActive }) => `btn-pink ${isActive ? 'active' : ''}`}>
              Create Account
            </NavLink>
          </>
        )}
        <button className="bag-btn" onClick={() => setOpen(true)} aria-label={`Open bag, ${count} items`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 7h12l-1 13H7L6 7z" />
            <path d="M9 7a3 3 0 0 1 6 0" />
          </svg>
          {count > 0 && <span className="bag-count">{count}</span>}
        </button>
      </nav>
      <a className="nav-som" href="https://som.yale.edu" target="_blank" rel="noreferrer" title="Yale School of Management">
        <img src="/som/som-logo.jpg" alt="Yale School of Management logo" />
      </a>
    </header>
  )
}
