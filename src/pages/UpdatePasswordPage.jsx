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
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Sway
              </p>
              <h1 className="text-3xl font-semibold text-white">Set new password</h1>
            </div>
            <Link
              to="/auth"
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Back to sign in
            </Link>
          </div>
          <p className="text-sm text-slate-400">
            Choose a new password to finish the reset.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/40">
          {!hasSession && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              Open the password reset email to continue.
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="block text-sm text-slate-300">
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                placeholder="Enter a new password"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                placeholder="Re-enter your password"
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
              disabled={loading || !hasSession}
              className="w-full rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
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
