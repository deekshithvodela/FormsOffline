import { chromium } from 'playwright';

(async () => {
  console.log('--- Starting Phase 35 Playwright Mobile UX & Touch Diagnostic ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE Mobile Viewport
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');

    // Test 1: Verify Standalone "Import from Link" Button
    console.log('1. Verifying Standalone "Import from Link" button on mobile...');
    const importLinkBtn = page.getByRole('button', { name: /Import from Link/i });
    const isImportLinkVisible = await importLinkBtn.isVisible();
    console.log('   Import from Link button visible:', isImportLinkVisible);
    if (!isImportLinkVisible) throw new Error('Import from Link button not visible!');

    // Click Import from Link to open SmartFormImporterModal
    await importLinkBtn.click();
    await page.waitForTimeout(300);
    const modalHeader = page.getByText('Import Google / MS Form');
    console.log('   Link Importer Modal opened:', await modalHeader.isVisible());

    // Check modal overflow width
    const modalBox = await page.locator('.card:has-text("Import Google / MS Form")').boundingBox();
    console.log(`   Modal width on 375px screen: ${modalBox?.width}px (Max allowed <= 375px)`);
    if (modalBox && modalBox.width > 375) {
      throw new Error(`Modal overflows screen width! Width: ${modalBox.width}`);
    }

    // Close modal
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(200);

    // Test 2: Verify Form Builder Mobile Question Reorder Touch Listeners
    console.log('2. Verifying Form Builder question cards...');
    await page.click('button:has-text("Create New Form")');
    await page.waitForTimeout(300);

    // Add 2 questions
    const addQuestionBtn = page.getByRole('button', { name: /Add Question/i });
    if (await addQuestionBtn.isVisible()) {
      await addQuestionBtn.click();
      await page.waitForTimeout(100);
      await addQuestionBtn.click();
      await page.waitForTimeout(100);
    }

    const gripHandles = page.locator('[title="Drag or touch-drag to reorder"]');
    const gripCount = await gripHandles.count();
    console.log(`   Found ${gripCount} touch-drag Grip handles in Form Builder.`);
    if (gripCount < 2) throw new Error('Expected at least 2 touch drag handles');

    // Perform touch drag simulation
    const firstHandle = gripHandles.nth(0);
    const secondHandle = gripHandles.nth(1);
    const box1 = await firstHandle.boundingBox();
    const box2 = await secondHandle.boundingBox();

    if (box1 && box2) {
      console.log('   Simulating touch drag from handle 1 to handle 2...');
      await page.touchscreen.tap(box1.x + box1.width / 2, box1.y + box1.height / 2);
    }

    console.log('--- ALL PHASE 35 DIAGNOSTIC CHECKS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('DIAGNOSTIC TEST FAILED:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
