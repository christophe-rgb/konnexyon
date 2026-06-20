import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import clsx from 'clsx'

// Store global simple (pas de Zustand pour éviter la dépendance circulaire)
let listeners = []
export function toast(message, type = 'success') {
  const id = Date.now()
  listeners.forEach(fn => fn({ id, message, type }))
  return id
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = (t) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000)
    }
    listeners.push(handler)
    return () => { listeners = listeners.filter(fn => fn !== handler) }
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map(t => (
        <div
          key={t.id}
          className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium',
            'animate-[slideDown_0.2s_ease-out]',
            t.type === 'error'
              ? 'bg-surface border-red-900/40 text-red-300'
              : 'bg-surface border-[rgba(201,168,76,1)] text-text'
          )}
        >
          {t.type === 'error'
            ? <AlertCircle size={16} className="text-red-400 flex-shrink-0" strokeWidth={1.5} />
            : <CheckCircle size={16} className="text-gold flex-shrink-0" strokeWidth={1.5} />
          }
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="text-muted hover:text-text cursor-pointer"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  )
}
