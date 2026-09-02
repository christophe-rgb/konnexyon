import { useState, useRef, useEffect, useCallback } from 'react'
import { Quill } from './Logo'
import { ponctuation } from '../lib/typographie'
import { Unlink, Feather } from 'lucide-react'

const THRESHOLD = 70

/**
 * Pile de lecture — le second mode de /lire.
 *
 * Chaque item porte un `id` : celui de l'auteur de la ligne, puisque
 * c'est lui qu'on connecte. Le mot est recopié dans chaque item, toutes
 * les lignes du jour répondant au même.
 */
export default function SwipeStack({ profiles, onLike, onPass, counterLabel, vide, ton = 'encre' }) {
  // 'encre' dans l'application, ou la pile est chez elle sur fond sombre ;
  // 'papier' sur l'accueil, ou la ligne se lit comme sur une feuille posee.
  const papier      = ton === 'papier'
  const cardBg      = papier ? '#FBF8F3' : '#0D0D0D'
  const filet       = papier ? 'rgba(11,11,11,0.10)'   : 'rgba(201,168,76,0.1)'
  const filetActif  = papier ? 'rgba(160,120,48,0.30)' : 'rgba(201,168,76,0.25)'
  const ombre       = papier
    ? '0 18px 44px rgba(11,11,11,0.10), 0 2px 6px rgba(11,11,11,0.05)'
    : '0 16px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(201,168,76,0.15)'
  const stackHeight = 'min(430px, calc(100dvh - 380px))'
  const [index,  setIndex]  = useState(0)
  const [drag,   setDrag]   = useState({ x: 0, y: 0 })
  const [flying, setFlying] = useState(null) // 'left' | 'right' | null
  const activeRef   = useRef(false)
  const startRef    = useRef({ x: 0, y: 0 })
  const indexRef    = useRef(0)
  const profilesRef = useRef(profiles)
  useEffect(() => { profilesRef.current = profiles }, [profiles])

  const current  = profiles[index]
  const next     = profiles[index + 1]
  const nextnext = profiles[index + 2]

  const onStart = useCallback((cx, cy) => {
    if (flying) return
    activeRef.current = true
    startRef.current  = { x: cx, y: cy }
    setDrag({ x: 0, y: 0 })
  }, [flying])

  const onMove = useCallback((cx, cy) => {
    if (!activeRef.current || flying) return
    setDrag({ x: cx - startRef.current.x, y: cy - startRef.current.y })
  }, [flying])

  const onEnd = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    setDrag(d => {
      if (d.x > THRESHOLD)  { triggerFly('right'); return d }
      if (d.x < -THRESHOLD) { triggerFly('left');  return d }
      return { x: 0, y: 0 }
    })
  }, []) // eslint-disable-line

  const triggerFly = (dir) => {
    const capturedIndex = indexRef.current
    setFlying(dir)
    setTimeout(() => {
      if (dir === 'right') onLike(profilesRef.current[capturedIndex]?.id)
      else                 onPass?.(profilesRef.current[capturedIndex]?.id)
      indexRef.current = capturedIndex + 1
      setIndex(capturedIndex + 1)
      setFlying(null)
      setDrag({ x: 0, y: 0 })
    }, 380)
  }

  const handleLike = () => { if (!flying) triggerFly('right') }
  const handlePass = () => { if (!flying) triggerFly('left')  }

  if (!current) return <EmptySwipe vide={vide} papier={papier} />

  const dx  = flying === 'right' ? 700 : flying === 'left' ? -700 : drag.x
  const dy  = flying ? 0 : drag.y * 0.25
  const rot = flying === 'right' ? 20 : flying === 'left' ? -20 : dx / 15
  const likeOp = Math.max(0, Math.min(dx / THRESHOLD, 1))
  const passOp = Math.max(0, Math.min(-dx / THRESHOLD, 1))
  const isFlying = !!flying

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '8px 16px 16px', gap: 14, overflow: 'hidden' }}>

      {/* stack */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 400, height: stackHeight, flexShrink: 0 }}>

        {/* carte 3 */}
        {nextnext && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: 24, overflow: 'hidden', transform: 'scale(0.88) translateY(16px)', transformOrigin: 'bottom center', border: `1px solid ${filet}`, background: cardBg }}>
            <CardWord item={nextnext} papier={papier} />
          </div>
        )}

        {/* carte 2 */}
        {next && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: 24, overflow: 'hidden', transform: 'scale(0.94) translateY(8px)', transformOrigin: 'bottom center', border: `1px solid ${filet}`, background: cardBg }}>
            <CardWord item={next} papier={papier} />
          </div>
        )}

        {/* carte active */}
        <div
          onMouseDown={e  => onStart(e.clientX, e.clientY)}
          onMouseMove={e  => onMove(e.clientX, e.clientY)}
          onMouseUp={onEnd}
          onMouseLeave={onEnd}
          onTouchStart={e => onStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={e  => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchEnd={onEnd}
          style={{
            position: 'absolute', inset: 0,
            borderRadius: 24, overflow: 'hidden',
            cursor: isFlying ? 'default' : activeRef.current ? 'grabbing' : 'grab',
            transform: `translateX(${dx}px) translateY(${dy}px) rotate(${rot}deg)`,
            transition: isFlying ? 'transform 0.38s cubic-bezier(0.4,0,1,1)' : activeRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)',
            userSelect: 'none',
            touchAction: 'none',
            border: `1px solid ${filetActif}`,
            boxShadow: ombre,
            background: cardBg,
          }}
        >
          <CardWord item={current} papier={papier} />

          {/* label CONNEXION */}
          <div style={{
            position: 'absolute', top: 28, left: 24,
            opacity: likeOp,
            transform: `rotate(-15deg) scale(${0.75 + likeOp * 0.25})`,
            pointerEvents: 'none',
          }}>
            <div style={{
              padding: '6px 18px', borderRadius: 8,
              border: '3px solid #4ade80', color: '#4ade80',
              fontFamily: 'Cormorant, serif', fontSize: '1.9rem', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              textShadow: '0 0 20px rgba(74,222,128,0.4)',
            }}>
              CONNEXION
            </div>
          </div>

          {/* label PLUS TARD */}
          <div style={{
            position: 'absolute', top: 28, right: 24,
            opacity: passOp,
            transform: `rotate(15deg) scale(${0.75 + passOp * 0.25})`,
            pointerEvents: 'none',
          }}>
            <div style={{
              padding: '6px 18px', borderRadius: 8,
              border: '3px solid rgba(248,113,113,0.9)', color: 'rgba(248,113,113,0.95)',
              fontFamily: 'Cormorant, serif', fontSize: '1.9rem', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              textShadow: '0 0 20px rgba(248,113,113,0.35)',
            }}>
              PLUS TARD
            </div>
          </div>

        </div>
      </div>

      {/* compteur */}
      <p style={{ fontSize: 11, letterSpacing: '0.14em', color: papier ? 'rgba(146,108,38,0.95)' : 'rgba(201,168,76,1)', textTransform: 'uppercase' }}>
        {counterLabel ?? `${profiles.length - index} connexion${profiles.length - index > 1 ? 's' : ''} restante${profiles.length - index > 1 ? 's' : ''}`}
      </p>

      {/* boutons action */}
      <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
        <ActionBtn onClick={handlePass} aria="Plus tard">
          <Unlink size={26} strokeWidth={1.5} color="rgba(248,113,113,0.85)" />
        </ActionBtn>

        <ActionBtn onClick={handleLike} aria="Se connecter" gold>
          <Quill size={30} tone="or" />
        </ActionBtn>
      </div>
    </div>
  )
}

// Carte Mot du jour : le mot en grand, la ligne d'un autre membre, son pseudo.
// L'item porte son propre `word` — toutes les lignes du jour répondent au même
// mot, la page le recopie dans chaque item plutôt que de le faire traverser
// SwipeStack en prop.
function CardWord({ item, papier }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 26, padding: '36px 28px', textAlign: 'center',
      background: papier
        ? 'radial-gradient(ellipse at 50% 26%, rgba(201,168,76,0.09), transparent 64%), #FBF8F3'
        : 'radial-gradient(ellipse at 50% 28%, rgba(201,168,76,0.10), transparent 62%), #0D0D0D',
    }}>
      {/* Le mot, quand la carte doit le porter. Sur l'accueil il est deja
          annonce au-dessus de la pile : le repeter sur chaque carte en
          faisait le sujet, alors que le sujet est la phrase. */}
      {item.word && (
        <>
          <h2 className={papier ? undefined : 'shine-text'} style={{
            color: papier ? 'var(--or)' : undefined,
            fontFamily: 'Cormorant, serif',
            fontSize: 'clamp(2.4rem, 11vw, 3.6rem)',
            fontWeight: 600, lineHeight: 1.05,
            letterSpacing: '0.02em',
          }}>
            {item.word}
          </h2>

          <div style={{ width: 46, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.55), transparent)' }} />
        </>
      )}

      {/* la ligne écrite par un autre membre */}
      <p style={{
        fontFamily: 'Cormorant, serif',
        fontSize: papier ? 'clamp(1.3rem, 5vw, 1.75rem)' : 'clamp(1.15rem, 4.6vw, 1.5rem)',
        fontStyle: 'italic',
        lineHeight: 1.55,
        color: papier ? 'rgba(11,11,11,0.86)' : 'rgba(245,240,232,0.94)',
        maxWidth: 300,
      }}>
        {ponctuation(item.line)}
      </p>

      {/* son pseudo, et le taux quand il a du sens */}
      <div>
        <p style={{
          fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: papier ? 'rgba(146,108,38,0.95)' : 'rgba(201,168,76,0.85)',
        }}>
          {item.pseudo}
        </p>
        {item.compatibility != null && (
          <p style={{ fontSize: 10, letterSpacing: '0.1em', color: papier ? 'rgba(11,11,11,0.42)' : 'rgba(242,238,230,0.4)', marginTop: 6 }}>
            {item.compatibility} % de compatibilité
          </p>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ onClick, children, aria, gold }) {
  return (
    <button className="erb-btn"
      onClick={onClick}
      aria-label={aria}
      style={{
        width: gold ? 72 : 60,
        height: gold ? 72 : 60,
        borderRadius: '50%',
        border: gold ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(248,113,113,0.3)',
        background: gold
          ? 'radial-gradient(circle at 40% 35%, rgba(232,204,122,0.18), rgba(160,120,48,0.06))'
          : 'rgba(248,113,113,0.06)',
        boxShadow: gold ? '0 0 20px rgba(201,168,76,0.3)' : '0 0 20px rgba(248,113,113,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = gold ? '0 0 28px rgba(201,168,76,0.4)' : '0 0 30px rgba(248,113,113,0.25)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';   e.currentTarget.style.boxShadow = gold ? '0 0 20px rgba(201,168,76,0.3)' : '0 0 20px rgba(248,113,113,0.1)' }}
    >
      {children}
    </button>
  )
}

function EmptySwipe({ vide, papier }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 32px', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, rgba(201,168,76,0.1), transparent)', border: '1px solid rgba(201,168,76,0.1)' }}>
        <Feather size={28} strokeWidth={1} style={{ color: 'rgba(201,168,76,1)' }} />
      </div>
      <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', color: papier ? 'rgba(11,11,11,0.86)' : 'rgba(245,240,232,0.92)' }}>
        {vide?.titre ?? 'Vous avez lu toutes les lignes du jour'}
      </p>
      <p style={{ fontSize: 13, color: papier ? 'rgba(11,11,11,0.5)' : 'rgba(245,240,232,0.55)', lineHeight: 1.6 }}>
        {vide?.texte ?? 'Revenez demain : un nouveau mot, de nouvelles lignes.'}
      </p>
    </div>
  )
}
