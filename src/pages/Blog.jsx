import { Link } from 'react-router-dom'
import { ARTICLES } from '../data/articles'

export default function Blog() {
  return (
    <div className="min-h-dvh" style={{ background: '#FDFAF6' }}>
      <header style={{
        padding: '16px 24px', borderBottom: '1px solid rgba(201,168,76,0.1)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link to="/" style={{ color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontSize: 20 }}>←</Link>
        <span style={{ fontFamily: 'Cormorant, serif', fontSize: '1.2rem', color: 'rgba(201,168,76,0.7)', letterSpacing: '0.1em' }}>
          Guide & Conseils
        </span>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px' }}>

        <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)', marginBottom: 12 }}>
          Le blog Konnexyon
        </p>
        <h1 style={{ fontFamily: 'Cormorant, serif', fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 600, color: '#1C1814', lineHeight: 1.15, marginBottom: 48 }}>
          Conseils pour couples<br />ouverts et libertins
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {ARTICLES.map((a, i) => (
            <Link
              key={a.slug}
              to={`/blog/${a.slug}`}
              style={{ textDecoration: 'none' }}
            >
              <article
                className="animate-fade-in-up card-luxury"
                style={{
                  padding: '28px 28px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  animationDelay: `${i * 60}ms`,
                  animationFillMode: 'both',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)' }}>
                    {new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span style={{ color: 'rgba(201,168,76,0.2)', fontSize: 10 }}>·</span>
                  <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)' }}>
                    {a.readTime}
                  </span>
                </div>
                <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.35rem', fontWeight: 600, color: '#1C1814', lineHeight: 1.3, marginBottom: 10 }}>
                  {a.title}
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.7 }}>
                  {a.excerpt}
                </p>
                <p style={{ marginTop: 16, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.55)' }}>
                  Lire l'article →
                </p>
              </article>
            </Link>
          ))}
        </div>

        {/* autres éditions */}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(201,168,76,0.08)' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 16 }}>
            Éditions locales
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { to: '/belgique', flag: '🇧🇪', label: 'Belgique' },
              { to: '/suisse',   flag: '🇨🇭', label: 'Suisse romande' },
              { to: '/quebec',   flag: '🇨🇦', label: 'Québec' },
            ].map(({ to, flag, label }) => (
              <Link key={to} to={to} style={{ fontSize: 12, color: 'rgba(201,168,76,0.55)', textDecoration: 'none', padding: '7px 16px', borderRadius: 99, border: '1px solid rgba(201,168,76,0.18)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = '#C9A84C' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)'; e.currentTarget.style.color = 'rgba(201,168,76,0.55)' }}
              >
                {flag} {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
