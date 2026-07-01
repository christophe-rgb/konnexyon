import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Store, Phone, Mail, Check, ShieldCheck } from 'lucide-react'

const GOLD_GRADIENT = 'linear-gradient(135deg, #B8891F, #F4D875, #B8891F)'
const CONTACT_PHONE = '06 63 46 07 69'
const CONTACT_EMAIL = 'konnexyon@gmail.com'

const TYPES = [
  { value: 'club',    label: 'Club' },
  { value: 'sauna',   label: 'Sauna' },
  { value: 'sexshop', label: 'Sex-shop' },
  { value: 'bar',     label: 'Bar' },
  { value: 'autre',   label: 'Autre' },
]

const FORMULES = [
  { value: 'gratuit',   label: 'Gratuit (lancement)' },
  { value: 'essentiel', label: 'Essentiel' },
  { value: 'premium',   label: 'Premium' },
  { value: 'infos',     label: 'Je veux juste des infos' },
]

const OFFERS = [
  { title: 'Gratuit',   price: 'Lancement', desc: 'Votre lieu sur la carte' },
  { title: 'Essentiel', price: '19 €/mois', desc: 'Mise en avant renforcée' },
  { title: 'Premium',   price: '49 €/mois', desc: 'Visibilité maximale' },
  { title: 'Événement', price: '25 €',      desc: 'Une soirée mise en avant' },
]

const CREAM = '#F7F5EF'

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#FFFFFF', border: '1px solid rgba(28,24,20,0.16)',
  borderRadius: 12, padding: '11px 13px', color: '#1C1814', fontSize: 14,
  outline: 'none',
}
const labelStyle = {
  fontSize: 11, color: 'rgba(28,24,20,0.55)', letterSpacing: '0.06em',
  textTransform: 'uppercase', marginBottom: 6, display: 'block', fontWeight: 600,
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
  })
  const [saving, setSaving] = useState(false)
  const [sent, setSent]     = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.venue_name.trim()) { toast('Le nom de l\'établissement est requis', 'error'); return }
    setSaving(true)
    const clean = v => (v && v.trim() ? v.trim() : null)
    const { error } = await supabase.rpc('submit_venue_lead', {
      p_venue_name:   form.venue_name.trim(),
      p_city:         clean(form.city),
      p_type:         form.type || null,
      p_contact_name: clean(form.contact_name),
      p_email:        clean(form.email),
      p_phone:        clean(form.phone),
      p_formule:      form.formule || null,
      p_message:      clean(form.message),
    })
    setSaving(false)
    if (error) { toast('Envoi impossible, réessayez', 'error'); console.error('submit_venue_lead:', error.message); return }
    toast('Réponse envoyée, merci !')
    setSent(true)
  }

  return (
    <div style={{ background: CREAM, minHeight: '100dvh', width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>

      {/* header — barre sombre pleine largeur, titre centré (cf. Matches) */}
      <header
        style={{
          background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.28)',
          boxShadow: '0 6px 22px rgba(0,0,0,0.28)',
          width: '100vw', marginLeft: 'calc(50% - 50vw)',
        }}
      >
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center text-center px-5 py-5" style={{ position: 'relative' }}>
          <div aria-hidden style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 260, height: 90, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0) 70%)',
          }} />
          <div style={{
            width: 34, height: 34, borderRadius: '11px', marginBottom: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(201,168,76,0.12), rgba(201,168,76,0.04))',
            border: '1px solid rgba(201,168,76,0.28)',
            boxShadow: '0 0 14px rgba(201,168,76,0.18)',
            position: 'relative',
          }}>
            <Store size={15} strokeWidth={1.5} style={{ color: 'rgba(201,168,76,1)' }} />
          </div>
          <h1 style={{
            fontFamily: 'Cormorant, serif',
            fontSize: '1.9rem',
            fontWeight: 600,
            background: GOLD_GRADIENT,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.03em',
            lineHeight: 1.1,
            position: 'relative',
          }}>
            Devenez lieu partenaire
          </h1>
          <p style={{ fontSize: 11, color: 'rgba(201,168,76,1)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 4, position: 'relative' }}>
            Mini étude de marché
          </p>
        </div>
      </header>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* accroche */}
        <p style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(28,24,20,0.8)', textAlign: 'center', marginBottom: 26 }}>
          <strong style={{ color: '#1C1814' }}>Konnexyon</strong> — la nouvelle plateforme de rencontres
          pour couples libertins (<strong style={{ color: '#8A6A18' }}>100 % gratuite</strong>).
          Mettez votre établissement en avant sur notre carte.
        </p>

        {/* rappel de l'offre */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
          {OFFERS.map(o => (
            <div key={o.title} style={{
              background: 'linear-gradient(180deg, #FDFAF6 0%, #F5F0E8 100%)',
              border: '1px solid rgba(201,168,76,0.22)',
              borderRadius: 18, padding: '14px 16px', textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            }}>
              <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.35rem', fontWeight: 600, color: '#1C1814' }}>{o.title}</p>
              <p style={{
                fontSize: 13, fontWeight: 700, marginTop: 2,
                background: GOLD_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>{o.price}</p>
              <p style={{ fontSize: 11.5, color: 'rgba(28,24,20,0.55)', marginTop: 6, lineHeight: 1.4 }}>{o.desc}</p>
            </div>
          ))}
        </div>

        {/* badge rassurant — sans engagement */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          margin: '0 auto 30px', maxWidth: 460,
          padding: '11px 18px', borderRadius: 99,
          background: GOLD_GRADIENT, color: '#050505',
          fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', textAlign: 'center',
          boxShadow: '0 6px 18px rgba(184,137,31,0.28)',
        }}>
          <ShieldCheck size={17} strokeWidth={2} />
          Sans engagement — résiliation en 1 clic, à tout moment.
        </div>

        {sent ? (
          <ThankYou />
        ) : (
          <form onSubmit={submit} style={{
            background: '#FFFFFF',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: 20, padding: '22px 20px',
            boxShadow: '0 6px 22px rgba(0,0,0,0.06)',
          }}>
            <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.6rem', fontWeight: 600, color: '#1C1814', marginBottom: 4 }}>
              Répondez-nous
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(28,24,20,0.55)', marginBottom: 20 }}>
              Quelques secondes suffisent — un seul champ est requis.
            </p>

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
                      border: active ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(28,24,20,0.14)',
                      background: active ? 'rgba(201,168,76,0.1)' : '#FFFFFF',
                      transition: 'all 0.2s',
                    }}>
                      <input
                        type="radio" name="formule" value={f.value}
                        checked={active} onChange={() => set('formule', f.value)}
                        style={{ accentColor: '#C9A84C', width: 16, height: 16, cursor: 'pointer' }}
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

        {/* bloc contact — toujours visible */}
        <div style={{
          marginTop: 30, padding: '20px', borderRadius: 18, textAlign: 'center',
          background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
          border: '1px solid rgba(201,168,76,0.22)',
        }}>
          <p style={{ fontSize: 13, color: 'rgba(240,237,232,0.7)', marginBottom: 12 }}>
            Une question ? Appelez-nous directement :
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
              fontSize: 13, color: 'rgba(201,168,76,1)', letterSpacing: '0.04em',
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
      background: '#FFFFFF', border: '1px solid rgba(201,168,76,0.25)',
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
      <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.9rem', fontWeight: 600, color: '#1C1814', marginBottom: 8 }}>
        Merci !
      </h2>
      <p style={{ fontSize: 14.5, color: 'rgba(28,24,20,0.7)', lineHeight: 1.6, marginBottom: 22 }}>
        Nous revenons vers vous très vite.
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
