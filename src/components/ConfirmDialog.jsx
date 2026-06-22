import { useEffect, useState } from 'react'

// API impérative (comme le toast) pour éviter window.confirm (bloquant,
// non stylable, parfois bloqué par les navigateurs / mode kiosque).
//   const ok = await confirm({ title, message, confirmLabel, danger })
let listener = null

export function confirm(options) {
  return new Promise((resolve) => {
    if (!listener) { resolve(false); return }
    listener({ ...options, resolve })
  })
}

export function ConfirmDialogHost() {
  const [state, setState] = useState(null)

  useEffect(() => {
    listener = (opts) => setState(opts)
    return () => { listener = null }
  }, [])

  if (!state) return null

  const close = (value) => {
    state.resolve(value)
    setState(null)
  }

  const {
    title = 'Confirmer',
    message = '',
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    danger = false,
  } = state

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => close(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380,
          background: 'linear-gradient(180deg, #FDFAF6 0%, #F5F0E8 100%)',
          border: '1px solid rgba(201,168,76,1)',
          borderRadius: 22, padding: '26px 22px',
          animation: 'slideUp 0.25s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      >
        <h2 style={{
          fontFamily: 'Cormorant, serif', fontSize: '1.45rem', fontWeight: 600,
          color: '#1C1814', marginBottom: 10, textAlign: 'center',
        }}>
          {title}
        </h2>
        {message && (
          <p style={{ fontSize: 13.5, color: 'rgba(28,24,20,0.85)', lineHeight: 1.6, textAlign: 'center', marginBottom: 22, whiteSpace: 'pre-line' }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => close(false)}
            className="erb-btn"
            style={{
              flex: 1, padding: '13px', borderRadius: 12, cursor: 'pointer',
              background: 'transparent', border: '1px solid rgba(201,168,76,0.4)',
              color: 'rgba(28,24,20,0.85)', fontSize: 13,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => close(true)}
            className={danger ? '' : 'btn-gold'}
            style={{
              flex: 1, padding: '13px', borderRadius: 12, cursor: 'pointer',
              border: danger ? '1px solid rgba(220,50,50,0.5)' : 'none',
              background: danger ? 'rgba(220,50,50,0.12)' : undefined,
              color: danger ? 'rgba(200,40,40,1)' : undefined,
              fontSize: 13, letterSpacing: '0.06em', fontWeight: 600,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
