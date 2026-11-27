import { test, expect } from '@playwright/test';

import { expectCreatorFooter } from '../creator/creator-footer-contract';
import { expectCreatorDialogCancellation } from '../creator/creator-dialog-contract';
import { creatorCopy } from '../../src/creator/creator-copy';

for (const [lang, width] of [['de', 320], ['en', 360], ['fr', 390], ['es', 768], ['nl', 1440]] as const) {
  test(`Notenpunkte, Inhaltsseiten und PDF bei ${width}px (${lang})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/');
    await page.locator('#language-switch').selectOption(lang);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expectCreatorFooter(page, creatorCopy[lang].moreApps);
    const editTab = page.locator('.mobile-tab[data-mobile-view="edit"]');
    const editLabel = (await editTab.textContent())!.trim();
    const startLabel = (await page.locator('#start-criteria').textContent())!.trim();
    if (width <= 900) await page.locator('.mobile-tab[data-mobile-view="preview"]').click();
    const emptyPreview = page.locator('.a4-empty');
    await expect(emptyPreview).toBeVisible();
    await expect(emptyPreview).toContainText(editLabel);
    await expect(emptyPreview).toContainText(startLabel);
    if (width <= 900) await editTab.click();
    await page.locator('#start-criteria').click();
    await expect(page.locator('#criteria-search')).toBeFocused();
    await page.locator('#acc-allgemeine').click();
    await page.locator('#acc-allgemeine-panel .category-scale-select').selectOption('notenpunkte_15');
    await page.locator('label[for="cb-allgemeine-abgabe"]').click();
    await page.locator('label[for="cb-allgemeine-dateinamen"]').click();
    for (const path of ['/help', '/examples', '/about', '/support', '/agb', '/privacy', '/imprint']) {
      await page.locator(`footer a[href="${path}"]`).click();
      await expect(page.locator('#content-page h1')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await page.goBack();
    }
    if (width <= 900) await page.locator('.mobile-tab[data-mobile-view="preview"]').click();
    const matrix = page.locator('.a4-grade-points');
    const columns = matrix.locator('thead .a4-scale-option-head');
    await expect(columns).toHaveText(Array.from({ length: 16 }, (_, i) => String(i)));
    const rows = matrix.locator('tbody tr');
    await expect(rows).toHaveCount(2);
    for (const row of await rows.all()) {
      await expect(row.locator('.a4-scale-cell')).toHaveText(Array(16).fill('☐'));
      const lastHeading = await columns.last().boundingBox();
      const lastCell = await row.locator('.a4-scale-cell').last().boundingBox();
      expect(Math.abs(lastHeading!.x - lastCell!.x)).toBeLessThan(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (width <= 900) await page.locator('.mobile-tab[data-mobile-view="export"]').click();
    else await page.locator('#export-menu-trigger').click();
    const download = page.waitForEvent('download');
    await page.locator('[data-export-format="pdf-print"]:visible').click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  });
}

test('Browserdruck enthält auf Desktop und im mobilen Editor mehrere Seiten', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Playwright PDF generation requires Chromium');
  const { PDFDocument } = await import('pdf-lib');
  const customItems = Array.from({ length: 80 }, (_, index) => ({
    id: `custom_print_${index}`, categoryId: 'allgemeine', custom: true,
    label: `Kriterium ${index + 1}: Eine nachvollziehbare und vollständige Begründung wird anhand eines konkreten Beispiels erläutert.`,
  }));
  const project = { format: 'feedbackbogen-generator', schemaVersion: 5, language: 'de',
    selectedItems: customItems.map(({ id, categoryId }) => ({ itemId: id, categoryId })),
    customItems, defaultScaleId: 'notenpunkte_15' };
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await page.locator('#config-load-start').click();
  await (await chooser).setFiles({ name: 'Druck.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await expect(page.locator('.a4-item')).toHaveCount(80);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.a4-page')).toBeVisible();
    await expect(page.locator('.mobile-tabs')).toBeHidden();
    const pdf = await PDFDocument.load(await page.pdf({ preferCSSPageSize: true }));
    expect(pdf.getPageCount()).toBeGreaterThan(2);
  }
});

test('Suchtreffer sind ohne Aufklappen per Tastatur auswählbar', async ({ page }) => {
  await page.goto('/');
  const search = page.locator('#criteria-search');
  await search.fill('Körpersprache');
  const hit = page.locator('#cb-praesentation-koerpersprache');
  await expect(hit).toBeVisible();
  await hit.focus();
  await page.keyboard.press('Space');
  await expect(hit).toBeChecked();
  await expect(page.locator('.a4-item')).toContainText('Körpersprache');
  await search.fill('');
  await expect(page.locator('#acc-praesentation')).toHaveAttribute('aria-expanded', 'false');
});


test('Zurücksetzen lässt sich per Tastatur abbrechen und gibt den Fokus zurück', async ({page}) => {
  await page.goto('/');
  await page.locator('#language-switch').selectOption('de');
  await page.locator('#acc-allgemeine').click();
  await page.locator('label[for="cb-allgemeine-abgabe"]').click();
  const trigger = page.locator('#config-reset');
  await expectCreatorDialogCancellation(page, trigger, 'Konfiguration zurücksetzen?', 'Abbrechen');
});

test('Mischbogen hält die Skalentexte auf schmalen Bildschirmen in ihrer Spalte', async ({ page }) => {
  const scaleByCategory = { allgemeine: 'verbal_5', sachebene: 'punkte_10', sprachgebrauch: 'notenpunkte_15' };
  await page.setViewportSize({ width: 320, height: 850 });
  await page.addInitScript(scales => {
    const customItems = Object.keys(scales).map(categoryId => ({
      id: 'custom_' + categoryId, categoryId, custom: true, label: 'Ein ausführlich formuliertes Kriterium',
    }));
    localStorage.setItem('bbk:config', JSON.stringify({
      format: 'feedbackbogen-generator', schemaVersion: 5, language: 'de',
      selectedItems: customItems.map(({ id, categoryId }) => ({ itemId: id, categoryId })),
      customItems, scaleByCategory: scales, defaultScaleId: 'verbal_5',
    }));
  }, scaleByCategory);
  await page.goto('/');
  await page.locator('[data-mobile-view="preview"]').click();
  const tables = page.locator('.a4-scale-table');
  await expect(tables).toHaveCount(3);
  for (const table of await tables.all()) {
    const maxOffset = await table.evaluate(element => {
      const headings = Array.from(element.querySelectorAll('.a4-scale-option-head'));
      const cells = element.querySelector('tbody tr')!.querySelectorAll('.a4-scale-cell');
      return Math.max(...headings.map((heading, i) => {
        const box = heading.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(heading);
        return Math.max(Math.abs(box.x - cells[i].getBoundingClientRect().x),
          ...Array.from(range.getClientRects(), text => Math.max(box.left - text.left, text.right - box.right)));
      }));
    });
    expect(maxOffset).toBeLessThanOrEqual(1);
  }
});
