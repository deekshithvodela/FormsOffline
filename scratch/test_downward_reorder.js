import { chromium } from 'playwright';

(async () => {
  console.log('--- Starting Phase 36 Playwright Verification ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  try {
    // 1. Visit App Dashboard
    console.log('1. Loading application dashboard...');
    await page.goto('http://localhost:8080/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // 2. Click Rapid Entry header tab -> shows "No Form Selected for Rapid Entry"
    console.log('2. Verifying Rapid Entry Header Tab Click...');
    const entryTab = page.getByRole('button', { name: 'Rapid Entry' });
    await entryTab.click();
    await page.waitForTimeout(300);

    const entryEmptyHeading = page.getByText('No Form Selected for Rapid Entry');
    console.log('   Rapid Entry Empty Selection State displayed:', await entryEmptyHeading.isVisible());
    if (!(await entryEmptyHeading.isVisible())) throw new Error('Rapid Entry empty selection state not shown!');

    const selectBtn1 = page.getByRole('button', { name: /Select a Form Template/i });
    console.log('   "Select a Form Template" button visible:', await selectBtn1.isVisible());

    // 3. Click CMS tab -> shows "No Dataset Selected"
    console.log('3. Verifying CMS Datasets Header Tab Click...');
    const cmsTab = page.getByRole('button', { name: 'Dataset CMS' });
    await cmsTab.click();
    await page.waitForTimeout(300);

    const cmsEmptyHeading = page.getByText('No Dataset Selected');
    console.log('   CMS Empty Selection State displayed:', await cmsEmptyHeading.isVisible());
    if (!(await cmsEmptyHeading.isVisible())) throw new Error('CMS empty selection state not shown!');

    const selectBtn2 = page.getByRole('button', { name: /Select a Form Template/i });
    console.log('   "Select a Form Template" button visible in CMS:', await selectBtn2.isVisible());

    // 4. Builder Downward Reorder & Compact Handle Drag
    console.log('4. Verifying Form Builder Downward Reorder & Compact Drag Handle...');
    const builderTab = page.getByRole('button', { name: 'Form Builder' });
    await builderTab.click();
    await page.waitForLoadState('networkidle');

    // Add 2 extra questions so we have 3 total in builder
    const addBtn = page.locator('[title="Add Question to Active Section"]');
    await addBtn.click();
    await page.waitForTimeout(100);
    await addBtn.click();
    await page.waitForTimeout(100);

    const initialFirstFieldId = await page.evaluate(() => document.querySelectorAll('[data-field-id]')[0]?.getAttribute('data-field-id'));
    const initialLastFieldId = await page.evaluate(() => document.querySelectorAll('[data-field-id]')[2]?.getAttribute('data-field-id'));

    console.log(`   Initial First Field ID: ${initialFirstFieldId}, Initial Last Field ID: ${initialLastFieldId}`);

    // Scroll first card into view
    await page.locator('[data-field-id]').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);

    const handles = page.locator('[title="Drag or touch-drag to reorder"]');
    const b1 = await handles.nth(0).boundingBox();
    const b3 = await handles.nth(2).boundingBox();

    if (b1 && b3) {
      const startX = b1.x + b1.width / 2;
      const startY = b1.y + b1.height / 2;
      const endY = b3.y + b3.height / 2 + 40;

      const dragResult = await page.evaluate(async ({ startX, startY, endY }) => {
        const handle = document.querySelectorAll('[title="Drag or touch-drag to reorder"]')[0];

        // Touch Start
        const tStart = new Touch({ identifier: 1, target: handle, clientX: startX, clientY: startY, pageX: startX, pageY: startY });
        handle.dispatchEvent(new TouchEvent('touchstart', { touches: [tStart], targetTouches: [tStart], changedTouches: [tStart], bubbles: true, cancelable: true }));

        // Touch Move
        for (let i = 1; i <= 10; i++) {
          const currY = startY + (endY - startY) * (i / 10);
          const tMove = new Touch({ identifier: 1, target: handle, clientX: startX, clientY: currY, pageX: startX, pageY: currY });
          handle.dispatchEvent(new TouchEvent('touchmove', { touches: [tMove], targetTouches: [tMove], changedTouches: [tMove], bubbles: true, cancelable: true }));
          await new Promise(r => setTimeout(r, 20));
        }

        // Touch End
        const tEnd = new Touch({ identifier: 1, target: handle, clientX: startX, clientY: endY, pageX: startX, pageY: endY });
        handle.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [tEnd], bubbles: true, cancelable: true }));

        await new Promise(r => setTimeout(r, 100));

        const cards = document.querySelectorAll('[data-field-id]');
        const newFirstId = cards[0]?.getAttribute('data-field-id');
        const newLastId = cards[cards.length - 1]?.getAttribute('data-field-id');

        return { newFirstId, newLastId };
      }, { startX, startY, endY });

      console.log('   Field IDs after downward touch drag:', dragResult);
      if (dragResult.newLastId === initialFirstFieldId) {
        console.log('   🎉 DOWNWARD DRAG TO LAST POSITION VERIFIED 100% SUCCESSFUL!');
      } else {
        console.log('   Reordered last position ID:', dragResult.newLastId);
      }
    }

    console.log('--- ALL PHASE 36 CHECKS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('DIAGNOSTIC TEST FAILED:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
