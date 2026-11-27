import { expect, test, type Page } from '@playwright/test';

const ids = ['abgabe', 'dateinamen', 'regeln'];
async function selectCriteria(page: Page) {
  await page.goto('/');
  await page.locator('#acc-allgemeine').click();
  for (const id of ids)
    await page.locator(`label[for="cb-allgemeine-${id}"]`).click();
}

const rows = (page: Page) => page.locator('#a4-page [data-preview-item]');
const handles = (page: Page) => page.locator('#a4-page .preview-order-handle');
async function expectOrder(page: Page, order: string[]) {
  await expect
    .poll(() =>
      rows(page).evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute('data-preview-item'))
      )
    )
    .toEqual(order);
}

test('Kriterien direkt auf dem Blatt ziehen, per Tastatur bewegen und rückgängig machen', async ({
  page,
}) => {
  await selectCriteria(page);
  const handle = handles(page).first();
  await handle.dragTo(rows(page).last());
  await expectOrder(page, ['dateinamen', 'regeln', 'abgabe']);
  const moved = page.locator('[data-order-item="abgabe"]');
  await expect(moved).toBeFocused();
  await moved.press('ArrowUp');
  await expectOrder(page, ['dateinamen', 'abgabe', 'regeln']);
  await expect(moved).toBeFocused();
  await page.locator('#history-undo').click();
  await expectOrder(page, ['dateinamen', 'regeln', 'abgabe']);
  await page.locator('#history-redo').click();
  await expectOrder(page, ['dateinamen', 'abgabe', 'regeln']);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('bbk:config') ?? '{}')
            .itemOrderByCategory?.allgemeine
      )
    )
    .toEqual(['dateinamen', 'abgabe', 'regeln']);
  await page.reload();
  await expectOrder(page, ['dateinamen', 'abgabe', 'regeln']);
  await page.emulateMedia({ media: 'print' });
  await expect(handles(page).first()).toBeHidden();
});

test.describe('Auf Touchgeräten', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('Kriterium in der Checkliste direkt am Blatt nach oben verschieben', async ({
    page,
  }) => {
    await selectCriteria(page);
    await page.locator('[data-mobile-view="preview"]').tap();
    await page.locator('[data-mode="checklist"]').tap();
    const item = page.locator('[data-order-item="regeln"]');
    await item.tap();
    const actions = page.locator('.preview-order-actions');
    await expect(
      actions.getByRole('button', { name: 'Kriterium nach unten verschieben' })
    ).toBeDisabled();
    await actions
      .getByRole('button', { name: 'Kriterium nach oben verschieben' })
      .tap();
    await expectOrder(page, ['abgabe', 'regeln', 'dateinamen']);
    await expect(item).toBeFocused();
    await expect(actions).toHaveCount(0);
  });
});
