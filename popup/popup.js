import { DEFAULT_SETTINGS } from '../src/constants.js';
import { parseJson } from '../src/parser.js';
import { renderPretty } from '../src/pretty.js';
import { renderTree } from '../src/tree.js';
import { createSearcher } from '../src/search.js';
import { readTextSafe, writeTextSafe } from '../src/clipboard.js';
import { getSettings, getState, saveState } from '../src/storage.js';
import {
  applyTheme,
  resolveTheme,
  watchSystemTheme,
  invertTheme,
  THEME
} from '../src/theme.js';
import { debounce, formatBytes, isJsonLike } from '../src/util.js';

const msg = (key, fallback = '') => chrome.i18n?.getMessage(key) || fallback;

const STRINGS = {
  statusReady: msg('statusReady', 'Ready.'),
  statusParsed: msg('statusParsed', 'Parsed successfully.'),
  statusCopied: msg('statusCopied', 'Copied to clipboard.'),
  statusCopyFailed: msg('statusCopyFailed', 'Unable to copy.'),
  statusClipboardUnavailable: msg('statusClipboardUnavailable', 'Clipboard unavailable.'),
  statusParseFailed: msg('statusParseFailed', 'Parsing failed.'),
  statusPointerCopied: msg('statusPointerCopied', 'JSON Pointer copied.'),
  statusDuplicateBadge: msg('statusDuplicateBadge', 'Duplicate keys detected'),
  statusLenientBadge: msg('statusLenientBadge', 'Lenient mode applied'),
  statusSizeLimit: msg('statusSizeLimit', 'Input exceeds configured size limit.'),
  statusDepthLimit: msg('statusDepthLimit', 'Input exceeds configured depth limit.'),
  pointerLabel: msg('pointerLabel', 'Pointer')
};

const themeLabels = {
  [THEME.LIGHT]: msg('themeToggleLight', 'Light theme'),
  [THEME.DARK]: msg('themeToggleDark', 'Dark theme')
};

const LOGO_SOURCES = {
  [THEME.LIGHT]: '../logo/svg/logo-light.svg',
  [THEME.DARK]: '../logo/svg/logo-dark.svg'
};

const elements = {};
let settings = { ...DEFAULT_SETTINGS };
let persistedState = {};
let parseResult = null;
let prettyRender = null;
let treeRender = null;
let prettySearcher = null;
let treeSearcher = null;
let treeApi = null;
let currentView = 'pretty';
let caseInsensitive = true;
let systemThemeCleanup = null;
let lastParsedInput = '';

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', () => {
  if (typeof systemThemeCleanup === 'function') {
    systemThemeCleanup();
  }
});

async function init() {
  localize();
  cacheElements();
  bindEvents();

  const manifest = chrome.runtime.getManifest();
  if (elements.version) {
    elements.version.textContent = `v${manifest.version}`;
  }

  const [storedSettings, storedState] = await Promise.all([
    getSettings(),
    getState()
  ]);

  settings = storedSettings;
  persistedState = storedState || {};
  caseInsensitive =
    typeof persistedState.searchCaseInsensitive === 'boolean'
      ? persistedState.searchCaseInsensitive
      : settings.caseInsensitiveSearch;

  setCaseInsensitive(caseInsensitive, { persist: false });
  applyThemeFromState();
  updateClipboardNotice();

  if (settings.rememberLastInput && persistedState.lastInput) {
    elements.textarea.value = persistedState.lastInput;
  }

  setActiveView(persistedState.lastTab || 'pretty', { skipSave: true });

  setStatusLine(STRINGS.statusReady);
  setActionAvailability(false);

  if (elements.textarea.value.trim()) {
    parseAndRender();
  } else if (settings.autoPaste) {
    if (shouldShowClipboardNotice()) {
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }
    await attemptAutoPaste();
  }

  updateSearchStatus();
}

function localize(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const value = chrome.i18n?.getMessage(key);
    if (value) {
      el.textContent = value;
    }
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const value = chrome.i18n?.getMessage(key);
    if (value) {
      el.setAttribute('placeholder', value);
    }
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.dataset.i18nAriaLabel;
    const value = chrome.i18n?.getMessage(key);
    if (value) {
      el.setAttribute('aria-label', value);
    }
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle;
    const value = chrome.i18n?.getMessage(key);
    if (value) {
      el.setAttribute('title', value);
    }
  });
}

function cacheElements() {
  elements.textarea = document.getElementById('jsonInput');
  elements.logo = document.getElementById('appLogo');
  elements.parseButton = document.getElementById('parseButton');
  elements.pasteButton = document.getElementById('pasteClipboard');
  elements.copyButton = document.getElementById('copyOutput');
  elements.searchInput = document.getElementById('searchInput');
  elements.searchCaseToggle = document.getElementById('searchCaseToggle');
  elements.searchPrev = document.getElementById('searchPrev');
  elements.searchNext = document.getElementById('searchNext');
  elements.searchStatus = document.getElementById('searchStatus');
  elements.themeToggle = document.getElementById('themeToggle');
  elements.themeToggleText = document.getElementById('themeToggleText');
  elements.tabPretty = document.getElementById('tabPretty');
  elements.tabTree = document.getElementById('tabTree');
  elements.prettyContainer = document.getElementById('prettyContainer');
  elements.treeContainer = document.getElementById('treeContainer');
  elements.errorPanel = document.getElementById('errorPanel');
  elements.errorMessage = document.getElementById('errorMessage');
  elements.errorSnippet = document.getElementById('errorSnippet');
  elements.errorPosition = document.getElementById('errorPosition');
  elements.statusBadges = document.getElementById('statusBadges');
  elements.statusLine = document.getElementById('statusLine');
  elements.pointerLine = document.getElementById('pointerLine');
  elements.expandAll = document.getElementById('expandAll');
  elements.collapseAll = document.getElementById('collapseAll');
  elements.version = document.getElementById('appVersion');
  elements.clipboardNotice = document.getElementById('clipboardNotice');
  elements.dismissClipboardNotice = document.getElementById('dismissClipboardNotice');
}

function bindEvents() {
  elements.parseButton.addEventListener('click', parseAndRender);
  elements.pasteButton.addEventListener('click', handlePasteFromClipboard);
  elements.copyButton.addEventListener('click', copyCurrentOutput);

  elements.tabPretty.addEventListener('click', () => setActiveView('pretty'));
  elements.tabTree.addEventListener('click', () => setActiveView('tree'));

  elements.expandAll.addEventListener('click', () => treeApi?.expandAll());
  elements.collapseAll.addEventListener('click', () => treeApi?.collapseAll());

  elements.themeToggle.addEventListener('click', toggleTheme);

  elements.textarea.addEventListener(
    'input',
    debounce(() => {
      persistInput();
    }, 300)
  );
  elements.textarea.addEventListener('blur', handleTextareaBlur);

  elements.searchInput.addEventListener(
    'input',
    debounce(() => runSearch(), 150)
  );

  elements.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        searchPrev();
      } else {
        searchNext();
      }
    }
  });

  elements.searchPrev.addEventListener('click', searchPrev);
  elements.searchNext.addEventListener('click', searchNext);
  elements.searchCaseToggle.addEventListener('click', () => {
    setCaseInsensitive(!caseInsensitive);
    runSearch();
  });

  elements.dismissClipboardNotice?.addEventListener('click', dismissClipboardNotice);

  document.addEventListener('keydown', (event) => {
    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key === 'Enter') {
      event.preventDefault();
      parseAndRender();
    } else if (mod && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      elements.searchInput.focus();
      elements.searchInput.select();
    } else if (mod && event.key.toLowerCase() === 'c') {
      if (isOutputFocused()) {
        event.preventDefault();
        copyCurrentOutput();
      }
    }
  });
}

function isOutputFocused() {
  const active = document.activeElement;
  return (
    active === elements.copyButton ||
    elements.prettyContainer.contains(active) ||
    elements.treeContainer.contains(active)
  );
}

async function attemptAutoPaste() {
  const result = await readTextSafe();
  if (!result.ok || !result.text) {
    return;
  }
  const clipboardText = result.text;
  if (!clipboardText.trim() || !isJsonLike(clipboardText)) {
    return;
  }
  const existing = elements.textarea.value;
  if (existing === clipboardText) {
    parseAndRender();
    return;
  }
  elements.textarea.value = clipboardText;
  persistInput();
  parseAndRender();
}

async function handlePasteFromClipboard() {
  const result = await readTextSafe();
  if (!result.ok) {
    setStatusLine(STRINGS.statusClipboardUnavailable);
    return;
  }
  if (result.text != null) {
    elements.textarea.value = result.text;
    persistInput();
    parseAndRender();
  }
}

function parseAndRender() {
  const input = elements.textarea.value || '';
  if (!input.trim()) {
    clearOutput();
    setStatusLine(STRINGS.statusReady);
    hideErrorPanel();
    lastParsedInput = input;
    return;
  }

  const parseOptions = {
    lenient: settings.lenientMode,
    duplicatePolicy: settings.duplicatePolicy,
    maxDepth: settings.maxDepth,
    maxInputBytes: settings.maxInputBytes
  };

  let result;
  try {
    result = parseJson(input, parseOptions);
  } catch (error) {
    lastParsedInput = input;
    handleParseError(error);
    return;
  }

  parseResult = result;
  hideErrorPanel();
  renderOutput(result.value);
  renderWarnings(result.warnings);
  const stats = `${STRINGS.statusParsed} • ${formatBytes(result.meta.bytes)} • Depth ${result.meta.depth}`;
  setStatusLine(stats);
  setActionAvailability(true);
  runSearch();
  lastParsedInput = input;

  if (settings.rememberLastInput) {
    persistedState.lastInput = input;
    saveState({ lastInput: input }).catch(() => {});
  }
}

function handleTextareaBlur() {
  if (!settings.autoParseOnBlur) {
    return;
  }
  const input = elements.textarea.value;
  if (input === lastParsedInput) {
    return;
  }
  parseAndRender();
}

function shouldShowClipboardNotice() {
  if (!settings.autoPaste) {
    return false;
  }
  return !persistedState.clipboardNoticeDismissed;
}

function updateClipboardNotice() {
  if (!elements.clipboardNotice) {
    return;
  }
  elements.clipboardNotice.hidden = !shouldShowClipboardNotice();
}

function dismissClipboardNotice() {
  persistedState.clipboardNoticeDismissed = true;
  if (elements.clipboardNotice) {
    elements.clipboardNotice.hidden = true;
  }
  saveState({ clipboardNoticeDismissed: true }).catch(() => {});
}

function renderOutput(value) {
  prettyRender = renderPretty(value, { indent: settings.indent });
  elements.prettyContainer.replaceChildren(prettyRender.element);
  prettySearcher = createSearcher(elements.prettyContainer);

  treeRender = renderTree(value, {
    onPointerHover: handlePointerHover,
    onPointerLeave: clearPointerLine,
    onPointerCopy: handlePointerCopy,
    onSelect: handleTreeSelect
  });
  treeApi = treeRender.api;
  elements.treeContainer.replaceChildren(treeRender.element);
  treeSearcher = createSearcher(elements.treeContainer);

  setActiveView(currentView, { skipSave: true });
  setActionAvailability(true);
}

function renderWarnings(warnings = {}) {
  elements.statusBadges.replaceChildren();
  if (!warnings) {
    return;
  }
  if (warnings.lenientApplied) {
    elements.statusBadges.appendChild(createBadge('info', STRINGS.statusLenientBadge));
  }
  if (Array.isArray(warnings.duplicates) && warnings.duplicates.length) {
    const label = `${STRINGS.statusDuplicateBadge} (${settings.duplicatePolicy}, ${warnings.duplicates.length})`;
    elements.statusBadges.appendChild(createBadge('warning', label));
  }
}

function createBadge(kind, text) {
  const badge = document.createElement('span');
  badge.className = `status-badge status-badge--${kind}`;
  badge.textContent = text;
  return badge;
}

function clearOutput() {
  elements.prettyContainer.replaceChildren();
  elements.treeContainer.replaceChildren();
  parseResult = null;
  prettyRender = null;
  treeRender = null;
  treeSearcher?.clear();
  prettySearcher?.clear();
  treeSearcher = null;
  prettySearcher = null;
  treeApi = null;
  elements.statusBadges.replaceChildren();
  setActionAvailability(false);
  clearPointerLine();
}

function handleParseError(error) {
  clearOutput();
  showErrorPanel(error);
  setStatusLine(error?.message || STRINGS.statusParseFailed);
  updateSearchStatus();
}

function showErrorPanel(error) {
  elements.errorPanel.hidden = false;
  elements.errorMessage.textContent = error.message || STRINGS.statusParseFailed;
  if (typeof error.line === 'number' && typeof error.column === 'number') {
    elements.errorPosition.textContent = `Line ${error.line}, Column ${error.column}`;
  } else {
    elements.errorPosition.textContent = '';
  }
  elements.errorSnippet.textContent = error.snippet || '';
}

function hideErrorPanel() {
  elements.errorPanel.hidden = true;
  elements.errorMessage.textContent = '';
  elements.errorSnippet.textContent = '';
  elements.errorPosition.textContent = '';
}

function copyCurrentOutput() {
  if (!parseResult) {
    setStatusLine(STRINGS.statusCopyFailed);
    return;
  }
  let text = '';
  if (currentView === 'tree' && treeApi) {
    const value = treeApi.getSelectedValue();
    if (value === undefined) {
      setStatusLine(STRINGS.statusCopyFailed);
      return;
    }
    text = JSON.stringify(value, null, settings.indent);
  } else if (prettyRender) {
    text = prettyRender.text;
  }

  writeTextSafe(text).then((result) => {
    setStatusLine(result.ok ? STRINGS.statusCopied : STRINGS.statusCopyFailed);
  });
}

function handlePointerCopy(pointer) {
  const target = pointer || '/';
  writeTextSafe(target).then((result) => {
    setStatusLine(result.ok ? STRINGS.statusPointerCopied : STRINGS.statusCopyFailed);
  });
}

function handlePointerHover(pointer) {
  const target = pointer || '/';
  elements.pointerLine.textContent = `${STRINGS.pointerLabel}: ${target}`;
}

function handleTreeSelect(detail) {
  if (detail?.pointer) {
    handlePointerHover(detail.pointer);
  }
}

function clearPointerLine() {
  elements.pointerLine.textContent = '';
}

function runSearch() {
  const query = elements.searchInput.value.trim();
  const activeSearcher = getActiveSearcher();
  const inactiveSearcher = currentView === 'pretty' ? treeSearcher : prettySearcher;
  inactiveSearcher?.clear();

  if (!activeSearcher) {
    updateSearchStatus();
    return;
  }
  const result = activeSearcher.search(query, caseInsensitive);
  updateSearchStatus(result.count, result.index);
}

function getActiveSearcher() {
  return currentView === 'tree' ? treeSearcher : prettySearcher;
}

function searchNext() {
  const searcher = getActiveSearcher();
  if (!searcher) {
    return;
  }
  const result = searcher.next();
  updateSearchStatus(result.count, result.index);
}

function searchPrev() {
  const searcher = getActiveSearcher();
  if (!searcher) {
    return;
  }
  const result = searcher.prev();
  updateSearchStatus(result.count, result.index);
}

function updateSearchStatus(count = 0, index = -1) {
  if (!elements.searchStatus) {
    return;
  }
  if (count > 0 && index >= 0) {
    elements.searchStatus.textContent = `${index + 1}/${count}`;
  } else {
    elements.searchStatus.textContent = '0/0';
  }
  elements.searchPrev.disabled = count === 0;
  elements.searchNext.disabled = count === 0;
}

function setStatusLine(text) {
  if (elements.statusLine) {
    elements.statusLine.textContent = text;
  }
}

function setActionAvailability(enabled) {
  elements.copyButton.disabled = !enabled;
  const treeEnabled = enabled && currentView === 'tree' && Boolean(treeApi);
  elements.expandAll.disabled = !treeEnabled;
  elements.collapseAll.disabled = !treeEnabled;
}

function setActiveView(view, { skipSave = false } = {}) {
  if (view !== 'pretty' && view !== 'tree') {
    return;
  }
  currentView = view;
  elements.tabPretty.classList.toggle('active', currentView === 'pretty');
  elements.tabTree.classList.toggle('active', currentView === 'tree');
  elements.tabPretty.setAttribute('aria-selected', String(currentView === 'pretty'));
  elements.tabTree.setAttribute('aria-selected', String(currentView === 'tree'));

  elements.prettyContainer.classList.toggle('hidden', currentView !== 'pretty');
  elements.treeContainer.classList.toggle('hidden', currentView !== 'tree');

  setActionAvailability(Boolean(parseResult));
  runSearch();

  if (!skipSave) {
    persistedState.lastTab = view;
    saveState({ lastTab: view }).catch(() => {});
  }
}

function setCaseInsensitive(value, { persist = true } = {}) {
  caseInsensitive = Boolean(value);
  elements.searchCaseToggle.setAttribute('aria-pressed', String(caseInsensitive));
  persistedState.searchCaseInsensitive = caseInsensitive;
  if (persist) {
    saveState({ searchCaseInsensitive: caseInsensitive }).catch(() => {});
  }
}

function persistInput() {
  if (settings.rememberLastInput) {
    const value = elements.textarea.value;
    persistedState.lastInput = value;
    saveState({ lastInput: value }).catch(() => {});
  } else if (persistedState.lastInput) {
    persistedState.lastInput = '';
    saveState({ lastInput: '' }).catch(() => {});
  }
}

function applyThemeFromState() {
  const override = persistedState.themeOverride || null;
  const mode = override || settings.theme || THEME.SYSTEM;
  const applied = applyTheme(document.body, mode);
  updateThemeToggle(applied);

  if (!override && mode === THEME.SYSTEM) {
    if (!systemThemeCleanup) {
      systemThemeCleanup = watchSystemTheme((systemTheme) => {
        const resolved = applyTheme(document.body, systemTheme);
        updateThemeToggle(resolved);
      });
    }
  } else if (systemThemeCleanup) {
    systemThemeCleanup();
    systemThemeCleanup = null;
  }
}

function updateThemeToggle(theme) {
  elements.themeToggle.setAttribute('aria-pressed', String(theme === THEME.DARK));
  elements.themeToggleText.textContent = theme === THEME.DARK ? '🌙' : '☀';
  const title = themeLabels[theme] || themeLabels[THEME.LIGHT];
  elements.themeToggle.title = title;
  updateLogo(theme);
}

function toggleTheme() {
  const current = resolveTheme(persistedState.themeOverride || settings.theme);
  const next = invertTheme(current);
  persistedState.themeOverride = next;
  saveState({ themeOverride: next }).catch(() => {});
  applyThemeFromState();
}

function updateLogo(theme) {
  if (!elements.logo) {
    return;
  }
  const src = LOGO_SOURCES[theme] || LOGO_SOURCES[THEME.LIGHT];
  if (elements.logo.getAttribute('src') !== src) {
    elements.logo.src = src;
  }
}
