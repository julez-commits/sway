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
      <span className="text-emerald-300">{marker}</span>
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
          className="rounded-full border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
        >
          {highlightTemplate(template)}
        </MotionButton>
      ))}
    </div>
  )
}

export default TemplateGallery
