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
const getAnsweredStorageKey = (userId) => `sway_answered_${userId}`

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

const loadAnsweredQuestions = (userId) => {
  if (!userId) return []
  try {
    const stored = localStorage.getItem(getAnsweredStorageKey(userId))
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const persistAnsweredQuestion = (userId, pollId, choice, answeredAt) => {
  if (!userId) return
  const answered = loadAnsweredQuestions(userId)
  const updated = [{ pollId, choice, answeredAt }, ...answered.filter(a => a.pollId !== pollId)].slice(0, 20)
  localStorage.setItem(getAnsweredStorageKey(userId), JSON.stringify(updated))
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
  const [showThumb, setShowThumb] = useState(null)
  const [reports, setReports] = useState({})
  const [reportThankYou, setReportThankYou] = useState(false)
  const [reporting, setReporting] = useState(false)

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
      if (!data.session?.user) {
        navigate('/auth', { replace: true })
      }
    }

    initAuth()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return
        setUser(session?.user ?? null)
        if (!session?.user) {
          navigate('/auth', { replace: true })
        }
      }
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [supabaseReady, navigate])

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
        setIsFetching(false)
        return
      }

      // Fetch reports
      const { data: reportsData } = await supabase
        .from('reports')
        .select('question_id')
      
      // Count reports per question
      const reportCounts = {}
      if (reportsData) {
        reportsData.forEach((report) => {
          reportCounts[report.question_id] = (reportCounts[report.question_id] || 0) + 1
        })
      }
      setReports(reportCounts)

      // Filter out questions with 3+ reports
      const filteredPolls = (data ?? []).filter((poll) => (reportCounts[poll.id] || 0) < 3)
      setPolls(filteredPolls)
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
      persistAnsweredQuestion(user.id, poll.id, choice, new Date().toISOString())
      
      // Show thumb animation
      setShowThumb(choice === 'yes' ? 'up' : 'down')
      setTimeout(() => setShowThumb(null), 800)
    },
    [answerLoading, supabaseReady, user, recordAnswer]
  )

  const handleReport = useCallback(
    async (poll) => {
      if (!poll || reporting) return
      if (!supabaseReady) {
        setError('Configure Supabase to report questions.')
        return
      }
      if (!user) {
        setError('Sign in to report questions.')
        return
      }
      setReporting(true)
      setError('')
      
      const { error: reportError } = await supabase
        .from('reports')
        .insert({
          question_id: poll.id,
          user_id: user.id,
        })
      
      setReporting(false)
      
      if (reportError) {
        if (reportError.code === '23505') {
          // Unique constraint violation - already reported
          setError('You have already reported this question.')
        } else {
          setError('Unable to report question.')
        }
        return
      }

      // Update local reports count
      setReports((prev) => ({
        ...prev,
        [poll.id]: (prev[poll.id] || 0) + 1,
      }))

      // Show thank you message
      setReportThankYou(true)
      setTimeout(() => {
        setReportThankYou(false)
        // If 3+ reports, remove from feed
        const newReportCount = (reports[poll.id] || 0) + 1
        if (newReportCount >= 3) {
          setPolls((prev) => prev.filter((p) => p.id !== poll.id))
          setCurrentPollId((prev) => (prev === poll.id ? null : prev))
        }
      }, 2000)
    },
    [reporting, supabaseReady, user, reports]
  )

  const activePolls = useMemo(
    () => polls.filter((poll) => isPollActive(poll, now)),
    [polls, now]
  )
  const unansweredPolls = useMemo(
    () => {
      const filtered = activePolls.filter(
        (poll) => 
          !answeredSet.has(poll.id) && 
          poll.user_id !== user?.id &&
          (reports[poll.id] || 0) < 3
      )
      return [...filtered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    },
    [activePolls, answeredSet, user, reports]
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
      ? "You haven't asked any questions yet."
      : 'No closed polls yet.'
    : 'Sign in to see your polls.'

  const emptyFeedLabel = isFetching ? 'Loading questions...' : 'Awaiting more questions'

  const answerDisabled = answerLoading || !user || !supabaseReady

  return (
    <div className="min-h-screen bg-[color:var(--sway-bg)] text-[color:var(--sway-text)]">
      {user && (
        <MotionButton
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/ask')}
          className="fixed right-6 bottom-6 z-50 rounded-full bg-[color:var(--sway-accent)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--sway-bg)] shadow-lg shadow-black/25 transition hover:opacity-90"
        >
          Ask
        </MotionButton>
      )}
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--sway-muted)]">
                Sway
              </p>
              <h1 className="text-3xl font-semibold text-[color:var(--sway-text)]">
                Sway
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <MotionButton
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate('/my-sway')}
                    className="rounded-full border border-[color:var(--sway-border)] px-4 py-2 text-xs font-semibold text-[color:var(--sway-text)] transition hover:border-[color:var(--sway-accent)]"
                  >
                    My Sway
                  </MotionButton>
                  <MotionButton
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={handleSignOut}
                    className="rounded-full border border-[color:var(--sway-border)] px-4 py-2 text-xs font-semibold text-[color:var(--sway-text)] transition hover:border-[color:var(--sway-accent)]"
                  >
                    Sign out
                  </MotionButton>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="rounded-full border border-[color:var(--sway-accent)] px-4 py-2 text-xs font-semibold text-[color:var(--sway-accent)] transition hover:bg-[color:var(--sway-accent-soft)]"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
          {view === 'feed' && (
            <p className="text-sm text-[color:var(--sway-muted)]">
              Answer the current question or skip to keep the feed moving.
            </p>
          )}
        </header>

        {!supabaseReady && (
          <div className="rounded-2xl border border-[color:var(--sway-accent)] bg-[color:var(--sway-accent-soft)] p-4 text-sm text-[color:var(--sway-accent)]">
            Add Supabase credentials in <span className="font-semibold">.env</span>{' '}
            to load and publish polls.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-[color:var(--sway-accent-2)] bg-[color:var(--sway-accent-2-soft)] p-4 text-sm text-[color:var(--sway-accent-2)]">
            {error}
          </div>
        )}

        {reportThankYou && (
          <div className="rounded-2xl border border-[color:var(--sway-accent)] bg-[color:var(--sway-accent-soft)] p-4 text-sm text-[color:var(--sway-accent)]">
            Thank you for keeping the Sway community safe!
          </div>
        )}

        {!user && (
          <div className="rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-4 text-sm text-[color:var(--sway-muted)]">
            Sign in to answer questions.{' '}
            <Link to="/auth" className="text-[color:var(--sway-accent)] hover:opacity-90">
              Go to login.
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-full border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-1">
            {[
              { value: 'feed', label: 'Feed' },
              { value: 'mine', label: 'Questions Asked' },
            ].map((option) => (
              <MotionButton
                key={option.value}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => setView(option.value)}
                className={`rounded-full px-4 py-1 text-sm transition ${
                  view === option.value
                    ? 'bg-[color:var(--sway-accent)] text-[color:var(--sway-bg)]'
                    : 'text-[color:var(--sway-muted)] hover:text-[color:var(--sway-text)]'
                }`}
              >
                {option.label}
              </MotionButton>
            ))}
          </div>
          {view === 'mine' && (
            <div className="inline-flex rounded-full border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-1">
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
                      ? 'bg-[color:var(--sway-accent)] text-[color:var(--sway-bg)]'
                      : 'text-[color:var(--sway-muted)] hover:text-[color:var(--sway-text)]'
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
            <AnimatePresence>
              {showThumb && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
                >
                  <span className="text-6xl">
                    {showThumb === 'up' ? '👍' : '👎'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
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
                  {currentPoll && (currentPoll.yes_votes || 0) + (currentPoll.no_votes || 0) > 0 && (
                    <p className="w-full text-center text-xs text-[color:var(--sway-muted)]">
                      {(currentPoll.yes_votes || 0) + (currentPoll.no_votes || 0)} people voted!
                    </p>
                  )}
                  <div className="w-full rounded-3xl bg-[color:var(--sway-card)] px-6 py-10 text-center text-lg font-semibold text-[color:var(--sway-text-dark)] shadow-2xl shadow-black/30">
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
                          className="rounded-2xl bg-[color:var(--sway-accent)] py-3 text-sm font-semibold text-[color:var(--sway-bg)] shadow-lg shadow-black/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[color:var(--sway-border)] disabled:text-[color:var(--sway-muted)]"
                        >
                          Yes
                        </MotionButton>
                        <MotionButton
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          disabled={answerDisabled}
                          onClick={() => handleAnswer(currentPoll, 'no')}
                          className="rounded-2xl bg-[color:var(--sway-accent-2)] py-3 text-sm font-semibold text-[color:var(--sway-bg)] shadow-lg shadow-black/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[color:var(--sway-border)] disabled:text-[color:var(--sway-muted)]"
                        >
                          No
                        </MotionButton>
                      </div>
                      <MotionButton
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        disabled={answerDisabled}
                        onClick={() => handleAnswer(currentPoll, 'skip')}
                        className="w-full rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] py-3 text-sm font-semibold text-[color:var(--sway-text)] transition hover:border-[color:var(--sway-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Skip
                      </MotionButton>
                      <MotionButton
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        disabled={!user || !supabaseReady || reporting}
                        onClick={() => handleReport(currentPoll)}
                        className="w-full rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] py-2 text-xs font-semibold text-[color:var(--sway-text)] transition hover:border-[color:var(--sway-accent-2)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Report
                      </MotionButton>
                    </div>
                  ) : (
                    <p className="text-xs text-[color:var(--sway-muted)]">
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
              <div className="rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-4 text-sm text-[color:var(--sway-muted)]">
                Loading polls...
              </div>
            ) : myPolls.length === 0 ? (
              <div className="rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-4 text-sm text-[color:var(--sway-muted)]">
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
