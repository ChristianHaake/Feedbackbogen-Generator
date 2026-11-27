import { currentLanguage } from './strings';

export type ContentPageId = 'help' | 'examples' | 'terms' | 'support' | 'about' | 'imprint' | 'privacy';
export type AppRoute = 'generator' | ContentPageId;

export const contentPages: Record<ContentPageId, { title: string; file: string; path: string }> = {
  examples: { title: 'Beispiele', file: 'examples.md', path: '/examples' },
  terms: { title: 'Hinweise zur Nutzung', file: 'terms.md', path: '/agb' },
  help: { title: 'Hilfe', file: 'help.md', path: '/help' },
  support: { title: 'Unterstützen', file: 'support.md', path: '/support' },
  about: { title: 'Über das Projekt', file: 'about.md', path: '/about' },
  imprint: { title: 'Impressum', file: 'imprint.md', path: '/imprint' },
  privacy: { title: 'Datenschutz', file: 'privacy.md', path: '/privacy' }
};

export function routeFromPath(pathname: string): AppRoute {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  for (const page of Object.keys(contentPages) as ContentPageId[]) {
    if (normalized === contentPages[page].path) return page;
  }
  return 'generator';
}

export async function loadContentMarkdown(pageId: ContentPageId): Promise<string> {
  const localized = currentLanguage !== 'de' ? `${currentLanguage}/` : '';
  const response = await fetch(`/content/${localized}${contentPages[pageId].file}`);
  if (!response.ok) throw new Error(`Failed to load ${contentPages[pageId].file}`);
  return response.text();
}
