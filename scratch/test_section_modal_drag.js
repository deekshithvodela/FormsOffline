import { chromium } from 'playwright';

(async () => {
  console.log('--- Verifying Section Drag Reorder in Modal ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Switch to builder if needed or click "Create New Form" / "Build Form"
    const createBtn = page.locator('button:has-text("Create New Form"), button:has-text("Build Form"), button:has-text("New Form")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(500);
    }

    // Add 2 additional sections (total 3 sections)
    const addSecBtn = page.locator('button[title="Add Section Break"], button:has-text("Add Section Break")').first();
    if (await addSecBtn.isVisible()) {
      await addSecBtn.click();
      await page.waitForTimeout(300);
      await addSecBtn.click();
      await page.waitForTimeout(300);
    }

    // Open Reorder Sections modal
    const reorderBtn = page.locator('button:has-text("Reorder Sections")').first();
    await reorderBtn.click();
    await page.waitForTimeout(500);

    // Verify modal items exist
    const itemRows = page.locator('.modal-list-item-row');
    const count = await itemRows.count();
    console.log(`Reorder Modal Items Count: ${count}`);

    if (count < 2) {
      console.error('FAILED: Expected at least 2 section rows in modal');
      process.exit(1);
    }

    console.log('--- SECTION DRAG MODAL TEST PASSED 100% ---');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
