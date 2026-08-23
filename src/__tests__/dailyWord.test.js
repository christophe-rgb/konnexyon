/**
 * Tests unitaires — fonctions pures du Mot du jour.
 * Aucun mock Supabase, aucun rendu React requis.
 *
 * Lancer : npx vitest run src/__tests__/dailyWord.test.js
 */

import { describe, it, expect } from 'vitest'
import {
  normalizeLine,
  validateLine,
  connectionsLeft,
  computeStreak,
  formatCarnetDate,
  MAX_LINE_LENGTH,
  DAILY_CONNECTION_QUOTA,
} from '../lib/dailyWord.js'

// ─── normalizeLine ────────────────────────────────────────────────────────────

describe('normalizeLine', () => {
  it('supprime les espaces de début et de fin', () => {
    expect(normalizeLine('  une ligne  ')).toBe('une ligne')
  })

  it('écrase les espaces multiples et les retours à la ligne', () => {
    expect(normalizeLine('une\n\nligne   brisée')).toBe('une ligne brisée')
  })

  it('renvoie une chaîne vide pour null ou undefined', () => {
    expect(normalizeLine(null)).toBe('')
    expect(normalizeLine(undefined)).toBe('')
  })
})

// ─── validateLine ─────────────────────────────────────────────────────────────

describe('validateLine', () => {
  it('refuse une ligne vide', () => {
    const result = validateLine('   ')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/écrivez/i)
  })

  it('accepte une ligne de 180 caractères pile', () => {
    const result = validateLine('a'.repeat(MAX_LINE_LENGTH))
    expect(result.ok).toBe(true)
    expect(result.line).toHaveLength(MAX_LINE_LENGTH)
  })

  it('refuse une ligne de 181 caractères', () => {
    const result = validateLine('a'.repeat(MAX_LINE_LENGTH + 1))
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/180/)
  })

  it('normalise avant de compter — 200 espaces ne dépassent pas le quota', () => {
    const result = validateLine('mot' + ' '.repeat(200) + 'mot')
    expect(result.ok).toBe(true)
    expect(result.line).toBe('mot mot')
  })
})

// ─── connectionsLeft ──────────────────────────────────────────────────────────

describe('connectionsLeft', () => {
  it('renvoie le quota complet quand rien n’a été envoyé', () => {
    expect(connectionsLeft(0)).toBe(DAILY_CONNECTION_QUOTA)
  })

  it('décompte les connexions déjà envoyées', () => {
    expect(connectionsLeft(1)).toBe(2)
    expect(connectionsLeft(3)).toBe(0)
  })

  it('ne descend jamais sous zéro', () => {
    expect(connectionsLeft(9)).toBe(0)
  })

  it('retombe sur le quota complet pour une valeur inexploitable', () => {
    expect(connectionsLeft(undefined)).toBe(DAILY_CONNECTION_QUOTA)
    expect(connectionsLeft(NaN)).toBe(DAILY_CONNECTION_QUOTA)
  })
})

// ─── computeStreak ────────────────────────────────────────────────────────────

describe('computeStreak', () => {
  const today = new Date(2026, 7, 23) // 23 août 2026, en heure locale

  it('renvoie 0 sans aucune ligne', () => {
    expect(computeStreak([], today)).toBe(0)
    expect(computeStreak(null, today)).toBe(0)
  })

  it('compte les jours consécutifs terminant aujourd’hui', () => {
    expect(computeStreak(['2026-08-23', '2026-08-22', '2026-08-21'], today)).toBe(3)
  })

  it('maintient la série si rien n’a encore été écrit aujourd’hui', () => {
    // la journée n'est pas finie : une série qui s'arrête hier reste vivante
    expect(computeStreak(['2026-08-22', '2026-08-21'], today)).toBe(2)
  })

  it('casse la série après deux jours sans écrire', () => {
    expect(computeStreak(['2026-08-21', '2026-08-20'], today)).toBe(0)
  })

  it('s’arrête au premier trou', () => {
    expect(computeStreak(['2026-08-23', '2026-08-22', '2026-08-20'], today)).toBe(2)
  })

  it('tolère les doublons et le désordre', () => {
    expect(computeStreak(['2026-08-22', '2026-08-23', '2026-08-22'], today)).toBe(2)
  })

  it('accepte un timestamp complet et n’en garde que le jour', () => {
    expect(computeStreak(['2026-08-23T21:14:00.000Z'], today)).toBe(1)
  })

  it('franchit un changement de mois', () => {
    const firstOfSeptember = new Date(2026, 8, 1)
    expect(computeStreak(['2026-09-01', '2026-08-31', '2026-08-30'], firstOfSeptember)).toBe(3)
  })
})

// ─── formatCarnetDate ─────────────────────────────────────────────────────────

describe('formatCarnetDate', () => {
  it('formate une date ISO en français', () => {
    expect(formatCarnetDate('2026-08-23')).toBe('23 août 2026')
  })

  it('ne recule pas d’un jour sur un timestamp UTC', () => {
    expect(formatCarnetDate('2026-08-23T00:30:00.000Z')).toBe('23 août 2026')
  })

  it('renvoie une chaîne vide pour une valeur invalide', () => {
    expect(formatCarnetDate(null)).toBe('')
    expect(formatCarnetDate('pas une date')).toBe('')
  })
})
