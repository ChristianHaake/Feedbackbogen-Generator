const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.Node = dom.window.Node;
global.HTMLElement = dom.window.HTMLElement;

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = String(v);
    else if (k.startsWith('on') && typeof v === 'function') node[k.toLowerCase()] = v;
    else if (typeof v === 'boolean') { if (v) node.setAttribute(k, ''); }
    else if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c == null) continue;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

const colgroup = el('colgroup');
colgroup.append(el('col', { class: 'a4-scale-col-criterion', style: `width: 42%` }));
const options = [1, 2, 3, 4, 5];
const optionWidth = (100 - 42) / options.length;
options.forEach(() =>
  colgroup.append(el('col', { class: 'a4-scale-col-option', style: `width: ${optionWidth}%` }))
);
console.log(colgroup.outerHTML);
