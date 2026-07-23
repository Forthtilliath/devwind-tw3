export interface ShadowMount {
  host: HTMLDivElement
  shadowRoot: ShadowRoot
}

/**
 * Monte le host Shadow DOM sur `documentElement` (pas `body`, pour éviter les
 * `overflow`/`position` custom de certains sites), pour l'overlay de survol du picker
 * uniquement (le panneau d'édition vit maintenant dans une fenêtre séparée, voir
 * src/devpanel/). `pointer-events: none` : l'overlay est purement visuel, jamais interactif.
 */
export function mountShadowHost(hostId: string): ShadowMount {
  const host = document.createElement('div')
  host.id = hostId
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;'
  document.documentElement.appendChild(host)

  const shadowRoot = host.attachShadow({ mode: 'open' })

  // Le Shadow DOM bloque nativement les collisions de sélecteurs dans les deux sens,
  // mais pas l'héritage CSS (font-family, color, line-height traversent la frontière) :
  // reset explicite en plus de l'inline posé sur le host.
  const resetStyle = document.createElement('style')
  resetStyle.textContent = ':host { all: initial; }'
  shadowRoot.appendChild(resetStyle)

  return { host, shadowRoot }
}
