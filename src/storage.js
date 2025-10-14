import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  STORAGE_VERSION
} from './constants.js';

function getStorage() {
  return chrome?.storage?.local;
}

function promisify(method, ...args) {
  const storage = getStorage();
  if (!storage || typeof storage[method] !== 'function') {
    return Promise.reject(new Error('chrome.storage.local unavailable'));
  }
  return new Promise((resolve, reject) => {
    storage[method](...args, (result) => {
      const error = chrome.runtime?.lastError;
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

export async function getSettings() {
  try {
    const data = await promisify('get', [STORAGE_KEYS.SETTINGS, STORAGE_KEYS.VERSION]);
    const stored = data?.[STORAGE_KEYS.SETTINGS] || {};
    return {
      ...DEFAULT_SETTINGS,
      ...stored
    };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  const payload = {
    [STORAGE_KEYS.SETTINGS]: {
      ...DEFAULT_SETTINGS,
      ...settings
    },
    [STORAGE_KEYS.VERSION]: STORAGE_VERSION
  };
  await promisify('set', payload);
}

export async function getState() {
  try {
    const data = await promisify('get', STORAGE_KEYS.STATE);
    return data?.[STORAGE_KEYS.STATE] || {};
  } catch (_) {
    return {};
  }
}

export async function saveState(nextState) {
  const current = await getState();
  const payload = {
    [STORAGE_KEYS.STATE]: {
      ...current,
      ...nextState
    }
  };
  await promisify('set', payload);
}
