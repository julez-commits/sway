import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CreatePoll from '../components/CreatePoll'
import { supabase } from '../lib/supabaseClient'

const MotionButton = motion.button

const AskPage = () => {
  const [user, setUser] = useState(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const supabaseReady = Boolean(supabase)

  useEffect(() => {
    if (!supabaseReady) return
    let active = true

    const initAuth = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!active) return
      if (sessionError) {
        setError('Unable to access your session.')
        return
      }
      setUser(data.session?.user ?? null)
    }

    initAuth()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return
        setUser(session?.user ?? null)
      }
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [supabaseReady])

  const handleCreatePoll = useCallback(
    async (text) => {
      if (!supabaseReady) {
        setError('Add Supabase credentials to publish your question.')
        return false
      }
      if (!user) {
        setError('Sign in to publish a question.')
        return false
      }
      setError('')
      setSuccess('')
      setCreateLoading(true)
      const { error: createError } = await supabase.from('questions').insert({
        user_id: user.id,
        text_content: text,
      })
      setCreateLoading(false)

      if (createError) {
        setError('Unable to publish your question.')
        return false
      }

      setSuccess('Thanks for asking! Returning you to the feed...')
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 1200)
      return true
    },
    [supabaseReady, user, navigate]
  )

  const helperText = !supabaseReady
    ? 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to publish.'
    : user
      ? 'Polls close exactly 24 hours after they are created.'
      : 'Sign in to publish your question.'

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
                Ask a question
              </h1>
            </div>
            <Link
              to="/"
              className="rounded-full border border-[color:var(--sway-border)] px-4 py-2 text-xs font-semibold text-[color:var(--sway-text)] transition hover:border-[color:var(--sway-accent)]"
            >
              Back to feed
            </Link>
          </div>
          <p className="text-sm text-[color:var(--sway-muted)]">
            Share a question and let the room sway.
          </p>
        </header>

        {error && (
          <div className="rounded-2xl border border-[color:var(--sway-accent-2)] bg-[color:var(--sway-accent-2-soft)] p-4 text-sm text-[color:var(--sway-accent-2)]">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-[color:var(--sway-accent)] bg-[color:var(--sway-accent-soft)] p-4 text-sm text-[color:var(--sway-accent)]">
            {success}
          </div>
        )}

        <CreatePoll
          onCreate={handleCreatePoll}
          disabled={!supabaseReady || !user}
          loading={createLoading}
          helperText={helperText}
        />

        {!user && (
          <div className="rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-4 text-sm text-[color:var(--sway-muted)]">
            Need to sign in?{' '}
            <Link to="/auth" className="text-[color:var(--sway-accent)] hover:opacity-90">
              Go to the login page.
            </Link>
          </div>
        )}

        <div className="flex justify-end">
          <MotionButton
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            className="rounded-full border border-[color:var(--sway-border)] px-4 py-2 text-xs font-semibold text-[color:var(--sway-text)] transition hover:border-[color:var(--sway-accent)]"
          >
            Back to feed
          </MotionButton>
        </div>
      </div>
    </div>
  )
}

export default AskPage
