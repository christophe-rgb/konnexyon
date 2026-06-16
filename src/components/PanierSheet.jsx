import XLogo from './XLogo'

export default function PanierSheet({ profiles, onLike, onRemove, onClose }) {
  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 80,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease both',
        }}
      />

      {/* drawer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 81,
        background: 'linear-gradient(180deg, #0d0d0d 0%, #080808 100%)',
        borderTop: '1px solid rgba(201,168,76,0.2)',
        borderRadius: '24px 24px 0 0',
        maxHeight: '80dvh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.8)',
        animation: 'slideUp 0.32s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>

        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(201,168,76,0.25)' }} />
        </div>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <div>
            <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', fontWeight: 600, color: '#F2EDE6', letterSpacing: '0.05em' }}>
              Mis de côté
            </h2>
            <p style={{ fontSize: 11, letterSpacing: '0.14em', color: 'rgba(201,168,76,0.4)', textTransform: 'uppercase', marginTop: 2 }}>
              {profiles.length} couple{profiles.length > 1 ? 's' : ''}
            </p>
          </div>
          <button className="erb-btn"
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >×</button>
        </div>

        {/* liste */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 32px' }}>
          {profiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>
              Aucun profil mis de côté
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {profiles.map((p, i) => (
                <PanierCard key={p.id} profile={p} onLike={onLike} onRemove={onRemove} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}

function PanierCard({ profile, onLike, onRemove, index }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'linear-gradient(135deg, rgba(15,12,5,0.98), rgba(10,8,3,0.98))',
        border: '1px solid rgba(201,168,76,0.1)',
        borderRadius: 16, padding: '12px 14px',
        animation: `fadeInUp 0.3s ease ${index * 0.05}s both`,
      }}
    >
      {/* avatar */}
      <div style={{
        width: 56, height: 56, borderRadius: 14, flexShrink: 0,
        overflow: 'hidden',
        border: '1px solid rgba(201,168,76,0.18)',
        background: '#111',
      }}>
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant', fontSize: 24, color: 'rgba(201,168,76,0.25)' }}>
            {profile.couple_name?.[0] || '∞'}
          </div>
        )}
      </div>

      {/* infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.1rem', fontWeight: 600, color: '#F2EDE6', marginBottom: 2 }}>
          {profile.couple_name}
        </p>
        <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {profile.orientation}{profile.distance_km ? ` · ${Math.round(profile.distance_km)} km` : ''}
        </p>
      </div>

      {/* actions */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {/* retirer */}
        <button className="erb-btn"
          onClick={() => onRemove(profile.id)}
          aria-label="Retirer"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(248,113,113,0.06)',
            border: '1px solid rgba(248,113,113,0.2)',
            color: 'rgba(248,113,113,0.7)',
            cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.14)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.06)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)'; }}
        >×</button>

        {/* connecter */}
        <button className="erb-btn"
          onClick={() => onLike(profile.id)}
          aria-label="Se connecter"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 35%, rgba(232,204,122,0.18), rgba(160,120,48,0.06))',
            border: '1px solid rgba(201,168,76,0.3)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
            boxShadow: '0 0 16px rgba(201,168,76,0.12)',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 24px rgba(201,168,76,0.3)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 16px rgba(201,168,76,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <XLogo size={20} />
        </button>
      </div>
    </div>
  )
}
