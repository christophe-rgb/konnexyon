import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { DEMO_PROFILES } from '../lib/demo'
import { MapPin, Camera, Flag, Ban, Settings, Trash2 } from 'lucide-react'
import XLogo from '../components/XLogo'
import { toast } from '../components/Toast'
import { confirm } from '../components/ConfirmDialog'
import { validateImageFile, validateImageMagicBytes } from '../lib/upload'

const LIMITS_LABELS = {
  pas_photo:             'Aucune photo partagée sans accord mutuel préalable',
  discretion:            'Discrétion absolue — identité et vie privée protégées',
  pas_contact_hors_site: 'Pas de contact hors site avant rencontre',
  preservatif:           'Préservatif obligatoire',
  pas_penetration:       'Pas de pénétration',
}

const SEEKING_LABELS = {
  decouverte:                'Découverte · curieux',
  rencontres_occasionnelles: 'Rencontres occasionnelles',
  echangisme:                'Échangisme · soirées',
  expert:                    'Expert',
}

const ORIENTATION_LABELS = {
  hetero: 'Hétéro',
  bi:     'Bi',
}

const SEEKING_OPTIONS = [
  { value: 'decouverte',                label: 'Découverte · curieux' },
  { value: 'rencontres_occasionnelles', label: 'Rencontres occasionnelles' },
  { value: 'echangisme',                label: 'Échangisme · soirées' },
  { value: 'expert',                    label: 'Expert' },
]

const AVAIL_OPTIONS = [
  { value: 'semaine',      label: 'En semaine' },
  { value: 'weekend',      label: 'Le week-end' },
  { value: 'rdv',          label: 'Sur rendez-vous' },
  { value: 'spontanement', label: 'Spontanément' },
]

const LIMITS_OPTIONS = [
  { value: 'pas_photo',             label: 'Pas de photo sans accord' },
  { value: 'discretion',            label: 'Discrétion absolue' },
  { value: 'pas_contact_hors_site', label: 'Pas de contact hors site' },
  { value: 'preservatif',           label: 'Préservatif obligatoire' },
  { value: 'pas_penetration',       label: 'Pas de pénétration' },
]


const inputStyle = {
  width: '100%',
  background: 'rgba(245,240,232,0.85)',
  border: '1px solid rgba(201,168,76,0.25)',
  borderRadius: '14px',
  padding: '13px 16px',
  color: '#1C1814',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  backdropFilter: 'blur(10px)',
}

export default function Profile() {
  const { id }       = useParams()
  const myProfile    = useAuthStore(s => s.profile)
  const user         = useAuthStore(s => s.user)
  const fetchProfile = useAuthStore(s => s.fetchProfile)
  const navigate     = useNavigate()

  const demoMode = useAuthStore(s => s.demoMode)
  // isOwn = vrai si pas d'id, ou si l'id correspond au user connecté ou à son profil
  const isOwn   = !id || id === user?.id || (!!myProfile && id === myProfile.id)
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

  const checkMatch = useCallback(async () => {
    if (!myProfile?.id || !uid) return
    const a = myProfile.id < uid ? myProfile.id : uid
    const b = myProfile.id < uid ? uid : myProfile.id
    const { data } = await supabase.from('matches')
      .select('id').eq('couple_a', a).eq('couple_b', b).single()
    setMatched(!!data)
  }, [myProfile?.id, uid])

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
      const checkLike = async () => {
        const { data } = await supabase.from('likes')
          .select('id').eq('from_id', myProfile.id).eq('to_id', uid).single()
        if (isMounted) setLiked(!!data)
      }

      loadOtherProfile()
      checkLike()
      checkMatch()

      return () => { isMounted = false }
    }
  }, [uid, myProfile, checkMatch])

  const handleConnect = async () => {
    if (liking) return
    setLiking(true)
    if (liked) {
      const { error } = await supabase.from('likes').delete().eq('from_id', myProfile.id).eq('to_id', uid)
      if (error) { toast('Erreur : impossible de retirer la connexion', 'error'); setLiking(false); return }
      setLiked(false)
    } else {
      const { error } = await supabase.from('likes').insert({ from_id: myProfile.id, to_id: uid })
      // 23505 = doublon (déjà liké) → pas une vraie erreur
      if (error && error.code !== '23505') { toast(`Erreur : ${error.message}`, 'error'); setLiking(false); return }
      setLiked(true)
      toast('Demande de connexion envoyée ✓')
      checkMatch()
    }
    setLiking(false)
  }

  const block = async () => {
    const ok = await confirm({
      title: 'Bloquer ce couple',
      message: 'Le match et les contacts seront supprimés. Continuer ?',
      confirmLabel: 'Bloquer',
      danger: true,
    })
    if (!ok) return
    const { error } = await supabase.from('blocks').insert({ blocker_id: myProfile.id, blocked_id: uid })
    if (error && error.code !== '23505') { toast(`Erreur : ${error.message}`, 'error'); return }
    toast('Couple bloqué')
    navigate('/discover')
  }

  const report = async () => {
    if (!reportReason.trim()) return
    const { error } = await supabase.from('reports').insert({
      reporter_id: myProfile.id,
      reported_id: uid,
      reason: reportReason,
    })
    if (error) { toast(`Erreur : ${error.message}`, 'error'); return }
    setShowReport(false)
    setReportReason('')
    toast('Signalement envoyé')
  }

  const deleteAvatar = async () => {
    const ok = await confirm({
      title: 'Supprimer la photo',
      message: 'Supprimer votre photo de profil ?',
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      const url = myProfile.avatar_url || ''
      const filename = url.split('/').pop()
      if (filename) await supabase.storage.from('avatars').remove([`${myProfile.id}/${filename}`])
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', myProfile.id)
      await fetchProfile(myProfile.id)
      toast('Photo supprimée')
    } catch (e) {
      toast('Erreur lors de la suppression')
    }
  }

  const uploadAvatar = async (file) => {
    const check = validateImageFile(file)
    if (!check.ok) { toast(check.error, 'error'); return }
    const magic = await validateImageMagicBytes(file)
    if (!magic.ok) { toast(magic.error, 'error'); return }
    try {
      const ext  = file.name.split('.').pop().toLowerCase()
      const path = `${myProfile.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { toast(`Erreur upload : ${upErr.message}`); return }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlWithCache = `${publicUrl}?t=${Date.now()}`
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: urlWithCache }).eq('id', myProfile.id)
      if (dbErr) { toast(`Erreur sauvegarde : ${dbErr.message}`); return }
      await fetchProfile(myProfile.id)
      toast('Photo mise à jour ✓')
    } catch (e) {
      toast('Erreur inattendue lors de l\'upload')
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const orientationMap = {
        'hetero-hetero': 'hetero_hetero',
        'hetero-bi':     'hetero_bi',
        'bi-hetero':     'hetero_bi',
        'bi-bi':         'bi_all',
      }
      const { orientation_lui, orientation_elle, ...profileData } = form
      const orientation = orientationMap[`${orientation_lui}-${orientation_elle}`] || 'hetero_hetero'
      const { error } = await supabase
        .from('profiles')
        .update({ ...profileData, orientation })
        .eq('id', myProfile.id)
      if (error) {
        console.error('Erreur Supabase save():', error)
        toast('Erreur lors de la sauvegarde — ' + (error.message || 'réessayez'))
        return
      }
      await fetchProfile(myProfile.id)
      setEditing(false)
      navigate('/discover?view=map')
    } catch (err) {
      if (import.meta.env.DEV) console.error('Exception save():', err)
      toast('Une erreur inattendue est survenue')
    } finally {
      setSaving(false)
    }
  }

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

        {/* upload button (own profile) */}
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
                  title: '📸 Photo de profil',
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
          <h1 style={{
            fontFamily: 'Cormorant, serif',
            fontSize: '2.4rem',
            fontWeight: 600,
            color: '#1C1814',
            lineHeight: 1.1,
            marginBottom: '6px',
          }}>
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
                      <>
                        <XLogo size={26} />
                        Connexion envoyée — retirer
                      </>
                    ) : (
                      <>
                        <XLogo size={26} />
                        Se connecter
                      </>
                    )}
                  </button>
                )}

                <div className="flex gap-2">
                  <button className="erb-btn"
                    onClick={() => setShowReport(true)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '12px', borderRadius: '12px',
                      background: 'transparent',
                      border: '1px solid rgba(201,168,76,0.25)',
                      color: 'rgba(28,24,20,0.9)',
                      fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
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
              background: 'rgba(253,250,246,0.98)',
              border: '1px solid rgba(201,168,76,0.25)',
              borderRadius: '24px 24px 0 0',
              width: '100%', maxWidth: '480px',
              padding: '28px 24px 40px',
              animationFillMode: 'both',
            }}
          >
            <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.6rem', color: '#1C1814', marginBottom: '16px' }}>
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
              onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.12)'; }}
              onBlur={e =>  { e.target.style.borderColor = 'rgba(201,168,76,0.25)'; e.target.style.boxShadow = 'none'; }}
            />
            <div className="flex gap-3">
              <button className="erb-btn"
                onClick={() => setShowReport(false)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(201,168,76,0.25)',
                  color: 'rgba(28,24,20,0.9)',
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
          fontSize: '12px',
          padding: '5px 13px',
          borderRadius: '99px',
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

function EditForm({ form, setForm, onSave, onCancel, saving }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '8px' }}>
          Pseudo du couple
        </label>
        <input
          value={form.couple_name}
          onChange={e => set('couple_name', e.target.value)}
          maxLength={50}
          style={inputStyle}
          onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.12)'; }}
          onBlur={e =>  { e.target.style.borderColor = 'rgba(201,168,76,0.25)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '8px' }}>
          Bio <span style={{ opacity: 0.5, fontSize: '9px' }}>(max 300 caractères)</span>
        </label>
        <textarea
          value={form.bio}
          onChange={e => set('bio', e.target.value)}
          maxLength={300}
          rows={4}
          style={{ ...inputStyle, resize: 'none' }}
          onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.12)'; }}
          onBlur={e =>  { e.target.style.borderColor = 'rgba(201,168,76,0.25)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      {/* Orientation */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'LUI', key: 'orientation_lui' },
          { label: 'ELLE', key: 'orientation_elle' },
        ].map(({ label, key }) => (
          <div key={key} style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '8px' }}>
              {label}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'hetero', label: 'Hétéro' },
                { value: 'bi', label: 'Bi' },
              ].map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set(key, o.value)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: '10px', cursor: 'pointer',
                    fontSize: '12px', letterSpacing: '0.06em', transition: 'all 0.2s',
                    border: form[key] === o.value ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(201,168,76,0.25)',
                    background: form[key] === o.value ? 'rgba(201,168,76,0.28)' : 'transparent',
                    color: form[key] === o.value ? '#C9A84C' : 'rgba(28,24,20,0.8)',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Désirs */}
      <div>
        <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '10px' }}>
          Vos désirs
        </label>
        <div className="flex flex-col gap-2">
          {SEEKING_OPTIONS.map(o => {
            const active = form.seeking?.includes(o.value)
            return (
              <button key={o.value} type="button"
                onClick={() => set('seeking', active ? form.seeking.filter(x => x !== o.value) : [...(form.seeking || []), o.value])}
                style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                  border: `1px solid ${active ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
                  background: active ? 'rgba(201,168,76,0.28)' : 'transparent',
                  color: active ? '#C9A84C' : 'rgba(28,24,20,0.8)',
                  fontSize: '13px', transition: 'all 0.2s',
                }}
              >{o.label}</button>
            )
          })}
        </div>
      </div>

      {/* Disponibilités */}
      <div>
        <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '10px' }}>
          Disponibilités
        </label>
        <div className="flex flex-wrap gap-2">
          {AVAIL_OPTIONS.map(o => {
            const active = form.availabilities?.includes(o.value)
            return (
              <button key={o.value} type="button"
                onClick={() => set('availabilities', active ? form.availabilities.filter(x => x !== o.value) : [...(form.availabilities || []), o.value])}
                style={{
                  padding: '9px 14px', borderRadius: '99px', cursor: 'pointer',
                  border: `1px solid ${active ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
                  background: active ? 'rgba(201,168,76,0.28)' : 'transparent',
                  color: active ? '#C9A84C' : 'rgba(28,24,20,0.8)',
                  fontSize: '12px', transition: 'all 0.2s',
                }}
              >{o.label}</button>
            )
          })}
        </div>
      </div>

      {/* Limites */}
      <div>
        <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '10px' }}>
          Non négociable
        </label>
        <div className="flex flex-col gap-2">
          {LIMITS_OPTIONS.map(o => {
            const active = form.limits?.includes(o.value)
            return (
              <button key={o.value} type="button"
                onClick={() => set('limits', active ? form.limits.filter(x => x !== o.value) : [...(form.limits || []), o.value])}
                style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                  border: `1px solid ${active ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
                  background: active ? 'rgba(201,168,76,0.28)' : 'transparent',
                  color: active ? 'rgba(201,168,76,1)' : 'rgba(28,24,20,0.8)',
                  fontSize: '13px', transition: 'all 0.2s',
                }}
              >{o.label}</button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3 mt-1">
        <button className="erb-btn"
          onClick={onCancel}
          style={{
            flex: 1, padding: '14px', borderRadius: '12px',
            background: 'transparent', border: '1px solid rgba(201,168,76,0.1)',
            color: 'rgba(28,24,20,0.9)', fontSize: '13px', cursor: 'pointer',
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
