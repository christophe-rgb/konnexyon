import { create } from 'zustand'

// Nombre max de fenêtres de chat ouvertes simultanément (les plus anciennes
// sont fermées au-delà).
const MAX_OPEN = 3

// Dock de chat global (façon Messenger) : plusieurs conversations ouvertes en
// parallèle, chacune réductible/fermable, persistant à travers la navigation.
export const useChatDock = create((set) => ({
  openIds: [],      // matchIds, ordre d'affichage (droite = plus récent)
  minimized: {},    // { [matchId]: true }

  openChat: (matchId) => {
    if (!matchId) return
    set((s) => {
      if (s.openIds.includes(matchId)) {
        // déjà ouvert → on le dé-réduit
        return { minimized: { ...s.minimized, [matchId]: false } }
      }
      const openIds = [...s.openIds, matchId]
      const minimized = { ...s.minimized, [matchId]: false }
      while (openIds.length > MAX_OPEN) {
        const removed = openIds.shift()
        delete minimized[removed]
      }
      return { openIds, minimized }
    })
  },

  closeChat: (matchId) => set((s) => {
    const minimized = { ...s.minimized }
    delete minimized[matchId]
    return { openIds: s.openIds.filter((id) => id !== matchId), minimized }
  }),

  toggleMinimize: (matchId) => set((s) => ({
    minimized: { ...s.minimized, [matchId]: !s.minimized[matchId] },
  })),

  // Ferme tout (ex. à la déconnexion)
  closeAll: () => set({ openIds: [], minimized: {} }),
}))
