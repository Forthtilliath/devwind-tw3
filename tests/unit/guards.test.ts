import { describe, expect, it } from 'vitest'
import { isBalancedSelectorFragment } from '../../src/core/css-guard'
import { isPickerMessage, isSyncFromContent, isSyncFromPanel } from '../../src/core/message-guards'

describe('isBalancedSelectorFragment', () => {
  it('accepte un fragment bien formé', () => {
    expect(isBalancedSelectorFragment('> img')).toBe(true)
    expect(isBalancedSelectorFragment('[data-x="a)b"]')).toBe(true)
    expect(isBalancedSelectorFragment('a:not(.b)')).toBe(true)
    expect(isBalancedSelectorFragment('a\\)')).toBe(true)
  })

  it('refuse ce qui sortirait du :has() ou casserait la règle', () => {
    expect(isBalancedSelectorFragment('a),body *,x:has(b')).toBe(false)
    expect(isBalancedSelectorFragment('a{}')).toBe(false)
    expect(isBalancedSelectorFragment('a;b')).toBe(false)
    expect(isBalancedSelectorFragment('[x="a]')).toBe(false)
    expect(isBalancedSelectorFragment('(]')).toBe(false)
  })
})

describe('isSyncFromPanel', () => {
  it('accepte les messages valides', () => {
    const rule = { rules: ['.md\\:pt-4 { padding-top: 1rem !important; }'], dark: false }
    expect(isSyncFromPanel({ type: 'APPLY_CHANGE', edit: { remove: ['pt-2'], add: 'md:pt-4', liveRule: rule } })).toBe(true)
    expect(isSyncFromPanel({ type: 'APPLY_CHANGE', edit: { remove: ['pt-2'], add: null, liveRule: null } })).toBe(true)
    expect(isSyncFromPanel({ type: 'SELECT_ANCESTOR', index: 0 })).toBe(true)
    expect(isSyncFromPanel({ type: 'NAVIGATE', direction: 'parent' })).toBe(true)
    expect(isSyncFromPanel({ type: 'RUN_CSS_SCAN' })).toBe(true)
  })

  it('refuse les messages mal formés', () => {
    expect(isSyncFromPanel(null)).toBe(false)
    expect(isSyncFromPanel({ type: 'INCONNU' })).toBe(false)
    expect(isSyncFromPanel({ type: 'REMOVE_CLASS', rawClass: 'a b' })).toBe(false)
    expect(isSyncFromPanel({ type: 'SELECT_ANCESTOR', index: -1 })).toBe(false)
    expect(isSyncFromPanel({ type: 'SELECT_ANCESTOR', index: 1.5 })).toBe(false)
    expect(isSyncFromPanel({ type: 'NAVIGATE', direction: 'up' })).toBe(false)
    expect(isSyncFromPanel({ type: 'APPLY_CHANGE', edit: { remove: ['a b'], add: 'pt-4', liveRule: null } })).toBe(false)
    expect(isSyncFromPanel({ type: 'APPLY_CHANGE', edit: { remove: [], add: 'pt-4', liveRule: { rules: ['a', 'b'], dark: false } } })).toBe(false)
    // Pas de navigateur de variables de thème en v3 (pas de `@theme` runtime).
    expect(isSyncFromPanel({ type: 'RUN_THEME_SCAN', prefix: null })).toBe(false)
    expect(isSyncFromPanel({ type: 'REVERT_CHANGE', id: 1, undo: true, liveRules: [['a b', null]] })).toBe(false)
  })

  it('aperçu, annulation et export', () => {
    expect(isSyncFromPanel({ type: 'PREVIEW_CHANGE', edit: { remove: [], add: 'pt-4', liveRule: null } })).toBe(true)
    expect(isSyncFromPanel({ type: 'CANCEL_PREVIEW' })).toBe(true)
    expect(isSyncFromPanel({ type: 'REVERT_CHANGE', id: 1, undo: false, liveRules: [['p-4', { rules: ['.p-4{}'], dark: false }]] })).toBe(true)
    expect(isSyncFromPanel({ type: 'REQUEST_FINAL_CLASSES' })).toBe(true)
  })
})

describe('isPickerMessage', () => {
  it('ping et activation uniquement', () => {
    expect(isPickerMessage({ type: 'DEVWIND_PING' })).toBe(true)
    expect(isPickerMessage({ type: 'DEVWIND_SET_ACTIVE', active: true })).toBe(true)
    expect(isPickerMessage({ type: 'DEVWIND_SET_ACTIVE', active: 'oui' })).toBe(false)
    expect(isPickerMessage({ type: 'DEVWIND_GET_STATE' })).toBe(false)
  })
})

describe('isSyncFromContent', () => {
  const colors = { color: 'rgb(0, 0, 0)', backgroundColor: 'transparent', backdrop: ['rgb(255, 255, 255)'], approximate: false, fontSize: 16, bold: false }

  it('accepte une sélection valide', () => {
    expect(isSyncFromContent({ type: 'ELEMENT_SELECTED', tagName: 'div', classes: ['p-4'], ancestors: [{ tagName: 'body', id: null, classes: [] }], colors })).toBe(true)
  })

  it('historique incrémental et candidats de préfixe', () => {
    const entry = { id: 1, timestamp: 0, elementLabel: 'div', selector: 'body > div', added: ['p-4'], removed: [] }
    expect(isSyncFromContent({ type: 'CHANGE_LOG_ENTRY', entry })).toBe(true)
    expect(isSyncFromContent({ type: 'CHANGE_LOG_RESET', entries: [entry] })).toBe(true)
    expect(isSyncFromContent({ type: 'CHANGE_LOG_ENTRY_UPDATED', entry: { ...entry, undoneSeq: 2 } })).toBe(true)
    expect(isSyncFromContent({ type: 'CHANGE_LOG_ENTRY_UPDATED', entry: { ...entry, undoneSeq: 'oui' } })).toBe(false)
    expect(isSyncFromContent({ type: 'REVERT_REJECTED', id: 1, reason: 'modified' })).toBe(true)
    expect(isSyncFromContent({ type: 'REVERT_REJECTED', id: 1, reason: 'autre' })).toBe(false)
    expect(isSyncFromContent({ type: 'FINAL_CLASSES', elements: [{ selector: 'p#a', classes: ['z'] }] })).toBe(true)
    expect(isSyncFromContent({ type: 'CUSTOM_SCAN_RESULT', found: [], unscannable: [], breakpoints: [['sm', '', 'min', '40rem', 2]] })).toBe(true)
    expect(isSyncFromContent({ type: 'CUSTOM_SCAN_RESULT', found: [], unscannable: [], breakpoints: [['sm', '', 'up', '40rem', 2]] })).toBe(false)
    expect(isSyncFromContent({ type: 'PREFIX_CANDIDATES', candidates: [['tw', 'p-4', 3]] })).toBe(true)
    expect(isSyncFromContent({ type: 'PREFIX_CANDIDATES', candidates: [['tw', 'p-4', 0]] })).toBe(false)
  })

  it('refuse des couleurs incomplètes ou une taille non finie', () => {
    expect(isSyncFromContent({ type: 'CLASSES_UPDATED', classes: [], colors: { ...colors, backdrop: undefined } })).toBe(false)
    expect(isSyncFromContent({ type: 'CLASSES_UPDATED', classes: [], colors: { ...colors, fontSize: Number.NaN } })).toBe(false)
  })
})
