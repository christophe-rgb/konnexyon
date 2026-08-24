import { TRAIT_SECTIONS, SCALE_MIN, SCALE_MAX } from '../lib/compatibility'

/**
 * Le questionnaire de compatibilité — seize curseurs à cinq crans.
 *
 * Sert à l'inscription comme à l'édition du profil, sur fond encre ou
 * sur papier : `tone` bascule la palette, rien d'autre ne change.
 */
export default function TraitQuestionnaire({ traits, onChange, tone = 'encre', sections = TRAIT_SECTIONS }) {
  const sombre = tone === 'encre'
  const texte  = sombre ? 'rgba(242,238,230,0.92)' : '#0B0B0B'
  const faible = sombre ? 'rgba(242,238,230,0.42)' : 'rgba(11,11,11,0.45)'
  const trait  = sombre ? 'rgba(242,238,230,0.16)' : 'rgba(11,11,11,0.14)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 38 }}>
      {sections.map(section => (
        <section key={section.slug}>
          <h3 style={{
            fontFamily: 'Cormorant, serif', fontSize: '1.5rem', fontWeight: 500,
            color: texte, lineHeight: 1.2,
          }}>
            {section.title}
          </h3>
          {section.intro && (
            <p style={{ fontSize: 12, color: faible, lineHeight: 1.6, marginTop: 6 }}>
              {section.intro}
            </p>
          )}

          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 26 }}>
            {section.questions.map(q => (
              <fieldset key={q.slug} style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend style={{
                  fontFamily: 'Cormorant, serif', fontSize: '1.15rem',
                  color: texte, padding: 0, marginBottom: 10,
                }}>
                  {q.label}
                </legend>

                <div className="flex items-center" style={{ gap: 10 }}>
                  <span style={{ ...pole, color: faible, textAlign: 'right' }}>{q.left}</span>

                  <div className="flex items-center" style={{ gap: 6, flexShrink: 0 }}>
                    {Array.from({ length: SCALE_MAX - SCALE_MIN + 1 }, (_, i) => SCALE_MIN + i).map(v => {
                      const actif = traits?.[q.slug] === v
                      // le cran du milieu est plus discret : il ne dit rien
                      const taille = v === 3 ? 12 : 15
                      return (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={actif}
                          aria-label={`${q.label} — ${v} sur ${SCALE_MAX}`}
                          onClick={() => onChange(q.slug, v)}
                          style={{
                            width: taille, height: taille, borderRadius: '50%',
                            padding: 0, cursor: 'pointer',
                            background: actif ? 'var(--or)' : 'transparent',
                            border: `1px solid ${actif ? 'var(--or)' : trait}`,
                            boxShadow: actif ? '0 0 10px rgba(201,168,76,0.45)' : 'none',
                            transition: 'all var(--dur-fast) var(--ease-out)',
                          }}
                        />
                      )
                    })}
                  </div>

                  <span style={{ ...pole, color: faible }}>{q.right}</span>
                </div>
              </fieldset>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

const pole = {
  fontSize: 11,
  lineHeight: 1.4,
  flex: 1,
  minWidth: 0,
}
