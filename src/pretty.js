import { escapeHtml } from './util.js';

export function renderPretty(value, options = {}) {
  const indent = options.indent === 4 ? 4 : 2;
  const text = JSON.stringify(value, null, indent);
  const pre = document.createElement('pre');
  pre.className = 'pretty-json';
  pre.innerHTML = highlightJson(text);
  return {
    element: pre,
    text
  };
}

function highlightJson(json) {
  const tokenPattern = /("(?:\\.|[^"\\])*"\s*:?)|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|\btrue\b|\bfalse\b|\bnull\b/g;
  let lastIndex = 0;
  let result = '';
  let match;
  while ((match = tokenPattern.exec(json)) !== null) {
    const [full, stringToken, numberToken] = match;
    result += escapeHtml(json.slice(lastIndex, match.index));
    if (typeof stringToken === 'string') {
      const keyMatch = stringToken.match(/^("(?:\\.|[^"\\])*")([\s]*:)/);
      if (keyMatch) {
        result += `<span class="token-key">${escapeHtml(keyMatch[1])}</span>${escapeHtml(keyMatch[2])}`;
      } else {
        result += `<span class="token-string">${escapeHtml(stringToken)}</span>`;
      }
    } else if (typeof numberToken === 'string') {
      result += `<span class="token-number">${escapeHtml(numberToken)}</span>`;
    } else if (full === 'true' || full === 'false') {
      result += `<span class="token-boolean">${full}</span>`;
    } else if (full === 'null') {
      result += '<span class="token-null">null</span>';
    } else {
      result += escapeHtml(full);
    }
    lastIndex = tokenPattern.lastIndex;
  }
  result += escapeHtml(json.slice(lastIndex));
  return result;
}
