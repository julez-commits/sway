import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PollCard from '../components/PollCard'
import { supabase } from '../lib/supabaseClient'

const getAnsweredStorageKey = (userId) => `sway_answered_${userId}`

const loadAnsweredQuestions = (userId) => {
  if (!userId) return []
  try {
    const stored = localStorage.getItem(getAnsweredStorageKey(userId))
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const MotionButton = motion.button

const MySwayPage = () => {
  const [user, setUser] = useState(null)
  const [polls, setPolls] = useState([])
  const [answeredData, setAnsweredData] = useState([])
  const [isFetching, setIsFetching] = useState(true)
  const [now, setNow] = useState(Date.now())
  const navigate = useNavigate()

  const supabaseReady = Boolean(supabase)

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
        return
      }
      const currentUser = data.session?.user ?? null
      setUser(currentUser)
      if (!currentUser) {
        navigate('/auth', { replace: true })
        return
      }
      const answered = loadAnsweredQuestions(currentUser.id)
      setAnsweredData(answered)
    }

    initAuth()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (!currentUser) {
          navigate('/auth', { replace: true })
        } else {
          const answered = loadAnsweredQuestions(currentUser.id)
          setAnsweredData(answered)
        }
      }
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [supabaseReady, navigate])

  useEffect(() => {
    if (!supabaseReady || !user || answeredData.length === 0) {
      setIsFetching(false)
      return
    }

    const fetchPolls = async () => {
      setIsFetching(true)
      const pollIds = answeredData.map(a => a.pollId)
      const { data, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .in('id', pollIds)
      
      if (fetchError) {
        setIsFetching(false)
        return
      }

      // Sort by answered date descending (most recent first)
      const sorted = (data ?? []).sort((a, b) => {
        const aAnswered = answeredData.find(ad => ad.pollId === a.id)
        const bAnswered = answeredData.find(ad => ad.pollId === b.id)
        if (!aAnswered || !bAnswered) return 0
        return new Date(bAnswered.answeredAt).getTime() - new Date(aAnswered.answeredAt).getTime()
      }).slice(0, 20)

      setPolls(sorted)
      setIsFetching(false)
    }

    fetchPolls()
  }, [supabaseReady, user, answeredData])

  const answeredCount = answeredData.length

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
                My Sway
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
            Your recently answered questions
          </p>
        </header>

        <div className="rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-4 text-sm text-[color:var(--sway-text)]">
          Questions I've answered: {answeredCount}
        </div>

        <section className="space-y-4 pb-8">
          {isFetching ? (
            <div className="rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-4 text-sm text-[color:var(--sway-muted)]">
              Loading your answered questions...
            </div>
          ) : polls.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-4 text-sm text-[color:var(--sway-muted)]">
              You haven't answered any questions yet. Start answering questions in the feed!
            </div>
          ) : (
            polls.map((poll) => {
              const answeredInfo = answeredData.find(a => a.pollId === poll.id)
              return (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  now={now}
                  onVote={() => null}
                  hasVoted={true}
                  isResultOnly
                  isVoting={false}
                />
              )
            })
          )}
        </section>
      </div>
    </div>
  )
}

export default MySwayPage
