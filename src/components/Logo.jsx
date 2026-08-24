/**
 * Identité Konnexyon — « site de rencontre par l'écriture ».
 *
 * Quill    : la plume, seule (icône, favicon, puces).
 * Wordmark : KONNE·X·YON, la plume plantée dans le X.
 *
 * Deux tonalités : 'or' sur fond encre, 'encre' sur fond ivoire.
 */

// La plume : rapport largeur/hauteur du fichier détouré. `size` est la
// hauteur rendue, la largeur suit.
const PLUME_RATIO = 0.703

/**
 * La plume, seule — icône, ornement, filigrane.
 *
 * Deux tirages du même dessin : l'or pour les fonds encre, une
 * silhouette d'encre pour les fonds ivoire, où le détail est porté par
 * l'alpha plutôt que par la couleur.
 *
 * @param {number} size  hauteur rendue en px
 * @param {'or'|'encre'} tone
 */
export function Quill({ size = 28, tone = 'or', style = {}, alt = '' }) {
  return (
    <img
      src={tone === 'encre' ? '/brand/plume-encre.webp' : '/brand/plume.webp'}
      alt={alt}
      aria-hidden={alt ? undefined : 'true'}
      width={Math.round(size * PLUME_RATIO)}
      height={size}
      // marges automatiques : l'ancien dessin etait un SVG en ligne, que
      // text-align centrait. Une image en display:block ne l'est plus.
      style={{ height: size, width: 'auto', display: 'block', marginInline: 'auto', ...style }}
    />
  )
}

/**
 * Le mot-symbole. Deux tirages du même dessin : ivoire et or sur fond
 * encre, encre et or sur fond ivoire.
 *
 * `size` reste la hauteur des capitales, comme pour un texte — les
 * capitales occupent 31,9 % de la hauteur de l'image, le reste étant la
 * plume qui les surplombe et la volute qui passe dessous.
 *
 * @param {number} size   hauteur des capitales en px
 * @param {'or'|'encre'} tone
 * @param {boolean} tagline
 */
const CAP_RATIO = 0.319          // mesuré sur public/brand/konnexyon-encre.png
const LOGO_RATIO = 3.017         // largeur / hauteur

export function Wordmark({ size = 26, tone = 'or', tagline = false }) {
  const hauteur = Math.round(size / CAP_RATIO)

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <img
        src={tone === 'encre' ? '/brand/konnexyon-encre.png' : '/brand/konnexyon.png'}
        alt="Konnexyon"
        width={Math.round(hauteur * LOGO_RATIO)}
        height={hauteur}
        style={{ height: hauteur, width: 'auto', display: 'block' }}
      />

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
