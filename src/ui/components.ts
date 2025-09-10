export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, any> = {}, ...children: (Node | string | null | undefined)[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = String(v);
    else if (k.startsWith('on') && typeof v === 'function') (node as any)[k.toLowerCase()] = v;
    else if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c == null) continue;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function icon(id: string, ariaLabel?: string) {
  const svg = el('svg', { 'aria-hidden': ariaLabel ? 'false' : 'true', width: '18', height: '18', viewBox: '0 0 24 24' });
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `./icons.svg#${id}`);
  (svg as any).append(use);
  if (ariaLabel) svg.setAttribute('role', 'img');
  return svg;
}

