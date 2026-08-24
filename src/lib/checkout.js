import { supabase } from './supabase'

/**
 * Passage en caisse.
 *
 * Deux règles non négociables :
 *   1. le montant n'est jamais décidé côté client. On envoie des slugs et
 *      des quantités ; la fonction edge relit les prix dans la base.
 *   2. la commande n'existe qu'en 'en_attente' tant que le webhook de
 *      paiement ne l'a pas fait passer à 'payee'.
 *
 * La fonction edge `creer-paiement` porte la clé Stripe secrète. Tant
 * qu'elle n'est pas déployée, on le dit clairement au lieu de laisser
 * l'acheteur devant un bouton mort.
 */
export async function passerCommande(items, profile) {
  if (!items?.length) return { erreur: 'Votre panier est vide.' }

  const lignes = items.map(i => ({ slug: i.slug, quantity: i.quantity }))

  try {
    const { data, error } = await supabase.functions.invoke('creer-paiement', {
      body: {
        lignes,
        email: profile?.email || null,
        // d'où vient l'acheteur : sert à rapprocher les ventes des campagnes
        source: new URLSearchParams(window.location.search).get('utm_campaign') || null,
      },
    })

    if (error) {
      return { erreur: 'Le paiement n’est pas encore ouvert sur cette boutique.' }
    }
    if (!data?.url) {
      return { erreur: 'Réponse de paiement inattendue — réessayez dans un instant.' }
    }
    return { url: data.url }
  } catch {
    return { erreur: 'Le paiement n’est pas encore ouvert sur cette boutique.' }
  }
}
