import { test, expect } from '@playwright/test';

test.describe('Feedbackbogen-Generator E2E Click Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure a clean state and suppress onboarding hint
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem('bbk:onboarding-dismissed', '1');
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
    const previewNameVal = page.locator('.a4-hf-row:has-text("Name:") .a4-hf-value');
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
    const previewCustomVal = page.locator('.a4-hf-row:has-text("Fachbereich:") .a4-hf-value');
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

  test('Criteria Selection, Search & Custom Criteria Items', async ({ page }) => {
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
    await panel.locator('.custom-item-row').first().locator('.btn-icon.danger').click();
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
    // Open the export menu
    const exportTrigger = page.locator('#export-menu-trigger');
    await expect(exportTrigger).toBeVisible();
    await exportTrigger.click();

    // Verify all export format options exist
    const pdfPrintOption = page.locator('.menu-item[data-export-format="pdf-print"]');
    const docxOption = page.locator('.menu-item[data-export-format="docx"]');
    const xlsxOption = page.locator('.menu-item[data-export-format="xlsx"]');
    const odtOption = page.locator('.menu-item[data-export-format="odt"]');

    await expect(pdfPrintOption).toBeVisible();
    await expect(docxOption).toBeVisible();
    await expect(xlsxOption).toBeVisible();
    await expect(odtOption).toBeVisible();
  });
});
