/* Icône X Konnexyon — deux rubans courbés croisés, effet bijou lumineux */
export default function XLogo({ size = 44, style = {} }) {
  const id = `xl-${Math.random().toString(36).slice(2, 8)}`
  const shimmer1 = `${id}-sh1`
  const shimmer2 = `${id}-sh2`
  const clip1    = `${id}-c1`
  const clip2    = `${id}-c2`

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
        {/* dégradés de base — or chaud */}
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="100" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6B4E10"/>
          <stop offset="30%"  stopColor="#C9A84C"/>
          <stop offset="60%"  stopColor="#F0D878"/>
          <stop offset="100%" stopColor="#8A6820"/>
        </linearGradient>
        <linearGradient id={`${id}b`} x1="100" y1="0" x2="0" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6B4E10"/>
          <stop offset="30%"  stopColor="#C9A84C"/>
          <stop offset="60%"  stopColor="#F0D878"/>
          <stop offset="100%" stopColor="#8A6820"/>
        </linearGradient>

        {/* reflet qui traverse — bijou */}
        <linearGradient id={shimmer1} x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse"
          x1="0" y1="0" x2="100" y2="65">
          <stop offset="0%"   stopColor="white" stopOpacity="0">
            <animate attributeName="offset" values="-0.6;1.2" dur="2.8s" repeatCount="indefinite"/>
          </stop>
          <stop offset="8%"  stopColor="white" stopOpacity="0.55">
            <animate attributeName="offset" values="-0.45;1.35" dur="2.8s" repeatCount="indefinite"/>
          </stop>
          <stop offset="16%"  stopColor="white" stopOpacity="0">
            <animate attributeName="offset" values="-0.3;1.5" dur="2.8s" repeatCount="indefinite"/>
          </stop>
        </linearGradient>

        <linearGradient id={shimmer2} x1="100" y1="0" x2="0" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="white" stopOpacity="0">
            <animate attributeName="offset" values="-0.6;1.2" dur="2.8s" begin="1.4s" repeatCount="indefinite"/>
          </stop>
          <stop offset="8%"  stopColor="white" stopOpacity="0.5">
            <animate attributeName="offset" values="-0.45;1.35" dur="2.8s" begin="1.4s" repeatCount="indefinite"/>
          </stop>
          <stop offset="16%"  stopColor="white" stopOpacity="0">
            <animate attributeName="offset" values="-0.3;1.5" dur="2.8s" begin="1.4s" repeatCount="indefinite"/>
          </stop>
        </linearGradient>

        {/* clip pour confiner le reflet à chaque ruban */}
        <clipPath id={clip1}>
          <path d="M 4,3 C 38,-4 62,60 96,62 C 60,68 36,18 4,3 Z"/>
        </clipPath>
        <clipPath id={clip2}>
          <path d="M 4,62 C 36,44 60,-3 96,3 C 62,8 38,70 4,62 Z"/>
        </clipPath>
      </defs>

      {/* ── ruban \ ── */}
      <path d="M 4,3 C 38,-4 62,60 96,62 C 60,68 36,18 4,3 Z" fill={`url(#${id}a)`}/>
      {/* reflet glissant sur ruban \ */}
      <rect x="-10" y="-5" width="120" height="75" fill={`url(#${shimmer1})`} clipPath={`url(#${clip1})`} style={{ mixBlendMode: 'screen' }}/>

      {/* ── ruban / ── */}
      <path d="M 4,62 C 36,44 60,-3 96,3 C 62,8 38,70 4,62 Z" fill={`url(#${id}b)`}/>
      {/* reflet glissant sur ruban / */}
      <rect x="-10" y="-5" width="120" height="75" fill={`url(#${shimmer2})`} clipPath={`url(#${clip2})`} style={{ mixBlendMode: 'screen' }}/>

      {/* ── étoiles scintillantes aux extrémités ── */}
      <Star cx={4}  cy={3}  r={3.5} delay="0s"/>
      <Star cx={96} cy={62} r={3.5} delay="1.4s"/>
      <Star cx={96} cy={3}  r={3}   delay="0.7s"/>
      <Star cx={4}  cy={62} r={3}   delay="2.1s"/>
    </svg>
  )
}

function Star({ cx, cy, r, delay }) {
  const s = r * 0.28
  return (
    <g>
      {/* croix 4 branches */}
      <path
        d={`M${cx},${cy-r} L${cx+s},${cy-s} L${cx+r},${cy} L${cx+s},${cy+s} L${cx},${cy+r} L${cx-s},${cy+s} L${cx-r},${cy} L${cx-s},${cy-s} Z`}
        fill="white"
      >
        <animate attributeName="opacity" values="0;1;0.6;1;0" dur="2.8s" begin={delay} repeatCount="indefinite"/>
        <animateTransform attributeName="transform" type="scale" values="0.6 0.6;1.2 1.2;1 1;1.3 1.3;0.7 0.7"
          additive="sum" origin={`${cx} ${cy}`}
          dur="2.8s" begin={delay} repeatCount="indefinite"/>
      </path>
      {/* halo doux */}
      <circle cx={cx} cy={cy} r={r * 1.8} fill="white">
        <animate attributeName="opacity" values="0;0.25;0;0.2;0" dur="2.8s" begin={delay} repeatCount="indefinite"/>
      </circle>
    </g>
  )
}
