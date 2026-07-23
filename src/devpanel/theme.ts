export type ThemePreference = 'auto' | 'light' | 'dark'

const STORAGE_KEY = 'devwind-theme'

export async function loadTheme(): Promise<ThemePreference> {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  const value = stored[STORAGE_KEY]
  return value === 'light' || value === 'dark' ? value : 'auto'
}

/** `auto` retire l'attribut (laisse `@media (prefers-color-scheme)` décider), sinon force explicitement. */
export function applyTheme(pref: ThemePreference): void {
  if (pref === 'auto') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', pref)
}

export async function setTheme(pref: ThemePreference): Promise<void> {
  applyTheme(pref)
  await chrome.storage.local.set({ [STORAGE_KEY]: pref })
}

export const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  auto: 'light',
  light: 'dark',
  dark: 'auto',
}

export const THEME_ICON: Record<ThemePreference, string> = {
  auto: '🌓',
  light: '☀️',
  dark: '🌙',
}
