import { describe, expect, it } from 'vitest'
import { canonicalValue, editDistance, searchClasses } from '../../src/devpanel/search'

const names = (query: string, limit?: number) => searchClasses(query, limit).items.map((c) => c.className)

describe('searchClasses', () => {
  it('classe exact > commence par > contient', () => {
    const result = names('p-4', 500)
    expect(result[0]).toBe('p-4')
    // `p-40` commence par la requête, `-mx-p-4`... la contiendrait seulement : rangé avant.
    expect(result.indexOf('p-40')).toBeGreaterThan(0)
    expect(result.indexOf('p-40')).toBeLessThan(result.indexOf('-p-4') === -1 ? result.length : result.indexOf('-p-4'))
  })

  it('compte tous les résultats au-delà de la limite', () => {
    const result = searchClasses('bg-', 60)
    expect(result.items).toHaveLength(60)
    expect(result.total).toBeGreaterThan(60)
    expect(result.fuzzy).toBe(false)
  })

  it('recherche par valeur CSS (px converti en rem, s en ms)', () => {
    expect(names('16px', 500)).toEqual(expect.arrayContaining(['p-4', 'text-base']))
    expect(names('0.15s', 500)).toContain('duration-150')
    expect(names('50%', 500)).toContain('w-1/2')
  })

  it('suggestions tolérantes aux fautes quand rien ne correspond', () => {
    const result = searchClasses('roudned-lg')
    expect(result.fuzzy).toBe(true)
    expect(result.items[0].className).toBe('rounded-lg')
    // Faute dans un nom en cours de frappe : comparé au début des noms.
    expect(searchClasses('opactiy').items.map((c) => c.className)).toEqual(expect.arrayContaining(['opacity-50']))
  })

  it('requête vide : aucun résultat', () => {
    expect(searchClasses('  ').total).toBe(0)
  })
})

describe('canonicalValue / editDistance', () => {
  it('normalise les unités', () => {
    expect(canonicalValue('16px')).toBe('1rem')
    expect(canonicalValue('1rem')).toBe('1rem')
    expect(canonicalValue('-8px')).toBe('-0.5rem')
    expect(canonicalValue('red')).toBeNull()
  })

  it('compte une transposition comme une seule faute', () => {
    expect(editDistance('itmes', 'items', 2)).toBe(1)
    expect(editDistance('abc', 'xyz', 1)).toBe(2)
  })
})
