/* Icône X Konnexyon — deux rubans courbés croisés, effilés aux extrémités */
export default function XLogo({ size = 44, style = {} }) {
  const id = `xlogo-${Math.random().toString(36).slice(2, 7)}`
  return (
    <svg
      width={size}
      height={size * 0.65}
      viewBox="0 0 100 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={style}
    >
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="100" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7A5A18"/>
          <stop offset="35%"  stopColor="#C9A84C"/>
          <stop offset="65%"  stopColor="#E8CC7A"/>
          <stop offset="100%" stopColor="#A07830"/>
        </linearGradient>
        <linearGradient id={`${id}b`} x1="100" y1="0" x2="0" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7A5A18"/>
          <stop offset="35%"  stopColor="#C9A84C"/>
          <stop offset="65%"  stopColor="#E8CC7A"/>
          <stop offset="100%" stopColor="#A07830"/>
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%"  stopColor="#FFF8DC" stopOpacity="0"/>
          <stop offset="50%" stopColor="#FFFACD" stopOpacity="1"/>
          <stop offset="100%" stopColor="#FFF8DC" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* ruban \ : de haut-gauche vers bas-droite, S-curve */}
      <path
        d="M 4,3 C 38,-4 62,60 96,62 C 60,68 36,18 4,3 Z"
        fill={`url(#${id}a)`}
      />

      {/* ruban / : de bas-gauche vers haut-droite, S-curve */}
      <path
        d="M 4,62 C 36,44 60,-3 96,3 C 62,8 38,70 4,62 Z"
        fill={`url(#${id}b)`}
      />

      {/* étoiles scintillantes aux 4 extrémités */}
      <Star cx={4}  cy={3}  r={3.5} id={`${id}s`}/>
      <Star cx={96} cy={62} r={3.5} id={`${id}s`}/>
      <Star cx={96} cy={3}  r={3}   id={`${id}s`}/>
      <Star cx={4}  cy={62} r={3}   id={`${id}s`}/>
    </svg>
  )
}

function Star({ cx, cy, r, id }) {
  const s = r * 0.3
  return (
    <path
      d={`M${cx},${cy - r} L${cx + s},${cy - s} L${cx + r},${cy} L${cx + s},${cy + s} L${cx},${cy + r} L${cx - s},${cy + s} L${cx - r},${cy} L${cx - s},${cy - s} Z`}
      fill="white"
      opacity="0.85"
    />
  )
}
