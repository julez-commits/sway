import { motion } from 'framer-motion'

const HOURS_24 = 24 * 60 * 60 * 1000
const MotionBar = motion.div
const MotionButton = motion.button

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
    <article className="rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-5 shadow-lg shadow-black/30">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.24em] ${
                isActive
                  ? 'text-[color:var(--sway-accent)]'
                  : 'text-[color:var(--sway-accent-2)]'
              }`}
            >
              {statusLabel}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[color:var(--sway-text)]">
              {poll.text_content}
            </h3>
            <p className="mt-1 text-xs text-[color:var(--sway-muted)]">
              Created {createdAt.toLocaleString()}
            </p>
          </div>
          <span className="rounded-full border border-[color:var(--sway-border)] px-3 py-1 text-xs text-[color:var(--sway-muted)]">
            {totalVotes} votes
          </span>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[color:var(--sway-muted)]">
              <span>Yes</span>
              <span>
                {yesPercent}% · {yesVotes}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[color:var(--sway-bg)]">
              <MotionBar
                className="h-2 rounded-full bg-[color:var(--sway-accent)]"
                initial={{ width: 0 }}
                animate={{ width: `${yesPercent}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[color:var(--sway-muted)]">
              <span>No</span>
              <span>
                {noPercent}% · {noVotes}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[color:var(--sway-bg)]">
              <MotionBar
                className="h-2 rounded-full bg-[color:var(--sway-accent-2)]"
                initial={{ width: 0 }}
                animate={{ width: `${noPercent}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
        </div>

        {isResultOnly ? (
          <div className="rounded-xl border border-[color:var(--sway-border)] bg-[color:var(--sway-bg)] px-3 py-2 text-xs text-[color:var(--sway-muted)]">
            Results only
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <MotionButton
              type="button"
              whileTap={{ scale: 0.97 }}
              disabled={voteDisabled}
              onClick={() => onVote(poll.id, 'yes')}
              className="rounded-xl border border-[color:var(--sway-accent)] bg-[color:var(--sway-accent)] py-2 text-sm font-semibold text-[color:var(--sway-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:border-[color:var(--sway-border)] disabled:bg-[color:var(--sway-surface)] disabled:text-[color:var(--sway-muted)]"
            >
              Vote Yes
            </MotionButton>
            <MotionButton
              type="button"
              whileTap={{ scale: 0.97 }}
              disabled={voteDisabled}
              onClick={() => onVote(poll.id, 'no')}
              className="rounded-xl border border-[color:var(--sway-accent-2)] bg-[color:var(--sway-accent-2)] py-2 text-sm font-semibold text-[color:var(--sway-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:border-[color:var(--sway-border)] disabled:bg-[color:var(--sway-surface)] disabled:text-[color:var(--sway-muted)]"
            >
              Vote No
            </MotionButton>
          </div>
        )}

        {hasVoted && !isResultOnly && (
          <p className="text-xs text-[color:var(--sway-muted)]">Vote locked for this poll.</p>
        )}
      </div>
    </article>
  )
}

export default PollCard
