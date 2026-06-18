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

  it('exposes the workflow action bar that routing toggles per route', () => {
    // main.ts queries '.action-bar' and toggles its `hidden` on route change;
    // this guards that selector contract (a mismatch crashes at load, not in unit tests).
    const layout = renderLayout();
    const actionBar = layout.querySelector('.action-bar');
    expect(actionBar).not.toBeNull();
    expect(actionBar!.querySelector('#config-save')).not.toBeNull();
    expect(actionBar!.querySelector('#export-menu')).not.toBeNull();
  });

  it('links the header brand back to the generator route', () => {
    const brand = renderLayout().querySelector<HTMLAnchorElement>('.app-header .brand');
    expect(brand).not.toBeNull();
    expect(brand!.dataset.appRoute).toBe('generator');
  });
});

describe('collapsible editor sections', () => {
  it('renders a collapse toggle wired to its panel for each of the five editor blocks', () => {
    const layout = renderLayout();
    const sections = Array.from(layout.querySelectorAll<HTMLElement>('.editor-pane [data-section-id]'));

    expect(sections.map((s) => s.dataset.sectionId)).toEqual([
      'kopfdaten', 'selected', 'criteria', 'formats', 'footer'
    ]);

    for (const section of sections) {
      const id = section.dataset.sectionId!;
      const toggle = section.querySelector<HTMLButtonElement>('.section-toggle');
      const panel = section.querySelector<HTMLElement>('.editor-section-panel');
      expect(toggle, id).not.toBeNull();
      expect(panel, id).not.toBeNull();
      expect(toggle!.getAttribute('aria-expanded')).toBe('true');
      expect(toggle!.getAttribute('aria-controls')).toBe(`sec-${id}-panel`);
      expect(panel!.id).toBe(`sec-${id}-panel`);
      expect(panel!.getAttribute('aria-labelledby')).toBe(toggle!.id);
    }
  });

  it('leaves the mobile export block non-collapsible', () => {
    const exportPane = renderLayout().querySelector<HTMLElement>('.mobile-export-pane');
    expect(exportPane).not.toBeNull();
    expect(exportPane!.querySelector('.section-toggle')).toBeNull();
    expect(exportPane!.querySelector('[data-section-id]')).toBeNull();
  });
});
