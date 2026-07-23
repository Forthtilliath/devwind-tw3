import { toggleDevPanel } from '../core/activation'

chrome.runtime.onInstalled.addListener(() => {
  console.log('[DevWind] extension installée')
})

// Clic sur l'icône : ouvre/ferme directement la fenêtre devpanel (plus de popup intermédiaire).
chrome.action.onClicked.addListener((tab) => {
  if (tab.id != null) void toggleDevPanel(tab.id)
})

// Raccourci clavier (Ctrl+Shift+K) : même bascule, geste utilisateur qualifiant pour activeTab
// au même titre qu'un clic sur l'icône.
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-picker' && tab?.id != null) void toggleDevPanel(tab.id)
})

// Hook réservé à la suite e2e (voir tests/e2e/) : Playwright ne peut pas simuler de façon
// fiable le geste utilisateur qu'`activeTab` exige (clic sur l'icône, raccourci clavier), donc
// les tests appellent `toggleDevPanel` directement via ce hook plutôt que de passer par
// `chrome.action`/`chrome.commands`. `import.meta.env.MODE` est remplacé statiquement par Vite
// au build : en mode 'production' (`npm run build`), ce bloc entier est éliminé du bundle, pas
// juste désactivé à l'exécution — rien n'est expédié aux utilisateurs.
if (import.meta.env.MODE === 'test') {
  // @ts-expect-error -- hook de test, jamais présent dans le bundle de production (cf. ci-dessus)
  self.__devwindTestToggle = (tabId: number) => toggleDevPanel(tabId)
}
