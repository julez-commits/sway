import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CreatePoll from '../components/CreatePoll'
import PollCard from '../components/PollCard'
import { supabase } from '../lib/supabaseClient'

const HOURS_24 = 24 * 60 * 60 * 1000

const isPollActive = (poll, now) =>
  new Date(poll.created_at).getTime() + HOURS_24 > now

const sortByNewest = (list) =>
  [...list].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

const upsertPoll = (list, poll) => {
  const without = list.filter((item) => item.id !== poll.id)
  return sortByNewest([poll, ...without])
}

const getVoteStorageKey = (userId) => `sway_votes_${userId}`

const loadVoteState = (userId) => {
  if (!userId) return new Set()
  try {
    const raw = localStorage.getItem(getVoteStorageKey(userId))
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

const persistVoteState = (userId, voteSet) => {
  if (!userId) return
  localStorage.setItem(getVoteStorageKey(userId), JSON.stringify([...voteSet]))
}

const MotionButton = motion.button

const HomePage = () => {
  const [polls, setPolls] = useState([])
  const [filter, setFilter] = useState('active')
  const [view, setView] = useState('feed')
  const [now, setNow] = useState(0)
  const [user, setUser] = useState(null)
  const [isFetching, setIsFetching] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [error, setError] = useState('')
  const [votedSet, setVotedSet] = useState(() => new Set())
  const [votePendingIds, setVotePendingIds] = useState(() => new Set())

  const supabaseReady = Boolean(supabase)
  const navigate = useNavigate()

  useEffect(() => {
    const initial = setTimeout(() => setNow(Date.now()), 0)
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearTimeout(initial)
      clearInterval(timer)
    }
  }, [])

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

  useEffect(() => {
    if (!supabaseReady) return

    const fetchPolls = async () => {
      setIsFetching(true)
      const { data, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false })
      if (fetchError) {
        setError('Unable to load polls.')
      } else {
        setPolls(data ?? [])
      }
      setIsFetching(false)
    }

    fetchPolls()
  }, [supabaseReady])

  useEffect(() => {
    if (!supabaseReady) return

    const channel = supabase
      .channel('questions-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        (payload) => {
          setPolls((prev) => {
            if (payload.eventType === 'INSERT') {
              return upsertPoll(prev, payload.new)
            }
            if (payload.eventType === 'UPDATE') {
              return upsertPoll(prev, payload.new)
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((poll) => poll.id !== payload.old.id)
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabaseReady])

  useEffect(() => {
    const syncVotes = setTimeout(() => {
      if (!user) {
        setVotedSet(new Set())
        return
      }
      setVotedSet(loadVoteState(user.id))
    }, 0)
    return () => clearTimeout(syncVotes)
  }, [user])

  const setVotePending = useCallback((pollId, pending) => {
    setVotePendingIds((prev) => {
      const next = new Set(prev)
      if (pending) {
        next.add(pollId)
      } else {
        next.delete(pollId)
      }
      return next
    })
  }, [])

  const recordVote = useCallback(
    (pollId) => {
      if (!user) return
      setVotedSet((prev) => {
        const next = new Set(prev)
        next.add(pollId)
        persistVoteState(user.id, next)
        return next
      })
    },
    [user]
  )

  const handleSignOut = useCallback(async () => {
    if (!supabaseReady) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError('Unable to sign out.')
      return
    }
    setUser(null)
    navigate('/auth', { replace: true })
  }, [supabaseReady, navigate])

  const handleCreatePoll = useCallback(
    async (text) => {
      if (!supabaseReady) {
        setError('Add Supabase credentials to .env before publishing polls.')
        return false
      }
      if (!user) {
        setError('Sign in to publish polls.')
        return false
      }
      setError('')
      setCreateLoading(true)
      const { data, error: createError } = await supabase
        .from('questions')
        .insert({
          user_id: user.id,
          text_content: text,
        })
        .select()
        .single()

      setCreateLoading(false)

      if (createError) {
        setError('Unable to publish poll.')
        return false
      }

      if (data) {
        setPolls((prev) => upsertPoll(prev, data))
      }

      return true
    },
    [supabaseReady, user]
  )

  const handleVote = useCallback(
    async (pollId, choice) => {
      if (!supabaseReady) {
        setError('Configure Supabase to cast votes.')
        return
      }
      if (!user) {
        setError('Sign in to cast votes.')
        return
      }
      const poll = polls.find((item) => item.id === pollId)
      if (!poll) return
      if (!isPollActive(poll, now)) return
      if (votedSet.has(pollId)) return

      setError('')
      setVotePending(pollId, true)

      const yesVotes = poll.yes_votes ?? 0
      const noVotes = poll.no_votes ?? 0
      const updates =
        choice === 'yes' ? { yes_votes: yesVotes + 1 } : { no_votes: noVotes + 1 }

      const { data, error: voteError } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', pollId)
        .select()
        .single()

      setVotePending(pollId, false)

      if (voteError) {
        setError('Unable to record vote.')
        return
      }

      if (data) {
        setPolls((prev) => upsertPoll(prev, data))
        recordVote(pollId)
      }
    },
    [supabaseReady, user, polls, now, votedSet, recordVote, setVotePending]
  )

  const effectiveFilter = view === 'mine' ? 'closed' : filter

  const visiblePolls = useMemo(() => {
    let list = polls
    if (view === 'mine') {
      list = user ? list.filter((poll) => poll.user_id === user.id) : []
    }
    return list.filter((poll) =>
      effectiveFilter === 'active'
        ? isPollActive(poll, now)
        : !isPollActive(poll, now)
    )
  }, [polls, view, user, now, effectiveFilter])

  const emptyMessage = view === 'mine'
    ? user
      ? 'No closed polls yet.'
      : 'Sign in to see your polls.'
    : effectiveFilter === 'active'
      ? 'No active polls yet.'
      : 'No closed polls yet.'

  const userLabel = user?.email ?? (user ? `User ${user.id.slice(0, 6)}` : '')
  const signedInHint = userLabel ? `Signed in as ${userLabel}. ` : ''
  const helperText = !supabaseReady
    ? 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to publish.'
    : user
      ? `${signedInHint}Polls close exactly 24 hours after they are created.`
      : 'Sign in on the account page to publish new polls.'

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Sway
              </p>
              <h1 className="text-3xl font-semibold text-white">Sway</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                Live polls
              </span>
              {user ? (
                <MotionButton
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={handleSignOut}
                  className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
                >
                  Sign out
                </MotionButton>
              ) : (
                <Link
                  to="/auth"
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-400">
            Ask fast questions and watch the room sway in real time.
          </p>
        </header>

        <CreatePoll
          onCreate={handleCreatePoll}
          disabled={!supabaseReady || !user}
          loading={createLoading}
          helperText={helperText}
        />

        {!supabaseReady && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            Add Supabase credentials in <span className="font-semibold">.env</span>{' '}
            to load and publish polls.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-full border border-slate-800 bg-slate-900/80 p-1">
            {[
              { value: 'feed', label: 'Feed' },
              { value: 'mine', label: 'My Polls' },
            ].map((option) => (
              <MotionButton
                key={option.value}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => setView(option.value)}
                className={`rounded-full px-4 py-1 text-sm transition ${
                  view === option.value
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
              </MotionButton>
            ))}
          </div>
          <div className="inline-flex rounded-full border border-slate-800 bg-slate-900/80 p-1">
            {[
              { value: 'active', label: 'Active' },
              { value: 'closed', label: 'Closed' },
            ].map((option) => {
              const isDisabled = view === 'mine' && option.value === 'active'
              return (
                <MotionButton
                  key={option.value}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setFilter(option.value)}
                  className={`rounded-full px-4 py-1 text-sm transition ${
                    effectiveFilter === option.value
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  } ${isDisabled ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  {option.label}
                </MotionButton>
              )
            })}
          </div>
        </div>

        {view === 'mine' && (
          <p className="text-xs text-slate-500">
            My Polls shows closed results only.
          </p>
        )}

        <section className="space-y-4 pb-8">
          {isFetching ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
              Loading polls...
            </div>
          ) : visiblePolls.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
              {emptyMessage}
            </div>
          ) : (
            visiblePolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                now={now}
                onVote={handleVote}
                hasVoted={votedSet.has(poll.id)}
                isResultOnly={view === 'mine'}
                isVoting={votePendingIds.has(poll.id)}
              />
            ))
          )}
        </section>
      </div>
    </div>
  )
}

export default HomePage
