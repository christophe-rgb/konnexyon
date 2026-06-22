import { useState, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { refreshSignedUrl } from '../lib/storageSignedUrl'

export default function ChatBubble({ message, isMine, onDelete }) {
  const [showActions, setShowActions] = useState(false)
  // imgSrc permet de substituer une URL régénérée sans muter le message parent
  const [imgSrc, setImgSrc] = useState(message.photo_url)
  // refreshing : verrou anti-boucle infinie (une seule tentative par image)
  const [refreshing, setRefreshing] = useState(false)
  // imgError : affiche un placeholder si le refresh a également échoué
  const [imgError, setImgError] = useState(false)

  const time = new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  /**
   * Appelé quand l'image échoue à se charger (typiquement 403 URL expirée).
   * On ne tente qu'une seule régénération pour éviter toute boucle.
   */
  const handleImgError = useCallback(async () => {
    if (refreshing || imgError) return   // déjà en cours ou déjà échoué

    setRefreshing(true)
    try {
      const newUrl = await refreshSignedUrl(imgSrc)
      if (newUrl) {
        setImgSrc(newUrl)
        setRefreshing(false)
        // imgError reste false : le nouveau src va relancer le chargement
      } else {
        setImgError(true)
        setRefreshing(false)
      }
    } catch {
      setImgError(true)
      setRefreshing(false)
    }
  }, [imgSrc, refreshing, imgError])

  return (
    <div
      className={clsx('flex flex-col gap-1 max-w-[75%] group', isMine ? 'self-end items-end' : 'self-start items-start')}
      onClick={() => isMine && onDelete && setShowActions(s => !s)}
      role={isMine && onDelete ? 'button' : undefined}
      tabIndex={isMine && onDelete ? 0 : undefined}
      onKeyDown={isMine && onDelete ? (e => e.key === 'Enter' && setShowActions(s => !s)) : undefined}
    >
      {message.photo_url && (
        <div style={{ aspectRatio: '4/3', maxHeight: 260, overflow: 'hidden' }} className="rounded-xl w-full">
          {imgError ? (
            /* Placeholder affiché si le refresh a échoué */
            <div
              className="rounded-xl w-full h-full flex items-center justify-center text-xs"
              style={{
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: 'rgba(201,168,76,0.6)',
                minHeight: 100,
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.05em',
              }}
            >
              Image indisponible
            </div>
          ) : refreshing ? (
            /* Spinner pendant la régénération de l'URL */
            <div
              className="rounded-xl w-full h-full flex items-center justify-center"
              style={{
                background: 'rgba(201,168,76,0.05)',
                border: '1px solid rgba(201,168,76,0.15)',
                minHeight: 100,
              }}
            >
              <div style={{
                width: 20, height: 20,
                border: '2px solid rgba(201,168,76,0.3)',
                borderTopColor: '#C9A84C',
                borderRadius: '50%',
                animation: 'rotateX 0.8s linear infinite',
              }} />
            </div>
          ) : (
            <img
              src={imgSrc}
              alt={`Photo envoyée par ${isMine ? 'vous' : "l'autre membre"}`}
              width="100%"
              height="auto"
              loading="lazy"
              className="rounded-xl max-w-full w-full h-full object-cover cursor-pointer"
              onError={handleImgError}
            />
          )}
        </div>
      )}
      {message.content && (
        <div className={clsx(
          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed cursor-default',
          isMine
            ? 'bg-gold text-bg rounded-br-sm'
            : 'bg-surface2 text-text rounded-bl-sm border border-[rgba(201,168,76,0.15)]'
        )}>
          {message.content}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted">{time}</span>
        {isMine && message.read_at && (
          <span className="text-[11px] text-gold">vu</span>
        )}
        {isMine && onDelete && showActions && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); setShowActions(false) }}
            className="text-muted hover:text-red-400 transition-colors duration-150 cursor-pointer ml-1"
            title="Supprimer pour moi"
          >
            <Trash2 size={12} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}
