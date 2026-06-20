import { Link, useParams, Navigate } from 'react-router-dom'
import { ARTICLES_BE } from '../data/articles-be'
import { ARTICLES_CH } from '../data/articles-ch'
import { ARTICLES_CA } from '../data/articles-ca'

const COUNTRIES = {
  belgique: {
    articles: ARTICLES_BE,
    label: 'Belgique',
    flag: '🇧🇪',
    desc: 'Bruxelles, Liège, Namur et toute la Wallonie',
  },
  suisse: {
    articles: ARTICLES_CH,
    label: 'Suisse romande',
    flag: '🇨🇭',
    desc: 'Genève, Lausanne, Fribourg et le Valais',
  },
  quebec: {
    articles: ARTICLES_CA,
    label: 'Québec',
    flag: '🇨🇦',
    desc: 'Montréal, Québec et les régions francophones',
  },
}

export function BlogCountryList({ country }) {
  const data = COUNTRIES[country]
  if (!data) return <Navigate to="/blog" replace />

  const { articles, label, flag, desc } = data
  const prefix = `/${country}`

  return (
    <div className="min-h-dvh" style={{ background: '#FDFAF6' }}>
      <header style={{
        padding: '16px 24px', borderBottom: '1px solid rgba(201,168,76,0.1)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link to="/blog" style={{ color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontSize: 20 }}>←</Link>
        <span style={{ fontFamily: 'Cormorant, serif', fontSize: '1.2rem', color: 'rgba(201,168,76,0.7)', letterSpacing: '0.1em' }}>
          {flag} Guide & Conseils · {label}
        </span>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)', marginBottom: 8 }}>
          Konnexyon · {label}
        </p>
        <h1 style={{ fontFamily: 'Cormorant, serif', fontSize: 'clamp(1.8rem, 6vw, 2.8rem)', fontWeight: 600, color: '#1C1814', lineHeight: 1.15, marginBottom: 8 }}>
          Rencontres couples<br />{label}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 48 }}>{desc}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {articles.map((a, i) => (
            <Link key={a.slug} to={`${prefix}/${a.slug}`} style={{ textDecoration: 'none' }}>
              <article
                className="animate-fade-in-up card-luxury"
                style={{ padding: '24px 28px', borderRadius: 18, cursor: 'pointer', animationDelay: `${i * 60}ms`, animationFillMode: 'both', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)' }}>
                    {new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span style={{ color: 'rgba(201,168,76,0.2)', fontSize: 10 }}>·</span>
                  <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)' }}>{a.readTime}</span>
                </div>
                <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.3rem', fontWeight: 600, color: '#1C1814', lineHeight: 1.3, marginBottom: 8 }}>{a.title}</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.65 }}>{a.excerpt}</p>
                <p style={{ marginTop: 14, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.55)' }}>Lire →</p>
              </article>
            </Link>
          ))}
        </div>

        {/* liens autres pays */}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(201,168,76,0.08)' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 16 }}>Autres éditions</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link to="/blog" style={{ fontSize: 12, color: 'rgba(201,168,76,0.5)', textDecoration: 'none', padding: '6px 14px', borderRadius: 99, border: '1px solid rgba(201,168,76,0.15)' }}>🇫🇷 France</Link>
            {Object.entries(COUNTRIES).filter(([k]) => k !== country).map(([k, v]) => (
              <Link key={k} to={`/${k}`} style={{ fontSize: 12, color: 'rgba(201,168,76,0.5)', textDecoration: 'none', padding: '6px 14px', borderRadius: 99, border: '1px solid rgba(201,168,76,0.15)' }}>
                {v.flag} {v.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function BlogCountryArticle({ country }) {
  const { slug } = useParams()
  const data = COUNTRIES[country]
  if (!data) return <Navigate to="/blog" replace />

  const article = data.articles.find(a => a.slug === slug)
  if (!article) return <Navigate to={`/${country}`} replace />

  const idx = data.articles.indexOf(article)
  const prev = data.articles[idx - 1]
  const next = data.articles[idx + 1]
  const prefix = `/${country}`

  return (
    <div className="min-h-dvh" style={{ background: '#FDFAF6' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '14px 24px', borderBottom: '1px solid rgba(201,168,76,0.08)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(253,250,246,0.95)', backdropFilter: 'blur(20px)',
      }}>
        <Link to={prefix} style={{ color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontSize: 20 }}>←</Link>
        <span style={{ fontFamily: 'Cormorant, serif', fontSize: '1rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.08em' }}>
          {data.flag} {data.label}
        </span>
      </header>

      <article style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)' }}>
            {new Date(article.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span style={{ color: 'rgba(201,168,76,0.2)' }}>·</span>
          <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)' }}>{article.readTime} de lecture</span>
        </div>

        <h1 style={{ fontFamily: 'Cormorant, serif', fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 700, color: '#1C1814', lineHeight: 1.2, marginBottom: 20 }}>
          {article.title}
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, marginBottom: 40, borderLeft: '2px solid rgba(201,168,76,0.3)', paddingLeft: 16 }}>
          {article.excerpt}
        </p>

        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.85 }}>
          <MarkdownLite content={article.content} />
        </div>

        <div style={{ marginTop: 56, padding: '32px', borderRadius: 20, background: 'linear-gradient(145deg, rgba(201,168,76,0.07), rgba(201,168,76,0.02))', border: '1px solid rgba(201,168,76,0.18)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', color: '#1C1814', marginBottom: 8 }}>
            Rejoignez Konnexyon {data.flag}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24, lineHeight: 1.6 }}>
            La plateforme discrète pour couples ouverts en {data.label}.
          </p>
          <Link to="/register" className="btn-gold erb-btn" style={{ display: 'inline-block', padding: '14px 36px', borderRadius: 12, fontSize: 13, letterSpacing: '0.12em', textDecoration: 'none' }}>
            Créer mon profil gratuitement
          </Link>
        </div>

        {(prev || next) && (
          <div style={{ marginTop: 40, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {prev && (
              <Link to={`${prefix}/${prev.slug}`} style={{ flex: 1, minWidth: 200, textDecoration: 'none', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(201,168,76,0.12)', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)', marginBottom: 6 }}>← Précédent</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{prev.title}</p>
              </Link>
            )}
            {next && (
              <Link to={`${prefix}/${next.slug}`} style={{ flex: 1, minWidth: 200, textDecoration: 'none', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(201,168,76,0.12)', background: 'rgba(255,255,255,0.02)', textAlign: 'right' }}>
                <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)', marginBottom: 6 }}>Suivant →</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{next.title}</p>
              </Link>
            )}
          </div>
        )}
      </article>
    </div>
  )
}

function MarkdownLite({ content }) {
  const lines = content.trim().split('\n')
  const elements = []
  let key = 0
  for (const line of lines) {
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} style={{ fontFamily: 'Cormorant, serif', fontSize: '1.3rem', fontWeight: 600, color: '#C9A84C', marginTop: 32, marginBottom: 12 }}>{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} style={{ fontFamily: 'Cormorant, serif', fontSize: '1.6rem', fontWeight: 600, color: '#1C1814', marginTop: 40, marginBottom: 16 }}>{line.slice(3)}</h2>)
    } else if (line.startsWith('- ')) {
      elements.push(<li key={key++} style={{ marginBottom: 8, paddingLeft: 8, color: 'rgba(255,255,255,0.55)' }}>{renderInline(line.slice(2))}</li>)
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<p key={key++} style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginTop: 20, marginBottom: 8 }}>{line.slice(2, -2)}</p>)
    } else if (line.trim() === '') {
      // skip
    } else {
      elements.push(<p key={key++} style={{ marginBottom: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.85 }}>{renderInline(line)}</p>)
    }
  }
  return <div>{elements}</div>
}

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
      : part
  )
}
