import { X, MapPin, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import XLogo from './XLogo'

const SEEKING_LABELS = {
  rencontres_occasionnelles: 'Rencontres',
  echangisme:                'Échangisme',
  amis_libertins:            'Amis libertins',
  decouverte:                'Découverte',
}

/* Icône X-connexion SVG inline */
function XConnectIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <line x1="2" y1="2" x2="12" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="2" x2="2" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="2"  cy="2"  r="1.5" fill={color}/>
      <circle cx="12" cy="2"  r="1.5" fill={color}/>
      <circle cx="2"  cy="12" r="1.5" fill={color}/>
      <circle cx="12" cy="12" r="1.5" fill={color}/>
    </svg>
  )
}

export default function ProfileCard({ profile, onLike, onPass, showActions = true, index = 0, isLiked = false }) {
  const navigate = useNavigate()
  const coupleName = profile.couple_name ?? 'Couple'
  const [hovered, setHovered] = useState(false)
  const [liking,  setLiking]  = useState(false)

  const handleLike = async e => {
    e.stopPropagation()
    if (liking) return
    setLiking(true)
    await onLike?.(profile.id)
    setLiking(false)
  }

  return (
    <div
      className="profile-card animate-fade-in-up"
      role="article"
      aria-label={`Profil de ${coupleName}`}
      onClick={() => navigate(`/profile/${profile.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
        aspectRatio: '3/4',
        borderRadius: '20px',
        boxShadow: hovered
          ? '0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(201,168,76,0.4)'
          : '0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(201,168,76,0.15)',
        transition: 'box-shadow 0.35s, transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)',
        transform: hovered ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
        animationDelay: `${index * 80}ms`,
        animationFillMode: 'both',
      }}
    >
      {/* ── photo ── */}
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={`Photo de ${coupleName}`}
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{
            transition: 'transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94)',
            transform: hovered ? 'scale(1.07)' : 'scale(1)',
          }}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{
          background: 'linear-gradient(145deg, #F0EBE2 0%, #EDE7DB 100%)',
        }}>
          {/* initiale stylisée */}
          <span style={{
            fontFamily: 'Cormorant, serif',
            fontSize: '72px',
            fontWeight: 300,
            background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            opacity: 0.5,
            lineHeight: 1,
          }}>
            {coupleName[0]}
          </span>
          <span style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(201,168,76,1)', marginTop: '8px', textTransform: 'uppercase' }}>
            {coupleName}
          </span>
        </div>
      )}

      {/* ── overlay gradient — plus dramatique en bas ── */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.1) 60%, transparent 100%)',
        transition: 'opacity 0.35s',
      }} />

      {/* ── vignette latérale subtile ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)',
      }} />

      {/* ── bordure or au hover ── */}
      <div className="absolute inset-0 rounded-[20px] pointer-events-none" style={{
        border: `1px solid ${hovered ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
        transition: 'border-color 0.35s',
      }} />

      {/* ── overlay liké ── */}
      {isLiked && (
        <div className="absolute inset-0 rounded-[20px] pointer-events-none" style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.1) 0%, transparent 60%)',
          border: '1px solid rgba(201,168,76,1)',
        }} />
      )}

      {/* ── badge X (liké) ── */}
      {isLiked && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full" style={{
          background: 'linear-gradient(135deg, #A07830, #E8CC7A)',
          boxShadow: '0 0 16px rgba(201,168,76,1)',
        }}>
          <XLogo size={13} style={{ opacity: 1 }} />
          <span style={{ fontSize: '10px', color: '#050505', fontWeight: 700, letterSpacing: '0.08em' }}>
            ENVOYÉ
          </span>
        </div>
      )}

      {/* ── badge distance ── */}
      {profile.distance_km != null && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full" style={{
          background: 'rgba(245,240,232,0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(28,24,20,0.15)',
        }}>
          <MapPin size={9} strokeWidth={2} style={{ color: 'rgba(201,168,76,1)' }} />
          <span style={{ fontSize: '11px', color: 'rgba(28,24,20,0.9)', fontWeight: 500 }}>
            {profile.distance_km} km
          </span>
        </div>
      )}

      {/* ── badge "nouveau" si récent ── */}
      {profile.is_new && (
        <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full" style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(232,204,122,0.9))',
        }}>
          <Zap size={9} strokeWidth={2.5} color="#050505" />
          <span style={{ fontSize: '10px', color: '#050505', fontWeight: 700, letterSpacing: '0.05em' }}>
            NOUVEAU
          </span>
        </div>
      )}

      {/* ── contenu bas ── */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {/* nom du couple */}
        <h3 style={{
          fontFamily: 'Cormorant, serif',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#fff',
          lineHeight: 1.1,
          marginBottom: '5px',
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}>
          {coupleName}
        </h3>

        {/* orientation */}
        {profile.orientation && (
          <p style={{
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(201,168,76,1)',
            marginBottom: '6px',
          }}>
            {profile.orientation.replace('_', ' · ')}
          </p>
        )}

        {/* bio */}
        {profile.bio && (
          <p style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,1)',
            lineHeight: 1.5,
            marginBottom: '10px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {profile.bio}
          </p>
        )}

        {/* tags seeking */}
        {profile.seeking?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {profile.seeking.slice(0, 2).map(s => (
              <span key={s} className="tag-connection" style={{
                fontSize: '10px',
                letterSpacing: '0.06em',
                color: 'rgba(201,168,76,1)',
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,1)',
                borderRadius: '99px',
                padding: '3px 10px',
              }}>
                {SEEKING_LABELS[s] || s}
              </span>
            ))}
          </div>
        )}

        {/* actions */}
        {showActions && (
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            {onPass && (
              <button className="erb-btn"
                onClick={e => { e.stopPropagation(); onPass(profile.id); }}
                aria-label={`Passer ${coupleName}`}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '11px',
                  minHeight: '44px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#ffffff',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
              >
                <X size={14} strokeWidth={2} />
                Passer
              </button>
            )}
            {(onLike || isLiked) && (
              <button
                onClick={isLiked ? undefined : handleLike}
                disabled={liking || isLiked}
                aria-label={isLiked ? 'Connexion envoyée' : `Se connecter avec ${coupleName}`}
                className="btn-gold"
                style={{
                  flex: onPass ? 1.4 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  padding: '11px',
                  minHeight: '44px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  letterSpacing: '0.08em',
                  cursor: (liking || isLiked) ? 'default' : 'pointer',
                  border: 'none',
                  opacity: isLiked ? 0.8 : liking ? 0.7 : 1,
                }}
              >
                {liking ? (
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#050505', borderRadius: '50%', display: 'inline-block', animation: 'rotateX 0.7s linear infinite' }} />
                ) : isLiked ? (
                  <>
                    <XLogo size={18} />
                    Connexion envoyée
                  </>
                ) : (
                  <>
                    <XLogo size={22} />
                    Se connecter
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
