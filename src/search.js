import { prefersReducedMotion } from './util.js';

export function createSearcher(container) {
  let highlights = [];
  let currentIndex = -1;

  function clear() {
    for (const span of highlights) {
      if (span.isConnected) {
        span.replaceWith(document.createTextNode(span.textContent || ''));
      }
    }
    highlights = [];
    currentIndex = -1;
    container.normalize();
  }

  function highlightMatches(query, caseInsensitive) {
    clear();
    if (!query) {
      return { count: 0, index: -1 };
    }

    const needle = caseInsensitive ? query.toLowerCase() : query;
    const length = query.length;
    const nodes = collectTextNodes(container);

    for (const node of nodes) {
      let textNode = node;
      let haystack = caseInsensitive
        ? textNode.textContent.toLowerCase()
        : textNode.textContent;
      let index = haystack.indexOf(needle);

      while (index !== -1 && textNode) {
        if (index > 0) {
          textNode = textNode.splitText(index);
        }
        const matchNode = textNode;
        const remainder = matchNode.splitText(length);
        const highlight = document.createElement('span');
        highlight.className = 'highlight-match';
        highlight.textContent = matchNode.textContent;
        matchNode.parentNode.replaceChild(highlight, matchNode);
        highlights.push(highlight);

        textNode = remainder;
        haystack = textNode
          ? caseInsensitive
            ? textNode.textContent.toLowerCase()
            : textNode.textContent
          : '';
        index = haystack.indexOf(needle);
      }
    }

    if (highlights.length) {
      currentIndex = 0;
      focusHighlight(currentIndex);
    }

    return { count: highlights.length, index: currentIndex };
  }

  function collectTextNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_SKIP;
        }
        if (parent.classList.contains('tree-node-toggle')) {
          return NodeFilter.FILTER_SKIP;
        }
        if (parent.classList.contains('highlight-match')) {
          return NodeFilter.FILTER_SKIP;
        }
        if (!node.textContent || !node.textContent.trim()) {
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    return nodes;
  }

  function focusHighlight(index) {
    highlights.forEach((span, idx) => {
      span.classList.toggle('highlight-active', idx === index);
    });
    const target = highlights[index];
    if (target) {
      const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
      target.scrollIntoView({ block: 'center', behavior });
    }
  }

  function next() {
    if (!highlights.length) {
      return { count: 0, index: -1 };
    }
    currentIndex = (currentIndex + 1) % highlights.length;
    focusHighlight(currentIndex);
    return { count: highlights.length, index: currentIndex };
  }

  function prev() {
    if (!highlights.length) {
      return { count: 0, index: -1 };
    }
    currentIndex = (currentIndex - 1 + highlights.length) % highlights.length;
    focusHighlight(currentIndex);
    return { count: highlights.length, index: currentIndex };
  }

  return {
    search(query, caseInsensitive) {
      return highlightMatches(query, caseInsensitive);
    },
    next,
    prev,
    clear
  };
}
