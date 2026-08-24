import { describe, it, expect } from 'vitest'
import { CATALOGUE, totaux, euros, bySlug, FRANCO_CENTS, LIVRAISON_CENTS } from '../lib/boutique'

describe('catalogue', () => {
  it('a des slugs uniques', () => {
    const slugs = CATALOGUE.map(p => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('n’a que des prix positifs en centimes entiers', () => {
    for (const p of CATALOGUE) {
      expect(Number.isInteger(p.price_cents)).toBe(true)
      expect(p.price_cents).toBeGreaterThan(0)
    }
  })

  it('n’affiche un prix barré que s’il est plus élevé que le prix de vente', () => {
    for (const p of CATALOGUE) {
      if (p.compare_cents) expect(p.compare_cents).toBeGreaterThan(p.price_cents)
    }
  })

  it('retrouve un produit par son slug, et rien pour un slug inconnu', () => {
    expect(bySlug('carnet-du-mot-du-jour')?.name).toBe('Le Carnet du Mot du jour')
    expect(bySlug('nimporte-quoi')).toBeNull()
  })
})

describe('totaux du panier', () => {
  it('additionne les lignes', () => {
    const t = totaux([{ slug: 'encre-d-or', quantity: 2 }])
    expect(t.count).toBe(2)
    expect(t.sous_total_cents).toBe(3600)
  })

  it('facture la livraison sous le franco', () => {
    const t = totaux([{ slug: 'encre-d-or', quantity: 1 }])
    expect(t.livraison_cents).toBe(LIVRAISON_CENTS)
    expect(t.total_cents).toBe(1800 + LIVRAISON_CENTS)
    expect(t.manque_franco_cents).toBe(FRANCO_CENTS - 1800)
  })

  it('offre la livraison au-dessus du franco', () => {
    const t = totaux([{ slug: 'necessaire-a-lettres', quantity: 1 }])
    expect(t.sous_total_cents).toBeGreaterThanOrEqual(FRANCO_CENTS)
    expect(t.livraison_cents).toBe(0)
    expect(t.manque_franco_cents).toBe(0)
  })

  it('ne facture pas de livraison sur un panier vide', () => {
    const t = totaux([])
    expect(t.total_cents).toBe(0)
    expect(t.livraison_cents).toBe(0)
  })

  it('ignore un slug inconnu au lieu de planter', () => {
    const t = totaux([{ slug: 'produit-fantome', quantity: 3 }, { slug: 'encre-d-or', quantity: 1 }])
    expect(t.items).toHaveLength(1)
    expect(t.sous_total_cents).toBe(1800)
  })

  it('borne les quantités absurdes — un panier client est manipulable', () => {
    expect(totaux([{ slug: 'encre-d-or', quantity: 9999 }]).count).toBe(20)
    expect(totaux([{ slug: 'encre-d-or', quantity: -5 }]).count).toBe(1)
    expect(totaux([{ slug: 'encre-d-or', quantity: 2.7 }]).count).toBe(2)
  })

  it('ne fait jamais confiance à un prix venu du panier', () => {
    const t = totaux([{ slug: 'necessaire-a-lettres', quantity: 1, price_cents: 1 }])
    expect(t.sous_total_cents).toBe(bySlug('necessaire-a-lettres').price_cents)
  })
})

describe('affichage des prix', () => {
  it('formate en euros français sans décimales inutiles', () => {
    expect(euros(6800).replace(/ | /g, ' ')).toBe('68 €')
    expect(euros(490).replace(/ | /g, ' ')).toBe('4,90 €')
  })
})
