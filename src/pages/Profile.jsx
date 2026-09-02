import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { BookOpen, LogOut, Settings as SettingsIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { toast } from '../components/Toast'
import TraitQuestionnaire from '../components/TraitQuestionnaire'
import { PROFILE_PROMPTS, MAX_ANSWER_LENGTH, formatIdentity } from '../lib/prompts'
import { sanitizeTraits, answeredCount, TOTAL_TRAITS } from '../lib/compatibility'
import { Quill } from '../components/Logo'

/**
 * Mon profil.
 *
 * Trois blocs qui s'enregistrent séparément : qui je suis, ce que
 * j'écris, et le questionnaire de compatibilité. La page de quelqu'un
 * d'autre, c'est /personne/:id — on y renvoie.
 */
export default function Profile() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const me       = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const signOut  = useAuthStore(s => s.signOut)
  const fetchProfile = useAuthStore(s => s.fetchProfile)

  const [identite, setIdentite] = useState({ display_name: '', age: '', city: '' })
  const [answers,  setAnswers]  = useState({})
  const [traits,   setTraits]   = useState({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(null)   // 'identite' | 'answers' | 'traits'

  useEffect(() => {
    if (!me?.id) return
    setIdentite({
      display_name: me.display_name || '',
      age:          me.age ?? '',
      city:         me.city || '',
    })
  }, [me?.id, me?.display_name, me?.age, me?.city])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (demoMode || !me?.id) return
        const [{ data: rows }, { data: mesTraits }] = await Promise.all([
          supabase.from('profile_answers').select('slug, answer').eq('user_id', me.id),
          supabase.rpc('my_traits'),
        ])
        if (!alive) return
        setAnswers(Object.fromEntries((rows || []).map(r => [r.slug, r.answer])))
        setTraits(sanitizeTraits(mesTraits))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [me?.id, demoMode])

  const remplies = useMemo(() => answeredCount(traits), [traits])

  // la page d'un autre membre a la sienne
  if (id && me?.id && id !== me.id) return <Navigate to={`/personne/${id}`} replace />
  if (!me) return <Ecran><Spinner /></Ecran>

  const enregistrerIdentite = async () => {
    const nom = identite.display_name.trim()
    if (nom.length < 1) { toast('Un prénom, même court.', 'error'); return }
    const age = identite.age === '' ? null : Number(identite.age)
    if (age !== null && (!Number.isInteger(age) || age < 18 || age > 120)) {
      toast('L’âge doit être un nombre entre 18 et 120.', 'error'); return
    }
    setSaving('identite')
    try {
      if (demoMode) { toast('Enregistré ✓'); return }
      const { error } = await supabase.from('profiles')
        .update({ display_name: nom, age, city: identite.city.trim() || null })
        .eq('id', me.id)
      if (error) { toast(`Erreur : ${error.message}`, 'error'); return }
      await fetchProfile(me.id)
      toast('Enregistré ✓')
    } finally { setSaving(null) }
  }

  const enregistrerAnswers = async () => {
    setSaving('answers')
    try {
      if (demoMode) { toast('Enregistré ✓'); return }
      const rangees = PROFILE_PROMPTS
        .map(p => ({ user_id: me.id, slug: p.slug, answer: (answers[p.slug] || '').trim() }))
        .filter(r => r.answer.length > 0)

      // une réponse effacée doit disparaître, l'upsert ne la supprimerait pas
      const vides = PROFILE_PROMPTS
        .map(p => p.slug)
        .filter(slug => !(answers[slug] || '').trim())

      if (vides.length) {
        await supabase.from('profile_answers').delete().eq('user_id', me.id).in('slug', vides)
      }
      if (rangees.length) {
        const { error } = await supabase.from('profile_answers')
          .upsert(rangees, { onConflict: 'user_id,slug' })
        if (error) { toast(`Erreur : ${error.message}`, 'error'); return }
      }
      toast('Enregistré ✓')
    } finally { setSaving(null) }
  }

  const enregistrerTraits = async () => {
    setSaving('traits')
    try {
      if (demoMode) { toast('Enregistré ✓'); return }
      const { error } = await supabase.from('profile_traits')
        .upsert({ user_id: me.id, traits: sanitizeTraits(traits) }, { onConflict: 'user_id' })
      if (error) { toast(`Erreur : ${error.message}`, 'error'); return }
      toast('Enregistré ✓')
    } finally { setSaving(null) }
  }

  return (
    <Ecran>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '24px clamp(18px, 5vw, 30px) 40px' }}>

        {/* ── identité ── */}
        <header className="flex items-start justify-between" style={{ gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontFamily: 'Cormorant, serif', fontWeight: 500,
              fontSize: 'clamp(2rem, 8vw, 2.8rem)', lineHeight: 1.05,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              {me.display_name || 'Sans nom'}
            </h1>
            {formatIdentity(me) && (
              <p style={{ fontSize: 13, color: 'rgba(242,238,230,0.5)', marginTop: 8 }}>
                {formatIdentity(me)}
              </p>
            )}
          </div>

          <div className="flex" style={{ gap: 8, flexShrink: 0 }}>
            <IconBtn onClick={() => navigate('/carnet')}   aria="Mon carnet"><BookOpen size={17} strokeWidth={1.5} /></IconBtn>
            <IconBtn onClick={() => navigate('/settings')} aria="Réglages"><SettingsIcon size={17} strokeWidth={1.5} /></IconBtn>
          </div>
        </header>

        {loading ? <Spinner /> : (
          <>
            <Bloc titre="Qui je suis" onSave={enregistrerIdentite} saving={saving === 'identite'}>
              <Champ label="Prénom" value={identite.display_name}
                     onChange={v => setIdentite(f => ({ ...f, display_name: v.slice(0, 40) }))}
                     placeholder="Marion" />
              <div className="flex" style={{ gap: 12 }}>
                <Champ label="Âge" value={identite.age} type="number"
                       onChange={v => setIdentite(f => ({ ...f, age: v }))}
                       placeholder="37" />
                <Champ label="Où" value={identite.city}
                       onChange={v => setIdentite(f => ({ ...f, city: v.slice(0, 60) }))}
                       placeholder="quelque part entre Paris et ailleurs" />
              </div>
            </Bloc>

            <Bloc titre="Ce que j’écris"
                  intro="Ces quatre réponses sont ton profil. Il n’y a rien d’autre à remplir."
                  onSave={enregistrerAnswers} saving={saving === 'answers'}>
              {PROFILE_PROMPTS.map(p => (
                <div key={p.slug}>
                  <label htmlFor={p.slug} style={etiquette}>{p.label}</label>
                  <textarea
                    id={p.slug}
                    rows={3}
                    value={answers[p.slug] || ''}
                    maxLength={MAX_ANSWER_LENGTH}
                    onChange={e => setAnswers(a => ({ ...a, [p.slug]: e.target.value.slice(0, MAX_ANSWER_LENGTH) }))}
                    placeholder={p.placeholder}
                    style={champStyle}
                  />
                  <p style={{ fontSize: 10, color: 'rgba(242,238,230,0.3)', textAlign: 'right', marginTop: 4 }}>
                    {(answers[p.slug] || '').length} / {MAX_ANSWER_LENGTH}
                  </p>
                </div>
              ))}
            </Bloc>

            <Bloc titre="Compatibilité"
                  intro={`${remplies} question${remplies > 1 ? 's' : ''} sur ${TOTAL_TRAITS} — plus tu réponds, plus le taux affiché en face des autres a du sens.`}
                  onSave={enregistrerTraits} saving={saving === 'traits'}>
              <Jauge rempli={remplies} total={TOTAL_TRAITS} />
              <div style={{ marginTop: 24 }}>
                <TraitQuestionnaire
                  traits={traits}
                  tone="encre"
                  onChange={(slug, v) => setTraits(t => ({ ...t, [slug]: v }))}
                />
              </div>
            </Bloc>

            {/* La deconnexion existait, mais derriere une roue crantee sans
                libelle, dans Reglages : trois gestes et une icone muette.
                Elle est ici, nommee, au bout de sa propre page. */}
            <div style={{ textAlign: 'center', padding: '30px 0 8px' }}>
              <button
                onClick={async () => { await signOut(); navigate('/') }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 9,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: 'rgba(248,113,113,0.8)', padding: '10px 14px',
                }}
              >
                <LogOut size={15} strokeWidth={1.6} />
                Se déconnecter
              </button>
            </div>
          </>
        )}
      </div>
    </Ecran>
  )
}

function Bloc({ titre, intro, children, onSave, saving }) {
  return (
    <section style={{ marginTop: 42 }}>
      <div className="separator-gold" style={{ marginBottom: 22 }} />
      <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.7rem', fontWeight: 500 }}>{titre}</h2>
      {intro && (
        <p style={{ fontSize: 12, color: 'rgba(242,238,230,0.45)', lineHeight: 1.65, marginTop: 8 }}>
          {intro}
        </p>
      )}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
      <button onClick={onSave} disabled={saving} className="btn btn-continuer" style={{ marginTop: 22 }}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </section>
  )
}

function Jauge({ rempli, total }) {
  return (
    <div style={{ height: 2, background: 'rgba(242,238,230,0.12)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.round((rempli / total) * 100)}%`, height: '100%',
        background: 'var(--or)', transition: 'width var(--dur-mid) var(--ease-out)',
      }} />
    </div>
  )
}

function Champ({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={etiquette}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...champStyle, fontFamily: 'Inter, sans-serif', fontSize: 14 }}
      />
    </div>
  )
}

function IconBtn({ onClick, aria, children }) {
  return (
    <button onClick={onClick} aria-label={aria} style={{
      width: 38, height: 38, borderRadius: 3,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', border: '1px solid rgba(242,238,230,0.16)',
      color: 'rgba(242,238,230,0.75)', cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}

function Ecran({ children }) {
  return (
    <div className="pb-nav" style={{ minHeight: '100dvh', background: 'var(--encre)', color: 'var(--ivoire)' }}>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center" style={{ padding: '70px 0' }} role="status" aria-label="Chargement…">
      <div className="w-7 h-7 rounded-full animate-spin"
           style={{ border: '2px solid rgba(201,168,76,0.22)', borderTopColor: 'var(--or)' }} />
    </div>
  )
}

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
