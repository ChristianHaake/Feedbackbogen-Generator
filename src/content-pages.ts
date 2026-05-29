import { strings } from './strings';
import { el } from './ui/components';

export type ContentPageId = 'about' | 'imprint' | 'privacy';
export type AppRoute = 'generator' | ContentPageId;

export const contentPages: Record<ContentPageId, { title: string; file: string; path: string }> = {
  about: { title: 'Über das Projekt', file: 'about.md', path: '/about' },
  imprint: { title: 'Impressum', file: 'imprint.md', path: '/imprint' },
  privacy: { title: 'Datenschutz', file: 'privacy.md', path: '/privacy' }
};

export function routeFromPath(pathname: string): AppRoute {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === contentPages.about.path) return 'about';
  if (normalized === contentPages.imprint.path) return 'imprint';
  if (normalized === contentPages.privacy.path) return 'privacy';
  return 'generator';
}

export async function loadContentMarkdown(pageId: ContentPageId): Promise<string> {
  const response = await fetch(`/content/${contentPages[pageId].file}`);
  if (!response.ok) throw new Error(`Failed to load ${contentPages[pageId].file}`);
  return response.text();
}

export function renderContentPage(container: HTMLElement, pageId: ContentPageId, markdown: string) {
  container.innerHTML = '';
  const page = contentPages[pageId];
  const article = el('article', { class: 'content-page-card', 'aria-labelledby': 'content-page-title' });
  const backLink = el('a', { class: 'content-back-link', href: '/', 'data-app-route': 'generator', text: `← Zurück zum ${strings.appTitle}` });
  article.append(backLink);

  const nodes = markdownToNodes(markdown);
  const firstHeading = nodes.find((node) => node instanceof HTMLHeadingElement);
  if (firstHeading) firstHeading.id = 'content-page-title';
  else article.append(el('h1', { id: 'content-page-title', text: page.title }));
  nodes.forEach((node) => article.append(node));

  container.append(article);
}

function markdownToNodes(markdown: string): HTMLElement[] {
  const nodes: HTMLElement[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trimEnd();
    if (!line.trim()) {
      index++;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3;
      nodes.push(headingNode(level, heading[2].trim()));
      index++;
      continue;
    }

    if (/^-\s+/.test(line.trimStart())) {
      const list = el('ul');
      while (index < lines.length && /^-\s+/.test(lines[index].trimStart())) {
        list.append(el('li', {}, ...inlineNodes(lines[index].trimStart().replace(/^-\s+/, ''))));
        index++;
      }
      nodes.push(list);
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !/^(#{1,3})\s+/.test(lines[index].trimStart())
      && !/^-\s+/.test(lines[index].trimStart())
    ) {
      paragraphLines.push(lines[index].trimEnd().replace(/\s{2}$/, ''));
      index++;
    }
    nodes.push(paragraph(paragraphLines));
  }

  return nodes;
}

function headingNode(level: 1 | 2 | 3, text: string): HTMLElement {
  if (level === 1) return el('h1', {}, ...inlineNodes(text));
  if (level === 2) return el('h2', {}, ...inlineNodes(text));
  return el('h3', {}, ...inlineNodes(text));
}

function paragraph(lines: string[]): HTMLElement {
  const p = el('p');
  lines.forEach((line, index) => {
    if (index > 0) p.append(el('br'));
    p.append(...inlineNodes(line));
  });
  return p;
}

function inlineNodes(text: string): (Node | string)[] {
  const nodes: (Node | string)[] = [];
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const url = match[0];
    nodes.push(el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: url }));
    lastIndex = match.index + url.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}
