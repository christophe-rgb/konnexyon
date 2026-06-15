import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle } from 'lucide-react'

export default function MatchModal({ match, onClose }) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-6">
      <div className="bg-surface border border-[rgba(201,168,76,0.3)] rounded-3xl p-8 w-full max-w-sm text-center gold-glow">
        {/* icône */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Avatar profile={match.me} />
          <Heart size={28} className="text-gold flex-shrink-0" fill="currentColor" />
          <Avatar profile={match.other} />
        </div>

        <h2 className="font-serif text-4xl font-semibold text-gold mb-2">Match !</h2>
        <p className="text-muted text-sm leading-relaxed mb-8">
          Vous et <strong className="text-text">{match.other?.couple_name}</strong> vous êtes likés mutuellement.
          Le chat est maintenant débloqué.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => { navigate(`/messages/${match.id}`); onClose() }}
            className="w-full py-3 rounded-xl bg-gold text-bg font-semibold flex items-center justify-center gap-2 hover:bg-[#d4ae58] transition-colors duration-150 cursor-pointer"
          >
            <MessageCircle size={18} strokeWidth={2} />
            Envoyer un message
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-[rgba(201,168,76,0.2)] text-muted hover:text-text transition-colors duration-150 cursor-pointer text-sm"
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
    <div className="w-16 h-16 rounded-full bg-surface2 border-2 border-[rgba(201,168,76,0.3)] overflow-hidden flex-shrink-0">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.couple_name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-serif text-2xl text-gold/40">
          {profile?.couple_name?.[0] || '?'}
        </div>
      )}
    </div>
  )
}
