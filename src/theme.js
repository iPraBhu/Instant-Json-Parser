export const THEME = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
});

export function applyTheme(element, mode = THEME.SYSTEM) {
  const resolved = resolveTheme(mode);
  element.dataset.theme = resolved;
  element.style.backgroundColor = '';
  return resolved;
}

export function resolveTheme(mode = THEME.SYSTEM) {
  if (mode === THEME.SYSTEM) {
    return prefersDarkScheme() ? THEME.DARK : THEME.LIGHT;
  }
  return mode === THEME.DARK ? THEME.DARK : THEME.LIGHT;
}

export function watchSystemTheme(callback) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    callback(media.matches ? THEME.DARK : THEME.LIGHT);
  };
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handler);
  } else {
    media.addListener(handler);
  }
  return () => {
    if (typeof media.removeEventListener === 'function') {
      media.removeEventListener('change', handler);
    } else {
      media.removeListener(handler);
    }
  };
}

export function invertTheme(theme) {
  return theme === THEME.DARK ? THEME.LIGHT : THEME.DARK;
}

function prefersDarkScheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
