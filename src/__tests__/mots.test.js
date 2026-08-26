/**
 * Tests unitaires — le vocabulaire des jeux.
 * Lancer : npx vitest run src/__tests__/mots.test.js
 */

import { describe, it, expect } from 'vitest'
import { MOTS, SOLUTIONS, estUnMot, motsDeLongueur, estFormable, solutionDuJour } from '../lib/jeux/mots.js'
import { normaliser } from '../lib/jeux/motCache.js'
import { tirage } from '../lib/jeux/quotidien.js'

describe('la liste', () => {
  it('n’est pas vide et tient en capitales sans accent', () => {
    expect(MOTS.size).toBeGreaterThan(500)
    for (const m of MOTS) expect(m).toMatch(/^[A-Z]+$/)
  })

  it('ne contient aucun mot d’une seule lettre', () => {
    for (const m of MOTS) expect(m.length).toBeGreaterThan(1)
  })

  it('offre assez de mots de cinq lettres pour tenir des annees', () => {
    expect(motsDeLongueur(5).length).toBeGreaterThan(200)
  })
})

describe('estUnMot', () => {
  it('reconnait un mot de la liste', () => {
    expect(estUnMot('seuil')).toBe(true)
    expect(estUnMot('SEUIL')).toBe(true)
  })

  it('ignore les accents', () => {
    expect(estUnMot('marée')).toBe(true)
    expect(estUnMot('écorce')).toBe(true)
  })

  it('refuse ce qui n’y est pas', () => {
    expect(estUnMot('zzzzz')).toBe(false)
    expect(estUnMot('')).toBe(false)
    expect(estUnMot(null)).toBe(false)
  })
})

describe('estFormable', () => {
  it('accepte un mot ecrit avec les lettres du tirage', () => {
    expect(estFormable('SEUIL', ['S', 'E', 'U', 'I', 'L', 'A', 'R'])).toBe(true)
  })

  it('refuse un mot qui reclame une lettre absente', () => {
    expect(estFormable('SEUIL', ['S', 'E', 'U', 'I', 'A', 'R'])).toBe(false)
  })

  it('ne laisse pas reutiliser deux fois la meme lettre', () => {
    // ELLE demande deux L, le tirage n'en donne qu'un
    expect(estFormable('ELLE', ['E', 'L', 'A', 'B'])).toBe(false)
    expect(estFormable('ELLE', ['E', 'L', 'L', 'E'])).toBe(true)
  })

  it('accepte une chaine de lettres autant qu’un tableau', () => {
    expect(estFormable('AIRE', 'AIREXYZ')).toBe(true)
  })

  it('ignore les accents du mot propose', () => {
    expect(estFormable('marée', 'MAREEZ')).toBe(true)
  })
})

describe('les solutions du mot cache', () => {
  it('appartiennent toutes a la liste', () => {
    for (const s of SOLUTIONS) expect(MOTS.has(normaliser(s))).toBe(true)
  })

  it('sont assez nombreuses pour ne pas se repeter trop vite', () => {
    expect(SOLUTIONS.length).toBeGreaterThanOrEqual(30)
  })

  it('n’ont aucun doublon', () => {
    const nues = SOLUTIONS.map(normaliser)
    expect(new Set(nues).size).toBe(nues.length)
  })

  it('gardent leurs accents pour l’affichage', () => {
    expect(SOLUTIONS.some(s => s !== normaliser(s))).toBe(true)
  })

  it('font entre quatre et huit lettres', () => {
    for (const s of SOLUTIONS) {
      expect(normaliser(s).length).toBeGreaterThanOrEqual(4)
      expect(normaliser(s).length).toBeLessThanOrEqual(8)
    }
  })
})

describe('solutionDuJour', () => {
  it('rend toujours une solution de la liste', () => {
    for (let i = 0; i < 50; i++) {
      expect(SOLUTIONS).toContain(solutionDuJour(tirage(i)))
    }
  })

  it('rend la meme solution pour le meme tirage', () => {
    expect(solutionDuJour(tirage(7))).toBe(solutionDuJour(tirage(7)))
  })
})
