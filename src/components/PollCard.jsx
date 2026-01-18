import { motion } from 'framer-motion'

const HOURS_24 = 24 * 60 * 60 * 1000

const formatCountdown = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

const PollCard = ({
  poll,
  now,
  hasVoted,
  onVote,
  isResultOnly,
  isVoting,
}) => {
  const yesVotes = poll.yes_votes ?? 0
  const noVotes = poll.no_votes ?? 0
  const totalVotes = yesVotes + noVotes
  const yesPercent = totalVotes ? Math.round((yesVotes / totalVotes) * 100) : 0
  const noPercent = totalVotes ? Math.round((noVotes / totalVotes) * 100) : 0

  const createdAt = new Date(poll.created_at)
  const expiresAt = createdAt.getTime() + HOURS_24
  const remaining = expiresAt - now
  const isActive = remaining > 0
  const statusLabel = isActive
    ? `Closes in ${formatCountdown(remaining)}`
    : 'Closed'

  const voteDisabled = !isActive || hasVoted || isVoting

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-800/40 p-5 shadow-lg shadow-slate-950/30">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.24em] ${
                isActive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {statusLabel}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              {poll.text_content}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Created {createdAt.toLocaleString()}
            </p>
          </div>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
            {totalVotes} votes
          </span>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Yes</span>
              <span>
                {yesPercent}% · {yesVotes}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-900/70">
              <motion.div
                className="h-2 rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${yesPercent}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>No</span>
              <span>
                {noPercent}% · {noVotes}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-900/70">
              <motion.div
                className="h-2 rounded-full bg-rose-500"
                initial={{ width: 0 }}
                animate={{ width: `${noPercent}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
        </div>

        {isResultOnly ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
            Results only
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              disabled={voteDisabled}
              onClick={() => onVote(poll.id, 'yes')}
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
            >
              Vote Yes
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              disabled={voteDisabled}
              onClick={() => onVote(poll.id, 'no')}
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
            >
              Vote No
            </motion.button>
          </div>
        )}

        {hasVoted && !isResultOnly && (
          <p className="text-xs text-slate-500">Vote locked for this poll.</p>
        )}
      </div>
    </article>
  )
}

export default PollCard
