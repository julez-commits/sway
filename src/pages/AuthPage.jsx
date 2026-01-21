import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthPanel from '../components/AuthPanel'
import { supabase } from '../lib/supabaseClient'

const MotionButton = motion.button

const AuthPage = () => {
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState('')
  const [authInfo, setAuthInfo] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const navigate = useNavigate()

  const supabaseReady = Boolean(supabase)

  useEffect(() => {
    if (!supabaseReady) return
    let active = true

    const initAuth = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!active) return
      if (sessionError) {
        setAuthError('Unable to access your session.')
        return
      }
      setAuthError('')
      setUser(data.session?.user ?? null)
    }

    initAuth()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return
        setUser(session?.user ?? null)
        if (session?.user) {
          setAuthError('')
        }
      }
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [supabaseReady])

  const handleSignIn = useCallback(
    async (email, password) => {
      if (!supabaseReady) {
        setAuthError('Add Supabase credentials to sign in.')
        return false
      }
      const trimmedEmail = email.trim()
      if (!trimmedEmail || !password) {
        setAuthError('Enter your email and password to continue.')
        return false
      }
      setAuthLoading(true)
      setAuthError('')
      setAuthInfo('')
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })
      setAuthLoading(false)
      if (signInError) {
        setAuthError(signInError.message || 'Unable to sign in.')
        return false
      }
      setAuthInfo('Signed in successfully.')
      setUser(data.user ?? null)
      navigate('/', { replace: true })
      return true
    },
    [supabaseReady, navigate]
  )

  const handleSignUp = useCallback(
    async (email, password) => {
      if (!supabaseReady) {
        setAuthError('Add Supabase credentials to create an account.')
        return false
      }
      const trimmedEmail = email.trim()
      if (!trimmedEmail || !password) {
        setAuthError('Enter your email and password to continue.')
        return false
      }
      setAuthLoading(true)
      setAuthError('')
      setAuthInfo('')
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      })
      setAuthLoading(false)
      if (signUpError) {
        setAuthError(signUpError.message || 'Unable to create account.')
        return false
      }
      if (!data.session) {
        setAuthInfo('Check your inbox to confirm your email address.')
        return true
      }
      setAuthInfo('Account created successfully.')
      setUser(data.user ?? null)
      navigate('/', { replace: true })
      return true
    },
    [supabaseReady, navigate]
  )

  const handleSignOut = useCallback(async () => {
    if (!supabaseReady) return
    setAuthLoading(true)
    setAuthError('')
    setAuthInfo('')
    const { error: signOutError } = await supabase.auth.signOut()
    setAuthLoading(false)
    if (signOutError) {
      setAuthError('Unable to sign out.')
      return
    }
    setUser(null)
    setAuthInfo('Signed out.')
  }, [supabaseReady])

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
                Account
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
            Sway - The ultimate consensus
          </p>
        </header>

        <AuthPanel
          user={user}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onSignOut={handleSignOut}
          loading={authLoading}
          error={authError}
          info={authInfo}
          disabled={!supabaseReady}
        />

        {!user && (
          <div className="rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-4 text-sm text-[color:var(--sway-muted)]">
            Need to reset your password?{' '}
            <Link to="/reset-password" className="text-[color:var(--sway-accent)] hover:opacity-90">
              Reset it here.
            </Link>
          </div>
        )}

        {user && (
          <div className="flex justify-end">
            <MotionButton
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/')}
              className="rounded-full bg-[color:var(--sway-accent)] px-5 py-2 text-sm font-semibold text-[color:var(--sway-bg)] transition hover:opacity-90"
            >
              Go to feed
            </MotionButton>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthPage
