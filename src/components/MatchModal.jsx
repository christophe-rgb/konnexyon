import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import XLogo from './XLogo'

export default function MatchModal({ match, onClose }) {
  const navigate = useNavigate()

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-6 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', animationFillMode: 'both' }}
    >
      {/* particules dorées */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 3, height: 3, borderRadius: '50%',
            background: 'rgba(201,168,76,0.1)',
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 20}%`,
            animation: `float ${2 + i * 0.4}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}
      </div>

      <div
        className="animate-fade-in-up"
        style={{
          background: 'linear-gradient(145deg, rgba(253,250,246,0.99) 0%, rgba(245,240,232,0.99) 100%)',
          border: '1px solid rgba(201,168,76,1)',
          borderRadius: '28px',
          padding: '40px 32px',
          width: '100%', maxWidth: '380px',
          textAlign: 'center',
          boxShadow: '0 0 80px rgba(201,168,76,1), 0 40px 80px rgba(0,0,0,0.9)',
          animationFillMode: 'both',
          position: 'relative',
        }}
      >
        {/* avatars */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '28px' }}>
          <Avatar profile={match.me} />

          {/* icône X connexion centrale */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(245,240,232,0.6)',
            boxShadow: '0 0 30px rgba(201,168,76,1)',
            animation: 'pulseGold 2s ease-in-out infinite',
            border: '1px solid rgba(201,168,76,1)',
          }}>
            <XLogo size={48} />
          </div>

          <Avatar profile={match.other} />
        </div>

        {/* titre */}
        <p style={{
          fontFamily: 'Cormorant, serif',
          fontSize: '2.4rem',
          fontWeight: 600,
          background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '0.05em',
          marginBottom: '10px',
          lineHeight: 1.1,
        }}>
          Connexion !
        </p>

        <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(201,168,76,1)', textTransform: 'uppercase', marginBottom: '16px' }}>
          ∞ · Connexion mutuelle · ∞
        </div>

        <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.9)', lineHeight: 1.7, marginBottom: '28px' }}>
          Vous et <strong style={{ color: 'rgba(28,24,20,0.9)' }}>{match.other?.couple_name}</strong> vous êtes connectés mutuellement.
          Le chat est maintenant débloqué.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="erb-btn"
            onClick={() => { navigate(`/messages/${match.id}`); onClose() }}
            className="btn-gold"
            style={{
              width: '100%', padding: '15px', borderRadius: '14px',
              border: 'none', fontSize: '13px', letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: 'pointer',
            }}
          >
            <MessageCircle size={16} strokeWidth={2} />
            Envoyer un message
          </button>
          <button className="erb-btn"
            onClick={onClose}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px',
              background: 'transparent',
              border: '1px solid rgba(201,168,76,1)',
              color: 'rgba(28,24,20,0.9)',
              fontSize: '12px', letterSpacing: '0.06em',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,1)'; e.currentTarget.style.color = 'rgba(28,24,20,0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,1)'; e.currentTarget.style.color = 'rgba(28,24,20,0.9)'; }}
          >
            Continuer à explorer
          </button>
        </div>
      </div>
    </div>
  )
}

function Avatar({ profile }) {
  return (
    <div style={{
      width: 64, height: 64, borderRadius: '20px', flexShrink: 0,
      overflow: 'hidden',
      border: '1px solid rgba(201,168,76,1)',
      boxShadow: '0 0 20px rgba(201,168,76,1)',
    }}>
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.couple_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#EDE7DB',
          fontFamily: 'Cormorant, serif', fontSize: '24px',
          color: 'rgba(201,168,76,1)',
        }}>
          {profile?.couple_name?.[0] || '∞'}
        </div>
      )}
    </div>
  )
}
