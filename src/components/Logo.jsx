/**
 * Identité Konnexyon — « site de rencontre par l'écriture ».
 *
 * Quill    : la plume, seule (icône, favicon, puces).
 * Wordmark : KONNE·X·YON, la plume plantée dans le X.
 *
 * Deux tonalités : 'or' sur fond encre, 'encre' sur fond ivoire.
 */

const GOLD  = '#C9A84C'
const INK   = '#0B0B0B'

export function Quill({ size = 28, tone = 'or', style = {}, animated = true }) {
  const id   = `q${Math.random().toString(36).slice(2, 8)}`
  const base = tone === 'encre' ? INK : GOLD

  return (
    <svg
      width={size} height={size} viewBox="0 0 64 64"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true" style={style}
    >
      <defs>
        <linearGradient id={`${id}g`} x1="52" y1="8" x2="12" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={tone === 'encre' ? '#343334' : '#F0D878'} />
          <stop offset="45%"  stopColor={base} />
          <stop offset="100%" stopColor={tone === 'encre' ? INK : '#8A6820'} />
        </linearGradient>
      </defs>

      {/* corps de la plume */}
      <path
        d="M53 9c2 16-6 30-20 37-4 2-9 3-13 3l-3 4c3-7 7-14 12-22C35 20 44 12 53 9Z"
        fill={`url(#${id}g)`}
        opacity={0.92}
      />

      {/* rachis */}
      <path
        d="M53 9C43 20 31 35 17 53"
        stroke={tone === 'encre' ? '#F2EEE6' : '#0B0B0B'}
        strokeOpacity="0.32" strokeWidth="1.4" strokeLinecap="round"
      />

      {/* barbes */}
      {[
        'M45 15 38 16', 'M40 22 31 23', 'M35 29 25 31',
        'M30 36 20 39',  'M25 43 16 47',
      ].map((d, i) => (
        <path key={i} d={d}
          stroke={tone === 'encre' ? '#F2EEE6' : '#0B0B0B'}
          strokeOpacity="0.22" strokeWidth="1.1" strokeLinecap="round" />
      ))}

      {/* pointe */}
      <path d="M17 53 11 58" stroke={base} strokeWidth="1.8" strokeLinecap="round" />

      {/* reflet bijou — la plume respire */}
      {animated && (
        <path d="M53 9c2 16-6 30-20 37-4 2-9 3-13 3l-3 4c3-7 7-14 12-22C35 20 44 12 53 9Z" fill="#FFFDE0">
          <animate attributeName="opacity" values="0;0.22;0" dur="6s" repeatCount="indefinite" />
        </path>
      )}
    </svg>
  )
}

/**
 * @param {'or'|'encre'} tone
 * @param {number} size  hauteur de capitale en px
 */
export function Wordmark({ size = 26, tone = 'or', tagline = false }) {
  const color = tone === 'encre' ? INK : '#F2EEE6'

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <span style={{
        fontFamily: 'Cormorant, serif',
        fontSize: size,
        fontWeight: 500,
        letterSpacing: '0.18em',
        color,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'flex-end',
        whiteSpace: 'nowrap',
      }}>
        KONNE
        {/* la plume est plantée dans le X */}
        <span style={{ position: 'relative', display: 'inline-block', color: GOLD }}>
          X
          {/* la plume surplombe le X sans l'effacer : sa pointe touche la
              croisée, le duvet monte au-dessus de la ligne de capitales */}
          <Quill
            size={size * 1.45}
            tone="or"
            style={{
              position: 'absolute',
              left: '46%', bottom: '34%',
              transform: 'translateX(-34%) rotate(-14deg)',
              pointerEvents: 'none',
            }}
          />
        </span>
        YON
      </span>

      {tagline && (
        <span style={{
          fontSize: Math.max(7, size * 0.3),
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: tone === 'encre' ? 'rgba(11,11,11,0.55)' : 'rgba(242,238,230,0.5)',
          whiteSpace: 'nowrap',
        }}>
          Site de rencontre par l’écriture
        </span>
      )}
    </span>
  )
}
