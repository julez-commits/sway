import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const MotionButton = motion.button

const ResetPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const supabaseReady = Boolean(supabase)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!supabaseReady) {
      setError('Add Supabase credentials to reset your password.')
      return
    }
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Enter the email associated with your account.')
      return
    }
    setLoading(true)
    setError('')
    setInfo('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      trimmedEmail,
      {
        redirectTo: `${window.location.origin}/update-password`,
      }
    )
    setLoading(false)
    if (resetError) {
      setError(resetError.message || 'Unable to send reset email.')
      return
    }
    setInfo('Check your inbox for a reset link.')
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
                Reset password
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
            We will email you a secure reset link.
          </p>
        </header>

        <section className="rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-5 shadow-lg shadow-black/30">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? 'Sending...' : 'Send reset link'}
            </MotionButton>
          </form>
        </section>

        <p className="text-xs text-[color:var(--sway-muted)]">
          If you no longer need a reset, you can return to the{' '}
          <Link to="/" className="text-[color:var(--sway-accent)] hover:opacity-90">
            Sway feed
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

export default ResetPasswordPage
