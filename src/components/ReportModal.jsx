import { useState } from 'react'

const inputStyle = {
  width: '100%',
  background: 'rgba(245,240,232,0.85)',
  border: '1px solid rgba(201,168,76,0.25)',
  borderRadius: '14px',
  padding: '13px 16px',
  color: '#1C1814',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  backdropFilter: 'blur(10px)',
}

export default function ReportModal({ onClose, onSubmit }) {
  const [reason, setReason] = useState('')

  const handleSubmit = async () => {
    const ok = await onSubmit(reason)
    if (ok) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', animationFillMode: 'both' }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in-up"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(253,250,246,0.98)',
          border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: '24px 24px 0 0',
          width: '100%', maxWidth: '480px',
          padding: '28px 24px 40px',
          animationFillMode: 'both',
        }}
      >
        <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.6rem', color: '#1C1814', marginBottom: '16px' }}>
          Signaler ce profil
        </h2>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Décrivez le problème…"
          rows={4}
          style={{ ...inputStyle, resize: 'none', marginBottom: '16px' }}
          onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.12)'; }}
          onBlur={e =>  { e.target.style.borderColor = 'rgba(201,168,76,0.25)'; e.target.style.boxShadow = 'none'; }}
        />
        <div className="flex gap-3">
          <button className="erb-btn"
            onClick={onClose}
            style={{
              flex: 1, padding: '14px', borderRadius: '12px',
              background: 'transparent',
              border: '1px solid rgba(201,168,76,0.25)',
              color: 'rgba(28,24,20,0.9)',
              fontSize: '13px', cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="btn-gold"
            style={{
              flex: 1, padding: '14px', borderRadius: '12px',
              border: 'none', fontSize: '13px', letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  )
}
