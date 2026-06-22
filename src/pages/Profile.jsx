import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { DEMO_PROFILES } from '../lib/demo'
import { MapPin, Camera, Flag, Ban, Settings, Trash2 } from 'lucide-react'
import XLogo from '../components/XLogo'
import { confirm } from '../components/ConfirmDialog'
import EditProfileForm from '../components/EditProfileForm'
import ReportModal from '../components/ReportModal'
import { useProfileActions } from '../hooks/useProfileActions'
import { SEEKING_LABELS } from '../data/labels'

const LIMITS_LABELS = {
  pas_photo:             'Aucune photo partagée sans accord mutuel préalable',
  discretion:            'Discrétion absolue — identité et vie privée protégées',
  pas_contact_hors_site: 'Pas de contact hors site avant rencontre',
  preservatif:           'Préservatif obligatoire',
  pas_penetration:       'Pas de pénétration',
}

const ORIENTATION_LABELS = {
  hetero: 'Hétéro',
  bi:     'Bi',
}

export default function Profile() {
  const { id }       = useParams()
  const myProfile    = useAuthStore(s => s.profile)
  const user         = useAuthStore(s => s.user)
  const navigate     = useNavigate()
  const demoMode     = useAuthStore(s => s.demoMode)

  const isOwn = !id || id === user?.id || (!!myProfile && id === myProfile.id)
  const uid   = isOwn ? myProfile?.id : id

  const [profile,    setProfile]    = useState(isOwn ? myProfile : null)
  const [editing,    setEditing]    = useState(false)
  const [form,       setForm]       = useState({})
  const [showReport, setShowReport] = useState(false)
  const fileRef = useRef(null)

  const {
    liked, liking, matched, saving,
    checkLike, checkMatch,
    handleConnect, block, report,
    uploadAvatar, deleteAvatar, save,
  } = useProfileActions(uid)

  useEffect(() => {
    if (!uid) return
    if (isOwn) {
      setProfile(myProfile)
      setForm({
        couple_name:      myProfile?.couple_name || '',
        bio:              myProfile?.bio || '',
        orientation_lui:  myProfile?.orientation_lui || 'hetero',
        orientation_elle: myProfile?.orientation_elle || 'hetero',
        seeking:          myProfile?.seeking || [],
        limits:           myProfile?.limits || [],
        availabilities:   myProfile?.availabilities || [],
      })
    } else if (demoMode) {
      const demo = DEMO_PROFILES.find(p => p.id === uid)
      if (demo) setProfile(demo)
    } else {
      let isMounted = true
      const loadOtherProfile = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
        if (isMounted) setProfile(data)
      }
      loadOtherProfile()
      checkLike()
      checkMatch()
      return () => { isMounted = false }
    }
  }, [uid, myProfile, checkLike, checkMatch, demoMode, isOwn])

  if (!profile) return (
    <div className="flex items-center justify-center h-dvh" role="status" aria-label="Chargement…">
      <div style={{ width: 24, height: 24, border: '2px solid rgba(201,168,76,0.4)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto pb-nav animate-fade-in" style={{ animationFillMode: 'both' }}>

      {/* hero photo */}
      <div
        style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden', cursor: isOwn ? 'pointer' : 'default' }}
        onClick={() => isOwn && fileRef.current?.click()}
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={`Photo de ${profile.couple_name}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(145deg, #F0EBE2 0%, #EDE7DB 100%)',
          }}>
            <span style={{
              fontFamily: 'Cormorant, serif', fontSize: '96px', fontWeight: 300,
              background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              opacity: 0.4,
            }}>
              {profile.couple_name?.[0] ?? '∞'}
            </span>
          </div>
        )}

        {/* gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(253,250,246,1) 0%, rgba(253,250,246,0.3) 50%, transparent 100%)',
        }} />

        {/* upload / delete buttons (own profile) */}
        {isOwn && (
          <>
            <button className="erb-btn"
              onClick={() => fileRef.current?.click()}
              aria-label="Changer la photo"
              style={{
                position: 'absolute', bottom: '16px', right: '16px',
                width: 40, height: 40, borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #A07830, #C9A84C)',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              }}
            >
              <Camera size={16} strokeWidth={2} color="#050505" />
            </button>
            {profile?.avatar_url && (
              <button className="erb-btn"
                onClick={deleteAvatar}
                aria-label="Supprimer la photo"
                style={{
                  position: 'absolute', bottom: '16px', right: '64px',
                  width: 40, height: 40, borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}
              >
                <Trash2 size={15} strokeWidth={2} color="#f87171" />
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={async e => {
                const file = e.target.files[0]
                e.target.value = ''
                if (!file) return
                const ok = await confirm({
                  title: 'Photo de profil',
                  message: 'Les photos dénudées ou explicites sont interdites sur Konnexyon.\nChoisissez une photo de visage ou en tenue.\n\nContinuer ?',
                  confirmLabel: 'Continuer',
                })
                if (!ok) return
                uploadAvatar(file)
              }} />
          </>
        )}

        {/* badge distance */}
        {profile.distance_km && (
          <div style={{
            position: 'absolute', top: '16px', right: '16px',
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px', borderRadius: '99px',
            background: 'rgba(245,240,232,0.9)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(28,24,20,0.15)',
          }}>
            <MapPin size={10} strokeWidth={2} style={{ color: 'rgba(201,168,76,1)' }} />
            <span style={{ fontSize: '11px', color: 'rgba(28,24,20,0.9)', fontWeight: 500 }}>
              ~{profile.distance_km} km
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '0 20px 24px' }}>

        {/* nom + orientation */}
        <div className="animate-fade-in-up delay-100" style={{ animationFillMode: 'both', marginTop: '20px', marginBottom: '20px' }}>
          <h1 style={{ fontFamily: 'Cormorant, serif', fontSize: '2.4rem', fontWeight: 600, color: '#1C1814', lineHeight: 1.1, marginBottom: '6px' }}>
            {profile.couple_name}
          </h1>
          {(profile.orientation_lui || profile.orientation_elle) && (
            <p style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)' }}>
              Lui · {ORIENTATION_LABELS[profile.orientation_lui] || profile.orientation_lui || '—'}
              {' '}/ Elle · {ORIENTATION_LABELS[profile.orientation_elle] || profile.orientation_elle || '—'}
            </p>
          )}
          {profile.bio && (
            <p style={{ fontSize: '14px', color: 'rgba(28,24,20,0.9)', lineHeight: 1.7, marginTop: '12px' }}>
              {profile.bio}
            </p>
          )}
        </div>

        {/* boutons own profile */}
        {isOwn && !editing && (
          <div className="flex gap-2 animate-fade-in-up delay-200" style={{ animationFillMode: 'both', marginBottom: '24px' }}>
            <button className="erb-btn"
              onClick={() => setEditing(true)}
              style={{
                flex: 1, padding: '13px', borderRadius: '14px',
                background: 'rgba(245,240,232,0.85)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: 'rgba(201,168,76,1)',
                fontSize: '13px', letterSpacing: '0.08em',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.background = 'rgba(201,168,76,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'; e.currentTarget.style.background = 'transparent'; }}
            >
              Modifier mon profil
            </button>
            <button className="erb-btn"
              onClick={() => navigate('/settings')}
              aria-label="Paramètres"
              style={{
                width: 48, height: 48, borderRadius: '14px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(245,240,232,0.85)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: 'rgba(28,24,20,0.9)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#C9A84C'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(28,24,20,0.9)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'; }}
            >
              <Settings size={17} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* formulaire édition */}
        {isOwn && editing && (
          <div className="animate-fade-in" style={{ animationFillMode: 'both', marginBottom: '24px' }}>
            <EditProfileForm
              form={form}
              setForm={setForm}
              onSave={() => save(form, { setEditing })}
              onCancel={() => setEditing(false)}
              saving={saving}
            />
          </div>
        )}

        {/* sections info */}
        {!editing && (
          <div className="flex flex-col gap-5">
            {profile.seeking?.length > 0 && (
              <Section title="Ce qu'ils cherchent">
                <TagList items={profile.seeking} map={SEEKING_LABELS} />
              </Section>
            )}
            {profile.limits?.length > 0 && (
              <Section title="Non négociable">
                <TagList items={profile.limits} map={LIMITS_LABELS} gold />
              </Section>
            )}

            {/* actions profil externe */}
            {!isOwn && (
              <div className="flex flex-col gap-3 pt-2">
                {matched ? (
                  <div style={{
                    textAlign: 'center', padding: '16px',
                    background: 'rgba(201,168,76,0.1)',
                    border: '1px solid rgba(201,168,76,0.25)',
                    borderRadius: '16px',
                  }}>
                    <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.3rem', color: '#C9A84C', letterSpacing: '0.05em' }}>
                      ∞ Connexion mutuelle ∞
                    </p>
                    <p style={{ fontSize: '11px', color: 'rgba(201,168,76,1)', marginTop: '4px', letterSpacing: '0.08em' }}>
                      Vous êtes connectés
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={liking}
                    className="btn-gold"
                    style={{
                      width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      fontSize: '13px', letterSpacing: '0.12em',
                      cursor: liking ? 'default' : 'pointer',
                      opacity: liking ? 0.75 : 1,
                    }}
                  >
                    {liking ? (
                      <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#050505', borderRadius: '50%', display: 'inline-block', animation: 'rotateX 0.7s linear infinite' }} />
                    ) : liked ? (
                      <><XLogo size={26} /> Connexion envoyée — retirer</>
                    ) : (
                      <><XLogo size={26} /> Se connecter</>
                    )}
                  </button>
                )}

                <div className="flex gap-2">
                  <button className="erb-btn"
                    onClick={() => setShowReport(true)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '12px', borderRadius: '12px',
                      background: 'transparent', border: '1px solid rgba(201,168,76,0.25)',
                      color: 'rgba(28,24,20,0.9)', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#1C1814'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(28,24,20,0.9)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'; }}
                  >
                    <Flag size={13} strokeWidth={1.5} /> Signaler
                  </button>
                  <button className="erb-btn"
                    onClick={block}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '12px', borderRadius: '12px',
                      background: 'transparent', border: '1px solid rgba(239,68,68,0.15)',
                      color: 'rgba(239,68,68,0.45)', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.8)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.45)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)'; }}
                  >
                    <Ban size={13} strokeWidth={1.5} /> Bloquer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showReport && (
        <ReportModal
          onClose={() => setShowReport(false)}
          onSubmit={report}
        />
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="animate-fade-in-up delay-200" style={{ animationFillMode: 'both' }}>
      <p style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '10px' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function TagList({ items, map, gold = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(v => (
        <span key={v} style={{
          fontSize: '12px', padding: '5px 13px', borderRadius: '99px',
          border: gold ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(28,24,20,0.2)',
          color: gold ? 'rgba(201,168,76,1)' : 'rgba(28,24,20,0.9)',
          background: gold ? 'rgba(201,168,76,0.28)' : 'rgba(28,24,20,0.07)',
          letterSpacing: '0.04em',
        }}>
          {map[v] || v}
        </span>
      ))}
    </div>
  )
}
