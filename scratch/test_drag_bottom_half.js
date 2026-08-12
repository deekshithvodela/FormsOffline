import { chromium } from 'playwright';

(async () => {
  console.log('--- Starting Phase 37 Playwright Verification ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  try {
    console.log('1. Loading Form Builder...');
    await page.goto('http://localhost:8080/builder');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const resetBtn = page.getByTitle('Reset Canvas to Clean State');
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      await page.waitForTimeout(200);
      const confirmReset = page.locator('div[style*="z-index: 1000"] button.btn-primary');
      if (await confirmReset.isVisible()) {
        await confirmReset.click();
        await page.waitForTimeout(500);
      }
    }

    const initialFieldCards = await page.locator('[data-field-id]').count();
    console.log(`   Initial Form Fields Count: ${initialFieldCards}`);
    const firstFieldLabel = await page.evaluate(() => document.querySelectorAll('[data-field-id]')[0]?.innerText || '');
    console.log(`   First Field Label: ${firstFieldLabel.replace(/\n/g, ' ')}`);

    console.log('2. Adding 2 questions for drag verification...');
    const addBtn = page.locator('[title="Add Question to Active Section"]');
    await addBtn.click();
    await page.waitForTimeout(150);
    await addBtn.click();
    await page.waitForTimeout(150);

    const f0Id = await page.evaluate(() => document.querySelectorAll('[data-field-id]')[0]?.getAttribute('data-field-id'));
    const f1Id = await page.evaluate(() => document.querySelectorAll('[data-field-id]')[1]?.getAttribute('data-field-id'));
    const f2Id = await page.evaluate(() => document.querySelectorAll('[data-field-id]')[2]?.getAttribute('data-field-id'));
    console.log(`   Field IDs before drag: [0]: ${f0Id}, [1]: ${f1Id}, [2]: ${f2Id}`);

    const card0 = page.locator('[data-field-id]').nth(0);
    const card2 = page.locator('[data-field-id]').nth(2);
    await card0.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);

    const handles = page.locator('[title="Drag or touch-drag to reorder"]');
    const b0 = await handles.nth(0).boundingBox();
    const b2Card = await card2.boundingBox();

    if (b0 && b2Card) {
      const startX = b0.x + b0.width / 2;
      const startY = b0.y + b0.height / 2;
      // Target lower 75% of card 2
      const targetX = b2Card.x + b2Card.width / 2;
      const targetY = b2Card.y + b2Card.height * 0.75;

      console.log(`   Touch Drag coords: Start(${startX}, ${startY}) -> Target(${targetX}, ${targetY})`);

      const result = await page.evaluate(async ({ startX, startY, targetX, targetY }) => {
        const handle = document.querySelectorAll('[title="Drag or touch-drag to reorder"]')[0];

        // Touch Start
        const tStart = new Touch({ identifier: 1, target: handle, clientX: startX, clientY: startY, pageX: startX, pageY: startY });
        handle.dispatchEvent(new TouchEvent('touchstart', { touches: [tStart], targetTouches: [tStart], changedTouches: [tStart], bubbles: true, cancelable: true }));

        // Touch Move
        for (let i = 1; i <= 10; i++) {
          const currX = startX + (targetX - startX) * (i / 10);
          const currY = startY + (targetY - startY) * (i / 10);
          const tMove = new Touch({ identifier: 1, target: handle, clientX: currX, clientY: currY, pageX: currX, pageY: currY });
          handle.dispatchEvent(new TouchEvent('touchmove', { touches: [tMove], targetTouches: [tMove], changedTouches: [tMove], bubbles: true, cancelable: true }));
          await new Promise(r => setTimeout(r, 20));
        }

        // Touch End
        const tEnd = new Touch({ identifier: 1, target: handle, clientX: targetX, clientY: targetY, pageX: targetX, pageY: targetY });
        handle.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [tEnd], bubbles: true, cancelable: true }));

        await new Promise(r => setTimeout(r, 100));

        const cards = document.querySelectorAll('[data-field-id]');
        const ids = Array.from(cards).map(c => c.getAttribute('data-field-id'));
        return ids;
      }, { startX, startY, targetX, targetY });

      console.log('   Field IDs after touch drag:', result);

      if (result[result.length - 1] === f0Id) {
        console.log('   🎉 DOWNWARD DRAG APPENDING AFTER LAST ITEM VERIFIED 100% SUCCESSFUL!');
      } else {
        throw new Error(`Expected item ${f0Id} to be at last position, got: ${JSON.stringify(result)}`);
      }
    }

    console.log('--- ALL PHASE 37 CHECKS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('DIAGNOSTIC TEST FAILED:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
