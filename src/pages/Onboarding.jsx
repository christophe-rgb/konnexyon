import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { toast } from '../components/Toast'
import TraitQuestionnaire from '../components/TraitQuestionnaire'
import { PROFILE_PROMPTS, MAX_ANSWER_LENGTH } from '../lib/prompts'
import { TRAIT_SECTIONS, sanitizeTraits, answeredCount, TOTAL_TRAITS } from '../lib/compatibility'
import { Quill, Wordmark } from '../components/Logo'

const CONSENT_VERSION = 'v2.0-ecriture'

// on n'oblige pas à tout remplir, mais on n'ouvre pas la porte sur un
// profil vide : ce sont les autres qui liraient du blanc
const MIN_ANSWERS = 2
const MIN_TRAITS  = 8

const ETAPES = ['Le principe', 'Qui vous êtes', 'Ce que vous écrivez', 'Ce qui vous ressemble']

export default function Onboarding() {
  const navigate     = useNavigate()
  const user         = useAuthStore(s => s.user)
  const setProfile   = useAuthStore(s => s.setProfile)
  const fetchProfile = useAuthStore(s => s.fetchProfile)

  const [step,     setStep]     = useState(0)
  const [accepte,  setAccepte]  = useState(false)
  const [identite, setIdentite] = useState({ display_name: '', age: '', city: '' })
  const [answers,  setAnswers]  = useState({})
  const [traits,   setTraits]   = useState({})
  const [saving,   setSaving]   = useState(false)
  const [erreur,   setErreur]   = useState('')

  const remplies = answeredCount(traits)
  const ecrites  = PROFILE_PROMPTS.filter(p => (answers[p.slug] || '').trim()).length

  const peutAvancer = () => {
    if (step === 0) return accepte
    if (step === 1) return identite.display_name.trim().length >= 1 && ageValide(identite.age)
    if (step === 2) return ecrites >= MIN_ANSWERS
    return remplies >= MIN_TRAITS
  }

  const suivant = () => {
    setErreur('')
    if (!peutAvancer()) { setErreur(messageBlocage(step, ecrites, remplies)); return }
    if (step < ETAPES.length - 1) { setStep(s => s + 1); return }
    terminer()
  }

  const terminer = async () => {
    setSaving(true)
    setErreur('')
    try {
      const uid   = user?.id    || (await supabase.auth.getUser()).data.user?.id
      const email = user?.email || (await supabase.auth.getUser()).data.user?.email
      if (!uid) { setErreur('Session expirée. Reconnectez-vous.'); return }

      // position approximative, pour la carte de lecture — facultative
      let locationSql = null
      if (navigator.geolocation) {
        await new Promise(resolve => {
          navigator.geolocation.getCurrentPosition(
            pos => { locationSql = `SRID=4326;POINT(${pos.coords.longitude} ${pos.coords.latitude})`; resolve() },
            resolve,
            { timeout: 5000 },
          )
        })
      }

      const now = new Date().toISOString()
      const payload = {
        id: uid,
        email_1: email,
        display_name: identite.display_name.trim(),
        age:  identite.age === '' ? null : Number(identite.age),
        city: identite.city.trim() || null,
        email_1_confirmed: true,
        consent_given_at: now,
        consent_version:  CONSENT_VERSION,
        ...(locationSql ? { location: locationSql, location_updated_at: now } : {}),
      }

      // trois tentatives espacées : une coupure réseau ne doit pas
      // renvoyer quelqu'un au début du questionnaire
      let erreurUpsert = null
      for (let essai = 0; essai < 3; essai++) {
        if (essai > 0) await new Promise(r => setTimeout(r, essai * 1200))
        const { error } = await supabase.from('profiles').upsert(payload)
        erreurUpsert = error
        if (!error) break
      }
      if (erreurUpsert) {
        setErreur('Erreur à l’enregistrement. Vérifiez votre connexion et réessayez.')
        return
      }

      const rangees = PROFILE_PROMPTS
        .map(p => ({ user_id: uid, slug: p.slug, answer: (answers[p.slug] || '').trim() }))
        .filter(r => r.answer.length > 0)
      if (rangees.length) {
        await supabase.from('profile_answers').upsert(rangees, { onConflict: 'user_id,slug' })
      }
      await supabase.from('profile_traits')
        .upsert({ user_id: uid, traits: sanitizeTraits(traits) }, { onConflict: 'user_id' })

      supabase.functions.invoke('notify-new-user', {
        body: { record: { display_name: payload.display_name, status: 'actif' } },
      }).catch(() => {})

      setProfile({ ...payload })
      fetchProfile(uid)
      navigate('/mot-du-jour')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--encre)', color: 'var(--ivoire)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '26px clamp(18px, 5vw, 30px) 48px' }}>

        <div className="flex items-center justify-between" style={{ marginBottom: 26 }}>
          <Wordmark size={17} tone="or" />
          <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(242,238,230,0.4)' }}>
            {step + 1} / {ETAPES.length}
          </span>
        </div>

        {/* progression */}
        <div className="flex" style={{ gap: 5, marginBottom: 34 }}>
          {ETAPES.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 2, borderRadius: 2,
              background: i <= step ? 'var(--or)' : 'rgba(242,238,230,0.14)',
              transition: 'background var(--dur-mid) var(--ease-out)',
            }} />
          ))}
        </div>

        <div key={step} className="animate-fade-in-up" style={{ animationFillMode: 'both' }}>
          <h1 style={{ fontFamily: 'Cormorant, serif', fontSize: 'clamp(1.9rem, 7vw, 2.5rem)', fontWeight: 500, lineHeight: 1.15 }}>
            {ETAPES[step]}
          </h1>

          {step === 0 && <EtapePrincipe accepte={accepte} setAccepte={setAccepte} />}
          {step === 1 && <EtapeIdentite identite={identite} setIdentite={setIdentite} />}
          {step === 2 && <EtapeEcriture answers={answers} setAnswers={setAnswers} ecrites={ecrites} />}
          {step === 3 && (
            <div style={{ marginTop: 22 }}>
              <p style={{ fontSize: 13, color: 'rgba(242,238,230,0.5)', lineHeight: 1.7, marginBottom: 26 }}>
                Seize questions, aucune bonne réponse. Elles servent à calculer un taux de
                compatibilité intellectuelle avec les autres — {remplies} sur {TOTAL_TRAITS} remplies,
                il en faut {MIN_TRAITS} pour continuer.
              </p>
              <TraitQuestionnaire
                traits={traits}
                tone="encre"
                sections={TRAIT_SECTIONS}
                onChange={(slug, v) => setTraits(t => ({ ...t, [slug]: v }))}
              />
            </div>
          )}
        </div>

        {erreur && (
          <p role="alert" style={{
            marginTop: 22, padding: '11px 14px', borderRadius: 3,
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
            color: 'rgba(248,113,113,0.95)', fontSize: 12, lineHeight: 1.55,
          }}>
            {erreur}
          </p>
        )}

        <div className="flex items-center" style={{ gap: 12, marginTop: 34 }}>
          {step > 0 && (
            <button onClick={() => { setErreur(''); setStep(s => s - 1) }} className="btn btn-ecrire">
              <ArrowLeft size={14} strokeWidth={1.7} />
              Retour
            </button>
          )}
          <button onClick={suivant} disabled={saving} className="btn btn-continuer" style={{ flex: 1 }}>
            {saving ? 'Enregistrement…' : step === ETAPES.length - 1 ? 'Entrer' : 'Continuer'}
            {!saving && <ArrowRight size={14} strokeWidth={1.7} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── étapes ───────────────────────────────────────────────────

function EtapePrincipe({ accepte, setAccepte }) {
  return (
    <div style={{ marginTop: 24 }}>
      <Quill size={46} tone="or" style={{ marginBottom: 22 }} />
      <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.3rem', lineHeight: 1.65, color: 'rgba(242,238,230,0.9)' }}>
        Ici, personne ne verra votre visage. On vous lira.
      </p>
      <p style={{ fontSize: 13, lineHeight: 1.85, color: 'rgba(242,238,230,0.5)', marginTop: 16 }}>
        Chaque jour, un mot. Vous écrivez la ligne qu’il fait remonter, et vous découvrez
        celles des autres. Votre profil, ce sont vos réponses — il n’y a pas de photo à
        téléverser, pas de case à cocher sur ce que vous cherchez.
      </p>

      <label className="flex items-start" style={{ gap: 12, marginTop: 28, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={accepte}
          onChange={e => setAccepte(e.target.checked)}
          style={{ marginTop: 2, width: 18, height: 18, flexShrink: 0, accentColor: '#C9A84C' }}
        />
        <span style={{ fontSize: 12, lineHeight: 1.7, color: 'rgba(242,238,230,0.7)' }}>
          J’accepte les <a href="/cgu" style={lien}>conditions d’utilisation</a> et la{' '}
          <a href="/confidentialite" style={lien}>politique de confidentialité</a>.
        </span>
      </label>
    </div>
  )
}

function EtapeIdentite({ identite, setIdentite }) {
  return (
    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <p style={{ fontSize: 13, color: 'rgba(242,238,230,0.5)', lineHeight: 1.7 }}>
        Un prénom suffit. Le lieu peut rester vague — « quelque part entre Paris et
        ailleurs » est une réponse acceptable.
      </p>
      <Champ label="Prénom" value={identite.display_name} placeholder="Marion"
             onChange={v => setIdentite(f => ({ ...f, display_name: v.slice(0, 40) }))} />
      <div className="flex" style={{ gap: 12 }}>
        <Champ label="Âge" type="number" value={identite.age} placeholder="37"
               onChange={v => setIdentite(f => ({ ...f, age: v }))} />
        <Champ label="Où" value={identite.city} placeholder="Lyon"
               onChange={v => setIdentite(f => ({ ...f, city: v.slice(0, 60) }))} />
      </div>
    </div>
  )
}

function EtapeEcriture({ answers, setAnswers, ecrites }) {
  return (
    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ fontSize: 13, color: 'rgba(242,238,230,0.5)', lineHeight: 1.7 }}>
        Ces quatre réponses tiennent lieu de profil. Répondez-en au moins {MIN_ANSWERS} —
        vous compléterez le reste quand ça viendra. ({ecrites} sur {PROFILE_PROMPTS.length})
      </p>
      {PROFILE_PROMPTS.map(p => (
        <div key={p.slug}>
          <label htmlFor={p.slug} style={etiquette}>{p.label}</label>
          <textarea
            id={p.slug}
            rows={3}
            value={answers[p.slug] || ''}
            maxLength={MAX_ANSWER_LENGTH}
            placeholder={p.placeholder}
            onChange={e => setAnswers(a => ({ ...a, [p.slug]: e.target.value.slice(0, MAX_ANSWER_LENGTH) }))}
            style={champStyle}
          />
        </div>
      ))}
    </div>
  )
}

// ─── détails ──────────────────────────────────────────────────

function ageValide(age) {
  if (age === '') return true                      // facultatif
  const n = Number(age)
  return Number.isInteger(n) && n >= 18 && n <= 120
}

function messageBlocage(step, ecrites, remplies) {
  if (step === 0) return 'Il faut accepter les conditions pour continuer.'
  if (step === 1) return 'Un prénom, et un âge entre 18 et 120 si vous le donnez.'
  if (step === 2) return `Répondez à au moins ${MIN_ANSWERS} questions — il y en a ${ecrites}.`
  return `Encore ${MIN_TRAITS - remplies} question${MIN_TRAITS - remplies > 1 ? 's' : ''} avant d’entrer.`
}

function Champ({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={etiquette}>{label}</label>
      <input type={type} value={value} placeholder={placeholder}
             onChange={e => onChange(e.target.value)}
             style={{ ...champStyle, fontFamily: 'Inter, sans-serif', fontSize: 14 }} />
    </div>
  )
}

const lien = { color: 'var(--or)', textDecoration: 'underline', textUnderlineOffset: 3 }

const etiquette = {
  display: 'block', fontSize: 10, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: 'rgba(201,168,76,0.75)', marginBottom: 7,
}

const champStyle = {
  width: '100%', resize: 'none',
  background: 'rgba(242,238,230,0.04)',
  border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: 3, padding: '12px 14px',
  color: 'rgba(242,238,230,0.95)',
  fontFamily: 'Cormorant, serif', fontSize: '1.1rem', lineHeight: 1.6,
  outline: 'none',
}
