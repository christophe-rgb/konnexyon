import { useNavigate } from 'react-router-dom'

export default function UpgradeModal({ onClose, message }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'linear-gradient(180deg, #FDFAF6 0%, #F5F0E8 100%)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '28px 24px 36px',
          animation: 'slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      >
        {/* handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(201,168,76,0.1)', margin: '0 auto 24px' }} />

        {/* icône */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%', margin: '0 auto 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(201,168,76,0.1), rgba(201,168,76,0.1))',
          border: '1px solid rgba(201,168,76,0.2)',
        }}>
          <span style={{ fontSize: 24 }}>∞</span>
        </div>

        <h2 style={{
          fontFamily: 'Cormorant, serif', fontSize: '1.7rem', fontWeight: 600,
          textAlign: 'center', color: '#1C1814', marginBottom: 10,
        }}>
          Fonctionnalité Premium
        </h2>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(28,24,20,0.9)', lineHeight: 1.6, marginBottom: 28 }}>
          {message || 'Passez Premium pour débloquer toutes les connexions.'}
        </p>

        <button
          className="btn-gold"
          onClick={() => { onClose(); navigate('/abonnement') }}
          style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 14, letterSpacing: '0.12em', marginBottom: 12 }}
        >
          Voir les offres Premium
        </button>
        <button
          className="erb-btn"
          onClick={onClose}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, cursor: 'pointer',
            background: 'transparent', border: '1px solid rgba(201,168,76,0.1)',
            color: 'rgba(28,24,20,0.9)', fontSize: 13,
          }}
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}
