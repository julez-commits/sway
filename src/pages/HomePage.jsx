import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PollCard from '../components/PollCard'
import { supabase } from '../lib/supabaseClient'

const HOURS_24 = 24 * 60 * 60 * 1000

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 240 : -240,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -240 : 240,
    opacity: 0,
  }),
}

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

const getAnswerStorageKey = (userId) => `sway_answers_${userId}`
const getLegacyVoteKey = (userId) => `sway_votes_${userId}`

const loadAnswerState = (userId) => {
  if (!userId) return new Set()
  try {
    const stored = localStorage.getItem(getAnswerStorageKey(userId))
    const legacy = localStorage.getItem(getLegacyVoteKey(userId))
    const answers = stored ? JSON.parse(stored) : []
    const legacyAnswers = legacy ? JSON.parse(legacy) : []
    return new Set([...answers, ...legacyAnswers])
  } catch {
    return new Set()
  }
}

const persistAnswerState = (userId, answerSet) => {
  if (!userId) return
  localStorage.setItem(
    getAnswerStorageKey(userId),
    JSON.stringify([...answerSet])
  )
}

const MotionButton = motion.button

const HomePage = () => {
  const [polls, setPolls] = useState([])
  const [filter, setFilter] = useState('active')
  const [view, setView] = useState('feed')
  const [now, setNow] = useState(0)
  const [user, setUser] = useState(null)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState('')
  const [answeredSet, setAnsweredSet] = useState(() => new Set())
  const [answerLoading, setAnswerLoading] = useState(false)
  const [slideDirection, setSlideDirection] = useState(1)
  const [currentPollId, setCurrentPollId] = useState(null)

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
    const syncAnswers = setTimeout(() => {
      if (!user) {
        setAnsweredSet(new Set())
        return
      }
      setAnsweredSet(loadAnswerState(user.id))
    }, 0)
    return () => clearTimeout(syncAnswers)
  }, [user])

  const recordAnswer = useCallback(
    (pollId) => {
      if (!user) return
      setAnsweredSet((prev) => {
        const next = new Set(prev)
        next.add(pollId)
        persistAnswerState(user.id, next)
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

  const handleAnswer = useCallback(
    async (poll, choice) => {
      if (!poll || answerLoading) return
      if (!supabaseReady) {
        setError('Configure Supabase to answer questions.')
        return
      }
      if (!user) {
        setError('Sign in to answer questions.')
        return
      }
      setSlideDirection(1)
      setError('')

      if (choice === 'skip') {
        recordAnswer(poll.id)
        return
      }

      setAnswerLoading(true)
      const yesVotes = poll.yes_votes ?? 0
      const noVotes = poll.no_votes ?? 0
      const updates =
        choice === 'yes' ? { yes_votes: yesVotes + 1 } : { no_votes: noVotes + 1 }

      const { data, error: voteError } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', poll.id)
        .select()
        .single()

      setAnswerLoading(false)

      if (voteError) {
        setError('Unable to record vote.')
        return
      }

      if (data) {
        setPolls((prev) => upsertPoll(prev, data))
      }

      recordAnswer(poll.id)
    },
    [answerLoading, supabaseReady, user, recordAnswer]
  )

  const activePolls = useMemo(
    () => polls.filter((poll) => isPollActive(poll, now)),
    [polls, now]
  )
  const unansweredPolls = useMemo(
    () => activePolls.filter((poll) => !answeredSet.has(poll.id)),
    [activePolls, answeredSet]
  )
  useEffect(() => {
    if (view !== 'feed') return
    const syncCurrent = setTimeout(() => {
      if (unansweredPolls.length === 0) {
        setCurrentPollId(null)
        return
      }
      setCurrentPollId((prev) => {
        if (prev && unansweredPolls.some((poll) => poll.id === prev)) {
          return prev
        }
        return unansweredPolls[0].id
      })
    }, 0)
    return () => clearTimeout(syncCurrent)
  }, [unansweredPolls, view])

  const currentPoll = useMemo(() => {
    if (unansweredPolls.length === 0) return null
    const match = unansweredPolls.find((poll) => poll.id === currentPollId)
    return match ?? unansweredPolls[0]
  }, [unansweredPolls, currentPollId])

  const myPolls = useMemo(() => {
    if (!user) return []
    const list = polls.filter((poll) => poll.user_id === user.id)
    return list.filter((poll) =>
      filter === 'active' ? isPollActive(poll, now) : !isPollActive(poll, now)
    )
  }, [polls, user, filter, now])

  const emptyMyPollMessage = user
    ? filter === 'active'
      ? 'No active polls yet.'
      : 'No closed polls yet.'
    : 'Sign in to see your polls.'

  const emptyFeedLabel = isFetching ? 'Loading questions...' : 'Awaiting more questions'

  const answerDisabled = answerLoading || !user || !supabaseReady

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {user && (
        <MotionButton
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/ask')}
          className="fixed right-6 top-6 z-50 rounded-full bg-emerald-500 px-5 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
        >
          Ask
        </MotionButton>
      )}
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
            Answer the current question or skip to keep the feed moving.
          </p>
        </header>

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

        {!user && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
            Sign in to answer questions.{' '}
            <Link to="/auth" className="text-emerald-300 hover:text-emerald-200">
              Go to login.
            </Link>
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
          {view === 'mine' && (
            <div className="inline-flex rounded-full border border-slate-800 bg-slate-900/80 p-1">
              {[
                { value: 'active', label: 'Active' },
                { value: 'closed', label: 'Closed' },
              ].map((option) => (
                <MotionButton
                  key={option.value}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-full px-4 py-1 text-sm transition ${
                    filter === option.value
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {option.label}
                </MotionButton>
              ))}
            </div>
          )}
        </div>

        {view === 'feed' ? (
          <section className="relative min-h-[360px] overflow-hidden pb-8">
            <AnimatePresence custom={slideDirection} mode="wait">
              <motion.div
                key={currentPoll ? currentPoll.id : 'empty'}
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                className="absolute inset-0"
              >
                <div className="flex h-full flex-col items-center justify-center gap-6">
                  <div className="w-full rounded-3xl bg-slate-100 px-6 py-10 text-center text-lg font-semibold text-slate-900 shadow-2xl shadow-slate-950/30">
                    {currentPoll ? currentPoll.text_content : emptyFeedLabel}
                  </div>
                  {currentPoll ? (
                    <div className="w-full space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <MotionButton
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          disabled={answerDisabled}
                          onClick={() => handleAnswer(currentPoll, 'yes')}
                          className="rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                        >
                          Yes
                        </MotionButton>
                        <MotionButton
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          disabled={answerDisabled}
                          onClick={() => handleAnswer(currentPoll, 'no')}
                          className="rounded-2xl bg-rose-500 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                        >
                          No
                        </MotionButton>
                      </div>
                      <MotionButton
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        disabled={answerDisabled}
                        onClick={() => handleAnswer(currentPoll, 'skip')}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-800 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Skip
                      </MotionButton>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Check back soon for the next question.
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </section>
        ) : (
          <section className="space-y-4 pb-8">
            {isFetching ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                Loading polls...
              </div>
            ) : myPolls.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                {emptyMyPollMessage}
              </div>
            ) : (
              myPolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  now={now}
                  onVote={() => null}
                  hasVoted={false}
                  isResultOnly
                  isVoting={false}
                />
              ))
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export default HomePage
