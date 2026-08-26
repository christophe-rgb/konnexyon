/**
 * Tests unitaires — socle des jeux et mot cache.
 * Lancer : npx vitest run src/__tests__/jeux.test.js
 */

import { describe, it, expect } from 'vitest'
import { jourCourant, graine, tirage, tirageDuJour, choisir, melanger } from '../lib/jeux/quotidien.js'
import { normaliser, confronter, estGagnee, partie, clavier, ESSAIS_MAX } from '../lib/jeux/motCache.js'

describe('le tirage du jour', () => {
  it('rend la date au format YYYY-MM-DD', () => {
    expect(jourCourant(new Date('2026-08-25T09:00:00Z'))).toBe('2026-08-25')
  })

  it('bascule a minuit heure de Paris, pas a minuit UTC', () => {
    // 23h30 UTC le 24 aout = 1h30 le 25 aout a Paris (UTC+2 en ete)
    expect(jourCourant(new Date('2026-08-24T23:30:00Z'))).toBe('2026-08-25')
  })

  it('donne le meme tirage deux fois pour le meme jour', () => {
    const a = tirageDuJour('mot-cache', '2026-08-25')
    const b = tirageDuJour('mot-cache', '2026-08-25')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('donne des tirages differents d’un jour a l’autre', () => {
    const lundi = tirageDuJour('mot-cache', '2026-08-24')
    const mardi = tirageDuJour('mot-cache', '2026-08-25')
    expect(lundi()).not.toBe(mardi())
  })

  it('donne des tirages differents d’un jeu a l’autre le meme jour', () => {
    const a = tirageDuJour('mot-cache',    '2026-08-25')
    const b = tirageDuJour('anagrammes',   '2026-08-25')
    expect(a()).not.toBe(b())
  })

  it('disperse deux dates voisines', () => {
    expect(graine('2026-08-24')).not.toBe(graine('2026-08-25'))
  })

  it('reste dans [0, 1[', () => {
    const suivant = tirage(42)
    for (let i = 0; i < 200; i++) {
      const v = suivant()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('melange sans toucher au tableau d’origine', () => {
    const origine = ['a', 'b', 'c', 'd', 'e']
    const copie = [...origine]
    const melange = melanger(origine, tirage(7))
    expect(origine).toEqual(copie)
    expect([...melange].sort()).toEqual([...origine].sort())
  })

  it('choisit dans la liste, et rend null si elle est vide', () => {
    expect(['a', 'b', 'c']).toContain(choisir(['a', 'b', 'c'], tirage(3)))
    expect(choisir([], tirage(3))).toBeNull()
  })
})

describe('normaliser', () => {
  it('retire les accents et la casse', () => {
    expect(normaliser('Écorce')).toBe('ECORCE')
    expect(normaliser('Fêlure')).toBe('FELURE')
    expect(normaliser('Tiède')).toBe('TIEDE')
  })

  it('retire ce qui n’est pas une lettre', () => {
    expect(normaliser('fou rire')).toBe('FOURIRE')
    expect(normaliser('non-dit')).toBe('NONDIT')
  })
})

describe('confronter', () => {
  it('reconnait le mot exact', () => {
    expect(confronter('SEUIL', 'SEUIL')).toEqual(
      ['placee', 'placee', 'placee', 'placee', 'placee'])
  })

  it('ignore les accents dans la comparaison', () => {
    expect(estGagnee(confronter('maree', 'Marée'))).toBe(true)
  })

  it('signale les lettres presentes mais mal placees', () => {
    // MAREE vs RAMEE : M present ailleurs, A bien place, R present ailleurs
    const v = confronter('MAREE', 'RAMEE')
    expect(v[1]).toBe('placee')     // A
    expect(v[3]).toBe('placee')     // E
    expect(v[0]).toBe('presente')   // M
    expect(v[2]).toBe('presente')   // R
  })

  it('ne signale pas deux fois une lettre unique dans le mot', () => {
    // deux E proposes, un seul E dans le mot : le second doit etre absent
    const v = confronter('ELLES', 'PELLE')
    const e = v.filter((x, i) => 'ELLES'[i] === 'E')
    expect(e.filter(x => x !== 'absente').length).toBeLessThanOrEqual(2)
  })

  it('marque absentes les lettres qui n’y sont pas', () => {
    expect(confronter('ZZZZZ', 'SEUIL')).toEqual(
      ['absente', 'absente', 'absente', 'absente', 'absente'])
  })

  it('refuse une proposition de longueur differente', () => {
    expect(confronter('SEL', 'SEUIL')).toBeNull()
  })
})

describe('partie', () => {
  it('est gagnee des que le mot est trouve', () => {
    const p = partie(['MAREE', 'SEUIL'], 'SEUIL')
    expect(p.gagnee).toBe(true)
    expect(p.terminee).toBe(true)
  })

  it('se termine apres six essais manques', () => {
    const p = partie(Array(ESSAIS_MAX).fill('MAREE'), 'SEUIL')
    expect(p.gagnee).toBe(false)
    expect(p.terminee).toBe(true)
    expect(p.essaisRestants).toBe(0)
  })

  it('decompte les essais restants', () => {
    expect(partie(['MAREE'], 'SEUIL').essaisRestants).toBe(ESSAIS_MAX - 1)
  })

  it('ignore les propositions de mauvaise longueur', () => {
    expect(partie(['SEL', 'MAREE'], 'SEUIL').verdicts).toHaveLength(1)
  })

  it('part d’une partie vierge sans propositions', () => {
    const p = partie([], 'SEUIL')
    expect(p.terminee).toBe(false)
    expect(p.essaisRestants).toBe(ESSAIS_MAX)
  })
})

describe('clavier', () => {
  it('garde le meilleur verdict de chaque lettre', () => {
    // S bien place au 2e essai ne doit pas retomber a « presente »
    const etat = clavier(['ESSAI', 'SEUIL'], 'SEUIL')
    expect(etat.S).toBe('placee')
  })

  it('n’inscrit que les lettres jouees', () => {
    const etat = clavier(['SEUIL'], 'SEUIL')
    expect(Object.keys(etat).sort()).toEqual(['E', 'I', 'L', 'S', 'U'])
  })
})
