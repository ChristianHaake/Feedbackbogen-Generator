import { test, expect } from '@playwright/test';

for (const [lang, width] of [['de', 320], ['en', 360], ['fr', 390], ['es', 768], ['nl', 1440]] as const) {
  test(`Notenpunkte, Inhaltsseiten und PDF bei ${width}px (${lang})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/');
    await page.locator('#language-switch').selectOption(lang);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
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
