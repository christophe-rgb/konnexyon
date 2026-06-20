import { useParams, Link, Navigate } from 'react-router-dom'
import { ARTICLES } from '../data/articles'

export default function BlogArticle() {
  const { slug } = useParams()
  const article = ARTICLES.find(a => a.slug === slug)

  if (!article) return <Navigate to="/blog" replace />

  const idx = ARTICLES.indexOf(article)
  const prev = ARTICLES[idx - 1]
  const next = ARTICLES[idx + 1]

  return (
    <div className="min-h-dvh" style={{ background: '#FDFAF6' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '14px 24px', borderBottom: '1px solid rgba(201,168,76,0.08)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(253,250,246,0.95)', backdropFilter: 'blur(20px)',
      }}>
        <Link to="/blog" style={{ color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontSize: 20 }}>←</Link>
        <span style={{ fontFamily: 'Cormorant, serif', fontSize: '1rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.08em' }}>
          Guide & Conseils
        </span>
      </header>

      <article style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)' }}>
            {new Date(article.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span style={{ color: 'rgba(201,168,76,0.2)' }}>·</span>
          <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)' }}>
            {article.readTime} de lecture
          </span>
        </div>

        {/* titre */}
        <h1 style={{
          fontFamily: 'Cormorant, serif', fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
          fontWeight: 700, color: '#1C1814', lineHeight: 1.2, marginBottom: 20,
        }}>
          {article.title}
        </h1>

        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, marginBottom: 40, borderLeft: '2px solid rgba(201,168,76,0.3)', paddingLeft: 16 }}>
          {article.excerpt}
        </p>

        {/* contenu markdown simplifié */}
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.85 }}>
          <MarkdownLite content={article.content} />
        </div>

        {/* CTA */}
        <div style={{
          marginTop: 56, padding: '32px', borderRadius: 20,
          background: 'linear-gradient(145deg, rgba(201,168,76,0.07), rgba(201,168,76,0.02))',
          border: '1px solid rgba(201,168,76,0.18)',
          textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', color: '#1C1814', marginBottom: 8 }}>
            Prêts à rencontrer d'autres couples ?
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24, lineHeight: 1.6 }}>
            Konnexyon, la plateforme discrète pour couples ouverts.
          </p>
          <Link to="/register" className="btn-gold erb-btn" style={{
            display: 'inline-block', padding: '14px 36px', borderRadius: 12,
            fontSize: 13, letterSpacing: '0.12em', textDecoration: 'none',
          }}>
            Créer mon profil gratuitement
          </Link>
        </div>

        {/* navigation articles */}
        {(prev || next) && (
          <div style={{ marginTop: 40, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {prev && (
              <Link to={`/blog/${prev.slug}`} style={{ flex: 1, minWidth: 200, textDecoration: 'none', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(201,168,76,0.12)', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)', marginBottom: 6 }}>← Précédent</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{prev.title}</p>
              </Link>
            )}
            {next && (
              <Link to={`/blog/${next.slug}`} style={{ flex: 1, minWidth: 200, textDecoration: 'none', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(201,168,76,0.12)', background: 'rgba(255,255,255,0.02)', textAlign: 'right' }}>
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} style={{ fontFamily: 'Cormorant, serif', fontSize: '1.3rem', fontWeight: 600, color: '#C9A84C', marginTop: 32, marginBottom: 12 }}>
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} style={{ fontFamily: 'Cormorant, serif', fontSize: '1.6rem', fontWeight: 600, color: '#1C1814', marginTop: 40, marginBottom: 16 }}>
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={key++} style={{ marginBottom: 8, paddingLeft: 8, color: 'rgba(255,255,255,0.55)' }}>
          {renderInline(line.slice(2))}
        </li>
      )
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={key++} style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginTop: 20, marginBottom: 8 }}>
          {line.slice(2, -2)}
        </p>
      )
    } else if (line.trim() === '') {
      // skip empty lines
    } else {
      elements.push(
        <p key={key++} style={{ marginBottom: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.85 }}>
          {renderInline(line)}
        </p>
      )
    }
  }

  return <div style={{ listStyle: 'none' }}>{elements}</div>
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}
