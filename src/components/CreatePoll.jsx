import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import TemplateGallery from './TemplateGallery'

const templates = [
  'Would you {{input}}?',
  'Is {{input}} worth it?',
  'Should I {{input}}?',
]

const MotionButton = motion.button

const CreatePoll = ({ onCreate, disabled, loading, helperText }) => {
  const [text, setText] = useState('')
  const inputRef = useRef(null)

  const handleTemplateSelect = (template) => {
    const marker = '{{input}}'
    setText(template)
    requestAnimationFrame(() => {
      if (!inputRef.current) return
      inputRef.current.focus()
      const start = template.indexOf(marker)
      if (start !== -1) {
        inputRef.current.setSelectionRange(start, start + marker.length)
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const value = text.trim()
    if (!value || disabled || loading) return
    const success = await onCreate(value)
    if (success) {
      setText('')
    }
  }

  return (
    <section className="rounded-2xl border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] p-5 shadow-lg shadow-black/30">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--sway-muted)]">
          Create a poll
        </p>
        <h2 className="text-xl font-semibold text-[color:var(--sway-text)]">
          Ask something worth debating
        </h2>
        <p className="text-sm text-[color:var(--sway-muted)]">
          Pick a template or drop your own question.
        </p>
      </div>
      <div className="mt-4 space-y-4">
        <TemplateGallery templates={templates} onSelect={handleTemplateSelect} />
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="text-sm font-medium text-[color:var(--sway-muted)]" htmlFor="poll-text">
            Your question
          </label>
          <textarea
            id="poll-text"
            ref={inputRef}
            rows={2}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type your question..."
            disabled={disabled}
            className="w-full resize-none rounded-xl border border-[color:var(--sway-border)] bg-[color:var(--sway-bg)] px-4 py-3 text-sm text-[color:var(--sway-text)] outline-none transition focus:border-[color:var(--sway-accent)] focus:ring-2 focus:ring-[color:var(--sway-accent-ring)] disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[color:var(--sway-muted)]">{helperText}</p>
            <MotionButton
              type="submit"
              whileTap={{ scale: 0.97 }}
              disabled={disabled || loading}
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--sway-accent)] px-5 py-2 text-sm font-semibold text-[color:var(--sway-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[color:var(--sway-border)] disabled:text-[color:var(--sway-muted)]"
            >
              {loading ? 'Publishing...' : 'Publish poll'}
            </MotionButton>
          </div>
        </form>
      </div>
    </section>
  )
}

export default CreatePoll
