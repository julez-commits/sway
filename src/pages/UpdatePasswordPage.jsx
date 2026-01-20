import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const MotionButton = motion.button

const UpdatePasswordPage = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [hasSession, setHasSession] = useState(false)

  const supabaseReady = Boolean(supabase)

  useEffect(() => {
    if (!supabaseReady) return
    let active = true
    const checkSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!active) return
      if (sessionError) {
        setError('Unable to read your reset session.')
        return
      }
      setHasSession(Boolean(data.session))
    }
    checkSession()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setHasSession(Boolean(session))
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabaseReady])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!supabaseReady) {
      setError('Add Supabase credentials to update your password.')
      return
    }
    if (!hasSession) {
      setError('Open the reset link from your email to continue.')
      return
    }
    if (!password || password.length < 8) {
      setError('Use a password that is at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    setInfo('')
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })
    setLoading(false)
    if (updateError) {
      setError(updateError.message || 'Unable to update password.')
      return
    }
    setInfo('Password updated. You can now sign in.')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="min-h-screen bg-[color:var(--sway-bg)] text-[color:var(--sway-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--sway-muted)]">
                Sway
              </p>
              <h1 className="text-3xl font-semibold text-[color:var(--sway-text)]">
                Set new password
              </h1>
            </div>
            <Link
              to="/auth"
              className="rounded-full border border-[color:var(--sway-border)] px-4 py-2 text-xs font-semibold text-[color:var(--sway-text)] transition hover:border-[color:var(--sway-accent)]"
            >
              Back to sign in
            </Link>
          </div>
          <p className="text-sm text-[color:var(--sway-muted)]">
            Choose a new password to finish the reset.
          </p>
        </header>

        <section className="rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-5 shadow-lg shadow-black/30">
          {!hasSession && (
            <div className="rounded-xl border border-[color:var(--sway-accent)] bg-[color:var(--sway-accent-soft)] p-3 text-sm text-[color:var(--sway-accent)]">
              Open the password reset email to continue.
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="block text-sm text-[color:var(--sway-muted)]">
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[color:var(--sway-border)] bg-[color:var(--sway-bg)] px-4 py-2 text-sm text-[color:var(--sway-text)] outline-none transition focus:border-[color:var(--sway-accent)] focus:ring-2 focus:ring-[color:var(--sway-accent-ring)]"
                placeholder="Enter a new password"
              />
            </label>
            <label className="block text-sm text-[color:var(--sway-muted)]">
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[color:var(--sway-border)] bg-[color:var(--sway-bg)] px-4 py-2 text-sm text-[color:var(--sway-text)] outline-none transition focus:border-[color:var(--sway-accent)] focus:ring-2 focus:ring-[color:var(--sway-accent-ring)]"
                placeholder="Re-enter your password"
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
              disabled={loading || !hasSession}
              className="w-full rounded-full bg-[color:var(--sway-accent)] px-4 py-2 text-sm font-semibold text-[color:var(--sway-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[color:var(--sway-border)] disabled:text-[color:var(--sway-muted)]"
            >
              {loading ? 'Updating...' : 'Update password'}
            </MotionButton>
          </form>
        </section>
      </div>
    </div>
  )
}

export default UpdatePasswordPage
