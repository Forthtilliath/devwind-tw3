import { describe, expect, it } from 'vitest'
import { translate } from '../../src/devpanel/i18n'
import { fr } from '../../src/devpanel/i18n/messages-fr'
import { en } from '../../src/devpanel/i18n/messages-en'

describe('translate', () => {
  it('remplace les paramètres et choisit le pluriel selon la langue', () => {
    expect(translate('fr', 'panel.count', { tag: 'div', count: 1 })).toBe('<div> · 1 classe')
    expect(translate('fr', 'panel.count', { tag: 'div', count: 0 })).toBe('<div> · 0 classe')
    expect(translate('en', 'panel.count', { tag: 'div', count: 0 })).toBe('<div> · 0 classes')
    expect(translate('en', 'chip.remove', { cls: 'p-4' })).toBe('Remove p-4')
  })

  it('les deux langues ont les mêmes paramètres pour chaque clé', () => {
    const params = (m: unknown) => [...JSON.stringify(m).matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort()
    for (const key of Object.keys(fr) as (keyof typeof fr)[]) {
      expect(params(en[key]), key).toEqual(params(fr[key]))
    }
  })
})
