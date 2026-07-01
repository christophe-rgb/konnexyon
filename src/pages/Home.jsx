import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import XLogo from '../components/XLogo'

export default function Home() {
  const { user, profile, loading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!user) return // affiche la landing
    if (!profile?.email_1_confirmed) navigate('/onboarding')
    else navigate('/discover')
  }, [user, profile, loading, navigate])

  if (loading) return null
  if (user) return null

  return (
    <div style={{ minHeight: '100dvh', background: '#0A0A0A', color: '#F0EDE8', overflowX: 'hidden', position: 'relative' }}>

      {/* header sombre */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,10,10,0.72)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,168,76,0.18)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'Cormorant, serif', fontWeight: 600, fontSize: '1.2rem',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Konnexyon</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/login" style={{
            padding: '7px 14px', borderRadius: 10,
            border: '1px solid rgba(201,168,76,0.35)',
            color: 'rgba(201,168,76,0.9)', fontSize: 12,
            textDecoration: 'none', letterSpacing: '0.04em',
          }}>Se connecter</Link>
          <Link to="/register" className="btn-gold" style={{
            padding: '7px 14px', borderRadius: 10,
            fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none',
          }}>Créer un compte</Link>
        </div>
      </header>

      {/* HERO — plein écran noir, logo qui prend toute la page */}
      <section style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '90px 20px 40px', position: 'relative', overflow: 'hidden', textAlign: 'center',
      }}>
        {/* halo doré central sur le noir */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 55% at 50% 42%, rgba(201,168,76,0.22), transparent 68%)' }} />

        {/* LOGO géant, reflet bijou + halo */}
        <div className="shine-img animate-fade-in" style={{
          position: 'relative', display: 'inline-block', zIndex: 1,
          borderRadius: '50%', animationFillMode: 'both',
        }}>
          <div style={{ position: 'absolute', inset: '-8%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,168,76,0.5), transparent 68%)', filter: 'blur(18px)' }} />
          <picture>
            <source srcSet="/logo.webp" type="image/webp" />
            <img src="/logo.webp" alt="Konnexyon" className="animate-float" style={{
              position: 'relative', display: 'block',
              width: 'min(86vw, 620px)', maxHeight: '62vh', objectFit: 'contain', height: 'auto',
              filter: 'drop-shadow(0 12px 50px rgba(201,168,76,0.55)) brightness(1.08)',
            }} />
          </picture>
        </div>

        {/* accroche + badge + CTA */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, marginTop: 18 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '9px 22px', borderRadius: 99,
              background: 'linear-gradient(135deg, #4ade80, #C9A84C, #E8CC7A)', backgroundSize: '200% 100%',
              boxShadow: '0 10px 34px rgba(74,222,128,0.35), inset 0 1px 0 rgba(255,255,255,0.45)',
              animation: 'shimmerBg 5s ease-in-out infinite',
            }}>
              <span style={{ fontSize: 18 }} aria-hidden>🎉</span>
              <span style={{ fontFamily: 'Cormorant, serif', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0D0D0D' }}>100% Gratuit</span>
              <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.7)', fontWeight: 600 }}>· tout est offert</span>
            </span>
          </div>

          <h1 className="animate-fade-in-up" style={{
            fontFamily: 'Cormorant, serif', fontSize: 'clamp(2.2rem, 6.5vw, 3.6rem)',
            fontWeight: 700, lineHeight: 1.12, marginBottom: 16,
            background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A, #C9A84C)', backgroundSize: '200%',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animationDelay: '0.1s', animationFillMode: 'both',
          }}>
            Libertins par choix.<br />Connectés par désir.
          </h1>

          <p className="animate-fade-in-up" style={{ fontSize: 15, color: 'rgba(240,237,232,0.72)', lineHeight: 1.7, marginBottom: 30, animationDelay: '0.2s', animationFillMode: 'both' }}>
            La plateforme de rencontres exclusive pour couples ouverts.
          </p>

          <Link to="/register" className="btn-gold animate-fade-in-up" style={{
            display: 'inline-block', padding: '17px 48px', borderRadius: 14, fontSize: 14,
            letterSpacing: '0.14em', textDecoration: 'none', animationDelay: '0.3s', animationFillMode: 'both',
          }}>
            Créer ma connexion ∞
          </Link>
          <p style={{ fontSize: 11, color: 'rgba(240,237,232,0.5)', letterSpacing: '0.08em', marginTop: 14 }}>
            Accès gratuit · Sans engagement · France · Belgique · Suisse · Québec · 18+
          </p>
        </div>
      </section>

      {/* features (sombre) */}
      <section style={{ padding: '80px 24px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <p style={{ textAlign: 'center', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: 48 }}>
          Pourquoi Konnexyon
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { icon: '◈', title: 'Couples uniquement', desc: 'Une communauté 100% couples — aucun célibataire. Des rencontres entre égaux, en toute confiance.' },
            { icon: '◉', title: 'Discrétion absolue', desc: 'Vos données restent privées. Géolocalisation approximative, profil invisible si vous le souhaitez.' },
            { icon: '∞', title: 'Connexions réelles', desc: 'Swipez, connectez, échangez. Un système de matching pensé pour les couples libertins.' },
            { icon: '🎉', title: '100% gratuit', desc: 'Likes illimités, messagerie, matchs — tout est offert, sans abonnement.' },
          ].map((f, i) => (
            <div key={i} style={{
              padding: '22px 24px', borderRadius: 18,
              display: 'flex', gap: 18, alignItems: 'flex-start',
              background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(201,168,76,0.18)',
            }}>
              <span style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)',
                fontSize: 18, color: '#C9A84C',
              }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: 15, fontWeight: 500, color: '#F0EDE8', marginBottom: 6 }}>{f.title}</p>
                <p style={{ fontSize: 13, color: 'rgba(240,237,232,0.6)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bas (sombre) */}
      <section style={{ padding: '40px 24px 80px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 480, margin: '0 auto', padding: '40px 32px', borderRadius: 24,
          background: 'linear-gradient(145deg, rgba(201,168,76,0.1), rgba(201,168,76,0.04))',
          border: '1px solid rgba(201,168,76,0.3)',
        }}>
          <XLogo size={40} style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '2rem', fontWeight: 600, color: '#F0EDE8', marginBottom: 12 }}>
            Prêts à vous connecter ?
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(240,237,232,0.65)', lineHeight: 1.7, marginBottom: 28 }}>
            Rejoignez une communauté exclusive de couples qui partagent vos valeurs.
          </p>
          <Link to="/register" className="btn-gold" style={{
            display: 'block', padding: '16px', borderRadius: 14,
            fontSize: 13, letterSpacing: '0.12em', textDecoration: 'none', marginBottom: 16,
          }}>
            Commencer gratuitement
          </Link>
          <Link to="/login" style={{ fontSize: 12, color: 'rgba(201,168,76,1)', textDecoration: 'none', letterSpacing: '0.06em' }}>
            Déjà membre ? Se connecter
          </Link>
        </div>
      </section>

      {/* footer (sombre) */}
      <footer style={{
        borderTop: '1px solid rgba(201,168,76,0.15)', padding: '24px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <span style={{ fontSize: 11, color: 'rgba(240,237,232,0.5)', letterSpacing: '0.08em' }}>
          © 2026 Konnexyon · Europe francophone · Réservé aux adultes consentants · 18+
        </span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/blog" style={{ fontSize: 11, color: 'rgba(240,237,232,0.5)', textDecoration: 'none', letterSpacing: '0.06em' }}>Guide</Link>
          <Link to="/cgu" style={{ fontSize: 11, color: 'rgba(240,237,232,0.5)', textDecoration: 'none', letterSpacing: '0.06em' }}>CGU</Link>
          <Link to="/confidentialite" style={{ fontSize: 11, color: 'rgba(240,237,232,0.5)', textDecoration: 'none', letterSpacing: '0.06em' }}>Confidentialité</Link>
          <Link to="/contact" style={{ fontSize: 11, color: 'rgba(240,237,232,0.5)', textDecoration: 'none', letterSpacing: '0.06em' }}>Contact</Link>
        </div>
      </footer>
    </div>
  )
}
