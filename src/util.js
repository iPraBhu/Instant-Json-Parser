export function debounce(fn, wait = 200) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, wait);
  };
}

export function isJsonLike(text) {
  if (!text) {
    return false;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  const first = trimmed[0];
  if (first === '{' || first === '[' || first === '"') {
    return true;
  }
  if (first === '-' || (first >= '0' && first <= '9')) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  return lower.startsWith('true') || lower.startsWith('false') || lower.startsWith('null');
}

export function typeOf(value) {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (value instanceof Date) {
    return 'string';
  }
  return typeof value;
}

export function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

export function formatBytes(bytes, decimals = 1) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(decimals)} ${units[exponent]}`;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

export function jsonPointerEncode(segment) {
  return String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
}

export function codeFrame(source, line, column, context = 2) {
  if (!source) {
    return '';
  }
  const lines = source.split(/\r?\n/);
  const targetLineIndex = Math.max(0, Math.min(line - 1, lines.length - 1));
  const start = Math.max(0, targetLineIndex - context);
  const end = Math.min(lines.length, targetLineIndex + context + 1);
  const numberWidth = String(end).length;
  const frame = [];
  for (let i = start; i < end; i += 1) {
    const number = String(i + 1).padStart(numberWidth, ' ');
    const indicator = i === targetLineIndex ? '>' : ' ';
    frame.push(`${indicator} ${number} | ${lines[i] ?? ''}`);
    if (i === targetLineIndex) {
      const caretLine =
        ' '.repeat(numberWidth + 4) + ' '.repeat(Math.max(column - 1, 0)) + '^';
      frame.push(caretLine);
    }
  }
  return frame.join('\n');
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
