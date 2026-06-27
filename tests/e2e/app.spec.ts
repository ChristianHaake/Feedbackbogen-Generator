import fs from 'node:fs/promises';

import { test, expect } from '@playwright/test';

test.describe('Feedbackbogen-Generator E2E Click Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure a clean state and suppress onboarding hint.
    // Pin the language to German so assertions don't depend on the browser locale.
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem('bbk:onboarding-dismissed', '1');
      window.localStorage.setItem('bbk:lang', 'de');
    });

    await page.goto('/');
  });

  test('Document Title & Header Fields (Kopfdaten)', async ({ page }) => {
    // Change Document Title Mode to custom (segmented pill)
    const titleCustomOpt = page.locator('[data-title-mode="custom"]');
    await expect(titleCustomOpt).toBeVisible();
    await titleCustomOpt.click();

    // Enter a custom title
    const customTitleInput = page.locator('#document-title-custom');
    await expect(customTitleInput).toBeVisible();
    await customTitleInput.fill('Test Feedbackbogen-Titel');

    // Verify preview document title is updated
    const previewTitle = page.locator('.a4-title');
    await expect(previewTitle).toHaveText('Test Feedbackbogen-Titel');

    // Fill in a default header field (Name)
    const nameValueInput = page.locator('#kd-value-name');
    await expect(nameValueInput).toBeVisible();
    await nameValueInput.fill('Erika Mustermann');

    // Verify it is reflected in the preview
    const previewNameVal = page.locator(
      '.a4-hf-row:has-text("Name:") .a4-hf-value'
    );
    await expect(previewNameVal).toHaveText('Erika Mustermann');

    // Add a custom header field
    const addHeaderFieldBtn = page.locator('.add-header-field-btn');
    await addHeaderFieldBtn.click();

    // Verify there are now 5 header field rows
    const headerRows = page.locator('.header-field-row');
    await expect(headerRows).toHaveCount(5);

    // Edit the custom header field's label and value
    const lastRow = headerRows.nth(4);
    const lastLabelInput = lastRow.locator('input.kd-input').nth(0);
    const lastValueInput = lastRow.locator('input.kd-input').nth(1);
    await lastLabelInput.fill('Fachbereich');
    await lastValueInput.fill('Naturwissenschaften');

    // Verify custom header field is rendered in preview
    const previewCustomVal = page.locator(
      '.a4-hf-row:has-text("Fachbereich:") .a4-hf-value'
    );
    await expect(previewCustomVal).toHaveText('Naturwissenschaften');

    // Reorder header fields using keyboard shortcuts on drag handles
    const dragHandles = page.locator('.header-field-drag-handle');
    await expect(dragHandles).toHaveCount(5);

    // Focus on the last drag handle and press ArrowUp to move it up
    await dragHandles.nth(4).focus();
    await page.keyboard.press('ArrowUp');

    // Verify it moved up (row index 4 becomes index 3)
    const row3Label = headerRows.nth(3).locator('input.kd-input').nth(0);
    await expect(row3Label).toHaveValue('Fachbereich');

    // Remove the custom header field
    await lastRow.locator('.remove-header-field-btn').click();
    await expect(headerRows).toHaveCount(4);
  });

  test('Criteria Selection, Search & Custom Criteria Items', async ({
    page,
  }) => {
    const allgemeinAccordion = page.locator('#acc-allgemeine');
    await expect(allgemeinAccordion).toBeVisible();

    // Expand "Allgemein" category accordion
    await allgemeinAccordion.click();
    const panel = page.locator('#acc-allgemeine-panel');
    await expect(panel).toBeVisible();

    // Toggle "Rechtzeitige Abgabe" checkbox
    const abgabeCb = page.locator('#cb-allgemeine-abgabe');
    await expect(abgabeCb).not.toBeChecked();

    // Click label to check
    await page.locator('label[for="cb-allgemeine-abgabe"]').click();
    await expect(abgabeCb).toBeChecked();

    // Verify checked item appears in preview body
    const previewItems = page.locator('.a4-items li');
    await expect(previewItems).toHaveCount(1);
    await expect(previewItems).toContainText('Rechtzeitige Abgabe');

    // Search filter: type "Quellen"
    const searchInput = page.locator('#criteria-search');
    await searchInput.fill('Quellen');

    // Verify matching accordion matches and others are hidden
    const sachebeneAccordion = page.locator('#acc-sachebene');
    await expect(sachebeneAccordion).not.toBeVisible();
    await expect(allgemeinAccordion).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(sachebeneAccordion).toBeVisible();

    // Add a custom criteria item
    const customItemInput = panel.locator('.custom-item-input');
    const addCustomBtn = panel.locator('.add-custom-btn');
    await customItemInput.fill('Meine eigene Anforderung');
    await addCustomBtn.click();

    // Verify it is created and checked
    const customItemCb = panel.locator('.custom-item-row .item-checkbox');
    await expect(customItemCb).toBeChecked();
    await expect(previewItems).toHaveCount(2);
    await expect(previewItems.nth(1)).toContainText('Meine eigene Anforderung');

    // Bulk add custom items
    const bulkInput = panel.locator('.bulk-add-input');
    const addBulkBtn = panel.locator('.add-bulk-btn');
    await bulkInput.fill('Bulk Item A\nBulk Item B');
    await addBulkBtn.click();

    // Verify bulk items are added and checked
    await expect(panel.locator('.custom-item-row')).toHaveCount(3); // 1 single + 2 bulk
    await expect(previewItems).toHaveCount(4);

    // Delete one custom item
    await panel
      .locator('.custom-item-row')
      .first()
      .locator('.btn-icon.danger')
      .click();
    await expect(panel.locator('.custom-item-row')).toHaveCount(2);
    await expect(previewItems).toHaveCount(3);
  });

  test('Category Scales & Weights', async ({ page }) => {
    const allgemeinAccordion = page.locator('#acc-allgemeine');
    await allgemeinAccordion.click();
    const panel = page.locator('#acc-allgemeine-panel');

    // Edit Category title
    const titleInput = panel.locator('.category-title-input');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Allgemeine Kriterien');
    await titleInput.blur();

    // Change category weight
    const weightInput = panel.locator('.category-weight-input');
    await weightInput.fill('25');
    await weightInput.blur();

    // Change category scale (verbal Likert to Emojis (3 Stufen))
    const scaleSelect = panel.locator('.category-scale-select');
    await scaleSelect.selectOption('ascii_3');

    // Select a criterion so we see the category header in the preview
    await page.locator('label[for="cb-allgemeine-abgabe"]').click();

    // Verify category header in preview displays new title and weight
    const previewCatHeading = page.locator('.a4-cat-heading');
    await expect(previewCatHeading).toHaveText('Allgemeine Kriterien — 25 %');

    // Verify preview scale header is visible and shows ASCII scale labels
    const scaleHeaders = page.locator('.a4-scale-opt-text');
    await expect(scaleHeaders).toHaveCount(3);
    await expect(scaleHeaders.nth(0)).toHaveText(':(');
    await expect(scaleHeaders.nth(1)).toHaveText(':/');
    await expect(scaleHeaders.nth(2)).toHaveText(':)');

    // Switch to numeric scale and check range settings
    await scaleSelect.selectOption('punkte_10');
    const minInput = page.locator('#allgemeine-scale-min');
    const maxInput = page.locator('#allgemeine-scale-max');
    await expect(minInput).toBeVisible();
    await expect(maxInput).toBeVisible();

    await minInput.fill('2');
    await minInput.blur();
    await maxInput.fill('8');
    await maxInput.blur();

    // Verify the scale header reflects the new range (2-8)
    const scaleMinCell = page.locator('.a4-scale-opt-text').first();
    const scaleMaxCell = page.locator('.a4-scale-opt-text').last();
    await expect(scaleMinCell).toHaveText('2');
    await expect(scaleMaxCell).toHaveText('8');
  });

  test('Product Formats Modal Selection', async ({ page }) => {
    // Expand the "Produktebene" (formats) editor section first
    const sectionToggle = page.locator('#sec-formats-btn');
    await expect(sectionToggle).toBeVisible();
    await sectionToggle.click();

    // Open product format selection modal
    const openModalBtn = page.locator('.choose-product-formats-btn');
    await expect(openModalBtn).toBeVisible();
    await openModalBtn.click();

    const modal = page.locator('.product-format-modal');
    await expect(modal).toBeVisible();

    // Search for a product format
    const formatSearch = modal.locator('#product-format-search');
    await formatSearch.fill('Podcast');

    // Verify Podcast is shown and others are filtered
    const podcastRow = modal.locator('.product-format-row:has-text("Podcast")');
    await expect(podcastRow).toBeVisible();
    const wikiRow = modal.locator('.product-format-row:has-text("Wiki")');
    await expect(wikiRow).not.toBeVisible();

    // Click to add Podcast product format
    const addBtn = podcastRow.locator('button', { hasText: 'Hinzufügen' });
    await addBtn.click();

    // Verify button text changes to 'Entfernen'
    await expect(podcastRow.locator('button')).toHaveText('Entfernen');

    // Close modal
    const doneBtn = modal.locator('.product-format-done-btn');
    await doneBtn.click();
    await expect(modal).not.toBeVisible();

    // Verify podcast category accordion is visible in editor
    const podcastAccordion = page.locator('#acc-podcast');
    await expect(podcastAccordion).toBeVisible();
    await podcastAccordion.click();

    // Select/check a criterion under Podcast category (e.g., 'tempo')
    const tempoCheckbox = page.locator('#cb-podcast-tempo');
    await expect(tempoCheckbox).toBeVisible();
    await page.locator('label[for="cb-podcast-tempo"]').click();
    await expect(tempoCheckbox).toBeChecked();

    // Verify it was added to selection list
    const selectedList = page.locator('#selected-list');
    await expect(selectedList).toContainText('Tempo');
  });

  test('Footer Toggles & Preview Modes', async ({ page }) => {
    // Select one criterion first
    await page.locator('#acc-allgemeine').click();
    await page.locator('label[for="cb-allgemeine-abgabe"]').click();

    // Footer fields are always visible (no collapsible section)
    // Verify default footer fields in preview
    const previewFooter = page.locator('.a4-footer-fields .a4-footer-field');
    await expect(previewFooter).toHaveCount(3); // Date, Signature, Grade

    // Disable Signature footer field (toggle chip)
    const signatureChip = page.locator('#footer-signature');
    await expect(signatureChip).toBeVisible();
    await expect(signatureChip).toHaveAttribute('aria-checked', 'true');
    await signatureChip.click();
    await expect(signatureChip).toHaveAttribute('aria-checked', 'false');

    // Verify Signature is removed from preview
    await expect(previewFooter).toHaveCount(2);

    // Test print preview modes: checklist vs full with scales
    const previewBodyItem = page.locator('.a4-item');
    await expect(previewBodyItem.locator('.a4-scale-boxes')).toBeVisible();

    // Switch to Checklist mode
    const checklistTab = page.locator('.mode-tab[data-mode="checklist"]');
    await checklistTab.click();
    await expect(checklistTab).toHaveClass(/active/);

    // Verify scales are no longer visible, checkbox box is shown instead
    await expect(previewBodyItem.locator('.a4-scale-boxes')).not.toBeVisible();
    await expect(previewBodyItem.locator('.a4-cbox')).toBeVisible();
  });

  test('Undo / Redo & Toolbar actions', async ({ page }) => {
    // Action 1: Fill document title (segmented pill)
    await page.locator('[data-title-mode="custom"]').click();
    const customTitleInput = page.locator('#document-title-custom');
    await customTitleInput.fill('Undo Titel Test');
    await customTitleInput.blur();

    const previewTitle = page.locator('.a4-title');
    await expect(previewTitle).toHaveText('Undo Titel Test');

    // Click Undo button in action bar
    const undoBtn = page.locator('#history-undo');
    await undoBtn.click();

    // Verify title is reverted
    await expect(previewTitle).toHaveText('Feedbackbogen');

    // Click Redo button in action bar
    const redoBtn = page.locator('#history-redo');
    await redoBtn.click();

    // Verify title is restored
    await expect(previewTitle).toHaveText('Undo Titel Test');

    // Revert using keyboard shortcuts (Control + z / Cmd + z)
    // Blur the input first so editing mode is not active
    await customTitleInput.blur();
    await page.keyboard.press('Control+z');
    await expect(previewTitle).toHaveText('Feedbackbogen');
  });

  test('Reset Configuration Workflow', async ({ page }) => {
    // Perform some changes
    await page.locator('#acc-allgemeine').click();
    await page.locator('label[for="cb-allgemeine-abgabe"]').click();
    await expect(page.locator('.a4-items li')).toHaveCount(1);

    // Click Reset button in action bar
    const resetBtn = page.locator('#config-reset');
    await resetBtn.click();

    // Reset confirm modal should be open
    const modal = page.locator('.reset-confirm-modal');
    await expect(modal).toBeVisible();

    // Click Cancel (Abbrechen)
    const cancelBtn = modal.locator('button', { hasText: 'Abbrechen' });
    await cancelBtn.click();
    await expect(modal).not.toBeVisible();

    // Verify selection is still there
    await expect(page.locator('.a4-items li')).toHaveCount(1);

    // Click Reset again and confirm
    await resetBtn.click();
    await expect(page.locator('.reset-confirm-modal')).toBeVisible();
    const confirmBtn = page.locator('button.reset-confirm-action');
    await confirmBtn.click();
    await expect(page.locator('.reset-confirm-modal')).not.toBeVisible();

    // Verify configuration was reset (selection empty)
    await expect(page.locator('.a4-items li')).toHaveCount(0);
  });

  test('Export Menu Downloads Click Check', async ({ page }) => {
    await page.locator('#acc-allgemeine').click();
    await page.locator('label[for="cb-allgemeine-abgabe"]').click();

    const expectedDownloads = [
      ['pdf-print', '.pdf'],
      ['pdf-fillable', '.pdf'],
      ['docx', '.docx'],
      ['xlsx', '.xlsx'],
      ['odt', '.odt'],
    ] as const;

    for (const [format, extension] of expectedDownloads) {
      await page.locator('#export-menu-trigger').click();
      const downloadPromise = page.waitForEvent('download');
      await page.locator(`.menu-item[data-export-format="${format}"]`).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(
        new RegExp(`\\${extension}$`)
      );
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      const downloadStat = await fs.stat(downloadPath!);
      expect(downloadStat.size).toBeGreaterThan(0);
    }
  });

  test('Config Import Through Toolbar', async ({ page }, testInfo) => {
    const configPath = testInfo.outputPath('import-config.json');
    await fs.writeFile(
      configPath,
      JSON.stringify({
        schemaVersion: 4,
        selectedItems: [{ categoryId: 'allgemeine', itemId: 'abgabe' }],
        selectedProductFormats: [],
        scaleByCategory: {},
        scaleSettingsByCategory: {},
        defaultScaleId: 'verbal_5',
        documentTitle: { mode: 'custom', custom: 'Import Testbogen' },
        header: {
          fields: [
            { id: 'topic', label: 'Thema', value: 'Importiertes Thema' },
          ],
        },
        footerFields: { date: true, signature: true, grade: true },
        customItems: [],
        categoryOrder: ['allgemeine'],
        itemOrderByCategory: { allgemeine: ['abgabe'] },
        categoryTitleOverrides: {},
        customCategories: [],
        categoryWeights: {},
      }),
      'utf8'
    );

    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('#config-load').click();
    const chooser = await chooserPromise;
    await chooser.setFiles(configPath);

    await expect(page.locator('.a4-title')).toHaveText('Import Testbogen');
    await expect(page.locator('.a4-items li')).toContainText(
      'Rechtzeitige Abgabe'
    );
    await expect(page.locator('#config-message')).toHaveText(
      'JSON importiert.'
    );
  });

  test('Export warns when category weights do not total 100 percent', async ({
    page,
  }) => {
    await page.locator('#acc-allgemeine').click();
    await page.locator('.category-weight-input').first().fill('25');
    await page.locator('.category-weight-input').first().blur();
    await page.locator('label[for="cb-allgemeine-abgabe"]').click();

    await page.locator('#export-menu-trigger').click();
    const dialogPromise = new Promise<{ type: string; message: string }>(
      (resolve) => {
        page.once('dialog', async (dialog) => {
          const result = {
            type: dialog.type(),
            message: dialog.message(),
          };
          await dialog.dismiss();
          resolve(result);
        });
      }
    );
    await page.locator('.menu-item[data-export-format="docx"]').click();
    const dialog = await dialogPromise;
    expect(dialog.type).toBe('confirm');
    expect(dialog.message).toContain(
      'Die Summe der Gewichtungen beträgt 25 % statt 100 %.'
    );
  });

  test('Content Route Renders Markdown Page', async ({ page }) => {
    await page.goto('/help');

    await expect(page.locator('#content-page-title')).toHaveText('Hilfe');
    await expect(page.locator('.workspace')).toBeHidden();
  });

  test('Mobile Tabs Switch Panels', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.mobile-tab[data-mobile-view="preview"]').click();
    await expect(page.locator('.preview-pane')).toBeVisible();

    await page.locator('.mobile-tab[data-mobile-view="export"]').click();
    await expect(page.locator('.mobile-export-pane')).toBeVisible();
  });

  test('Mobile 320px German layout has no clipped title segment or editor overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.reload();
    await expect(page.locator('.title-segment__opt')).toHaveCount(3);

    const metrics = await page.evaluate(() => {
      const titleButtons = Array.from(
        document.querySelectorAll<HTMLElement>('.title-segment__opt')
      ).map((element) => ({
        text: element.textContent?.trim(),
        clipped:
          element.scrollWidth > element.clientWidth + 1 ||
          element.scrollHeight > element.clientHeight + 1,
      }));
      const editor = document.querySelector<HTMLElement>('.editor-pane');
      return {
        titleButtons,
        bodyOverflow:
          Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth
          ) - window.innerWidth,
        editorOverflow: editor ? editor.scrollWidth - editor.clientWidth : 0,
      };
    });

    expect(metrics.bodyOverflow).toBeLessThanOrEqual(0);
    expect(metrics.editorOverflow).toBeLessThanOrEqual(0);
    expect(metrics.titleButtons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: 'Feedbackbogen', clipped: false }),
        expect.objectContaining({ text: 'Bewertungsbogen', clipped: false }),
        expect.objectContaining({ text: 'Benutzerdefiniert', clipped: false }),
      ])
    );
  });

  test('Mobile preview fits A4 page without horizontal scrolling', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.reload();
    await page.locator('.mobile-tab[data-mobile-view="preview"]').click();

    const metrics = await page.evaluate(() => {
      const preview = document.querySelector<HTMLElement>('.preview-pane-inner');
      const pageEl = document.querySelector<HTMLElement>('.a4-page');
      return {
        previewOverflow: preview ? preview.scrollWidth - preview.clientWidth : 0,
        pageRight: pageEl?.getBoundingClientRect().right ?? 0,
        viewport: window.innerWidth,
      };
    });

    expect(metrics.previewOverflow).toBeLessThanOrEqual(1);
    expect(metrics.pageRight).toBeLessThanOrEqual(metrics.viewport + 1);
  });

  test('Mobile primary controls meet minimum touch target size', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();

    const problems = await page.evaluate(() => {
      const selectors = [
        '.language-switcher',
        '.language-switcher__option',
        '.mobile-tab',
        '.title-segment__opt',
        '.btn-small',
        '.btn-icon',
        '.header-field-drag-handle',
        '.app-footer-nav a',
        '.bmc-link',
        '.github-link',
      ];
      return selectors.flatMap((selector) =>
        Array.from(document.querySelectorAll<HTMLElement>(selector))
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              (rect.width < 40 || rect.height < 40)
            );
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              selector,
              text: element.textContent?.trim() || element.getAttribute('aria-label'),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            };
          })
      );
    });

    expect(problems).toEqual([]);
  });
});

test.describe('Language Switching', () => {
  test('keeps title segment labels readable in German and Dutch', async ({
    page,
  }) => {
    for (const language of ['de', 'nl']) {
      await page.goto('/');
      await page.evaluate((languageCode) => {
        window.localStorage.clear();
        window.localStorage.setItem('bbk:onboarding-dismissed', '1');
        window.localStorage.setItem('bbk:lang', languageCode);
      }, language);
      await page.goto('/');

      await expect(page.locator('.title-segment__opt')).toHaveCount(3);

      const metrics = await page.evaluate(() => {
        const segment = document.querySelector<HTMLElement>('.title-segment');
        const buttons = Array.from(
          document.querySelectorAll<HTMLElement>('.title-segment__opt')
        ).map((button) => ({
          text: button.textContent?.trim(),
          clipped:
            button.scrollWidth > button.clientWidth + 1 ||
            button.scrollHeight > button.clientHeight + 1,
        }));

        return {
          display: segment ? getComputedStyle(segment).display : null,
          buttons,
        };
      });

      expect(metrics.display).toBe('grid');
      expect(metrics.buttons).toHaveLength(3);
      expect(metrics.buttons.every(({ clipped }) => !clipped)).toBe(true);
    }
  });

  test('switches UI and content JSON language', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.localStorage.setItem('bbk:onboarding-dismissed', '1');
      window.localStorage.setItem('bbk:lang', 'de');
    });
    await page.goto('/');

    await page.locator('[data-action="language-switch"][data-language-code="en"]').click();
    await page.waitForLoadState('load');

    await expect(page.locator('.app-footer-note')).toHaveText(
      'All data remains locally in the browser. No server transmission.'
    );
    await expect(page.locator('#acc-allgemeine')).toContainText('General');
  });

  test('keeps English header field labels readable', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.localStorage.setItem('bbk:onboarding-dismissed', '1');
      window.localStorage.setItem('bbk:lang', 'en');
    });
    await page.goto('/');

    const metrics = await page.locator('#kd-label-learngroup').evaluate(
      (input) => {
        const label = input.closest('.kd-field')?.querySelector('label');
        return {
          clientWidth: input.clientWidth,
          scrollWidth: input.scrollWidth,
          labelText: label?.textContent?.trim(),
          labelVisible: label
            ? getComputedStyle(label).position !== 'absolute'
            : false,
        };
      }
    );

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.labelText).toBe('Field');
    expect(metrics.labelVisible).toBe(true);
  });
});
