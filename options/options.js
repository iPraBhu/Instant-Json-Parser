import {
  APP_NAME,
  AUTHOR,
  VERSION,
  DEFAULT_SETTINGS,
  LIMITS,
  DUPLICATE_POLICIES,
  THEMES
} from '../src/constants.js';
import { getSettings, saveSettings } from '../src/storage.js';
import { formatBytes } from '../src/util.js';

const msg = (key, fallback = '') => chrome.i18n?.getMessage(key) || fallback;

const form = document.getElementById('optionsForm');
const statusMessage = document.getElementById('statusMessage');
const resetButton = document.getElementById('resetButton');

window.addEventListener('DOMContentLoaded', init);

async function init() {
  localize();
  populateMeta();
  const settings = await getSettings();
  hydrateForm(settings);
  form.addEventListener('submit', handleSubmit);
  resetButton.addEventListener('click', handleReset);
}

function localize(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const value = chrome.i18n?.getMessage(key);
    if (value) {
      el.textContent = value;
    }
  });
}

function populateMeta() {
  document.getElementById('metaAppName').textContent = APP_NAME;
  document.getElementById('metaVersion').textContent = VERSION;
  document.getElementById('metaAuthor').textContent = AUTHOR;
}

function hydrateForm(settings) {
  form.autoPaste.checked = settings.autoPaste;
  form.rememberLastInput.checked = settings.rememberLastInput;
  form.lenientMode.checked = settings.lenientMode;
  form.caseInsensitiveSearch.checked = settings.caseInsensitiveSearch;

  if (!DUPLICATE_POLICIES.includes(settings.duplicatePolicy)) {
    form.duplicatePolicy.value = DEFAULT_SETTINGS.duplicatePolicy;
  } else {
    form.duplicatePolicy.value = settings.duplicatePolicy;
  }

  if (!THEMES.includes(settings.theme)) {
    form.theme.value = DEFAULT_SETTINGS.theme;
  } else {
    form.theme.value = settings.theme;
  }

  if (Number(settings.indent) === 4) {
    form.indent.value = '4';
  } else {
    form.indent.value = '2';
  }

  form.maxInputBytes.value = Math.round(settings.maxInputBytes / (1024 * 1024));
  form.maxDepth.value = settings.maxDepth;
  statusMessage.textContent = msg('statusReady', 'Settings loaded.');
}

async function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(form);
  const indent = Number(formData.get('indent')) === 4 ? 4 : 2;
  const duplicatePolicy = formData.get('duplicatePolicy');
  const theme = formData.get('theme');
  const maxSizeMb = clamp(Number(formData.get('maxInputBytes')) || 0, 1, 100);
  const maxDepth = clamp(Number(formData.get('maxDepth')) || 0, 1, LIMITS.MAX_DEPTH);

  const nextSettings = {
    autoPaste: form.autoPaste.checked,
    rememberLastInput: form.rememberLastInput.checked,
    lenientMode: form.lenientMode.checked,
    caseInsensitiveSearch: form.caseInsensitiveSearch.checked,
    indent,
    duplicatePolicy: DUPLICATE_POLICIES.includes(duplicatePolicy)
      ? duplicatePolicy
      : DEFAULT_SETTINGS.duplicatePolicy,
    theme: THEMES.includes(theme) ? theme : DEFAULT_SETTINGS.theme,
    maxInputBytes: Math.min(maxSizeMb * 1024 * 1024, LIMITS.MAX_INPUT_BYTES),
    maxDepth
  };

  await saveSettings(nextSettings);
  statusMessage.textContent = `${msg('statusSaved', 'Settings saved.')} • ${formatBytes(nextSettings.maxInputBytes)} limit`;
}

async function handleReset() {
  await saveSettings({ ...DEFAULT_SETTINGS });
  hydrateForm(DEFAULT_SETTINGS);
  statusMessage.textContent = msg('statusReset', 'Settings reset to defaults.');
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
