import { useState, useRef, useEffect } from 'react'
import { Smile } from 'lucide-react'

const EMOJIS = [
  '😊','😍','🥰','😘','❤️','💕','🔥','✨','🥂','😈',
  '😏','💋','🫦','💦','😋','🤭','🙈','💯','👀','🫠',
  '😇','🤫','😌','💫','🌹','🍾','🎉','💎','🤩','😮',
]

export default function EmojiPicker({ onSelect }) {
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center text-muted hover:text-gold transition-colors duration-150 cursor-pointer flex-shrink-0"
        aria-label="Emojis"
      >
        <Smile size={18} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 bg-surface border border-[rgba(201,168,76,0.2)] rounded-2xl p-3 grid grid-cols-5 gap-1 shadow-xl z-20 w-52">
          {EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => { onSelect(e); setOpen(false) }}
              className="w-9 h-9 flex items-center justify-center text-xl hover:bg-surface2 rounded-lg transition-colors duration-150 cursor-pointer"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
