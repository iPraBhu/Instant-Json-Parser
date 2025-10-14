import { typeOf, jsonPointerEncode, isPlainObject } from './util.js';

export function renderTree(value, options = {}) {
  const state = {
    selectedNode: null,
    onPointerHover: options.onPointerHover || (() => {}),
    onPointerLeave: options.onPointerLeave || (() => {}),
    onPointerCopy: options.onPointerCopy || (() => {}),
    onSelect: options.onSelect || (() => {})
  };

  const rootNode = buildNode({ key: null, value, pointerSegments: [] });
  const rootList = document.createElement('ul');
  rootList.className = 'tree-root';

  const rootElement = createNodeElement(rootNode, state);
  rootList.appendChild(rootElement);

  selectNode(state, rootNode);
  if (rootNode.type === 'object' || rootNode.type === 'array') {
    setExpanded(rootNode, true, state);
  }

  return {
    element: rootList,
    api: {
      expandAll() {
        walkNodes(rootNode, state, (node) => {
          if (node.type === 'object' || node.type === 'array') {
            setExpanded(node, true, state);
          }
        });
      },
      collapseAll() {
        walkNodes(rootNode, state, (node) => {
          if (node !== rootNode && (node.type === 'object' || node.type === 'array')) {
            setExpanded(node, false, state);
          }
        });
      },
      getSelectedValue() {
        return state.selectedNode ? state.selectedNode.value : value;
      }
    }
  };
}

function buildNode({ key, value, pointerSegments }) {
  const nodeType = typeOf(value);
  const pointer = pointerSegments.length
    ? '/' + pointerSegments.map(jsonPointerEncode).join('/')
    : '/';

  const node = {
    key,
    value,
    type: nodeType,
    pointer,
    pointerSegments,
    expanded: nodeType === 'object' || nodeType === 'array',
    element: null,
    childrenContainer: null,
    toggleButton: null,
    headerEl: null,
    children: null
  };

  if (node.type === 'object' || node.type === 'array') {
    node.expanded = false;
  }

  return node;
}

function ensureChildren(node, state) {
  if (node.children) {
    return;
  }
  const children = [];
  if (node.type === 'object') {
    const entries = Object.entries(node.value || {});
    for (const [childKey, childValue] of entries) {
      children.push(
        buildNode({
          key: childKey,
          value: childValue,
          pointerSegments: [...node.pointerSegments, childKey]
        })
      );
    }
  } else if (node.type === 'array') {
    (node.value || []).forEach((item, index) => {
      children.push(
        buildNode({
          key: index,
          value: item,
          pointerSegments: [...node.pointerSegments, String(index)]
        })
      );
    });
  }
  node.children = children;
  if (node.childrenContainer) {
    node.childrenContainer.innerHTML = '';
    for (const child of children) {
      const childElement = createNodeElement(child, state);
      node.childrenContainer.appendChild(childElement);
    }
  }
}

function createNodeElement(node, state) {
  const li = document.createElement('li');
  li.className = 'tree-node';

  const header = document.createElement('div');
  header.className = 'tree-node-header';
  header.setAttribute('role', 'button');
  header.setAttribute('tabindex', '0');
  header.dataset.pointer = node.pointer;

  header.addEventListener('click', (event) => {
    event.stopPropagation();
    selectNode(state, node);
    state.onPointerCopy(node.pointer);
  });

  header.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectNode(state, node);
      state.onPointerCopy(node.pointer);
    } else if (event.key === 'ArrowRight') {
      if (node.toggleButton && !node.expanded) {
        setExpanded(node, true, state, { lazyLoad: true });
      }
    } else if (event.key === 'ArrowLeft') {
      if (node.toggleButton && node.expanded) {
        setExpanded(node, false, state);
      }
    }
  });

  header.addEventListener('mouseenter', () => {
    state.onPointerHover(node.pointer);
  });
  header.addEventListener('mouseleave', () => {
    state.onPointerLeave();
  });

  const toggleButton = createToggle(node, state);
  if (toggleButton) {
    li.appendChild(toggleButton);
    node.toggleButton = toggleButton;
  }

  const keySpan = document.createElement('span');
  keySpan.className = 'tree-node-key';
  keySpan.textContent = node.key === null ? '(root)' : String(node.key);
  header.appendChild(keySpan);

  const separator = document.createElement('span');
  separator.textContent = node.key === null ? ' ' : ': ';
  separator.className = 'tree-node-separator';
  header.appendChild(separator);

  const valueSpan = document.createElement('span');
  valueSpan.className = getValueClass(node.type);
  valueSpan.textContent = previewValue(node);
  header.appendChild(valueSpan);

  const badge = document.createElement('span');
  badge.className = 'type-badge';
  badge.textContent = buildBadgeLabel(node);
  header.appendChild(badge);

  li.appendChild(header);

  node.headerEl = header;
  node.element = li;

  if (node.type === 'object' || node.type === 'array') {
    const childrenContainer = document.createElement('ul');
    childrenContainer.className = 'tree-node-children';
    childrenContainer.setAttribute('data-state', 'collapsed');
    childrenContainer.hidden = true;
    node.childrenContainer = childrenContainer;
    li.appendChild(childrenContainer);
  }

  return li;
}

function createToggle(node, state) {
  if (node.type !== 'object' && node.type !== 'array') {
    return null;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tree-node-toggle';
  button.setAttribute('aria-expanded', String(node.expanded));
  button.textContent = node.expanded ? '−' : '+';
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const shouldExpand = !node.expanded;
    setExpanded(node, shouldExpand, state, { lazyLoad: true });
  });
  button.addEventListener('mouseenter', () => state.onPointerHover(node.pointer));
  button.addEventListener('mouseleave', () => state.onPointerLeave());
  return button;
}

function setExpanded(node, expand, state, options = {}) {
  if (node.type !== 'object' && node.type !== 'array') {
    return;
  }
  if (expand) {
    ensureChildren(node, state);
    if (node.childrenContainer) {
      node.childrenContainer.hidden = false;
      node.childrenContainer.setAttribute('data-state', 'expanded');
    }
    if (options.recursive && node.children) {
      node.children.forEach((child) => setExpanded(child, true, state, options));
    }
  } else if (node.childrenContainer) {
    node.childrenContainer.hidden = true;
    node.childrenContainer.setAttribute('data-state', 'collapsed');
  }
  node.expanded = expand;
  if (node.toggleButton) {
    node.toggleButton.textContent = expand ? '−' : '+';
    node.toggleButton.setAttribute('aria-expanded', String(expand));
  }
}

function selectNode(state, node) {
  if (state.selectedNode && state.selectedNode.headerEl) {
    state.selectedNode.headerEl.dataset.selected = 'false';
  }
  state.selectedNode = node;
  if (node.headerEl) {
    node.headerEl.dataset.selected = 'true';
  }
  state.onSelect({ pointer: node.pointer, value: node.value });
}

function walkNodes(node, state, callback) {
  callback(node);
  if (node.type === 'object' || node.type === 'array') {
    ensureChildren(node, state);
    if (node.children) {
      node.children.forEach((child) => walkNodes(child, state, callback));
    }
  }
}

function getValueClass(type) {
  switch (type) {
    case 'string':
      return 'tree-node-value-string';
    case 'number':
      return 'tree-node-value-number';
    case 'boolean':
      return 'tree-node-value-boolean';
    case 'null':
      return 'tree-node-value-null';
    case 'object':
    case 'array':
      return 'tree-node-value-collection';
    default:
      return 'tree-node-value-unknown';
  }
}

function previewValue(node) {
  if (node.type === 'object') {
    const size = isPlainObject(node.value) ? Object.keys(node.value).length : 0;
    return size ? `{…${size}}` : '{}';
  }
  if (node.type === 'array') {
    return `[${node.value.length}]`;
  }
  if (node.type === 'string') {
    const truncated = node.value.length > 60 ? `${node.value.slice(0, 57)}…` : node.value;
    return `"${truncated}"`;
  }
  if (node.type === 'number') {
    return String(node.value);
  }
  if (node.type === 'boolean') {
    return node.value ? 'true' : 'false';
  }
  if (node.type === 'null') {
    return 'null';
  }
  return String(node.value);
}

function buildBadgeLabel(node) {
  if (node.type === 'object') {
    const size = isPlainObject(node.value) ? Object.keys(node.value).length : 0;
    return `Object · ${size}`;
  }
  if (node.type === 'array') {
    return `Array · ${node.value.length}`;
  }
  if (node.type === 'string') {
    return `String · ${node.value.length}`;
  }
  if (node.type === 'number') {
    return 'Number';
  }
  if (node.type === 'boolean') {
    return 'Boolean';
  }
  if (node.type === 'null') {
    return 'Null';
  }
  return node.type;
}
