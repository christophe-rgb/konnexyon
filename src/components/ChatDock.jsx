import { useChatDock } from '../store/chatDock'
import DockedChat from './DockedChat'

// Conteneur global des fenêtres de chat (bas-droite). Rendu au niveau App donc
// persiste à travers la navigation.
export default function ChatDock() {
  const openIds = useChatDock((s) => s.openIds)
  if (!openIds.length) return null
  return (
    <div style={{
      position: 'fixed', bottom: 0, right: 12, zIndex: 9990,
      display: 'flex', alignItems: 'flex-end', gap: 12,
      pointerEvents: 'none',
    }}>
      {openIds.map((id) => <DockedChat key={id} matchId={id} />)}
    </div>
  )
}
