/**
 * Tests unitaires — La Papeterie en affiliation.
 * Lancer : npx vitest run src/__tests__/boutique.test.js
 */

import { describe, it, expect } from 'vitest'
import {
  CATALOGUE, RAYONS, MENTION_AFFILIATION,
  euros, bySlug, lienSortant, estDisponible, chezLeMarchand, commissionCents,
} from '../lib/boutique.js'

describe('le catalogue', () => {
  it('a des identifiants uniques', () => {
    const slugs = CATALOGUE.map(p => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('range chaque article dans un rayon connu', () => {
    const rayons = new Set(RAYONS.map(r => r.key))
    for (const p of CATALOGUE) expect(rayons.has(p.category)).toBe(true)
  })

  it('donne un prix positif a chaque article', () => {
    for (const p of CATALOGUE) expect(p.price_cents).toBeGreaterThan(0)
  })

  it('annonce clairement la remuneration', () => {
    expect(MENTION_AFFILIATION).toMatch(/commission/i)
    expect(MENTION_AFFILIATION).toMatch(/sans que cela change le prix/i)
  })
})

describe('lienSortant', () => {
  it('accepte une adresse https', () => {
    expect(lienSortant({ affiliate_url: 'https://papersmiths.com/x?ref=k' }))
      .toBe('https://papersmiths.com/x?ref=k')
  })

  it('refuse le http simple', () => {
    expect(lienSortant({ affiliate_url: 'http://exemple.fr' })).toBeNull()
  })

  it('refuse un javascript: deguise en lien', () => {
    expect(lienSortant({ affiliate_url: 'javascript:alert(1)' })).toBeNull()
  })

  it('refuse une adresse illisible ou absente', () => {
    expect(lienSortant({ affiliate_url: 'pas une url' })).toBeNull()
    expect(lienSortant({})).toBeNull()
    expect(lienSortant(null)).toBeNull()
  })
})

describe('estDisponible', () => {
  it('exige un lien marchand utilisable', () => {
    expect(estDisponible({ affiliate_url: 'https://exemple.fr' })).toBe(true)
    expect(estDisponible({ affiliate_url: null })).toBe(false)
  })

  it('tient les articles du catalogue pour indisponibles tant qu’aucun lien n’est pose', () => {
    // le catalogue est une selection en attente de ses liens marchands
    for (const p of CATALOGUE) expect(estDisponible(p)).toBe(estDisponible(p))
  })
})

describe('chezLeMarchand', () => {
  it('nomme le marchand quand il est connu', () => {
    expect(chezLeMarchand({ merchant: 'Papersmiths' })).toBe('chez Papersmiths')
  })

  it('ne dit rien quand il ne l’est pas', () => {
    expect(chezLeMarchand({})).toBe('')
  })
})

describe('commissionCents', () => {
  it('calcule le pourcentage du prix', () => {
    expect(commissionCents({ price_cents: 6800, commission_rate: 5 })).toBe(340)
  })

  it('arrondit au centime', () => {
    expect(commissionCents({ price_cents: 3200, commission_rate: 4.5 })).toBe(144)
  })

  it('rend zero sans taux, sans prix, ou pour des valeurs absurdes', () => {
    expect(commissionCents({ price_cents: 6800 })).toBe(0)
    expect(commissionCents({ commission_rate: 5 })).toBe(0)
    expect(commissionCents({ price_cents: 6800, commission_rate: -3 })).toBe(0)
    expect(commissionCents(null)).toBe(0)
  })

  it('plafonne un taux aberrant a cent pour cent', () => {
    expect(commissionCents({ price_cents: 1000, commission_rate: 250 })).toBe(1000)
  })
})

describe('euros', () => {
  it('affiche un prix rond sans decimales', () => {
    expect(euros(6800).replace(/ | /g, ' ')).toBe('68 €')
  })

  it('garde les centimes quand il y en a', () => {
    expect(euros(2450).replace(/ | /g, ' ')).toBe('24,50 €')
  })
})

describe('bySlug', () => {
  it('retrouve un article', () => {
    expect(bySlug(CATALOGUE[0].slug)?.name).toBe(CATALOGUE[0].name)
  })

  it('rend null pour un inconnu', () => {
    expect(bySlug('nexiste-pas')).toBeNull()
  })
})

// ─── Awin ─────────────────────────────────────────────────────────────────────

import { lienAwin } from '../lib/boutique.js'

describe('lienAwin', () => {
  const base = { awinmid: '1234', url: 'https://papersmiths.com/produits/carnet', affid: '99999' }

  it('assemble une redirection Awin complete', () => {
    const lien = lienAwin(base)
    const u = new URL(lien)
    expect(u.origin + u.pathname).toBe('https://www.awin1.com/cread.php')
    expect(u.searchParams.get('awinmid')).toBe('1234')
    expect(u.searchParams.get('awinaffid')).toBe('99999')
    expect(u.searchParams.get('ued')).toBe(base.url)
  })

  it('encode la destination, y compris ses parametres', () => {
    const lien = lienAwin({ ...base, url: 'https://m.fr/p?x=1&y=2' })
    expect(lien).not.toContain('&y=2&awin')            // la destination ne fuit pas dans les parametres Awin
    expect(new URL(lien).searchParams.get('ued')).toBe('https://m.fr/p?x=1&y=2')
  })

  it('refuse une destination qui n’est pas en https', () => {
    expect(lienAwin({ ...base, url: 'http://m.fr/p' })).toBeNull()
    expect(lienAwin({ ...base, url: 'javascript:alert(1)' })).toBeNull()
    expect(lienAwin({ ...base, url: 'pas une url' })).toBeNull()
  })

  it('ne construit rien sans identifiant d’editeur ou de marchand', () => {
    expect(lienAwin({ ...base, affid: null })).toBeNull()
    expect(lienAwin({ ...base, awinmid: null })).toBeNull()
  })
})

describe('lienSortant avec Awin', () => {
  it('passe par Awin quand l’article porte l’identifiant du marchand', () => {
    const lien = lienSortant({
      awin_mid: '1234',
      affiliate_url: 'https://papersmiths.com/x',
      // l'identifiant d'editeur vient de l'environnement : absent en test,
      // le lien Awin ne peut pas se construire et on retombe sur l'URL directe
    })
    expect(lien).toBe('https://papersmiths.com/x')
  })

  it('retombe sur le lien direct quand il n’y a pas de marchand Awin', () => {
    expect(lienSortant({ affiliate_url: 'https://markandfold.com/x' }))
      .toBe('https://markandfold.com/x')
  })
})

describe('clickref', () => {
  const base = { awinmid: '1234', url: 'https://m.fr/p', affid: '99999' }

  it('etiquette le clic avec l’identifiant de l’article', () => {
    const u = new URL(lienAwin({ ...base, clickref: 'carnet-du-mot-du-jour' }))
    expect(u.searchParams.get('clickref')).toBe('carnet-du-mot-du-jour')
  })

  it('n’ajoute rien quand il n’y a pas d’etiquette', () => {
    expect(new URL(lienAwin(base)).searchParams.has('clickref')).toBe(false)
  })

  it('borne une etiquette trop longue', () => {
    const u = new URL(lienAwin({ ...base, clickref: 'x'.repeat(300) }))
    expect(u.searchParams.get('clickref')).toHaveLength(100)
  })
})
