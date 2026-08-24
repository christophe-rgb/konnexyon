/**
 * Tests unitaires — compatibilité intellectuelle.
 *
 * Lancer : npx vitest run src/__tests__/compatibility.test.js
 */

import { describe, it, expect } from 'vitest'
import {
  TRAIT_SECTIONS,
  ALL_TRAITS,
  TOTAL_TRAITS,
  sanitizeTraits,
  answeredCount,
  computeCompatibility,
  compatibilityLabel,
  MIN_COMMON_ANSWERS,
} from '../lib/compatibility.js'

// jeu de réponses complet, toutes à la même valeur
const uniforme = v => Object.fromEntries(ALL_TRAITS.map(s => [s, v]))

describe('le questionnaire', () => {
  it('compte seize questions réparties en quatre thèmes', () => {
    expect(TRAIT_SECTIONS).toHaveLength(4)
    expect(TOTAL_TRAITS).toBe(16)
  })

  it('n’a aucune clé en double', () => {
    expect(new Set(ALL_TRAITS).size).toBe(ALL_TRAITS.length)
  })

  it('donne deux pôles et un intitulé à chaque question', () => {
    for (const section of TRAIT_SECTIONS) {
      for (const q of section.questions) {
        expect(q.label.length).toBeGreaterThan(0)
        expect(q.left.length).toBeGreaterThan(0)
        expect(q.right.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('sanitizeTraits', () => {
  it('écarte les clés inconnues', () => {
    expect(sanitizeTraits({ soiree: 3, gloubi: 4 })).toEqual({ soiree: 3 })
  })

  it('écarte les valeurs hors échelle', () => {
    expect(sanitizeTraits({ soiree: 0, rythme: 6, humour: 3 })).toEqual({ humour: 3 })
  })

  it('écarte les valeurs non entières', () => {
    expect(sanitizeTraits({ soiree: 2.5, rythme: 'trois' })).toEqual({})
  })

  it('survit à null et aux valeurs qui n’en sont pas', () => {
    expect(sanitizeTraits(null)).toEqual({})
    expect(sanitizeTraits('bonjour')).toEqual({})
    expect(answeredCount(undefined)).toBe(0)
  })
})

describe('computeCompatibility', () => {
  it('rend 100 pour deux jeux identiques', () => {
    const { score } = computeCompatibility(uniforme(3), uniforme(3))
    expect(score).toBe(100)
  })

  it('rend 0 pour deux jeux diamétralement opposés', () => {
    const { score } = computeCompatibility(uniforme(1), uniforme(5))
    expect(score).toBe(0)
  })

  it('rend 50 pour un écart de deux crans sur toute la ligne', () => {
    const { score } = computeCompatibility(uniforme(1), uniforme(3))
    expect(score).toBe(50)
  })

  it('refuse de se prononcer en dessous du seuil de réponses communes', () => {
    const peu = Object.fromEntries(ALL_TRAITS.slice(0, MIN_COMMON_ANSWERS - 1).map(s => [s, 3]))
    const { score, common } = computeCompatibility(peu, uniforme(3))
    expect(common).toBe(MIN_COMMON_ANSWERS - 1)
    expect(score).toBeNull()
  })

  it('se prononce dès le seuil atteint', () => {
    const juste = Object.fromEntries(ALL_TRAITS.slice(0, MIN_COMMON_ANSWERS).map(s => [s, 3]))
    expect(computeCompatibility(juste, uniforme(3)).score).toBe(100)
  })

  it('ne compte que les questions répondues des deux côtés', () => {
    const a = { ...uniforme(3), soiree: 1 }
    const b = uniforme(3)
    delete b.soiree                       // la divergence n'est pas comparable
    expect(computeCompatibility(a, b).score).toBe(100)
  })

  it('pondère les thèmes également, pas les questions', () => {
    // désaccord total sur un seul thème, accord parfait sur les trois autres
    const a = uniforme(3)
    const b = { ...uniforme(3) }
    for (const q of TRAIT_SECTIONS[0].questions) { a[q.slug] = 1; b[q.slug] = 5 }
    // un thème à 0, trois à 100 → 75
    expect(computeCompatibility(a, b).score).toBe(75)
  })

  it('détaille le score thème par thème', () => {
    const { byTheme } = computeCompatibility(uniforme(2), uniforme(4))
    expect(Object.keys(byTheme).sort()).toEqual(
      TRAIT_SECTIONS.map(s => s.slug).sort()
    )
    expect(byTheme.qui_je_suis).toBe(50)
  })

  it('reste symétrique', () => {
    const a = { ...uniforme(2), lecture: 5, humour: 1 }
    const b = { ...uniforme(4), cinema: 1 }
    expect(computeCompatibility(a, b).score).toBe(computeCompatibility(b, a).score)
  })

  it('ne se prononce pas sur deux profils vides', () => {
    expect(computeCompatibility({}, {}).score).toBeNull()
  })
})

describe('compatibilityLabel', () => {
  it('dit « à compléter » sans score', () => {
    expect(compatibilityLabel(null)).toMatch(/compléter/i)
  })

  it('donne un libellé différent selon le palier', () => {
    const paliers = [95, 75, 60, 45, 10].map(compatibilityLabel)
    expect(new Set(paliers).size).toBe(paliers.length)
  })
})
