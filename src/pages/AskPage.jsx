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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return
        setUser(session?.user ?? null)
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
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
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Sway
              </p>
              <h1 className="text-3xl font-semibold text-white">Ask a question</h1>
            </div>
            <Link
              to="/"
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Back to feed
            </Link>
          </div>
          <p className="text-sm text-slate-400">
            Share a question and let the room sway.
          </p>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
            Need to sign in?{' '}
            <Link to="/auth" className="text-emerald-300 hover:text-emerald-200">
              Go to the login page.
            </Link>
          </div>
        )}

        <div className="flex justify-end">
          <MotionButton
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
          >
            Back to feed
          </MotionButton>
        </div>
      </div>
    </div>
  )
}

export default AskPage
