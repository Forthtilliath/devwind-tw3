// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { shortElementLabel, uniqueSelector } from '../../src/core/unique-selector'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('uniqueSelector', () => {
  it('id unique : sélecteur direct', () => {
    document.body.innerHTML = '<main><button id="go" class="p-4">Go</button></main>'
    const el = document.getElementById('go')!
    expect(uniqueSelector(el)).toBe('button#go')
    expect(shortElementLabel(el)).toBe('button#go')
  })

  it('sans id : chemin positionnel le plus court qui ne désigne que lui', () => {
    document.body.innerHTML = '<ul id="a"><li>1</li><li>2</li></ul><ul><li>3</li><li>4</li></ul>'
    const second = document.querySelectorAll('li')[1]
    const fourth = document.querySelectorAll('li')[3]
    expect(uniqueSelector(second)).toBe('ul#a > li:nth-of-type(2)')
    expect(document.querySelectorAll(uniqueSelector(fourth))).toHaveLength(1)
    expect(document.querySelector(uniqueSelector(fourth))).toBe(fourth)
    expect(shortElementLabel(fourth)).toBe('li:nth-of-type(2)')
  })

  it('id dupliqué : ignoré, jamais basé sur les classes', () => {
    document.body.innerHTML = '<div id="x" class="a"></div><div id="x" class="a"></div>'
    const second = document.querySelectorAll('div')[1]
    const selector = uniqueSelector(second)
    expect(selector).not.toContain('.a')
    expect(document.querySelector(selector)).toBe(second)
  })
})
