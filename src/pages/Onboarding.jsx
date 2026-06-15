import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import clsx from 'clsx'

const STEPS = ['profil', 'cherche', 'disponibilites', 'limites', 'distance', 'visibilite']

const SEEKING_OPTIONS = [
  { value: 'rencontres_occasionnelles', label: 'Rencontres occasionnelles' },
  { value: 'echangisme',                label: 'Échangisme / soirées' },
  { value: 'amis_libertins',            label: 'Amis libertins sans obligation' },
  { value: 'decouverte',                label: 'Découverte / curieux' },
]

const AVAIL_OPTIONS = [
  { value: 'semaine',      label: 'En semaine' },
  { value: 'weekend',      label: 'Le week-end' },
  { value: 'rdv',          label: 'Sur rendez-vous' },
  { value: 'spontanement', label: 'Spontanément' },
]

const LIMITS_OPTIONS = [
  { value: 'pas_photo',              label: 'Pas de photo sans accord' },
  { value: 'discretion',             label: 'Discrétion totale' },
  { value: 'pas_contact_hors_site',  label: 'Pas de contact hors site avant rencontre' },
  { value: 'preservatif',            label: 'Préservatif obligatoire' },
]

const ORIENTATIONS = [
  { value: 'hetero_hetero', label: 'Hétéro cherche hétéro' },
  { value: 'hetero_bi',     label: 'Hétéro cherche bi' },
  { value: 'bi_all',        label: 'Bi cherche tout profil' },
]

const LOOKING_FOR = [
  { value: 'couple', label: 'Autre couple' },
  { value: 'man',    label: 'Homme' },
  { value: 'woman',  label: 'Femme' },
]

export default function Onboarding() {
  const user         = useAuthStore(s => s.user)
  const fetchProfile = useAuthStore(s => s.fetchProfile)
  const navigate     = useNavigate()

  const [step,   setStep]   = useState(0)
  const [saving, setSaving] = useState(false)
  const [data,   setData]   = useState({
    couple_name:  '',
    bio:          '',
    orientation:  'hetero_hetero',
    looking_for:  ['couple'],
    seeking:      [],
    availabilities: [],
    limits:       [],
    max_distance_km: 50,
    visibility:   'public',
  })

  const set = (k, v) => setData(d => ({ ...d, [k]: v }))

  const toggleArr = (k, v) => {
    const arr = data[k]
    set(k, arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
  }

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  const finish = async () => {
    setSaving(true)

    // géoloc
    let locationSql = null
    await new Promise(resolve => {
      navigator.geolocation?.getCurrentPosition(pos => {
        locationSql = `POINT(${pos.coords.longitude} ${pos.coords.latitude})`
        resolve()
      }, resolve, { timeout: 5000 })
    })

    await supabase.from('profiles').update({
      ...data,
      email_1_confirmed: true,
      ...(locationSql ? { location: locationSql, location_updated_at: new Date().toISOString() } : {}),
    }).eq('id', user.id)

    await fetchProfile(user.id)

    // si email_2 renseigné → envoyer la confirmation partenaire
    const { data: updatedProfile } = await supabase
      .from('profiles').select('email_2').eq('id', user.id).single()

    if (updatedProfile?.email_2) {
      await supabase.functions.invoke('send-partner-confirmation', {
        body: {
          profile_id: user.id,
          email_2:    updatedProfile.email_2,
          app_url:    window.location.origin,
        },
      })
    }

    navigate('/discover')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* progress */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className={clsx('flex-1 h-1 rounded-full transition-colors duration-300',
              i <= step ? 'bg-gold' : 'bg-surface2')} />
          ))}
        </div>

        {step === 0 && (
          <StepProfil data={data} set={set} />
        )}
        {step === 1 && (
          <StepMulti title="Ce que vous cherchez" subtitle="Sélectionnez tout ce qui vous correspond"
            options={SEEKING_OPTIONS} field="seeking" data={data} toggle={toggleArr} />
        )}
        {step === 2 && (
          <StepMulti title="Vos disponibilités" subtitle="Quand êtes-vous disponibles ?"
            options={AVAIL_OPTIONS} field="availabilities" data={data} toggle={toggleArr} />
        )}
        {step === 3 && (
          <StepMulti title="Vos limites" subtitle="Ces points seront affichés comme non négociables sur votre profil"
            options={LIMITS_OPTIONS} field="limits" data={data} toggle={toggleArr} />
        )}
        {step === 4 && (
          <StepDistance data={data} set={set} />
        )}
        {step === 5 && (
          <StepVisibility data={data} set={set} />
        )}

        {/* nav */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button onClick={prev}
              className="flex-1 py-3 rounded-xl border border-[rgba(201,168,76,0.2)] text-muted hover:text-text transition-colors duration-150 cursor-pointer">
              Retour
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={next}
              className="flex-1 py-3 rounded-xl bg-gold text-bg font-semibold hover:bg-[#d4ae58] transition-colors duration-150 cursor-pointer">
              Suivant
            </button>
          ) : (
            <button onClick={finish} disabled={saving}
              className="flex-1 py-3 rounded-xl bg-gold text-bg font-semibold hover:bg-[#d4ae58] disabled:opacity-50 transition-colors duration-150 cursor-pointer">
              {saving ? 'Enregistrement…' : 'Terminer'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StepProfil({ data, set }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-3xl font-semibold mb-1">Votre couple</h2>
        <p className="text-muted text-sm">Comment voulez-vous vous présenter ?</p>
      </div>
      <div>
        <label className="block text-sm text-muted mb-1.5">Pseudo du couple *</label>
        <input value={data.couple_name} onChange={e => set('couple_name', e.target.value)}
          maxLength={50} placeholder="Marc & Julie"
          className="w-full bg-surface2 border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors duration-150" />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1.5">Description <span className="text-xs">(max 300 car.)</span></label>
        <textarea value={data.bio} onChange={e => set('bio', e.target.value)}
          maxLength={300} rows={3} placeholder="Parlez de vous en quelques mots…"
          className="w-full bg-surface2 border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors duration-150 resize-none" />
      </div>
      <div>
        <label className="block text-sm text-muted mb-2">Votre orientation</label>
        <div className="flex flex-col gap-2">
          {[
            { value: 'hetero_hetero', label: 'Hétéro cherche hétéro' },
            { value: 'hetero_bi',     label: 'Hétéro cherche bi' },
            { value: 'bi_all',        label: 'Bi cherche tout profil' },
          ].map(o => (
            <button key={o.value} onClick={() => set('orientation', o.value)}
              className={clsx('text-left px-4 py-2.5 rounded-xl border text-sm transition-colors duration-150 cursor-pointer',
                data.orientation === o.value
                  ? 'bg-gold/10 border-gold text-gold'
                  : 'border-[rgba(201,168,76,0.2)] text-muted hover:text-text')}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm text-muted mb-2">Vous cherchez</label>
        <div className="flex gap-2">
          {[
            { value: 'couple', label: 'Couple' },
            { value: 'man',    label: 'Homme' },
            { value: 'woman',  label: 'Femme' },
          ].map(o => {
            const active = data.looking_for.includes(o.value)
            return (
              <button key={o.value}
                onClick={() => {
                  set('looking_for', active
                    ? data.looking_for.filter(x => x !== o.value)
                    : [...data.looking_for, o.value])
                }}
                className={clsx('flex-1 py-2 rounded-xl border text-sm transition-colors duration-150 cursor-pointer',
                  active ? 'bg-gold text-bg border-gold' : 'border-[rgba(201,168,76,0.2)] text-muted hover:text-text')}>
                {o.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StepMulti({ title, subtitle, options, field, data, toggle }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-3xl font-semibold mb-1">{title}</h2>
        {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-2">
        {options.map(o => {
          const active = data[field]?.includes(o.value)
          return (
            <button key={o.value} onClick={() => toggle(field, o.value)}
              className={clsx('text-left px-4 py-3 rounded-xl border text-sm transition-colors duration-150 cursor-pointer',
                active
                  ? 'bg-gold/10 border-gold text-gold'
                  : 'border-[rgba(201,168,76,0.2)] text-muted hover:text-text')}>
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepDistance({ data, set }) {
  const options = [
    { value: 20,  label: 'Moins de 20 km' },
    { value: 50,  label: '20 – 50 km' },
    { value: 100, label: '50 – 100 km' },
    { value: 0,   label: 'Peu importe' },
  ]
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-3xl font-semibold mb-1">Distance</h2>
        <p className="text-muted text-sm">Distance maximum acceptable pour une rencontre</p>
      </div>
      <div className="flex flex-col gap-2">
        {options.map(o => (
          <button key={o.value} onClick={() => set('max_distance_km', o.value)}
            className={clsx('text-left px-4 py-3 rounded-xl border text-sm transition-colors duration-150 cursor-pointer',
              data.max_distance_km === o.value
                ? 'bg-gold/10 border-gold text-gold'
                : 'border-[rgba(201,168,76,0.2)] text-muted hover:text-text')}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function StepVisibility({ data, set }) {
  const options = [
    { value: 'public',        label: 'Visible par tous les membres', desc: 'Votre profil apparaît dans les résultats de recherche' },
    { value: 'matches_only',  label: 'Visible par nos matchs uniquement', desc: 'Seuls vos matchs peuvent voir votre profil' },
    { value: 'discreet',      label: 'Mode discret', desc: 'Invisible sur la carte et la liste — vous seuls voyez les autres' },
  ]
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-3xl font-semibold mb-1">Visibilité</h2>
        <p className="text-muted text-sm">Qui peut voir votre profil ?</p>
      </div>
      <div className="flex flex-col gap-2">
        {options.map(o => (
          <button key={o.value} onClick={() => set('visibility', o.value)}
            className={clsx('text-left px-4 py-3 rounded-xl border transition-colors duration-150 cursor-pointer',
              data.visibility === o.value
                ? 'bg-gold/10 border-gold'
                : 'border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]')}>
            <p className={clsx('text-sm font-medium', data.visibility === o.value ? 'text-gold' : 'text-text')}>{o.label}</p>
            <p className="text-xs text-muted mt-0.5">{o.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
