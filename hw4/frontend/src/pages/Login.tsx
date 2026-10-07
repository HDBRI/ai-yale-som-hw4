import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Labubu from '../components/Labubu'
import { login } from '../api'
import { useAuth } from '../auth'

export default function Login() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { user } = await login(email, password)
      setUser(user)
      navigate('/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section auth">
      <form className="auth-card" onSubmit={onSubmit}>
        <Labubu size={70} />
        <h1>Welcome back, Bulldog</h1>
        <label>
          Email
          <input type="email" required placeholder="you@yale.edu" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn-pink" type="submit" disabled={busy}>
          {busy ? 'Logging in…' : 'Log In'}
        </button>
        <p className="small">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </section>
  )
}
