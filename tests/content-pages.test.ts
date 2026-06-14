import { describe, expect, it } from 'vitest';

import { contentPages, routeFromPath } from '@/content-pages';
import { renderLayout } from '@/ui/templates';

describe('help content page', () => {
  it('registers and resolves the help route', () => {
    expect(contentPages.help).toEqual({ title: 'Hilfe', file: 'help.md', path: '/help' });
    expect(routeFromPath('/help')).toBe('help');
    expect(routeFromPath('/help/')).toBe('help');
  });

  it('renders the help link before project information in the footer', () => {
    const layout = renderLayout();
    const footerLinks = Array.from(layout.querySelectorAll<HTMLAnchorElement>('.app-footer-nav a'));

    expect(footerLinks.map((link) => link.textContent)).toEqual([
      'Hilfe',
      'Über das Projekt',
      'Impressum',
      'Datenschutz'
    ]);
    expect(footerLinks[0].href).toMatch(/\/help$/);
    expect(footerLinks[0].dataset.appRoute).toBe('help');

    const repoLink = layout.querySelector<HTMLAnchorElement>('.app-footer .github-link');
    expect(repoLink).not.toBeNull();
    expect(repoLink!.href).toMatch(/github\.com\/ChristianHaake\/Feedbackbogen-Generator$/);
    expect(repoLink!.target).toBe('_blank');
    expect(repoLink!.rel).toContain('noopener');
  });
});
