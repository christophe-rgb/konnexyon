import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

const STEPS = [
  { key: 'profil',         label: 'Votre couple',      icon: '∞' },
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

  const [step,   setStep]   = useState(0)
  const [saving, setSaving] = useState(false)
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
  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  const finish = async () => {
    setSaving(true)
    let locationSql = null
    await new Promise(resolve => {
      navigator.geolocation?.getCurrentPosition(pos => {
        locationSql = `POINT(${pos.coords.longitude} ${pos.coords.latitude})`
        resolve()
      }, resolve, { timeout: 5000 })
    })
    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: user.id,
      email_1: user.email,
      ...data,
      email_1_confirmed: true,
      ...(locationSql ? { location: locationSql, location_updated_at: new Date().toISOString() } : {}),
    })
    if (upsertError) {
      console.error('Upsert error:', upsertError)
      setSaving(false)
      return
    }
    // Force le store immédiatement — sans attendre fetchProfile qui peut échouer
    setProfile({ id: user.id, email_1: user.email, ...data, email_1_confirmed: true })
    // Refresh en arrière-plan
    fetchProfile(user.id)
    const { data: updatedProfile } = await supabase
      .from('profiles').select('email_2').eq('id', user.id).single()
    if (updatedProfile?.email_2) {
      await supabase.functions.invoke('send-partner-confirmation', {
        body: { profile_id: user.id, email_2: updatedProfile.email_2, app_url: window.location.origin },
      })
    }
    navigate('/discover')
  }

  const currentStep = STEPS[step]

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">

      {/* fond logo filigrane */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <img src="/logo.png" alt="" aria-hidden style={{
          width: '130vw', maxWidth: 860,
          opacity: 0.28, filter: 'brightness(0.85) saturate(0.9)',
          userSelect: 'none', display: 'block',
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, rgba(5,5,5,0.2) 0%, rgba(5,5,5,0.65) 55%, rgba(5,5,5,0.96) 100%)',
        }} />
      </div>



      <div className="w-full max-w-sm relative z-10">

        {/* header marque */}
        <div className="flex items-center justify-center gap-2 mb-8 animate-fade-in" style={{ animationFillMode: 'both' }}>
          <span style={{ color: 'rgba(201,168,76,0.4)', fontSize: '14px' }}>∞</span>
          <span style={{ fontFamily: 'Cormorant, serif', fontSize: '1rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.4)', textTransform: 'uppercase' }}>
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
                    : 'rgba(255,255,255,0.06)',
                  boxShadow: i <= step ? '0 0 8px rgba(201,168,76,0.3)' : 'none',
                }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)' }}>
              {currentStep.icon} {currentStep.label}
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
              {step + 1} / {STEPS.length}
            </span>
          </div>
        </div>

        {/* contenu step */}
        <div className="animate-fade-in-up mt-6" style={{ animationFillMode: 'both', animationDuration: '350ms' }} key={step}>
          {step === 0 && <StepProfil data={data} set={set} toggleArr={toggleArr} />}
          {step === 1 && (
            <StepMulti
              title="Vos désirs" subtitle="Sélectionnez tout ce qui vous correspond"
              options={SEEKING_OPTIONS} field="seeking" data={data} toggle={toggleArr}
            />
          )}
          {step === 2 && (
            <StepMulti
              title="Vos disponibilités" subtitle="Quand êtes-vous disponibles ?"
              options={AVAIL_OPTIONS} field="availabilities" data={data} toggle={toggleArr}
            />
          )}
          {step === 3 && (
            <StepMulti
              title="Vos limites" subtitle="Ces points seront visibles sur votre profil"
              options={LIMITS_OPTIONS} field="limits" data={data} toggle={toggleArr}
            />
          )}
          {step === 4 && <StepDistance data={data} set={set} />}
          {step === 5 && <StepVisibility data={data} set={set} />}
        </div>

        {/* navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button className="erb-btn"
              onClick={prev}
              style={{
                flex: 1, padding: '15px', borderRadius: '14px', cursor: 'pointer',
                background: 'transparent',
                border: '1px solid rgba(201,168,76,0.2)',
                color: 'rgba(201,168,76,0.6)',
                fontSize: '13px', letterSpacing: '0.08em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = '#C9A84C'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'; e.currentTarget.style.color = 'rgba(201,168,76,0.6)'; }}
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

function StepProfil({ data, set, toggleArr }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '2rem', fontWeight: 600, color: '#F2EDE6', marginBottom: '4px' }}>
          Votre couple
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Comment voulez-vous vous présenter ?</p>
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
        <p style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', marginBottom: '10px' }}>
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
        <p style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', marginBottom: '10px' }}>
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
        <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '2rem', fontWeight: 600, color: '#F2EDE6', marginBottom: '4px' }}>
          {title}
        </h2>
        {subtitle && <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>{subtitle}</p>}
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
                border: `1px solid ${active ? 'rgba(201,168,76,0.55)' : 'rgba(201,168,76,0.15)'}`,
                background: active ? 'rgba(201,168,76,0.08)' : 'rgba(15,15,15,0.6)',
                color: active ? '#C9A84C' : 'rgba(255,255,255,0.5)',
                fontSize: '14px', cursor: 'pointer',
                transition: 'all 0.2s',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ display: 'block', fontWeight: active ? 500 : 400 }}>{o.label}</span>
              {o.desc && <span style={{ display: 'block', fontSize: '11px', color: active ? 'rgba(201,168,76,0.6)' : 'rgba(255,255,255,0.2)', marginTop: '2px' }}>{o.desc}</span>}
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
        <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '2rem', fontWeight: 600, color: '#F2EDE6', marginBottom: '4px' }}>
          Distance
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Distance maximum pour une rencontre</p>
      </div>
      <div className="flex flex-col gap-2">
        {options.map(o => (
          <button className="erb-btn"
            key={o.value}
            onClick={() => set('max_distance_km', o.value)}
            style={{
              textAlign: 'left', padding: '14px 16px', borderRadius: '14px',
              border: `1px solid ${data.max_distance_km === o.value ? 'rgba(201,168,76,0.55)' : 'rgba(201,168,76,0.15)'}`,
              background: data.max_distance_km === o.value ? 'rgba(201,168,76,0.08)' : 'rgba(15,15,15,0.6)',
              cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ display: 'block', fontSize: '14px', color: data.max_distance_km === o.value ? '#C9A84C' : 'rgba(255,255,255,0.6)', fontWeight: data.max_distance_km === o.value ? 500 : 400 }}>
              {o.label}
            </span>
            <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '2px' }}>{o.desc}</span>
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
        <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '2rem', fontWeight: 600, color: '#F2EDE6', marginBottom: '4px' }}>
          Visibilité
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Qui peut voir votre profil ?</p>
      </div>
      <div className="flex flex-col gap-2">
        {options.map(o => (
          <button className="erb-btn"
            key={o.value}
            onClick={() => set('visibility', o.value)}
            style={{
              textAlign: 'left', padding: '16px', borderRadius: '14px',
              border: `1px solid ${data.visibility === o.value ? 'rgba(201,168,76,0.55)' : 'rgba(201,168,76,0.15)'}`,
              background: data.visibility === o.value ? 'rgba(201,168,76,0.08)' : 'rgba(15,15,15,0.6)',
              cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(8px)',
            }}
          >
            <p style={{ fontSize: '14px', fontWeight: data.visibility === o.value ? 500 : 400, color: data.visibility === o.value ? '#C9A84C' : '#F2EDE6', marginBottom: '3px' }}>
              {o.label}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>{o.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: 'rgba(15,15,15,0.85)',
  border: '1px solid rgba(201,168,76,0.18)',
  borderRadius: '14px',
  padding: '14px 18px',
  color: '#F2EDE6',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  backdropFilter: 'blur(12px)',
  fontFamily: 'Inter, sans-serif',
}
const onFocus = e => { e.target.style.borderColor = 'rgba(201,168,76,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.07)'; }
const onBlur  = e => { e.target.style.borderColor = 'rgba(201,168,76,0.18)'; e.target.style.boxShadow = 'none'; }

function OField({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', marginBottom: '8px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function OButton({ active, onClick, children }) {
  return (
    <button className="erb-btn"
      onClick={onClick}
      style={{
        textAlign: 'left', padding: '12px 16px', borderRadius: '12px',
        border: `1px solid ${active ? 'rgba(201,168,76,0.55)' : 'rgba(201,168,76,0.15)'}`,
        background: active ? 'rgba(201,168,76,0.09)' : 'transparent',
        color: active ? '#C9A84C' : 'rgba(255,255,255,0.45)',
        fontSize: '14px', cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  )
}

