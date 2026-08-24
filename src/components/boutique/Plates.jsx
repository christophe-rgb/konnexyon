/**
 * Les planches de la Papeterie.
 *
 * Pas de photo : le site n'en a jamais eu, ce serait un contresens d'en
 * mettre en boutique. Chaque produit est dessiné au trait, dans le même
 * geste que la plume du logo — encre sur ivoire, l'or pour ce qui compte.
 */

const INK  = '#0B0B0B'
const GOLD = '#C9A84C'

const trait = { stroke: INK, strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }
const or    = { stroke: GOLD, strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }
const fin   = { stroke: INK, strokeWidth: 0.9, strokeLinecap: 'round', strokeOpacity: 0.35, fill: 'none' }

/* ── Le Nécessaire : le coffret ouvert, tout dedans ─────────── */
function Necessaire() {
  return (
    <>
      <path {...trait} d="M38 96h164v104a8 8 0 0 1-8 8H46a8 8 0 0 1-8-8V96Z" />
      <path {...fin}   d="M38 96 60 74h158l-16 22" />
      <path {...or}    d="M38 118h164" />
      {/* sceau */}
      <circle {...or} cx="76" cy="160" r="17" />
      <path {...fin} d="M76 152v16M69 160h14" />
      <path {...trait} d="M76 143v-9" />
      {/* bâtons de cire */}
      <path {...trait} d="M112 142v54M124 142v54M136 142v54" />
      <path {...or}   d="M112 142h24" strokeOpacity="0.5" />
      {/* porte-plume */}
      <path {...trait} d="M160 196 190 140" />
      <path {...or}    d="M190 140l6-11-11 4" />
      <path {...fin}   d="M167 184l22-40" />
    </>
  )
}

/* ── Le Carnet : ouvert à plat, une seule ligne ─────────────── */
function Carnet() {
  return (
    <>
      <path {...trait} d="M28 68h84v112H28z" />
      <path {...trait} d="M128 68h84v112h-84z" />
      <path {...trait} d="M112 68h16v112h-16z" />
      <path {...fin}   d="M120 68v112" />
      {/* le mot, en haut */}
      <path {...or} d="M48 96h40" strokeWidth="2.4" />
      {/* la ligne à écrire */}
      <path {...fin} d="M48 126h44M148 96h44M148 126h44" />
      <path {...or}  d="M48 152h20" strokeWidth="1.8" strokeOpacity="0.55" />
      {/* signet */}
      <path {...or} d="M120 180v34l-9-9-9 9v-34" fill="#C9A84C" fillOpacity="0.12" />
    </>
  )
}

/* ── Les Cartes-questions : l'éventail ──────────────────────── */
function Cartes() {
  return (
    <>
      <g transform="rotate(-14 120 130)">
        <rect {...fin} x="52" y="66" width="90" height="128" rx="7" />
      </g>
      <g transform="rotate(-7 120 130)">
        <rect {...fin} x="66" y="62" width="90" height="128" rx="7" />
      </g>
      <rect {...trait} x="80" y="58" width="92" height="130" rx="7" />
      <path {...or}    d="M100 92h52" strokeWidth="2.2" />
      <path {...fin}   d="M100 112h52M100 128h34" />
      <text x="126" y="168" textAnchor="middle" fill={GOLD}
            fontFamily="Cormorant, serif" fontSize="30" fontStyle="italic">?</text>
    </>
  )
}

/* ── Le Sceau : le manche, la matrice, la cire ──────────────── */
function Sceau() {
  return (
    <>
      <path {...trait} d="M108 44h24v58h-24z" />
      <path {...fin}   d="M108 62h24M108 82h24" />
      <path {...trait} d="M100 102h40v16h-40z" />
      {/* la cire */}
      <path {...or} d="M84 152c0-18 16-30 36-30s36 12 36 30-16 32-36 32-36-14-36-32Z"
            fill="#C9A84C" fillOpacity="0.14" />
      <path {...fin} d="M92 168c-6 10-14 12-18 22M148 168c6 10 14 12 18 22" />
      {/* l'initiale */}
      <text x="120" y="163" textAnchor="middle" fill={GOLD}
            fontFamily="Cormorant, serif" fontSize="34">K</text>
    </>
  )
}

/* ── Le Porte-plume & l'encre ───────────────────────────────── */
function Plume() {
  return (
    <>
      <path {...trait} d="M62 196 168 62" />
      <path {...or}    d="M168 62l14-18-20 6" />
      <path {...fin}   d="M72 186 164 74" />
      <path {...trait} d="M62 196l-6 8 10-2" />
      {/* encrier */}
      <path {...trait} d="M118 158h56v34a8 8 0 0 1-8 8h-40a8 8 0 0 1-8-8v-34Z" />
      <path {...or}    d="M124 172h44" />
      <path {...trait} d="M132 158v-10h28v10" />
      <path {...or} d="M124 178h44v14a8 8 0 0 1-8 8h-28a8 8 0 0 1-8-8v-14Z"
            fill="#0B0B0B" fillOpacity="0.75" stroke="none" />
    </>
  )
}

/* ── L'Encre d'or : le flacon ───────────────────────────────── */
function Encre() {
  return (
    <>
      <path {...trait} d="M92 92h56v88a12 12 0 0 1-12 12h-32a12 12 0 0 1-12-12V92Z" />
      <path {...trait} d="M104 92V70h32v22" />
      <path {...trait} d="M100 70h40v-12h-40z" />
      <path {...or} d="M92 126h56v54a12 12 0 0 1-12 12h-32a12 12 0 0 1-12-12v-54Z"
            fill="#C9A84C" fillOpacity="0.3" stroke="none" />
      <path {...or} d="M92 126h56" />
      {/* particules */}
      <circle fill={GOLD} cx="110" cy="150" r="2" />
      <circle fill={GOLD} cx="130" cy="164" r="1.6" />
      <circle fill={GOLD} cx="118" cy="176" r="1.8" />
      <path {...fin} d="M148 108c10-6 18-4 24 4" />
    </>
  )
}

/* ── Le Papier à lettres : la pile et l'enveloppe ───────────── */
function Papier() {
  return (
    <>
      <path {...fin}   d="M44 74h108v128H44z" />
      <path {...fin}   d="M52 66h108v128H52z" />
      <path {...trait} d="M60 58h108v128H60z" />
      <path {...fin}   d="M78 92h72M78 110h72M78 128h48" />
      <path {...or}    d="M78 152h30" strokeWidth="1.8" />
      {/* enveloppe */}
      <path {...trait} d="M132 140h76v56h-76z" />
      <path {...or}    d="M132 140l38 28 38-28" />
      <path {...fin}   d="M132 196l28-22M208 196l-28-22" />
    </>
  )
}

/* ── L'Abonnement : l'enveloppe qui revient ─────────────────── */
function Abonnement() {
  return (
    <>
      <path {...trait} d="M52 92h136v88H52z" />
      <path {...or}    d="M52 92l68 50 68-50" />
      <path {...fin}   d="M52 180l50-38M188 180l-50-38" />
      {/* la flèche du mois qui revient */}
      <path {...or} d="M120 44a34 34 0 1 1-30 18" />
      <path {...or} d="M86 46l4 18 18-6" />
      <text x="120" y="76" textAnchor="middle" fill={INK}
            fontFamily="Cormorant, serif" fontSize="22">1</text>
    </>
  )
}

const PLANCHES = {
  necessaire: Necessaire,
  carnet:     Carnet,
  cartes:     Cartes,
  sceau:      Sceau,
  plume:      Plume,
  encre:      Encre,
  papier:     Papier,
  abonnement: Abonnement,
}

export default function Plate({ nom, ratio = '1 / 1', style = {} }) {
  const Dessin = PLANCHES[nom] || Carnet
  return (
    <div style={{
      aspectRatio: ratio,
      background: 'linear-gradient(160deg, #F7F4EE 0%, #EDE7DB 100%)',
      border: '1px solid rgba(201,168,76,0.22)',
      overflow: 'hidden',
      ...style,
    }}>
      <svg viewBox="0 0 240 240" width="100%" height="100%" aria-hidden="true"
           preserveAspectRatio="xMidYMid meet">
        <Dessin />
      </svg>
    </div>
  )
}
