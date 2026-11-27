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
    for (const path of ['/help', '/examples', '/about', '/support', '/agb', '/privacy', '/imprint']) {
      await page.locator(`footer a[href="${path}"]`).click();
      await expect(page.locator('#content-page h1')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await page.goBack();
    }
    if (width <= 900) await page.locator('.mobile-tab[data-mobile-view="preview"]').click();
    const options = page.locator('.grade-points-options span');
    await expect(options).toHaveCount(16);
    await expect(options.last()).toContainText('15');
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
