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
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Sway
              </p>
              <h1 className="text-3xl font-semibold text-white">Reset password</h1>
            </div>
            <Link
              to="/auth"
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Back to sign in
            </Link>
          </div>
          <p className="text-sm text-slate-400">
            We will email you a secure reset link.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/40">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? 'Sending...' : 'Send reset link'}
            </MotionButton>
          </form>
        </section>

        <p className="text-xs text-slate-500">
          If you no longer need a reset, you can return to the{' '}
          <Link to="/" className="text-emerald-300 hover:text-emerald-200">
            Sway feed
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

export default ResetPasswordPage
