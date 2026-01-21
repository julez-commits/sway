import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const MotionButton = motion.button

const AuthPanel = ({
  user,
  onSignIn,
  onSignUp,
  onSignOut,
  loading,
  error,
  info,
  disabled,
}) => {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (disabled) return
    const action = mode === 'signin' ? onSignIn : onSignUp
    const success = await action(email, password)
    if (success) {
      setPassword('')
    }
  }

  const handleSignOut = async () => {
    if (disabled) return
    await onSignOut()
  }

  const userLabel = user?.email ?? (user ? `User ${user.id.slice(0, 6)}` : '')

  return (
    <section className="rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-5 shadow-lg shadow-black/30">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--sway-muted)]">
          Account
        </p>
        <h2 className="text-xl font-semibold text-[color:var(--sway-text)]">
          {user ? 'You are signed in' : 'Create an account or sign in'}
        </h2>
        <p className="text-sm text-[color:var(--sway-muted)]">
          {user
            ? 'Manage your session to publish and vote.'
            : 'Email sign-in is powered by Supabase.'}
        </p>
      </div>

      {disabled ? (
        <div className="mt-4 rounded-xl border border-[color:var(--sway-accent)] bg-[color:var(--sway-accent-soft)] p-3 text-sm text-[color:var(--sway-accent)]">
          Add your Supabase credentials to enable authentication.
        </div>
      ) : user ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[color:var(--sway-text)]">{userLabel}</p>
            <p className="text-xs text-[color:var(--sway-muted)]">Signed in</p>
          </div>
          <MotionButton
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleSignOut}
            disabled={loading}
            className="rounded-full border border-[color:var(--sway-border)] px-4 py-2 text-sm font-semibold text-[color:var(--sway-text)] transition hover:border-[color:var(--sway-accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Sign out
          </MotionButton>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="inline-flex rounded-full border border-[color:var(--sway-border)] bg-[color:var(--sway-bg)] p-1">
            {[
              { value: 'signin', label: 'Sign in' },
              { value: 'signup', label: 'Create account' },
            ].map((option) => (
              <MotionButton
                key={option.value}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => setMode(option.value)}
                className={`rounded-full px-4 py-1 text-sm transition ${
                  mode === option.value
                    ? 'bg-[color:var(--sway-accent)] text-[color:var(--sway-bg)]'
                    : 'text-[color:var(--sway-muted)] hover:text-[color:var(--sway-text)]'
                }`}
              >
                {option.label}
              </MotionButton>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm text-[color:var(--sway-muted)]">
              Email address
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[color:var(--sway-border)] bg-[color:var(--sway-bg)] px-4 py-2 text-sm text-[color:var(--sway-text)] outline-none transition focus:border-[color:var(--sway-accent)] focus:ring-2 focus:ring-[color:var(--sway-accent-ring)]"
                placeholder="you@example.com"
              />
            </label>
            <label className="block text-sm text-[color:var(--sway-muted)]">
              Password
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[color:var(--sway-border)] bg-[color:var(--sway-bg)] px-4 py-2 text-sm text-[color:var(--sway-text)] outline-none transition focus:border-[color:var(--sway-accent)] focus:ring-2 focus:ring-[color:var(--sway-accent-ring)]"
                placeholder="Enter a secure password"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-[color:var(--sway-accent-2)] bg-[color:var(--sway-accent-2-soft)] p-3 text-xs text-[color:var(--sway-accent-2)]">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-xl border border-[color:var(--sway-accent)] bg-[color:var(--sway-accent-soft)] p-3 text-xs text-[color:var(--sway-accent)]">
                {info}
              </div>
            )}

            <MotionButton
              type="submit"
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              className="w-full rounded-full bg-[color:var(--sway-accent)] px-4 py-2 text-sm font-semibold text-[color:var(--sway-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[color:var(--sway-border)] disabled:text-[color:var(--sway-muted)]"
            >
              {loading
                ? 'Working...'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </MotionButton>
          </form>
          <div className="text-center text-xs text-[color:var(--sway-muted)]">
            Forgot your password?{' '}
            <Link to="/reset-password" className="text-[color:var(--sway-accent)] hover:opacity-90">
              Reset it
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}

export default AuthPanel
