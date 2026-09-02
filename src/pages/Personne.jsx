import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Flag, Ban } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { toast } from '../components/Toast'
import { confirm } from '../components/ConfirmDialog'
import ReportModal from '../components/ReportModal'
import { PROFILE_PROMPTS, PROMPT_LABELS, formatIdentity } from '../lib/prompts'
import { useConnections } from '../hooks/useConnections'
import { compatibilityLabel } from '../lib/compatibility'
import { Quill } from '../components/Logo'

/**
 * La page de quelqu'un — une feuille de papier posée sur l'encre.
 * Ni photo ni compteur : un prénom, un âge, un lieu, et ce qu'il a écrit.
 */
export default function Personne() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const me       = useAuthStore(s => s.profile)
  const demoMode = useAuthStore(s => s.demoMode)
  const { connect } = useConnections()

  const [page,     setPage]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [menu,     setMenu]     = useState(false)
  const [report,   setReport]   = useState(false)
  const [matchId,  setMatchId]  = useState(null)
  const [writing,  setWriting]  = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (demoMode) {
          if (alive) setPage(DEMO_PAGE)
          return
        }
        if (!id || !me?.id) return

        const [{ data, error }, { data: match }] = await Promise.all([
          supabase.rpc('get_profile_page', { p_user_id: id }),
          supabase.from('matches').select('id')
            .eq('member_a', me.id < id ? me.id : id)
            .eq('member_b', me.id < id ? id : me.id)
            .maybeSingle(),
        ])
        if (!alive) return
        if (error) {
          toast('Impossible d’ouvrir cette page — ' + (error.message || 'réessayez'), 'error')
          return
        }
        setPage(data)
        setMatchId(match?.id || null)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id, me?.id, demoMode])

  // « Écrire à X » : si la connexion est déjà réciproque on ouvre la
  // conversation, sinon on envoie l'intérêt et on le dit sans détour.
  const ecrire = async () => {
    if (matchId) { navigate(`/messages/${matchId}`); return }
    if (writing) return
    setWriting(true)
    try {
      const ok = await connect(id)
      if (ok) toast(`Ton intérêt est parti. Tu pourras écrire dès que ${page?.display_name} répondra.`)
    } finally {
      setWriting(false)
    }
  }

  const signaler = async (reason) => {
    if (!reason?.trim()) return false
    const { error } = await supabase.from('reports').insert({
      reporter_id: me.id, reported_id: id, reason,
    })
    if (error) { toast(`Erreur : ${error.message}`, 'error'); return false }
    toast('Signalement envoyé')
    return true
  }

  const bloquer = async () => {
    setMenu(false)
    const ok = await confirm({
      title: 'Bloquer cette personne',
      message: 'Tu ne verras plus ses écrits, et elle ne verra plus les tiens. Continuer ?',
      confirmLabel: 'Bloquer',
      danger: true,
    })
    if (!ok) return
    const { error } = await supabase.from('blocks').insert({ blocker_id: me.id, blocked_id: id })
    if (error && error.code !== '23505') { toast(`Erreur : ${error.message}`, 'error'); return }
    toast('Personne bloquée')
    navigate('/lire')
  }

  if (loading) return <Ecran><Spinner /></Ecran>
  if (!page)   return <Ecran><Introuvable onBack={() => navigate('/lire')} /></Ecran>

  const answers = Object.fromEntries((page.answers || []).map(a => [a.slug, a.answer]))
  const remplies = PROFILE_PROMPTS.filter(p => answers[p.slug])

  return (
    <Ecran>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '18px clamp(14px, 4vw, 24px) 40px' }}>

        {/* ── barre ── */}
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} aria-label="Retour" style={iconBtn}>
            <ArrowLeft size={18} strokeWidth={1.5} />
          </button>

          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu(m => !m)} aria-label="Plus d’options"
                    aria-expanded={menu} style={iconBtn}>
              <MoreHorizontal size={18} strokeWidth={1.5} />
            </button>
            {menu && (
              <div className="animate-slide-down" style={{
                position: 'absolute', right: 0, top: 38, zIndex: 20, minWidth: 168,
                background: 'var(--graphite)', borderRadius: 4,
                border: '1px solid rgba(242,238,230,0.12)',
                boxShadow: '0 12px 34px rgba(0,0,0,0.5)', overflow: 'hidden',
              }}>
                <button onClick={() => { setMenu(false); setReport(true) }} style={menuItem}>
                  <Flag size={14} strokeWidth={1.5} /> Signaler
                </button>
                <button onClick={bloquer} style={{ ...menuItem, color: 'rgba(248,113,113,0.95)' }}>
                  <Ban size={14} strokeWidth={1.5} /> Bloquer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── la feuille ── */}
        <article className="paper animate-fade-in-up" style={{
          position: 'relative', overflow: 'hidden',
          padding: 'clamp(28px, 7vw, 44px) clamp(22px, 6vw, 40px) clamp(26px, 6vw, 38px)',
          animationFillMode: 'both',
        }}>
          {/* plume en filigrane */}
          <Quill size={190} tone="encre" style={{
            position: 'absolute', right: -34, top: 54, opacity: 0.06, pointerEvents: 'none',
          }} />

          <h1 style={{
            fontFamily: 'Cormorant, serif', fontSize: 'clamp(1.9rem, 7vw, 2.5rem)',
            fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1,
          }}>
            {page.display_name}
          </h1>
          {formatIdentity(page) && (
            <p style={{ fontSize: 13, color: 'rgba(11,11,11,0.5)', marginTop: 9 }}>
              {formatIdentity(page)}
            </p>
          )}

          {page.compatibility != null ? (
            <div style={{ marginTop: 20 }}>
              <div className="flex items-baseline justify-between" style={{ gap: 12, marginBottom: 7 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(11,11,11,0.42)' }}>
                  Compatibilité intellectuelle
                </span>
                <span style={{ fontFamily: 'Cormorant, serif', fontSize: '1.3rem', color: 'var(--or)' }}>
                  {page.compatibility} %
                </span>
              </div>
              <div style={{ height: 2, background: 'rgba(11,11,11,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${page.compatibility}%`, height: '100%', background: 'var(--or)' }} />
              </div>
              <p style={{ fontSize: 11, color: 'rgba(11,11,11,0.45)', marginTop: 7 }}>
                {compatibilityLabel(page.compatibility)}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 11, color: 'rgba(11,11,11,0.4)', lineHeight: 1.6, marginTop: 20 }}>
              Taux indisponible : l’un de vous deux n’a pas assez répondu au questionnaire.
            </p>
          )}

          <div style={{ height: 1, background: 'rgba(11,11,11,0.1)', margin: '26px 0 4px' }} />

          {remplies.length === 0 ? (
            <p style={{
              fontFamily: 'Cormorant, serif', fontStyle: 'italic', fontSize: '1.15rem',
              color: 'rgba(11,11,11,0.5)', padding: '22px 0',
            }}>
              Cette personne n’a pas encore écrit son profil.
            </p>
          ) : remplies.map(p => (
            <section key={p.slug} style={{ padding: '22px 0 0' }}>
              <h2 style={{
                fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'rgba(11,11,11,0.42)', fontFamily: 'Inter, sans-serif', fontWeight: 500,
              }}>
                {PROMPT_LABELS[p.slug]}
              </h2>
              <p style={{
                fontFamily: 'Cormorant, serif', fontSize: 'clamp(1.15rem, 4.4vw, 1.35rem)',
                lineHeight: 1.68, marginTop: 8,
              }}>
                {answers[p.slug]}
              </p>
            </section>
          ))}

          {page.last_line && (
            <section style={{ padding: '26px 0 0' }}>
              <h2 style={{
                fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'rgba(201,168,76,0.85)', fontFamily: 'Inter, sans-serif', fontWeight: 500,
              }}>
                Sa dernière ligne
              </h2>
              <p style={{
                fontFamily: 'Cormorant, serif', fontStyle: 'italic',
                fontSize: 'clamp(1.15rem, 4.4vw, 1.35rem)', lineHeight: 1.68, marginTop: 8,
              }}>
                « {page.last_line} »
              </p>
            </section>
          )}

          <button onClick={ecrire} disabled={writing} className="btn btn-lire"
                  style={{ width: '100%', marginTop: 34 }}>
            Écrire à {page.display_name}
          </button>
        </article>
      </div>

      {report && (
        <ReportModal
          onClose={() => setReport(false)}
          onSubmit={signaler}
        />
      )}
    </Ecran>
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
    <div className="flex justify-center" style={{ padding: '90px 0' }} role="status" aria-label="Chargement…">
      <div className="w-7 h-7 rounded-full animate-spin"
           style={{ border: '2px solid rgba(201,168,76,0.22)', borderTopColor: 'var(--or)' }} />
    </div>
  )
}

function Introuvable({ onBack }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 28px' }}>
      <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.6rem' }}>Cette page n’existe plus.</p>
      <button onClick={onBack} className="btn btn-continuer" style={{ marginTop: 24 }}>Revenir à la lecture</button>
    </div>
  )
}

const iconBtn = {
  width: 36, height: 36, borderRadius: 4,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: '1px solid rgba(242,238,230,0.16)',
  color: 'rgba(242,238,230,0.75)', cursor: 'pointer',
}

const menuItem = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
  padding: '12px 15px', background: 'transparent', border: 'none',
  color: 'rgba(242,238,230,0.9)', fontSize: 12, letterSpacing: '0.06em',
  cursor: 'pointer', textAlign: 'left',
}

const DEMO_PAGE = {
  user_id: 'demo-2',
  display_name: 'Marion',
  age: 37,
  city: 'quelque part entre Paris et ailleurs',
  answers: [
    { slug: 'phrase_pour_commencer', answer: 'Je pourrais passer une soirée entière à parler avec quelqu’un que je viens de rencontrer.' },
    { slug: 'ce_qui_me_fait_rester',  answer: 'J’aime les conversations qui commencent par rien et finissent à trois heures du matin.' },
    { slug: 'une_question',           answer: 'Quel endroit pourrais-tu quitter demain sans regret ?' },
    { slug: 'ce_que_je_cherche',      answer: 'Pas forcément quelqu’un. Une conversation qui donne envie d’en avoir une deuxième.' },
  ],
  last_line: 'On a hésité si longtemps devant la porte que la nuit est passée derrière nous.',
  compatibility: 88,
}
