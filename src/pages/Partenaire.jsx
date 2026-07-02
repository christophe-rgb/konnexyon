import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Store, Phone, Mail, Check, ShieldCheck, Download, MapPin, Users, Sparkles } from 'lucide-react'

const GOLD_GRADIENT = 'linear-gradient(135deg, #B8891F, #F4D875, #B8891F)'
const CONTACT_PHONE = '06 63 46 07 69'
const CONTACT_EMAIL = 'konnexyon@gmail.com'
const CREAM = '#F7F5EF'
const INK = '#1C1814'

const TYPES = [
  { value: 'club',    label: 'Club' },
  { value: 'sauna',   label: 'Sauna' },
  { value: 'sexshop', label: 'Sex-shop' },
  { value: 'bar',     label: 'Bar' },
  { value: 'autre',   label: 'Autre' },
]

const FORMULES = [
  { value: 'gratuit',   label: 'Gratuit (lancement)' },
  { value: 'essentiel', label: 'Essentiel — 19 €/mois' },
  { value: 'premium',   label: 'Premium — 49 €/mois' },
  { value: 'infos',     label: 'Je veux juste des infos' },
]

// Visuels d'offre — « la taille de l'épingle = la formule »
const TIERS = [
  {
    title: 'Gratuit',
    price: 'Lancement',
    img: '/offres/tier-1-gratuit.png',
    desc: 'Votre lieu sur la carte, épingle standard. Idéal pour tester.',
  },
  {
    title: 'Essentiel',
    price: '19 €/mois',
    img: '/offres/tier-2-essentiel.png',
    desc: 'Épingle agrandie — aussi visible qu’un couple. On vous repère.',
  },
  {
    title: 'Premium',
    price: '49 €/mois',
    img: '/offres/tier-3-premium.png',
    desc: 'Grand médaillon avec votre logo · badge « Partenaire ». Vous dominez la carte.',
  },
  {
    title: 'Événement',
    price: '25 €',
    img: '/offres/tier-4-evenement.png',
    desc: 'Flash lumineux sur votre lieu pendant 7 jours pour une soirée spéciale.',
  },
]

const GLAMOUR = [
  { img: '/offres/glamour-essentiel.png', label: 'Essentiel' },
  { img: '/offres/glamour-premium.png',   label: 'Premium' },
  { img: '/offres/glamour-evenement.png', label: 'Événement' },
]

const BENEFITS = [
  { icon: Users, title: 'Audience ciblée', text: 'Des couples libertins actifs, précisément votre clientèle.' },
  { icon: MapPin, title: 'Visibilité locale', text: 'Vous apparaissez au bon endroit, au bon moment, près d’eux.' },
  { icon: Sparkles, title: '100 % gratuit pour les membres', text: 'Plus de trafic qualifié vers votre établissement.' },
]

const STEPS = [
  { n: '1', title: 'Vous répondez', text: 'Un formulaire de 30 secondes ou un simple appel suffit.' },
  { n: '2', title: 'On crée votre fiche', text: 'On monte votre fiche lieu et votre épingle personnalisée.' },
  { n: '3', title: 'Vous êtes sur la carte', text: 'Votre établissement apparaît auprès des couples de votre région.' },
]

const REASSURE = [
  '100 % gratuit au lancement',
  'Sans engagement',
  'Résiliation en 1 clic',
  'Réponse rapide',
  'Contact humain au 06 63 46 07 69',
]

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#FFFFFF', border: '1px solid rgba(28,24,20,0.16)',
  borderRadius: 12, padding: '11px 13px', color: INK, fontSize: 14,
  outline: 'none',
}
const labelStyle = {
  fontSize: 11, color: 'rgba(28,24,20,0.55)', letterSpacing: '0.06em',
  textTransform: 'uppercase', marginBottom: 6, display: 'block', fontWeight: 600,
}
const sectionTitle = {
  fontFamily: 'Cormorant, serif', fontSize: '1.8rem', fontWeight: 600,
  color: INK, textAlign: 'center', marginBottom: 6, lineHeight: 1.15,
}
const sectionSub = {
  fontSize: 13.5, color: 'rgba(28,24,20,0.55)', textAlign: 'center',
  marginBottom: 24, lineHeight: 1.6, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto',
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export default function Partenaire() {
  const [form, setForm] = useState({
    venue_name: '', city: '', type: 'club', contact_name: '',
    email: '', phone: '', formule: 'gratuit', message: '',
    horaires: '', capacite: '', reseaux: '',
  })
  const [saving, setSaving] = useState(false)
  const [sent, setSent]     = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.venue_name.trim()) { toast('Le nom de l\'établissement est requis', 'error'); return }
    setSaving(true)
    const clean = v => (v && v.trim() ? v.trim() : null)

    // Champs additionnels non stockés par la RPC → concaténés proprement dans p_message
    const horaires = form.horaires.trim()
    const capacite = form.capacite.trim()
    const reseaux  = form.reseaux.trim()
    const message  = form.message.trim()
    const extra = [
      horaires && 'Horaires: ' + horaires,
      capacite && 'Capacité: ' + capacite,
      reseaux  && 'Réseaux/site: ' + reseaux,
    ].filter(Boolean).join('\n')
    const fullMessage = [message, extra].filter(Boolean).join('\n\n')

    const { error } = await supabase.rpc('submit_venue_lead', {
      p_venue_name:   form.venue_name.trim(),
      p_city:         clean(form.city),
      p_type:         form.type || null,
      p_contact_name: clean(form.contact_name),
      p_email:        clean(form.email),
      p_phone:        clean(form.phone),
      p_formule:      form.formule || null,
      p_message:      fullMessage || null,
    })
    setSaving(false)
    if (error) { toast('Envoi impossible, réessayez', 'error'); console.error('submit_venue_lead:', error.message); return }
    toast('Réponse envoyée, merci !')
    setSent(true)
  }

  return (
    <div style={{ background: CREAM, minHeight: '100dvh', width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>

      {/* ============ HEADER — barre sombre pleine largeur (cf. Matches) ============ */}
      <header
        style={{
          background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.28)',
          boxShadow: '0 6px 22px rgba(0,0,0,0.28)',
          width: '100vw', marginLeft: 'calc(50% - 50vw)',
        }}
      >
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center text-center px-5 py-7" style={{ position: 'relative' }}>
          <div aria-hidden style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 300, height: 120, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0) 70%)',
          }} />
          <div style={{
            width: 36, height: 36, borderRadius: '11px', marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(212,175,55,0.14), rgba(212,175,55,0.04))',
            border: '1px solid rgba(212,175,55,0.32)',
            boxShadow: '0 0 14px rgba(212,175,55,0.2)',
            position: 'relative',
          }}>
            <Store size={16} strokeWidth={1.5} style={{ color: '#D4AF37' }} />
          </div>
          <p style={{ fontSize: 10.5, color: '#D4AF37', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 6, position: 'relative' }}>
            Konnexyon · Lieux partenaires
          </p>
          <h1 style={{
            fontFamily: 'Cormorant, serif',
            fontSize: '2.2rem',
            fontWeight: 600,
            background: GOLD_GRADIENT,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.02em',
            lineHeight: 1.12,
            position: 'relative',
          }}>
            Votre établissement<br />sur la carte du désir
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(247,245,239,0.72)', lineHeight: 1.6, marginTop: 10, maxWidth: 380, position: 'relative' }}>
            La plateforme de rencontres des couples libertins.
            Attirez une clientèle ciblée, au bon endroit, au bon moment.
          </p>
        </div>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 16px 64px' }}>

        {/* ============ ACCROCHE + BÉNÉFICES + PDF ============ */}
        <p style={{ fontSize: 15.5, lineHeight: 1.7, color: 'rgba(28,24,20,0.82)', textAlign: 'center', marginBottom: 24 }}>
          <strong style={{ color: INK }}>Konnexyon</strong> est <strong style={{ color: '#8A6A18' }}>100 % gratuit</strong> pour
          les membres. Notre carte met les clubs, saunas et sex-shops en avant auprès des couples
          qui cherchent, près de chez eux, un lieu où vivre leurs envies.
        </p>

        <div style={{ display: 'grid', gap: 12, marginBottom: 22 }}>
          {BENEFITS.map(b => {
            const Icon = b.icon
            return (
              <div key={b.title} style={{
                display: 'flex', alignItems: 'flex-start', gap: 13,
                background: '#FFFFFF', border: '1px solid rgba(212,175,55,0.2)',
                borderRadius: 16, padding: '15px 16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  flexShrink: 0, width: 40, height: 40, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.28)',
                }}>
                  <Icon size={19} strokeWidth={1.8} style={{ color: '#B8891F' }} />
                </div>
                <div>
                  <p style={{ fontSize: 14.5, fontWeight: 700, color: INK, marginBottom: 2 }}>{b.title}</p>
                  <p style={{ fontSize: 13, color: 'rgba(28,24,20,0.6)', lineHeight: 1.5 }}>{b.text}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <a
            href="/offres/Konnexyon-proposition-partenariat.pdf"
            download
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none',
              padding: '12px 22px', borderRadius: 99,
              background: 'transparent', color: '#8A6A18',
              border: '1.5px solid rgba(184,137,31,0.55)',
              fontSize: 14.5, fontWeight: 700, letterSpacing: '0.01em',
            }}
          >
            <Download size={17} strokeWidth={2} />
            Télécharger la proposition (PDF)
          </a>
        </div>

        {/* ============ SECTION « Votre visibilité sur la carte » ============ */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={sectionTitle}>Votre visibilité sur la carte</h2>
          <p style={sectionSub}>
            Le principe est simple : <strong style={{ color: '#8A6A18' }}>plus votre formule est haute, plus votre épingle est grosse</strong>.
            En Premium, votre lieu s’affiche en grand médaillon avec votre logo.
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14,
          }}>
            {TIERS.map(t => (
              <div key={t.title} style={{
                background: 'linear-gradient(180deg, #FDFAF6 0%, #F5F0E8 100%)',
                border: '1px solid rgba(212,175,55,0.24)',
                borderRadius: 18, padding: '14px', textAlign: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{
                  borderRadius: 14, overflow: 'hidden', marginBottom: 12,
                  border: '1px solid rgba(212,175,55,0.18)',
                  background: '#0A0A0A',
                }}>
                  <img
                    src={t.img}
                    alt={`Épingle formule ${t.title} sur la carte`}
                    loading="lazy"
                    style={{ display: 'block', width: '100%', height: 'auto' }}
                  />
                </div>
                <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.4rem', fontWeight: 600, color: INK, lineHeight: 1 }}>{t.title}</p>
                <p style={{
                  fontSize: 13, fontWeight: 700, marginTop: 3,
                  background: GOLD_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>{t.price}</p>
                <p style={{ fontSize: 12, color: 'rgba(28,24,20,0.58)', marginTop: 8, lineHeight: 1.45 }}>{t.desc}</p>
              </div>
            ))}
          </div>

          {/* Exemple concret « Le Glamour » */}
          <div style={{
            marginTop: 26, background: '#FFFFFF',
            border: '1px solid rgba(212,175,55,0.2)', borderRadius: 20, padding: '20px 18px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          }}>
            <p style={{ textAlign: 'center', fontSize: 12.5, color: 'rgba(28,24,20,0.55)', letterSpacing: '0.04em', marginBottom: 14 }}>
              Exemple — <strong style={{ color: INK }}>« Le Glamour »</strong> selon la formule choisie
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {GLAMOUR.map(g => (
                <figure key={g.label} style={{ margin: 0, textAlign: 'center' }}>
                  <div style={{ borderRadius: 12, overflow: 'hidden', background: '#0A0A0A', border: '1px solid rgba(212,175,55,0.16)' }}>
                    <img src={g.img} alt={`Le Glamour — formule ${g.label}`} loading="lazy" style={{ display: 'block', width: '100%', height: 'auto' }} />
                  </div>
                  <figcaption style={{ fontSize: 11.5, fontWeight: 600, color: '#8A6A18', marginTop: 7, letterSpacing: '0.03em' }}>{g.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ============ TARIFS ============ */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={sectionTitle}>Des tarifs simples et lisibles</h2>
          <p style={sectionSub}>Choisissez ce qui vous convient, changez ou arrêtez quand vous voulez.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
            {[
              { title: 'Gratuit',   price: 'Lancement', note: 'Offre de lancement' },
              { title: 'Essentiel', price: '19 €', note: 'par mois' },
              { title: 'Premium',   price: '49 €', note: 'par mois', hot: true },
              { title: 'Événement', price: '25 €', note: 'la soirée (7 j)' },
            ].map(o => (
              <div key={o.title} style={{
                background: o.hot ? 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)' : 'linear-gradient(180deg, #FDFAF6 0%, #F5F0E8 100%)',
                border: o.hot ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(212,175,55,0.22)',
                borderRadius: 18, padding: '16px 14px', textAlign: 'center',
                boxShadow: o.hot ? '0 8px 24px rgba(184,137,31,0.22)' : '0 4px 16px rgba(0,0,0,0.05)',
                position: 'relative',
              }}>
                {o.hot && (
                  <span style={{
                    position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                    background: GOLD_GRADIENT, color: '#050505', fontSize: 10, fontWeight: 800,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap',
                  }}>Le plus visible</span>
                )}
                <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.45rem', fontWeight: 600, color: o.hot ? '#F7F5EF' : INK }}>{o.title}</p>
                <p style={{
                  fontSize: '1.5rem', fontWeight: 800, marginTop: 2, lineHeight: 1,
                  background: GOLD_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>{o.price}</p>
                <p style={{ fontSize: 11.5, color: o.hot ? 'rgba(247,245,239,0.6)' : 'rgba(28,24,20,0.5)', marginTop: 4 }}>{o.note}</p>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            margin: '0 auto', maxWidth: 480,
            padding: '11px 18px', borderRadius: 99,
            background: GOLD_GRADIENT, color: '#050505',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.01em', textAlign: 'center',
            boxShadow: '0 6px 18px rgba(184,137,31,0.28)',
          }}>
            <ShieldCheck size={17} strokeWidth={2} />
            Sans engagement — résiliation en 1 clic
          </div>
        </section>

        {/* ============ COMMENT ÇA MARCHE ============ */}
        <section style={{ marginBottom: 44 }}>
          <h2 style={sectionTitle}>Comment ça marche</h2>
          <p style={sectionSub}>Trois étapes, zéro friction.</p>

          <div style={{ display: 'grid', gap: 12 }}>
            {STEPS.map(s => (
              <div key={s.n} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                background: '#FFFFFF', border: '1px solid rgba(212,175,55,0.2)',
                borderRadius: 16, padding: '16px 16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  flexShrink: 0, width: 38, height: 38, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: GOLD_GRADIENT, color: '#050505',
                  fontFamily: 'Cormorant, serif', fontSize: '1.3rem', fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(184,137,31,0.28)',
                }}>{s.n}</div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 2 }}>{s.title}</p>
                  <p style={{ fontSize: 13, color: 'rgba(28,24,20,0.6)', lineHeight: 1.5 }}>{s.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Réassurance — pastilles */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            {REASSURE.map(r => (
              <span key={r} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 13px', borderRadius: 99,
                background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)',
                fontSize: 12, fontWeight: 600, color: '#8A6A18',
              }}>
                <Check size={13} strokeWidth={2.4} style={{ color: '#B8891F' }} /> {r}
              </span>
            ))}
          </div>
        </section>

        {/* ============ FORMULAIRE ============ */}
        <h2 style={{ ...sectionTitle, fontSize: '2rem', marginBottom: 4 }}>Répondez-nous</h2>
        <p style={{ ...sectionSub, marginBottom: 22 }}>Quelques secondes suffisent — un seul champ est requis.</p>

        {sent ? (
          <ThankYou />
        ) : (
          <form onSubmit={submit} style={{
            background: '#FFFFFF',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: 20, padding: '22px 20px',
            boxShadow: '0 6px 22px rgba(0,0,0,0.06)',
          }}>
            <Field label="Nom de l'établissement *">
              <input value={form.venue_name} onChange={e => set('venue_name', e.target.value)} style={inputStyle} placeholder="Le Club des Sens" />
            </Field>

            <Field label="Ville">
              <input value={form.city} onChange={e => set('city', e.target.value)} style={inputStyle} placeholder="Paris" />
            </Field>

            <Field label="Type">
              <select value={form.type} onChange={e => set('type', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>

            <Field label="Horaires">
              <input value={form.horaires} onChange={e => set('horaires', e.target.value)} style={inputStyle} placeholder="Ven. & sam. 22h – 5h" />
            </Field>

            <Field label="Capacité (nb de personnes)">
              <input value={form.capacite} onChange={e => set('capacite', e.target.value)} style={inputStyle} placeholder="Ex. 120" inputMode="numeric" />
            </Field>

            <Field label="Réseaux sociaux / site web">
              <input value={form.reseaux} onChange={e => set('reseaux', e.target.value)} style={inputStyle} placeholder="instagram.com/… ou votre site" />
            </Field>

            <Field label="Votre nom">
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} style={inputStyle} placeholder="Prénom Nom" />
            </Field>

            <Field label="Email">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="vous@exemple.com" />
            </Field>

            <Field label="Téléphone">
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} placeholder="06 12 34 56 78" />
            </Field>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>La formule qui vous intéresse</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {FORMULES.map(f => {
                  const active = form.formule === f.value
                  return (
                    <label key={f.value} style={{
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      padding: '11px 14px', borderRadius: 12,
                      border: active ? '1px solid rgba(212,175,55,0.6)' : '1px solid rgba(28,24,20,0.14)',
                      background: active ? 'rgba(212,175,55,0.1)' : '#FFFFFF',
                      transition: 'all 0.2s',
                    }}>
                      <input
                        type="radio" name="formule" value={f.value}
                        checked={active} onChange={() => set('formule', f.value)}
                        style={{ accentColor: '#B8891F', width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 14, color: active ? '#8A6A18' : 'rgba(28,24,20,0.75)', fontWeight: active ? 600 : 400 }}>{f.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <Field label="Message / questions">
              <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Une question ? Dites-nous tout." />
            </Field>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%', padding: '14px', borderRadius: 14, marginTop: 6,
                cursor: saving ? 'default' : 'pointer', border: 'none',
                background: GOLD_GRADIENT, color: '#050505',
                fontSize: 15, fontWeight: 700, letterSpacing: '0.02em',
                opacity: saving ? 0.6 : 1,
                boxShadow: '0 6px 18px rgba(184,137,31,0.3)',
              }}
            >
              {saving ? 'Envoi…' : 'Envoyer ma réponse'}
            </button>
          </form>
        )}

        {/* ============ CONTACT — toujours visible ============ */}
        <div style={{
          marginTop: 30, padding: '20px', borderRadius: 18, textAlign: 'center',
          background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
          border: '1px solid rgba(212,175,55,0.22)',
        }}>
          <p style={{ fontSize: 13, color: 'rgba(247,245,239,0.7)', marginBottom: 12 }}>
            Vous préférez en parler de vive voix ? Appelez-nous :
          </p>
          <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
            fontFamily: 'Cormorant, serif', fontSize: '1.7rem', fontWeight: 600,
            background: GOLD_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            <Phone size={20} strokeWidth={1.8} style={{ color: '#D4AF37' }} />
            {CONTACT_PHONE}
          </a>
          <div style={{ marginTop: 12 }}>
            <a href={`mailto:${CONTACT_EMAIL}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none',
              fontSize: 13, color: '#D4AF37', letterSpacing: '0.04em',
            }}>
              <Mail size={14} strokeWidth={1.6} /> {CONTACT_EMAIL}
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}

function ThankYou() {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid rgba(212,175,55,0.25)',
      borderRadius: 20, padding: '36px 24px', textAlign: 'center',
      boxShadow: '0 6px 22px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', margin: '0 auto 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: GOLD_GRADIENT, boxShadow: '0 6px 18px rgba(184,137,31,0.3)',
      }}>
        <Check size={30} strokeWidth={2.4} style={{ color: '#050505' }} />
      </div>
      <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.9rem', fontWeight: 600, color: INK, marginBottom: 8 }}>
        Merci !
      </h2>
      <p style={{ fontSize: 14.5, color: 'rgba(28,24,20,0.7)', lineHeight: 1.6, marginBottom: 22 }}>
        Votre réponse est bien enregistrée. Nous revenons vers vous très vite.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
          fontSize: 15, fontWeight: 600, color: '#8A6A18',
        }}>
          <Phone size={16} strokeWidth={1.8} /> {CONTACT_PHONE}
        </a>
        <a href={`mailto:${CONTACT_EMAIL}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none',
          fontSize: 13.5, color: 'rgba(28,24,20,0.6)',
        }}>
          <Mail size={14} strokeWidth={1.6} /> {CONTACT_EMAIL}
        </a>
      </div>
    </div>
  )
}
