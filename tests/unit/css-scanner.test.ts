// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { watchForStylesheetChanges } from '../../src/core/css-scanner'

afterEach(() => {
  vi.useRealTimers()
  document.head.innerHTML = ''
})

/** Laisse passer le callback du MutationObserver (microtâche) puis le debounce. */
async function flush() {
  await Promise.resolve()
  vi.advanceTimersByTime(400)
}

describe('watchForStylesheetChanges', () => {
  it('ignore la feuille injectée par DevWind (ajout et contenu)', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const stop = watchForStylesheetChanges(onChange, document, 'devwind-live-styles')

    const own = document.createElement('style')
    own.id = 'devwind-live-styles'
    document.head.appendChild(own)
    own.appendChild(document.createTextNode('.a { color: red; }'))
    await flush()
    expect(onChange).not.toHaveBeenCalled()

    stop()
  })

  it('réagit à une feuille du site ajoutée, retirée ou dont le contenu change', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const stop = watchForStylesheetChanges(onChange, document, 'devwind-live-styles')

    const style = document.createElement('style')
    document.head.appendChild(style)
    await flush()
    expect(onChange).toHaveBeenCalledTimes(1)

    style.textContent = '.b { color: blue; }'
    await flush()
    expect(onChange).toHaveBeenCalledTimes(2)

    style.remove()
    await flush()
    expect(onChange).toHaveBeenCalledTimes(3)

    stop()
  })
})
