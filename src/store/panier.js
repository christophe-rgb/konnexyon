import { create } from 'zustand'
import { totaux } from '../lib/boutique'

/**
 * Le panier. Persisté en localStorage : on ne perd pas une intention
 * d'achat parce que l'onglet s'est fermé.
 *
 * On ne stocke que { slug, quantity } — jamais les prix. Le montant est
 * recalculé depuis le catalogue à chaque lecture, et refait côté serveur
 * avant le paiement.
 */

const CLE = 'konnexyon.panier.v1'

function lire() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) || '[]')
    if (!Array.isArray(brut)) return []
    return brut
      .filter(l => l && typeof l.slug === 'string')
      .map(l => ({ slug: l.slug, quantity: Math.max(1, Math.min(20, Math.trunc(l.quantity) || 1)) }))
  } catch {
    return []
  }
}

function ecrire(lignes) {
  try { localStorage.setItem(CLE, JSON.stringify(lignes)) } catch { /* quota plein, tant pis */ }
}

export const usePanier = create((set, get) => ({
  lignes: lire(),

  ajouter: (slug, quantity = 1) => {
    const lignes = [...get().lignes]
    const i = lignes.findIndex(l => l.slug === slug)
    if (i >= 0) lignes[i] = { ...lignes[i], quantity: Math.min(20, lignes[i].quantity + quantity) }
    else lignes.push({ slug, quantity: Math.max(1, Math.min(20, quantity)) })
    ecrire(lignes); set({ lignes })
  },

  changerQuantite: (slug, quantity) => {
    const q = Math.trunc(quantity)
    const lignes = q <= 0
      ? get().lignes.filter(l => l.slug !== slug)
      : get().lignes.map(l => (l.slug === slug ? { ...l, quantity: Math.min(20, q) } : l))
    ecrire(lignes); set({ lignes })
  },

  retirer: slug => {
    const lignes = get().lignes.filter(l => l.slug !== slug)
    ecrire(lignes); set({ lignes })
  },

  vider: () => { ecrire([]); set({ lignes: [] }) },
}))

/** Sélecteur pratique : les totaux recalculés depuis le catalogue. */
export function usePanierTotaux() {
  return totaux(usePanier(s => s.lignes))
}
