import { useState } from 'react'
import { motion } from 'framer-motion'

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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/40">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Account
        </p>
        <h2 className="text-xl font-semibold text-white">
          {user ? 'You are signed in' : 'Create an account or sign in'}
        </h2>
        <p className="text-sm text-slate-400">
          {user
            ? 'Manage your session to publish and vote.'
            : 'Email sign-in is powered by Supabase.'}
        </p>
      </div>

      {disabled ? (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Add your Supabase credentials to enable authentication.
        </div>
      ) : user ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">{userLabel}</p>
            <p className="text-xs text-slate-500">Signed in</p>
          </div>
          <MotionButton
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleSignOut}
            disabled={loading}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Sign out
          </MotionButton>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="inline-flex rounded-full border border-slate-800 bg-slate-950/70 p-1">
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
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
              </MotionButton>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm text-slate-300">
              Email address
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                placeholder="you@example.com"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Password
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                placeholder="Enter a secure password"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                {info}
              </div>
            )}

            <MotionButton
              type="submit"
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              className="w-full rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              {loading
                ? 'Working...'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </MotionButton>
          </form>
        </div>
      )}
    </section>
  )
}

export default AuthPanel
