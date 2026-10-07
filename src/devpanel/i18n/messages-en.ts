import type { MessageKey } from './messages-fr'
import type { Message } from './types'

export const en: Record<MessageKey, Message> = {
  'panel.selectHint': 'Click an element on the page to edit its classes.',
  'panel.detachedHint': 'The selected element was removed from the page (re-render?) — click it again to continue.',
  'panel.count': { one: '<{tag}> · {count} class', other: '<{tag}> · {count} classes' },
  'panel.noClasses': 'No classes on this element.',
  'panel.invalidTab': 'This panel opens from the DevWind icon of a tab (missing tabId parameter).',

  'header.theme': 'Theme: {theme}',
  'header.themeTitle': 'Theme: {theme} (click to change)',
  'header.theme.auto': 'automatic',
  'header.theme.light': 'light',
  'header.theme.dark': 'dark',
  'header.language': 'Interface language: {language}',
  'header.languageTitle': 'Interface language (click to change)',
  'header.lock': 'Lock the selection',
  'header.lockTitle.locked': 'Unlock (resume selecting on hover/click)',
  'header.lockTitle.unlocked': 'Lock the selection (interact with the page without losing it)',
  'header.undo': 'Undo the last change (Ctrl+Z)',
  'header.redo': 'Redo the undone change (Ctrl+Shift+Z)',

  'copy.trigger': 'Copy ▾',
  'copy.copied': 'Copied!',
  'copy.label': 'Copy the classes',
  'copy.plain': 'Classes',
  'copy.jsx': 'JSX (className="…")',

  'disconnected.title': 'Page closed or reloaded',
  'disconnected.body': 'This panel lost contact with the page.',
  'disconnected.reconnect': 'Reconnect',
  'disconnected.reconnecting': 'Reconnecting…',
  'disconnected.failed':
    'Chrome revoked access to the page when it reloaded (activeTab permission): click the DevWind icon (or Ctrl+Shift+K) in the page tab to reconnect this panel.',
  'disconnected.showPage': 'Show the page',

  'error.title': 'The panel ran into an unexpected error.',
  'error.reload': 'Reload the panel',

  'breadcrumb.label': 'Ancestors of the selected element',
  'contrast.label': 'Text/background contrast:',
  'contrast.title': 'Ratio {ratio}:1 ({size}) — AA {aa} · AAA {aaa}',
  'contrast.largeText': 'large text',
  'contrast.normalText': 'normal text',
  'contrast.approximate': ' — approximate: background gradient/image, opacity, filter or blend mode not taken into account',

  'variants.breakpointTitle': 'From {width} up',
  'variants.more': 'More variants',
  'variants.reset': 'Reset',
  'variants.resetLabel': 'Reset the variants',
  'variants.removeCustom': 'Remove the {variant} variant',
  'variants.customPlaceholder': 'other… (aria-checked, data-[open])',
  'variants.customLabel': 'Add another variant',

  'recent.label': 'Recent:',

  'search.placeholder': 'Search a class or a value (bg-red, p-4, 16px)… (Ctrl/Cmd+F)',
  'search.label': 'Search a class',
  'search.more': { one: '+{count} more result — refine the search', other: '+{count} more results — refine the search' },
  'search.fuzzy': 'No exact match — close suggestions:',
  'search.none': 'No results for “{query}”.',

  'chip.remove': 'Remove {cls}',
  'chip.unsupported': 'No previewable effect',
  'chip.unsupportedTitle':
    "No previewable visual effect: this variant can't be synthesized (e.g. dark: with no detectable strategy). The class is applied, but will only show if the site's real CSS defines it.",

  'category.resize': 'Resize the category column',
  'category.resizeTitle': 'Drag or ←/→ to resize (double-click or Enter to reset)',

  'property.value': '{label}: {value}',
  'property.none': 'no value',
  'property.default': 'default',
  'property.arbitraryColor': '#hex or css…',
  'property.arbitrary': 'css value…',

  'picker.filter': 'Search…',
  'picker.filterLabel': 'Filter the values',
  'picker.empty': 'No results',
  'picker.arbitraryLabel': 'Arbitrary value',
  'picker.arbitrarySubmit': 'Apply the arbitrary value',

  'custom.summary': 'Custom / Other classes ({count})',
  'custom.unscannable': { one: '{count} unscannable stylesheet', other: '{count} unscannable stylesheets' },
  'custom.prefix': 'detected prefix: {prefix}',
  'custom.prefixTitle':
    "Detected heuristically: this site's classes seem to be prefixed (Tailwind's `prefix` option). In v3 the prefix is part of the class name (e.g. `tw-bg-red-500`), so these classes aren't recognized as standard Tailwind — they stay listed here as custom classes instead of appearing in the categories.",
  'custom.empty': 'No custom class detected on this page.',

  'history.trigger': { one: 'Session history ({count} change)', other: 'Session history ({count} changes)' },
  'history.title': 'Session history',
  'history.copy': 'Copy',
  'history.copyTitle': 'Copy the applied changes (selector: +added −removed)',
  'history.copyFinal': 'Final classes',
  'history.copyFinalTitle': 'Copy the final classes of every modified element',
  'history.copied': 'Copied!',
  'history.clear': 'Clear',
  'history.empty': 'No changes this session.',
  'history.undo': 'Undo',
  'history.redo': 'Redo',
  'history.undoLabel': 'Undo the change on {element}',
  'history.redoLabel': 'Redo the change on {element}',

  'notice.revertDetached': 'Not possible: the element is no longer in the page.',
  'notice.revertModified': 'Not possible: these classes were changed since — undo the more recent changes first.',
  'notice.nothingToUndo': 'Nothing to undo.',
  'notice.nothingToRedo': 'Nothing to redo.',
  'notice.finalEmpty': 'No modified element to export.',
  'notice.copyFailed': 'Copy refused by the browser.',
  'notice.dismiss': 'Dismiss',
}
