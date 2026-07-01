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
    <div className="min-h-dvh flex flex-col relative overflow-x-hidden" style={{ background: '#FDFAF6' }}>

      {/* header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(253,250,246,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,168,76,0.2)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(201,168,76,0.1), rgba(201,168,76,0.1))',
            border: '1px solid rgba(201,168,76,0.25)',
          }}>
            <span style={{ fontSize: 16, background: 'linear-gradient(135deg,#A07830,#E8CC7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>∞</span>
          </div>
          <span style={{
            fontFamily: 'Cormorant, serif', fontWeight: 600, fontSize: '1.2rem',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Konnexyon</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/blog" style={{
            padding: '7px 14px', borderRadius: 10,
            border: '1px solid rgba(201,168,76,0.3)',
            color: 'rgba(201,168,76,0.85)', fontSize: 12,
            textDecoration: 'none', letterSpacing: '0.04em',
            display: 'none',
          }} className="sm:block">Guide</Link>
          <Link to="/login" style={{
            padding: '7px 14px', borderRadius: 10,
            border: '1px solid rgba(201,168,76,0.3)',
            color: 'rgba(201,168,76,0.85)', fontSize: 12,
            textDecoration: 'none', letterSpacing: '0.04em',
          }}>Se connecter</Link>
          <Link to="/register" className="btn-gold" style={{
            padding: '7px 14px', borderRadius: 10,
            fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none',
          }}>Créer un compte</Link>
        </div>
      </header>

      {/* hero */}
      <section style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 60px', position: 'relative', overflow: 'hidden' }}>

        {/* fond logo — centré, contenu dans le hero, fondu bas discret */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <picture>
            <source srcSet="/logo.webp" type="image/webp" />
            <img src="/logo.webp" alt="" aria-hidden style={{
              width: '90vw', maxWidth: 600,
              maxHeight: '92vh', objectFit: 'contain',
              opacity: 0.14, filter: 'brightness(1.4)',
              maskImage: 'linear-gradient(to bottom, black 0%, black 78%, transparent 95%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 78%, transparent 95%)',
            }} />
          </picture>
        </div>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 520 }}>

          {/* badge 100% GRATUIT — fun & éclatant */}
          <div className="animate-fade-in-up" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '9px 22px', borderRadius: 99, marginBottom: 18,
            background: 'linear-gradient(135deg, #4ade80, #C9A84C, #E8CC7A)',
            backgroundSize: '200% 100%',
            boxShadow: '0 10px 34px rgba(74,222,128,0.35), inset 0 1px 0 rgba(255,255,255,0.45)',
            animation: 'shimmerBg 5s ease-in-out infinite',
            animationFillMode: 'both',
          }}>
            <span style={{ fontSize: 18 }} aria-hidden>🎉</span>
            <span style={{
              fontFamily: 'Cormorant, serif', fontWeight: 700, fontSize: '1.1rem',
              letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0D0D0D',
            }}>100% Gratuit</span>
            <span style={{ fontSize: 11, color: 'rgba(13,13,13,0.7)', fontWeight: 600, letterSpacing: '0.04em' }}>
              · tout est offert
            </span>
          </div>
          <br />

          {/* badge */}
          <div className="animate-fade-in" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 99,
            background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.1)',
            marginBottom: 28, animationFillMode: 'both',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 8px #C9A84C' }} />
            <span style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)' }}>
              France · Belgique · Suisse · Québec · 18+
            </span>
          </div>

          <h1 className="animate-fade-in-up shine-text" style={{
            fontFamily: 'Cormorant, serif', fontSize: 'clamp(2.8rem, 8vw, 4.5rem)',
            fontWeight: 700, lineHeight: 1.1, marginBottom: 20,
            animationDelay: '0.1s', animationFillMode: 'both',
          }}>
            Libertins par choix.<br />Connectés par désir.
          </h1>

          <p className="animate-fade-in-up" style={{
            fontSize: 16, color: 'rgba(28,24,20,0.9)', lineHeight: 1.8,
            marginBottom: 40, animationDelay: '0.2s', animationFillMode: 'both',
          }}>
            Konnexyon est la plateforme de rencontres exclusive pour couples ouverts.<br />
            Rencontrez, échangez et connectez en toute discrétion.
          </p>

          <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', animationDelay: '0.3s', animationFillMode: 'both', marginTop: 24 }}>
            <Link to="/register" className="btn-gold" style={{
              padding: '17px 48px', borderRadius: 14, fontSize: 14,
              letterSpacing: '0.14em', textDecoration: 'none', display: 'inline-block',
            }}>
              Créer ma connexion ∞
            </Link>
            <p style={{ fontSize: 11, color: 'rgba(28,24,20,0.7)', letterSpacing: '0.08em' }}>
              Accès gratuit · Sans engagement
            </p>
          </div>
        </div>
      </section>

      {/* features */}
      <section style={{ padding: '80px 24px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <p className="animate-fade-in" style={{ textAlign: 'center', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: 48 }}>
          Pourquoi Konnexyon
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { icon: '◈', title: 'Couples uniquement', desc: 'Une communauté 100% couples — aucun célibataire. Des rencontres entre égaux, en toute confiance.' },
            { icon: '◉', title: 'Discrétion absolue', desc: 'Vos données restent privées. Géolocalisation approximative, profil invisible si vous le souhaitez.' },
            { icon: '∞', title: 'Connexions réelles', desc: 'Swipez, connectez, échangez. Un système de matching pensé pour les couples libertins.' },
            { icon: '◎', title: 'Par proximité', desc: 'Rencontrez des couples près de chez vous. Distance configurable selon vos envies.' },
          ].map((f, i) => (
            <div key={i} className="animate-fade-in-up card-luxury" style={{
              padding: '22px 24px', borderRadius: 18,
              display: 'flex', gap: 18, alignItems: 'flex-start',
              animationDelay: `${i * 0.1}s`, animationFillMode: 'both',
            }}>
              <span style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.1)',
                fontSize: 18, color: '#C9A84C',
              }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: 15, fontWeight: 500, color: '#1C1814', marginBottom: 6 }}>{f.title}</p>
                <p style={{ fontSize: 13, color: 'rgba(28,24,20,0.7)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bas */}
      <section style={{ padding: '60px 24px 80px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 480, margin: '0 auto',
          padding: '40px 32px', borderRadius: 24,
          background: 'linear-gradient(145deg, rgba(201,168,76,0.06), rgba(201,168,76,0.04))',
          border: '1px solid rgba(201,168,76,0.25)',
        }}>
          <XLogo size={40} style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '2rem', fontWeight: 600, color: '#1C1814', marginBottom: 12 }}>
            Prêts à vous connecter ?
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(28,24,20,0.7)', lineHeight: 1.7, marginBottom: 28 }}>
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

      {/* footer */}
      <footer style={{
        borderTop: '1px solid rgba(201,168,76,0.15)',
        padding: '24px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <span style={{ fontSize: 11, color: 'rgba(28,24,20,0.7)', letterSpacing: '0.08em' }}>
          © 2026 Konnexyon · Europe francophone · Réservé aux adultes consentants · 18+
        </span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/blog" style={{ fontSize: 11, color: 'rgba(28,24,20,0.7)', textDecoration: 'none', letterSpacing: '0.06em' }}>Guide & Conseils</Link>
          <Link to="/cgu" style={{ fontSize: 11, color: 'rgba(28,24,20,0.7)', textDecoration: 'none', letterSpacing: '0.06em' }}>CGU</Link>
          <Link to="/confidentialite" style={{ fontSize: 11, color: 'rgba(28,24,20,0.7)', textDecoration: 'none', letterSpacing: '0.06em' }}>Confidentialité</Link>
          <Link to="/contact" style={{ fontSize: 11, color: 'rgba(28,24,20,0.7)', textDecoration: 'none', letterSpacing: '0.06em' }}>Contact</Link>
        </div>
      </footer>
    </div>
  )
}
