// Vumètre visuel (ambiance club) — purement décoratif, ne touche pas au son.
// Rendu dans la barre de navigation, à gauche.
const BARS = [0.45, 0.8, 1, 0.55, 0.9, 0.5, 0.75, 0.6]

export default function Vumetre({ playing }) {
  return (
    <div aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 22, flexShrink: 0 }}>
      <style>{`@keyframes kx-eq { 0% { transform: scaleY(0.2) } 100% { transform: scaleY(1) } }`}</style>
      {BARS.map((h, i) => (
        <span
          key={i}
          style={{
            width: 3, height: '100%', borderRadius: 2,
            background: 'linear-gradient(180deg,#E8CC7A 0%,#C9A84C 55%,#8A6B24 100%)',
            transformOrigin: 'bottom',
            transform: `scaleY(${playing ? h : 0.16})`,
            animation: playing
              ? `kx-eq ${(0.26 + (i % 4) * 0.06 + h * 0.12).toFixed(2)}s ease-in-out ${(i * 0.04).toFixed(2)}s infinite alternate`
              : 'none',
            boxShadow: playing ? '0 0 5px rgba(201,168,76,0.5)' : 'none',
          }}
        />
      ))}
    </div>
  )
}
