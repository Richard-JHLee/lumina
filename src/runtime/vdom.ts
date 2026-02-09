// ============================================================
// Lumina Runtime - Virtual DOM Utilities
// ============================================================

/**
 * Simple Virtual DOM implementation for efficient updates
 */

export interface VNode {
  type: 'element' | 'text' | 'component';
  tag?: string;
  props?: Record<string, any>;
  children?: VNode[];
  text?: string;
  component?: Function;
  key?: string | number;
}

/**
 * Diff two VNode trees and apply minimal updates to real DOM
 */
export function patch(parent: HTMLElement, oldVNode: VNode | null, newVNode: VNode, index = 0): HTMLElement {
  // New node added
  if (!oldVNode) {
    const el = createElement(newVNode);
    parent.appendChild(el);
    return el;
  }

  // Node removed
  if (!newVNode) {
    parent.removeChild(parent.childNodes[index]);
    return parent;
  }

  // Node changed type
  if (hasChanged(oldVNode, newVNode)) {
    const el = createElement(newVNode);
    parent.replaceChild(el, parent.childNodes[index]);
    return el;
  }

  // Text node changed
  if (newVNode.type === 'text') {
    if (oldVNode.text !== newVNode.text) {
      parent.childNodes[index].textContent = newVNode.text || '';
    }
    return parent.childNodes[index] as HTMLElement;
  }

  // Element node - update props
  const el = parent.childNodes[index] as HTMLElement;
  if (newVNode.type === 'element') {
    updateProps(el, oldVNode.props || {}, newVNode.props || {});

    // Recursively patch children
    const oldChildren = oldVNode.children || [];
    const newChildren = newVNode.children || [];
    const maxLen = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLen; i++) {
      patch(el, oldChildren[i] || null, newChildren[i] || null, i);
    }
  }

  return el;
}

function hasChanged(oldVNode: VNode, newVNode: VNode): boolean {
  return (
    oldVNode.type !== newVNode.type ||
    oldVNode.tag !== newVNode.tag ||
    oldVNode.key !== newVNode.key
  );
}

function createElement(vnode: VNode): HTMLElement | Text {
  if (vnode.type === 'text') {
    return document.createTextNode(vnode.text || '');
  }

  if (vnode.type === 'component' && vnode.component) {
    return vnode.component(vnode.props || {});
  }

  const el = document.createElement(vnode.tag || 'div');

  // Apply props
  if (vnode.props) {
    updateProps(el, {}, vnode.props);
  }

  // Create children
  if (vnode.children) {
    for (const child of vnode.children) {
      el.appendChild(createElement(child));
    }
  }

  return el;
}

function updateProps(el: HTMLElement, oldProps: Record<string, any>, newProps: Record<string, any>) {
  // Remove old props
  for (const key in oldProps) {
    if (!(key in newProps)) {
      removeProp(el, key, oldProps[key]);
    }
  }

  // Set new props
  for (const key in newProps) {
    if (oldProps[key] !== newProps[key]) {
      setProp(el, key, newProps[key]);
    }
  }
}

function setProp(el: HTMLElement, key: string, value: any) {
  if (key === 'style' && typeof value === 'object') {
    Object.assign(el.style, value);
  } else if (key === 'className' || key === 'class') {
    el.className = value;
  } else if (key.startsWith('on')) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, value);
  } else if (typeof value === 'boolean') {
    if (value) {
      el.setAttribute(key, '');
    } else {
      el.removeAttribute(key);
    }
  } else {
    el.setAttribute(key, String(value));
  }
}

function removeProp(el: HTMLElement, key: string, value: any) {
  if (key === 'style') {
    el.removeAttribute('style');
  } else if (key === 'className' || key === 'class') {
    el.className = '';
  } else if (key.startsWith('on')) {
    const event = key.slice(2).toLowerCase();
    el.removeEventListener(event, value);
  } else {
    el.removeAttribute(key);
  }
}

/**
 * Create a VNode
 */
export function h(
  tag: string | Function,
  props?: Record<string, any> | null,
  ...children: (VNode | string | number)[]
): VNode {
  // Normalize children
  const normalizedChildren: VNode[] = children
    .flat()
    .filter(c => c !== null && c !== undefined && c !== false)
    .map(c => {
      if (typeof c === 'string' || typeof c === 'number') {
        return { type: 'text', text: String(c) };
      }
      return c;
    });

  if (typeof tag === 'function') {
    return {
      type: 'component',
      component: tag,
      props: props || {},
      children: normalizedChildren,
    };
  }

  return {
    type: 'element',
    tag,
    props: props || {},
    children: normalizedChildren,
  };
}
