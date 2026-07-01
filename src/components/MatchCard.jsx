import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useChatDock } from '../store/chatDock'

export default function MatchCard({ match }) {
  const navigate = useNavigate()
  const openChat = useChatDock(s => s.openChat)

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Conversation avec ${match.profile.couple_name}`}
      onClick={() => openChat(match.id)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openChat(match.id) } }}
      className="flex items-center gap-4 cursor-pointer group transition-all duration-200"
      style={{
        background: 'linear-gradient(135deg, rgba(245,240,232,0.9) 0%, rgba(245,240,232,0.95) 100%)',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: '18px',
        padding: '14px 16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.10)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* avatar */}
      <button
        className="relative flex-shrink-0"
        aria-label="Voir le profil"
        onClick={e => { e.stopPropagation(); navigate(`/profile/${match.profile.id}`) }}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <div style={{ width: 52, height: 52, borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.25)', boxShadow: 'none' }}>
          {match.profile.avatar_url ? (
            <img src={match.profile.avatar_url} alt={match.profile.couple_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EDE7DB', fontFamily: 'Cormorant, serif', fontSize: '22px', color: 'rgba(201,168,76,0.6)' }}>
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
          boxShadow: 'none',
          border: '1.5px solid #FDFAF6',
        }}>∞</div>
      </button>

      {/* texte */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.1rem', fontWeight: 600, color: '#1C1814', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.profile.couple_name}
        </p>
        {match.lastMessage ? (
          <p style={{ fontSize: '12px', color: 'rgba(28,24,20,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {match.lastMessage}
          </p>
        ) : (
          <p style={{ fontSize: '11px', color: 'rgba(201,168,76,1)', fontStyle: 'italic' }}>
            Dites bonjour…
          </p>
        )}
      </div>

      {/* icône message */}
      <div style={{
        flexShrink: 0, width: 38, height: 38, borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(201,168,76,0.1)',
        border: '1px solid rgba(201,168,76,0.2)',
        color: 'rgba(201,168,76,1)',
        transition: 'all 0.15s',
      }}>
        <MessageCircle size={16} strokeWidth={1.5} />
      </div>
    </article>
  )
}
