import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';

const roots = new WeakMap<Element, Root>();

export function renderView(host: Element, view: ReactNode) {
  let root = roots.get(host);
  if (!root) {
    root = createRoot(host);
    roots.set(host, root);
  }
  const activeRoot = root;
  flushSync(() => activeRoot.render(view));
}

export function unmountView(host: Element) {
  const root = roots.get(host);
  if (root) {
    root.unmount();
    roots.delete(host);
  }
}
