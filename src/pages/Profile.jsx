import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { DEMO_PROFILES } from '../lib/demo'
import { MapPin, Camera, Flag, Ban, Settings } from 'lucide-react'
import { toast } from '../components/Toast'

const LIMITS_LABELS = {
  pas_photo:             'Pas de photo sans accord',
  discretion:            'Discrétion totale',
  pas_contact_hors_site: 'Pas de contact hors site avant rencontre',
  preservatif:           'Préservatif obligatoire',
}

const SEEKING_LABELS = {
  rencontres_occasionnelles: 'Rencontres',
  echangisme:                'Échangisme',
  amis_libertins:            'Amis libertins',
  decouverte:                'Découverte',
}

/* X-connexion SVG inline */
function XConnectIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <line x1="3" y1="3" x2="13" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="13" y1="3" x2="3" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="3"  cy="3"  r="2" fill={color}/>
      <circle cx="13" cy="3"  r="2" fill={color}/>
      <circle cx="3"  cy="13" r="2" fill={color}/>
      <circle cx="13" cy="13" r="2" fill={color}/>
    </svg>
  )
}

const inputStyle = {
  width: '100%',
  background: 'rgba(15,15,15,0.85)',
  border: '1px solid rgba(201,168,76,0.18)',
  borderRadius: '14px',
  padding: '13px 16px',
  color: '#F2EDE6',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  backdropFilter: 'blur(10px)',
}

export default function Profile() {
  const { id }       = useParams()
  const myProfile    = useAuthStore(s => s.profile)
  const fetchProfile = useAuthStore(s => s.fetchProfile)
  const navigate     = useNavigate()

  const demoMode = useAuthStore(s => s.demoMode)
  const isOwn   = !id || id === myProfile?.id
  const uid     = isOwn ? myProfile?.id : id

  const [profile,    setProfile]    = useState(isOwn ? myProfile : null)
  const [editing,    setEditing]    = useState(false)
  const [form,       setForm]       = useState({})
  const [saving,     setSaving]     = useState(false)
  const [liked,      setLiked]      = useState(false)
  const [liking,     setLiking]     = useState(false)
  const [matched,    setMatched]    = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (!uid) return
    if (isOwn) {
      setProfile(myProfile)
      setForm({
        couple_name: myProfile?.couple_name || '',
        bio:         myProfile?.bio || '',
        orientation: myProfile?.orientation || 'hetero_hetero',
        looking_for: myProfile?.looking_for || ['couple'],
        seeking:     myProfile?.seeking || [],
        limits:      myProfile?.limits || [],
        availabilities: myProfile?.availabilities || [],
      })
    } else if (demoMode) {
      const demo = DEMO_PROFILES.find(p => p.id === uid)
      if (demo) setProfile(demo)
    } else {
      loadOtherProfile()
      checkLike()
      checkMatch()
    }
  }, [uid, myProfile])

  const loadOtherProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(data)
  }

  const checkLike = async () => {
    const { data } = await supabase.from('likes')
      .select('id').eq('from_id', myProfile.id).eq('to_id', uid).single()
    setLiked(!!data)
  }

  const checkMatch = async () => {
    const a = myProfile.id < uid ? myProfile.id : uid
    const b = myProfile.id < uid ? uid : myProfile.id
    const { data } = await supabase.from('matches')
      .select('id').eq('couple_a', a).eq('couple_b', b).single()
    setMatched(!!data)
  }

  const handleConnect = async () => {
    if (liking) return
    setLiking(true)
    if (liked) {
      await supabase.from('likes').delete().eq('from_id', myProfile.id).eq('to_id', uid)
      setLiked(false)
    } else {
      await supabase.from('likes').insert({ from_id: myProfile.id, to_id: uid })
      setLiked(true)
      toast('Demande de connexion envoyée ✓')
      checkMatch()
    }
    setLiking(false)
  }

  const block = async () => {
    if (!confirm('Bloquer ce couple ? Le match et les contacts seront supprimés.')) return
    await supabase.from('blocks').insert({ blocker_id: myProfile.id, blocked_id: uid })
    toast('Couple bloqué')
    navigate('/discover')
  }

  const report = async () => {
    if (!reportReason.trim()) return
    await supabase.from('reports').insert({
      reporter_id: myProfile.id,
      reported_id: uid,
      reason: reportReason,
    })
    setShowReport(false)
    setReportReason('')
    toast('Signalement envoyé')
  }

  const uploadAvatar = async (file) => {
    const ext  = file.name.split('.').pop()
    const path = `${myProfile.id}/avatar.${ext}`
    await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', myProfile.id)
    await fetchProfile(myProfile.id)
  }

  const save = async () => {
    setSaving(true)
    await supabase.from('profiles').update(form).eq('id', myProfile.id)
    await fetchProfile(myProfile.id)
    setSaving(false)
    setEditing(false)
  }

  if (!profile) return (
    <div className="flex items-center justify-center h-dvh">
      <div style={{ width: 24, height: 24, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto pb-nav animate-fade-in" style={{ animationFillMode: 'both' }}>

      {/* hero photo */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden' }}>
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
            background: 'linear-gradient(145deg, #111 0%, #0a0a0a 100%)',
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
          background: 'linear-gradient(to top, rgba(5,5,5,1) 0%, rgba(5,5,5,0.3) 50%, transparent 100%)',
        }} />

        {/* upload button (own profile) */}
        {isOwn && (
          <>
            <button
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
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && uploadAvatar(e.target.files[0])} />
          </>
        )}

        {/* badge distance */}
        {profile.distance_km && (
          <div style={{
            position: 'absolute', top: '16px', right: '16px',
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px', borderRadius: '99px',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <MapPin size={10} strokeWidth={2} style={{ color: 'rgba(201,168,76,0.8)' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
              ~{profile.distance_km} km
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '0 20px 24px' }}>

        {/* nom + orientation */}
        <div className="animate-fade-in-up delay-100" style={{ animationFillMode: 'both', marginTop: '20px', marginBottom: '20px' }}>
          <h1 style={{
            fontFamily: 'Cormorant, serif',
            fontSize: '2.4rem',
            fontWeight: 600,
            color: '#F2EDE6',
            lineHeight: 1.1,
            marginBottom: '6px',
          }}>
            {profile.couple_name}
          </h1>
          {profile.orientation && (
            <p style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.55)' }}>
              {profile.orientation.replace('_', ' · ')}
            </p>
          )}
          {profile.bio && (
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginTop: '12px' }}>
              {profile.bio}
            </p>
          )}
        </div>

        {/* boutons own profile */}
        {isOwn && !editing && (
          <div className="flex gap-2 animate-fade-in-up delay-200" style={{ animationFillMode: 'both', marginBottom: '24px' }}>
            <button
              onClick={() => setEditing(true)}
              style={{
                flex: 1, padding: '13px', borderRadius: '14px',
                background: 'rgba(15,15,15,0.85)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: 'rgba(201,168,76,0.8)',
                fontSize: '13px', letterSpacing: '0.08em',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.color = '#C9A84C'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'; e.currentTarget.style.color = 'rgba(201,168,76,0.8)'; }}
            >
              Modifier mon profil
            </button>
            <button
              onClick={() => navigate('/settings')}
              aria-label="Paramètres"
              style={{
                width: 48, height: 48, borderRadius: '14px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(15,15,15,0.85)',
                border: '1px solid rgba(201,168,76,0.15)',
                color: 'rgba(255,255,255,0.35)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(201,168,76,0.7)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)'; }}
            >
              <Settings size={17} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* formulaire édition */}
        {isOwn && editing && (
          <div className="animate-fade-in" style={{ animationFillMode: 'both', marginBottom: '24px' }}>
            <EditForm form={form} setForm={setForm} onSave={save} onCancel={() => setEditing(false)} saving={saving} />
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
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    borderRadius: '16px',
                  }}>
                    <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.3rem', color: '#C9A84C', letterSpacing: '0.05em' }}>
                      ∞ Connexion mutuelle ∞
                    </p>
                    <p style={{ fontSize: '11px', color: 'rgba(201,168,76,0.45)', marginTop: '4px', letterSpacing: '0.08em' }}>
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
                      <>
                        <XConnectIcon size={15} color="#050505" />
                        Connexion envoyée — retirer
                      </>
                    ) : (
                      <>
                        <XConnectIcon size={15} color="#050505" />
                        Se connecter
                      </>
                    )}
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowReport(true)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '12px', borderRadius: '12px',
                      background: 'transparent',
                      border: '1px solid rgba(201,168,76,0.12)',
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)'; }}
                  >
                    <Flag size={13} strokeWidth={1.5} /> Signaler
                  </button>
                  <button
                    onClick={block}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '12px', borderRadius: '12px',
                      background: 'transparent',
                      border: '1px solid rgba(239,68,68,0.15)',
                      color: 'rgba(239,68,68,0.45)',
                      fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
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

      {/* modal signalement */}
      {showReport && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', animationFillMode: 'both' }}
          onClick={() => setShowReport(false)}
        >
          <div
            className="animate-fade-in-up"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(10,10,10,0.98)',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: '24px 24px 0 0',
              width: '100%', maxWidth: '480px',
              padding: '28px 24px 40px',
              animationFillMode: 'both',
            }}
          >
            <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.6rem', color: '#F2EDE6', marginBottom: '16px' }}>
              Signaler ce profil
            </h2>
            <textarea
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              placeholder="Décrivez le problème…"
              rows={4}
              style={{
                ...inputStyle,
                resize: 'none',
                marginBottom: '16px',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.07)'; }}
              onBlur={e =>  { e.target.style.borderColor = 'rgba(201,168,76,0.18)'; e.target.style.boxShadow = 'none'; }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowReport(false)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(201,168,76,0.15)',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '13px', cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={report}
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
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="animate-fade-in-up delay-200" style={{ animationFillMode: 'both' }}>
      <p style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)', marginBottom: '10px' }}>
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
          fontSize: '12px',
          padding: '5px 13px',
          borderRadius: '99px',
          border: gold ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(255,255,255,0.08)',
          color: gold ? 'rgba(201,168,76,0.85)' : 'rgba(255,255,255,0.45)',
          background: gold ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.04)',
          letterSpacing: '0.04em',
        }}>
          {map[v] || v}
        </span>
      ))}
    </div>
  )
}

function EditForm({ form, setForm, onSave, onCancel, saving }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', marginBottom: '8px' }}>
          Pseudo du couple
        </label>
        <input
          value={form.couple_name}
          onChange={e => set('couple_name', e.target.value)}
          maxLength={50}
          style={inputStyle}
          onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.07)'; }}
          onBlur={e =>  { e.target.style.borderColor = 'rgba(201,168,76,0.18)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', marginBottom: '8px' }}>
          Bio <span style={{ opacity: 0.5, fontSize: '9px' }}>(max 300 caractères)</span>
        </label>
        <textarea
          value={form.bio}
          onChange={e => set('bio', e.target.value)}
          maxLength={300}
          rows={4}
          style={{ ...inputStyle, resize: 'none' }}
          onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.07)'; }}
          onBlur={e =>  { e.target.style.borderColor = 'rgba(201,168,76,0.18)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      <div className="flex gap-3 mt-1">
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '14px', borderRadius: '12px',
            background: 'transparent', border: '1px solid rgba(201,168,76,0.15)',
            color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer',
          }}
        >
          Annuler
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="btn-gold"
          style={{
            flex: 1, padding: '14px', borderRadius: '12px',
            border: 'none', fontSize: '13px', letterSpacing: '0.08em',
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.75 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {saving ? (
            <>
              <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#050505', borderRadius: '50%', display: 'inline-block', animation: 'rotateX 0.7s linear infinite' }} />
              Enregistrement…
            </>
          ) : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
