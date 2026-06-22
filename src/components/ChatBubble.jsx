import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import clsx from 'clsx'

export default function ChatBubble({ message, isMine, onDelete }) {
  const [showActions, setShowActions] = useState(false)
  const time = new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className={clsx('flex flex-col gap-1 max-w-[75%] group', isMine ? 'self-end items-end' : 'self-start items-start')}
      onClick={() => isMine && onDelete && setShowActions(s => !s)}
      role={isMine && onDelete ? 'button' : undefined}
      tabIndex={isMine && onDelete ? 0 : undefined}
      onKeyDown={isMine && onDelete ? (e => e.key === 'Enter' && setShowActions(s => !s)) : undefined}
    >
      {message.photo_url && (
        <div style={{ aspectRatio: '4/3', maxHeight: 260, overflow: 'hidden' }} className="rounded-xl w-full">
          <img
            src={message.photo_url}
            alt={`Photo envoyée par ${isMine ? 'vous' : "l'autre membre"}`}
            width="100%"
            height="auto"
            loading="lazy"
            className="rounded-xl max-w-full w-full h-full object-cover cursor-pointer"
          />
        </div>
      )}
      {message.content && (
        <div className={clsx(
          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed cursor-default',
          isMine
            ? 'bg-gold text-bg rounded-br-sm'
            : 'bg-surface2 text-text rounded-bl-sm border border-[rgba(201,168,76,0.15)]'
        )}>
          {message.content}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted">{time}</span>
        {isMine && message.read_at && (
          <span className="text-[11px] text-gold">vu</span>
        )}
        {isMine && onDelete && showActions && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); setShowActions(false) }}
            className="text-muted hover:text-red-400 transition-colors duration-150 cursor-pointer ml-1"
            title="Supprimer pour moi"
          >
            <Trash2 size={12} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}
