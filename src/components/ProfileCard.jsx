import { Heart, X, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const SEEKING_LABELS = {
  rencontres_occasionnelles: 'Rencontres',
  echangisme:                'Échangisme',
  amis_libertins:            'Amis libertins',
  decouverte:                'Découverte',
}

export default function ProfileCard({ profile, onLike, onPass, showActions = true }) {
  const navigate = useNavigate()

  return (
    <div
      className="relative overflow-hidden cursor-pointer group select-none"
      style={{ aspectRatio: '3/4', borderRadius: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}
      onClick={() => navigate(`/profile/${profile.id}`)}
    >
      {/* photo */}
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={profile.couple_name}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transition: 'transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)' }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-surface2">
          <span style={{ fontFamily: 'Cormorant, serif', fontSize: '80px', color: 'rgba(201,168,76,0.15)' }}>
            {profile.couple_name?.[0]}
          </span>
        </div>
      )}

      {/* dégradé superposé — plus dramatique */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.05) 70%, transparent 100%)',
      }} />

      {/* bordure or fine */}
      <div className="absolute inset-0 rounded-[20px]" style={{ border: '1px solid rgba(201,168,76,0.15)', pointerEvents: 'none' }} />

      {/* badge distance */}
      {profile.distance_km != null && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <MapPin size={9} strokeWidth={2} style={{ color: 'rgba(201,168,76,0.7)' }} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{profile.distance_km} km</span>
        </div>
      )}

      {/* contenu bas */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 style={{
          fontFamily: 'Cormorant, serif',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#fff',
          lineHeight: 1.1,
          marginBottom: '6px',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}>
          {profile.couple_name}
        </h3>

        {profile.bio && (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {profile.bio}
          </p>
        )}

        {profile.seeking?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {profile.seeking.slice(0, 2).map(s => (
              <span key={s} style={{
                fontSize: '10px',
                letterSpacing: '0.05em',
                color: 'rgba(201,168,76,0.8)',
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: '99px',
                padding: '3px 10px',
              }}>
                {SEEKING_LABELS[s] || s}
              </span>
            ))}
          </div>
        )}

        {showActions && (
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            {onPass && (
              <button onClick={() => onPass(profile.id)} style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.15s',
              }}>
                <X size={14} strokeWidth={2} />
                Passer
              </button>
            )}
            {onLike && (
              <button onClick={() => onLike(profile.id)} className="btn-gold" style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px',
                borderRadius: '12px',
                fontSize: '13px',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                border: 'none',
              }}>
                <Heart size={14} strokeWidth={2} fill="currentColor" />
                Like
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
