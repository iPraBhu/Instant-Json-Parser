export const APP_NAME = 'Instant JSON Parser';
export const AUTHOR = 'Pratik Bhuite';
export const VERSION = '1.0.0';
export const YEAR = '2025';
export const HOMEPAGE = 'https://example.com/instant-json-parser';

export const DUPLICATE_POLICIES = ['error', 'first', 'last'];
export const THEMES = ['system', 'light', 'dark'];

export const LIMITS = Object.freeze({
  MAX_INPUT_BYTES: 5 * 1024 * 1024,
  MAX_DEPTH: 512
});

export const DEFAULT_SETTINGS = Object.freeze({
  autoPaste: true,
  lenientMode: false,
  duplicatePolicy: 'error',
  indent: 2,
  theme: 'system',
  rememberLastInput: true,
  caseInsensitiveSearch: true,
  maxDepth: LIMITS.MAX_DEPTH,
  maxInputBytes: LIMITS.MAX_INPUT_BYTES
});

export const UI_STRINGS = Object.freeze({
  copyTooltip: 'Copy to clipboard',
  copyPointerTooltip: 'Copy JSON Pointer',
  expandAll: 'Expand all nodes',
  collapseAll: 'Collapse all nodes'
});

export const STORAGE_KEYS = Object.freeze({
  SETTINGS: 'settings',
  STATE: 'state',
  VERSION: 'storageVersion'
});

export const STORAGE_VERSION = 1;
