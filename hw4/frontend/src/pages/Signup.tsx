import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Labubu from '../components/Labubu'
import { signup } from '../api'
import { useAuth } from '../auth'

const empty = { first_name: '', last_name: '', email: '', password: '', confirm_password: '' }

export default function Signup() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const mismatch = form.confirm_password.length > 0 && form.password !== form.confirm_password

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm_password) return setError('Passwords do not match.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    setBusy(true)
    try {
      const { user } = await signup(form)
      setUser(user)
      navigate('/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section auth">
      <form className="auth-card" onSubmit={onSubmit}>
        <Labubu size={70} fur="#d6006f" />
        <h1>Join Campus Customs</h1>
        <div className="row">
          <label>
            First name
            <input required autoComplete="given-name" value={form.first_name} onChange={set('first_name')} />
          </label>
          <label>
            Last name
            <input required autoComplete="family-name" value={form.last_name} onChange={set('last_name')} />
          </label>
        </div>
        <label>
          Email
          <input type="email" required placeholder="you@yale.edu" autoComplete="email" value={form.email} onChange={set('email')} />
        </label>
        <label>
          Password
          <input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
        </label>
        <label>
          Confirm password
          <input type="password" required autoComplete="new-password" value={form.confirm_password} onChange={set('confirm_password')} />
        </label>
        {mismatch && <p className="form-error">Passwords don't match yet.</p>}
        {error && !mismatch && <p className="form-error">{error}</p>}
        <button className="btn-pink" type="submit" disabled={busy || mismatch}>
          {busy ? 'Creating…' : 'Create Account'}
        </button>
        <p className="muted small">At least 8 characters. Your password is salted and hashed. We never store it as plain text.</p>
        <p className="small">
          Already have one? <Link to="/login">Log in</Link>
        </p>
      </form>
    </section>
  )
}
