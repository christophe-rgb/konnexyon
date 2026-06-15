import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'

export default function MatchCard({ match }) {
  const navigate = useNavigate()

  return (
    <div onClick={() => navigate(`/messages/${match.id}`)}
      className="flex items-center gap-4 cursor-pointer group transition-all duration-200"
      style={{
        background: 'linear-gradient(135deg, rgba(15,15,15,0.9) 0%, rgba(10,10,10,0.95) 100%)',
        border: '1px solid rgba(201,168,76,0.1)',
        borderRadius: '18px',
        padding: '14px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* avatar */}
      <div className="relative flex-shrink-0"
        onClick={e => { e.stopPropagation(); navigate(`/profile/${match.profile.id}`) }}>
        <div style={{ width: 52, height: 52, borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.2)', boxShadow: '0 0 16px rgba(201,168,76,0.1)' }}>
          {match.profile.avatar_url ? (
            <img src={match.profile.avatar_url} alt={match.profile.couple_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#141414', fontFamily: 'Cormorant, serif', fontSize: '22px', color: 'rgba(201,168,76,0.3)' }}>
              {match.profile.couple_name?.[0]}
            </div>
          )}
        </div>
        {/* badge ∞ */}
        <div style={{
          position: 'absolute', bottom: -4, right: -4,
          width: 18, height: 18, borderRadius: '50%',
          background: 'linear-gradient(135deg, #A07830, #E8CC7A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', color: '#050505', fontWeight: 700,
          boxShadow: '0 0 8px rgba(201,168,76,0.5)',
          border: '1.5px solid #050505',
        }}>∞</div>
      </div>

      {/* texte */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.1rem', fontWeight: 600, color: '#F2EDE6', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.profile.couple_name}
        </p>
        {match.lastMessage ? (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {match.lastMessage}
          </p>
        ) : (
          <p style={{ fontSize: '11px', color: 'rgba(201,168,76,0.45)', fontStyle: 'italic' }}>
            Dites bonjour…
          </p>
        )}
      </div>

      {/* icône message */}
      <div style={{
        flexShrink: 0, width: 38, height: 38, borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(201,168,76,0.06)',
        border: '1px solid rgba(201,168,76,0.12)',
        color: 'rgba(201,168,76,0.6)',
        transition: 'all 0.15s',
      }}>
        <MessageCircle size={16} strokeWidth={1.5} />
      </div>
    </div>
  )
}
