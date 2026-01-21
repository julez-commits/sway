import { motion } from 'framer-motion'

const highlightTemplate = (template) => {
  const marker = '{{input}}'
  const splitIndex = template.indexOf(marker)
  if (splitIndex === -1) {
    return template
  }

  return (
    <>
      {template.slice(0, splitIndex)}
      <span className="text-[color:var(--sway-accent)]">{marker}</span>
      {template.slice(splitIndex + marker.length)}
    </>
  )
}

const MotionButton = motion.button

const TemplateGallery = ({ templates, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((template) => (
        <MotionButton
          key={template}
          type="button"
          onClick={() => onSelect(template)}
          whileTap={{ scale: 0.97 }}
          className="rounded-full border border-[color:var(--sway-border)] bg-[color:var(--sway-surface)] px-4 py-2 text-sm text-[color:var(--sway-text)] transition hover:border-[color:var(--sway-accent)] hover:text-white"
        >
          {highlightTemplate(template)}
        </MotionButton>
      ))}
    </div>
  )
}

export default TemplateGallery
