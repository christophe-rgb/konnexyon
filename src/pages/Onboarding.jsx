import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { validateImageFile } from '../lib/upload'
import { resolveOnboardingLocation } from '../lib/geo'
import { toast } from '../components/Toast'

// Version du texte de consentement — incrémenter si le texte change
const CONSENT_VERSION = 'v1.0'

const STEPS = [
  { key: 'consentement',   label: 'Consentement',      icon: '◉' },
  { key: 'profil',         label: 'Votre couple',      icon: '∞' },
  { key: 'photo',          label: 'Votre photo',        icon: '◈' },
  { key: 'cherche',        label: 'Vos désirs',         icon: '◈' },
  { key: 'disponibilites', label: 'Disponibilités',     icon: '◷' },
  { key: 'limites',        label: 'Vos limites',        icon: '◉' },
  { key: 'distance',       label: 'Distance',           icon: '◎' },
  { key: 'visibilite',     label: 'Visibilité',         icon: '◌' },
]

const SEEKING_OPTIONS = [
  { value: 'decouverte',                label: 'Découverte · curieux',          desc: 'Explorer en toute douceur' },
  { value: 'rencontres_occasionnelles', label: 'Rencontres occasionnelles',     desc: 'Des rencontres sensuelles sans engagement' },
  { value: 'echangisme',                label: 'Échangisme · soirées',          desc: 'Échanges et soirées entre couples' },
  { value: 'expert',                    label: 'Expert',                        desc: 'Pratiques intenses entre adultes consentants' },
]

const AVAIL_OPTIONS = [
  { value: 'semaine',      label: 'En semaine' },
  { value: 'weekend',      label: 'Le week-end' },
  { value: 'rdv',          label: 'Sur rendez-vous' },
  { value: 'spontanement', label: 'Spontanément' },
]

const LIMITS_OPTIONS = [
  { value: 'pas_photo',             label: 'Aucune photo partagée sans accord mutuel préalable' },
  { value: 'discretion',            label: 'Discrétion absolue — identité et vie privée protégées' },
  { value: 'pas_contact_hors_site', label: 'Pas de contact hors site avant rencontre' },
  { value: 'preservatif',           label: 'Préservatif obligatoire' },
  { value: 'pas_penetration',       label: 'Pas de pénétration' },
]

export default function Onboarding() {
  const user         = useAuthStore(s => s.user)
  const fetchProfile = useAuthStore(s => s.fetchProfile)
  const setProfile   = useAuthStore(s => s.setProfile)
  const navigate     = useNavigate()

  const [step,      setStep]      = useState(0)
  const [direction, setDirection] = useState('forward')
  const [saving,    setSaving]    = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const fileRef = useRef(null)
  // Consentement RGPD Art. 9 — données sensibles (orientation, pratiques)
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentTimestamp, setConsentTimestamp] = useState(null)
  const [data,   setData]   = useState({
    couple_name:    '',
    bio:            '',
    orientation_lui:  'hetero',
    orientation_elle: 'hetero',
    looking_for:    ['couple'],
    seeking:        [],
    availabilities: [],
    limits:         [],
    max_distance_km: 50,
    visibility:     'public',
  })

  const set      = (k, v) => setData(d => ({ ...d, [k]: v }))
  const toggleArr = (k, v) => {
    const arr = data[k]
    set(k, arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
  }
  const [stepError, setStepError] = useState('')

  const next = () => {
    setStepError('')
    // Étape 0 = consentement RGPD Art. 9 — blocage si non coché
    if (step === 0 && !consentChecked) {
      setStepError('Vous devez accepter explicitement le traitement de vos données sensibles pour continuer.')
      return
    }
    // Étape 0 → enregistre le timestamp de consentement
    if (step === 0 && consentChecked && !consentTimestamp) {
      setConsentTimestamp(new Date().toISOString())
    }
    // Étape 1 = profil
    if (step === 1 && data.couple_name.trim().length < 2) {
      setStepError('Le pseudo du couple doit comporter au moins 2 caractères.')
      return
    }
    setDirection('forward')
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }
  const prev = () => {
    setDirection('back')
    setStep(s => Math.max(s - 1, 0))
  }

  const finish = async () => {
    setSaving(true)
    setStepError('')

    // Récupère le user Supabase directement (cas où le store n'est pas encore hydraté)
    const uid   = user?.id   || (await supabase.auth.getUser()).data.user?.id
    const email = user?.email || (await supabase.auth.getUser()).data.user?.email
    if (!uid) {
      setStepError('Session expirée. Veuillez vous reconnecter.')
      setSaving(false)
      return
    }

    // GPS précis si accordé, sinon repli sur une position IP approximative.
    // Sans position, le couple n'apparaîtrait jamais sur la carte.
    const loc = await resolveOnboardingLocation()
    const locationSql = loc ? `SRID=4326;POINT(${loc.lng} ${loc.lat})` : null
    // Calcule l'enum orientation depuis lui + elle
    const orientationMap = {
      'hetero-hetero': 'hetero_hetero',
      'hetero-bi':     'hetero_bi',
      'bi-hetero':     'hetero_bi',
      'bi-bi':         'bi_all',
    }
    const orientationKey = `${data.orientation_lui}-${data.orientation_elle}`
    const orientation = orientationMap[orientationKey] || 'hetero_hetero'

    // eslint-disable-next-line no-unused-vars
    const { orientation_lui, orientation_elle, ...profileData } = data
    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: uid,
      email_1: email,
      ...profileData,
      orientation,
      // Détail Lui/Elle saisi à l'étape "Votre couple" (sinon perdu)
      orientation_lui:  data.orientation_lui,
      orientation_elle: data.orientation_elle,
      email_1_confirmed: true,
      // L'utilisateur a forcément passé l'age-gate pour arriver ici → on garantit
      // age_confirmed_at en base, sinon RequireProfile renvoie en boucle à l'onboarding.
      age_confirmed_at:  new Date().toISOString(),
      // Consentement RGPD Art. 9 — timestamp et version du texte accepté
      consent_given_at:  consentTimestamp || new Date().toISOString(),
      consent_version:   CONSENT_VERSION,
      ...(locationSql ? { location: locationSql, location_updated_at: new Date().toISOString() } : {}),
    })
    if (upsertError) {
      console.error('Upsert error:', upsertError)
      setStepError('Erreur lors de la sauvegarde : ' + upsertError.message)
      setSaving(false)
      return
    }
    // Upload photo si choisie
    if (photoFile) {
      const ext  = photoFile.name.split('.').pop().toLowerCase()
      const path = `${uid}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, photoFile, { upsert: true, contentType: photoFile.type })
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
        const urlWithCache = `${publicUrl}?t=${Date.now()}`
        await supabase.from('profiles').update({ avatar_url: urlWithCache }).eq('id', uid)
      }
    }

    // Notif Telegram admin
    supabase.functions.invoke('notify-new-user', {
      body: { record: { couple_name: data.couple_name, status: 'actif' } },
    }).catch(() => {})

    // Force le store immédiatement avec un profil COMPLET pour le routage
    // (email_1_confirmed + age_confirmed_at) — évite le rebond vers /onboarding.
    setProfile({
      id: uid, email_1: email, ...profileData, orientation,
      orientation_lui: data.orientation_lui, orientation_elle: data.orientation_elle,
      email_1_confirmed: true,
      age_confirmed_at: new Date().toISOString(),
      consent_given_at: consentTimestamp || new Date().toISOString(),
      consent_version: CONSENT_VERSION,
    })
    // Refresh en arrière-plan pour synchroniser les données Supabase
    fetchProfile(uid)
    const { data: updatedProfile } = await supabase
      .from('profiles').select('email_2').eq('id', uid).single()
    if (updatedProfile?.email_2) {
      supabase.functions.invoke('send-partner-confirmation', {
        body: { profile_id: uid, email_2: updatedProfile.email_2, app_url: window.location.origin },
      }).catch(() => {})
    }
    navigate('/discover?view=map')
  }

  const currentStep = STEPS[step]

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">

      {/* fond logo filigrane */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <picture>
          <source srcSet="/logo.webp" type="image/webp" />
          <img src="/logo.webp" alt="" aria-hidden style={{
            width: '130vw', maxWidth: 860,
            opacity: 0.28, filter: 'brightness(0.85) saturate(0.9)',
            userSelect: 'none', display: 'block',
          }} />
        </picture>
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, rgba(253,250,246,0.2) 0%, rgba(253,250,246,0.65) 55%, rgba(253,250,246,0.96) 100%)',
        }} />
      </div>



      <div className="w-full max-w-sm relative z-10">

        {/* header marque */}
        <div className="flex items-center justify-center gap-2 mb-8 animate-fade-in" style={{ animationFillMode: 'both' }}>
          <span style={{ color: 'rgba(201,168,76,1)', fontSize: '14px' }}>∞</span>
          <span style={{ fontFamily: 'Cormorant, serif', fontSize: '1rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,1)', textTransform: 'uppercase' }}>
            Konnexyon
          </span>
        </div>

        {/* barre de progression avec labels */}
        <div className="mb-2">
          <div className="flex gap-1 mb-3">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-500"
                style={{
                  height: '3px',
                  background: i < step
                    ? 'linear-gradient(90deg, #A07830, #C9A84C)'
                    : i === step
                    ? 'linear-gradient(90deg, #C9A84C, #E8CC7A)'
                    : 'rgba(28,24,20,0.9)',
                  boxShadow: i <= step ? '0 0 6px rgba(201,168,76,0.2)' : 'none',
                }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)' }}>
              {currentStep.icon} {currentStep.label}
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(28,24,20,0.9)' }}>
              {step + 1} / {STEPS.length}
            </span>
          </div>
        </div>

        {/* contenu step */}
        <div className={direction === 'back' ? 'animate-fade-in-down mt-6' : 'animate-fade-in-up mt-6'} style={{ animationFillMode: 'both', animationDuration: '350ms' }} key={step}>
          {step === 0 && (
            <StepConsentement
              checked={consentChecked}
              onChange={v => { setConsentChecked(v); setStepError('') }}
            />
          )}
          {step === 1 && <StepProfil data={data} set={set} toggleArr={toggleArr} />}
          {step === 2 && (
            <StepPhoto
              photoPreview={photoPreview}
              onFile={file => {
                const check = validateImageFile(file)
                if (!check.ok) { toast(check.error, 'error'); return }
                setPhotoFile(file)
                setPhotoPreview(URL.createObjectURL(file))
              }}
              fileRef={fileRef}
            />
          )}
          {step === 3 && (
            <StepMulti
              title="Vos désirs" subtitle="Sélectionnez tout ce qui vous correspond"
              options={SEEKING_OPTIONS} field="seeking" data={data} toggle={toggleArr}
            />
          )}
          {step === 4 && (
            <StepMulti
              title="Vos disponibilités" subtitle="Quand êtes-vous disponibles ?"
              options={AVAIL_OPTIONS} field="availabilities" data={data} toggle={toggleArr}
            />
          )}
          {step === 5 && (
            <StepMulti
              title="Vos limites" subtitle="Ces points seront visibles sur votre profil"
              options={LIMITS_OPTIONS} field="limits" data={data} toggle={toggleArr}
            />
          )}
          {step === 6 && <StepDistance data={data} set={set} />}
          {step === 7 && <StepVisibility data={data} set={set} />}
        </div>

        {/* erreur step */}
        {stepError && (
          <p role="alert" style={{
            color: '#f87171', fontSize: '13px', marginTop: '12px',
            background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.18)',
            borderRadius: '10px', padding: '10px 14px',
          }}>
            {stepError}
          </p>
        )}

        {/* navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button className="erb-btn"
              onClick={prev}
              style={{
                flex: 1, padding: '15px', borderRadius: '14px', cursor: 'pointer',
                background: 'transparent',
                border: '1px solid rgba(201,168,76,0.25)',
                color: 'rgba(201,168,76,1)',
                fontSize: '13px', letterSpacing: '0.08em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'; e.currentTarget.style.background = 'transparent'; }}
            >
              ← Retour
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="btn-gold"
              style={{
                flex: 1, padding: '15px', borderRadius: '14px', border: 'none',
                cursor: 'pointer', fontSize: '13px', letterSpacing: '0.1em',
              }}
            >
              Continuer →
            </button>
          ) : (
            <button
              onClick={finish} disabled={saving}
              className="btn-gold"
              style={{
                flex: 1, padding: '15px', borderRadius: '14px', border: 'none',
                cursor: saving ? 'default' : 'pointer',
                fontSize: '13px', letterSpacing: '0.1em',
                opacity: saving ? 0.75 : 1,
              }}
            >
              {saving ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#050505', borderRadius: '50%', display: 'inline-block', animation: 'rotateX 0.7s linear infinite' }} />
                  Activation…
                </span>
              ) : 'Activer ma connexion ∞'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Consentement RGPD Art. 9 ────────────────────────────────────────────────
// Données sensibles : orientation sexuelle, pratiques/désirs sexuels
// Base légale : consentement explicite libre, spécifique, éclairé, univoque
// Texte versionné via CONSENT_VERSION — à mettre à jour si le texte change
// ─────────────────────────────────────────────────────────────────────────────
function StepConsentement({ checked, onChange }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '2rem', fontWeight: 600, color: '#1C1814', marginBottom: '4px' }}>
          Vos données privées
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.7)' }}>
          Avant de continuer, nous avons besoin de votre accord explicite.
        </p>
      </div>

      <div style={{
        background: 'rgba(245,240,232,0.8)',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: '16px',
        padding: '20px',
        fontSize: '13px',
        color: 'rgba(28,24,20,0.85)',
        lineHeight: '1.7',
      }}>
        <p style={{ fontWeight: 600, marginBottom: '10px', color: '#1C1814' }}>
          Traitement de données à caractère sensible (Art. 9 RGPD)
        </p>
        <p style={{ marginBottom: '10px' }}>
          Pour fonctionner, Konnexyon collecte et traite des informations relatives à votre
          <strong> orientation sexuelle</strong> et à vos <strong>pratiques intimes</strong>.
          Ces données sont qualifiées de <strong>sensibles</strong> par le Règlement Général sur la Protection des Données (RGPD).
        </p>
        <p style={{ marginBottom: '10px' }}>
          Ces informations sont utilisées <strong>uniquement</strong> pour vous mettre en relation avec
          des couples compatibles et ne sont jamais revendues à des tiers.
        </p>
        <p>
          Vous pouvez <strong>retirer ce consentement à tout moment</strong> depuis
          Paramètres → Confidentialité, ce qui entraînera la suppression de ces données de votre profil.
        </p>
      </div>

      {/* Case à cocher — non pré-cochée, action positive requise */}
      <label
        htmlFor="consent-checkbox"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          cursor: 'pointer',
          padding: '16px',
          borderRadius: '14px',
          border: `1px solid ${checked ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.2)'}`,
          background: checked ? 'rgba(201,168,76,0.08)' : 'rgba(245,240,232,0.5)',
          transition: 'all 0.2s',
        }}
      >
        <input
          id="consent-checkbox"
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          style={{
            marginTop: '2px',
            width: '18px',
            height: '18px',
            accentColor: '#C9A84C',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: '13px', color: '#1C1814', lineHeight: '1.6' }}>
          J'accepte explicitement que Konnexyon traite mes données relatives à mon orientation sexuelle
          et mes pratiques intimes, conformément à la{' '}
          <a
            href="/confidentialite"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#C9A84C', textDecoration: 'underline' }}
            onClick={e => e.stopPropagation()}
          >
            politique de confidentialité
          </a>
          .
        </span>
      </label>

      <p style={{ fontSize: '11px', color: 'rgba(28,24,20,0.45)', textAlign: 'center' }}>
        Consentement {CONSENT_VERSION} — requis par le RGPD Art. 9. Non pré-coché, librement révocable.
      </p>
    </div>
  )
}

function StepProfil({ data, set, toggleArr }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '2rem', fontWeight: 600, color: '#1C1814', marginBottom: '4px' }}>
          Votre couple
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.9)' }}>Comment voulez-vous vous présenter ?</p>
      </div>

      <OField label="Pseudo du couple *">
        <input
          value={data.couple_name} onChange={e => set('couple_name', e.target.value)}
          maxLength={50} placeholder="Marc & Julie"
          style={inputStyle} onFocus={onFocus} onBlur={onBlur}
        />
      </OField>

      <OField label={`Description · ${data.bio.length}/300`}>
        <textarea
          value={data.bio} onChange={e => set('bio', e.target.value)}
          maxLength={300} rows={3} placeholder="Parlez de vous en quelques mots…"
          style={{ ...inputStyle, resize: 'none' }} onFocus={onFocus} onBlur={onBlur}
        />
      </OField>

      {/* Orientation Lui */}
      <div>
        <p style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '10px' }}>
          Lui
        </p>
        <div className="flex gap-2">
          {[{ value: 'hetero', label: 'Hétéro' }, { value: 'bi', label: 'Bi' }].map(o => (
            <OButton key={o.value} active={data.orientation_lui === o.value} onClick={() => set('orientation_lui', o.value)}>
              {o.label}
            </OButton>
          ))}
        </div>
      </div>

      {/* Orientation Elle */}
      <div>
        <p style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '10px' }}>
          Elle
        </p>
        <div className="flex gap-2">
          {[{ value: 'hetero', label: 'Hétéro' }, { value: 'bi', label: 'Bi' }].map(o => (
            <OButton key={o.value} active={data.orientation_elle === o.value} onClick={() => set('orientation_elle', o.value)}>
              {o.label}
            </OButton>
          ))}
        </div>
      </div>

    </div>
  )
}

function StepMulti({ title, subtitle, options, field, data, toggle }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '2rem', fontWeight: 600, color: '#1C1814', marginBottom: '4px' }}>
          {title}
        </h2>
        {subtitle && <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.9)' }}>{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-2">
        {options.map(o => {
          const active = data[field]?.includes(o.value)
          return (
            <button className="erb-btn"
              key={o.value}
              onClick={() => toggle(field, o.value)}
              style={{
                textAlign: 'left', padding: '14px 16px',
                borderRadius: '14px',
                border: `1px solid ${active ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
                background: active ? 'rgba(201,168,76,0.1)' : 'rgba(245,240,232,0.6)',
                color: active ? '#C9A84C' : 'rgba(28,24,20,0.9)',
                fontSize: '14px', cursor: 'pointer',
                transition: 'all 0.2s',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ display: 'block', fontWeight: active ? 500 : 400 }}>{o.label}</span>
              {o.desc && <span style={{ display: 'block', fontSize: '11px', color: active ? 'rgba(201,168,76,1)' : 'rgba(28,24,20,0.9)', marginTop: '2px' }}>{o.desc}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepDistance({ data, set }) {
  const options = [
    { value: 20,  label: 'Moins de 20 km',  desc: 'Autour de vous' },
    { value: 50,  label: '20 – 50 km',       desc: 'Votre région' },
    { value: 100, label: '50 – 100 km',      desc: 'Département élargi' },
    { value: 0,   label: 'Peu importe',      desc: 'La connexion n\'a pas de distance' },
  ]
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '2rem', fontWeight: 600, color: '#1C1814', marginBottom: '4px' }}>
          Distance
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.9)' }}>Distance maximum pour une rencontre</p>
      </div>
      <div className="flex flex-col gap-2">
        {options.map(o => (
          <button className="erb-btn"
            key={o.value}
            onClick={() => set('max_distance_km', o.value)}
            style={{
              textAlign: 'left', padding: '14px 16px', borderRadius: '14px',
              border: `1px solid ${data.max_distance_km === o.value ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
              background: data.max_distance_km === o.value ? 'rgba(201,168,76,0.1)' : 'rgba(245,240,232,0.6)',
              cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ display: 'block', fontSize: '14px', color: data.max_distance_km === o.value ? '#C9A84C' : 'rgba(28,24,20,0.9)', fontWeight: data.max_distance_km === o.value ? 500 : 400 }}>
              {o.label}
            </span>
            <span style={{ display: 'block', fontSize: '11px', color: 'rgba(28,24,20,0.9)', marginTop: '2px' }}>{o.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function StepVisibility({ data, set }) {
  const options = [
    { value: 'public',       label: 'Visible par tous', desc: 'Votre profil apparaît dans les connexions à proximité' },
    { value: 'matches_only', label: 'Connexions uniquement', desc: 'Seuls vos matchs peuvent voir votre profil' },
  ]
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '2rem', fontWeight: 600, color: '#1C1814', marginBottom: '4px' }}>
          Visibilité
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.9)' }}>Qui peut voir votre profil ?</p>
      </div>
      <div className="flex flex-col gap-2">
        {options.map(o => (
          <button className="erb-btn"
            key={o.value}
            onClick={() => set('visibility', o.value)}
            style={{
              textAlign: 'left', padding: '16px', borderRadius: '14px',
              border: `1px solid ${data.visibility === o.value ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
              background: data.visibility === o.value ? 'rgba(201,168,76,0.1)' : 'rgba(245,240,232,0.6)',
              cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(8px)',
            }}
          >
            <p style={{ fontSize: '14px', fontWeight: data.visibility === o.value ? 500 : 400, color: data.visibility === o.value ? '#C9A84C' : '#F2EDE6', marginBottom: '3px' }}>
              {o.label}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(28,24,20,0.9)' }}>{o.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: 'rgba(245,240,232,0.85)',
  border: '1px solid rgba(201,168,76,0.25)',
  borderRadius: '14px',
  padding: '14px 18px',
  color: '#1C1814',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  backdropFilter: 'blur(12px)',
  fontFamily: 'Inter, sans-serif',
}
const onFocus = e => { e.target.style.borderColor = 'rgba(201,168,76,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.12)'; }
const onBlur  = e => { e.target.style.borderColor = 'rgba(201,168,76,0.25)'; e.target.style.boxShadow = 'none'; }

function OField({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '8px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function StepPhoto({ photoPreview, onFile, fileRef }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '2rem', fontWeight: 600, color: '#1C1814', marginBottom: '4px' }}>
          Votre photo
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.9)' }}>Choisissez une photo de couple (optionnel)</p>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        style={{
          width: '100%', aspectRatio: '4/3', borderRadius: '18px',
          border: '2px dashed rgba(201,168,76,0.6)',
          background: photoPreview ? 'transparent' : 'rgba(245,240,232,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', overflow: 'hidden', position: 'relative',
          transition: 'border-color 0.2s',
        }}
      >
        {photoPreview ? (
          <img src={photoPreview} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }}>📸</div>
            <p style={{ fontSize: '14px', color: 'rgba(201,168,76,1)', fontWeight: 500 }}>Appuyez pour choisir une photo</p>
            <p style={{ fontSize: '11px', color: 'rgba(28,24,20,0.5)', marginTop: '4px' }}>Pas de photos explicites</p>
          </div>
        )}
      </div>

      {photoPreview && (
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            padding: '12px', borderRadius: '14px', cursor: 'pointer',
            background: 'transparent', border: '1px solid rgba(201,168,76,0.25)',
            color: 'rgba(201,168,76,1)', fontSize: '13px',
          }}
        >
          Changer la photo
        </button>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]) }}
      />

      <p style={{ fontSize: '11px', color: 'rgba(28,24,20,0.5)', textAlign: 'center' }}>
        Vous pourrez la modifier à tout moment depuis votre profil
      </p>
    </div>
  )
}

function OButton({ active, onClick, children }) {
  return (
    <button className="erb-btn"
      onClick={onClick}
      style={{
        textAlign: 'left', padding: '12px 16px', borderRadius: '12px',
        border: `1px solid ${active ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
        background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
        color: active ? '#C9A84C' : 'rgba(28,24,20,0.9)',
        fontSize: '14px', cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  )
}

