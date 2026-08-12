import { chromium } from 'playwright';

(async () => {
  console.log('--- Touch Drag Test Execution With ScrollIntoView ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  await page.goto('http://localhost:8080');
  await page.waitForLoadState('networkidle');

  // Navigate to builder
  await page.click('button:has-text("Create New Form")');
  await page.waitForTimeout(300);

  // Add 2 extra questions so we have 3 questions total
  const addBtn = page.locator('[title="Add Question to Active Section"]');
  await addBtn.click();
  await page.waitForTimeout(200);
  await addBtn.click();
  await page.waitForTimeout(200);

  // Scroll first question into view top
  await page.locator('[data-field-id]').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);

  const handles = page.locator('[title="Drag or touch-drag to reorder"]');
  const b1 = await handles.nth(0).boundingBox();
  const b3 = await handles.nth(2).boundingBox();

  console.log('Handle 1 bbox (after scroll):', b1);
  console.log('Handle 3 bbox (after scroll):', b3);

  if (b1 && b3) {
    const startX = b1.x + b1.width / 2;
    const startY = b1.y + b1.height / 2;
    const endY = b3.y + b3.height / 2;

    const result = await page.evaluate(async ({ startX, startY, endY }) => {
      const handles = document.querySelectorAll('[title="Drag or touch-drag to reorder"]');
      const handle = handles[0];
      const initialFieldId = handle.closest('[data-field-id]')?.getAttribute('data-field-id');

      // Dispatch touchstart
      const tStart = new Touch({ identifier: 1, target: handle, clientX: startX, clientY: startY, pageX: startX, pageY: startY });
      handle.dispatchEvent(new TouchEvent('touchstart', { touches: [tStart], targetTouches: [tStart], changedTouches: [tStart], bubbles: true, cancelable: true }));

      // Dispatch touchmove in 10 steps
      for (let i = 1; i <= 10; i++) {
        const currY = startY + (endY - startY) * (i / 10);
        const tMove = new Touch({ identifier: 1, target: handle, clientX: startX, clientY: currY, pageX: startX, pageY: currY });
        handle.dispatchEvent(new TouchEvent('touchmove', { touches: [tMove], targetTouches: [tMove], changedTouches: [tMove], bubbles: true, cancelable: true }));
        await new Promise(r => setTimeout(r, 20));
      }

      // Dispatch touchend
      const tEnd = new Touch({ identifier: 1, target: handle, clientX: startX, clientY: endY, pageX: startX, pageY: endY });
      handle.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [tEnd], bubbles: true, cancelable: true }));

      await new Promise(r => setTimeout(r, 100));

      const newFirstFieldId = document.querySelectorAll('[data-field-id]')[0]?.getAttribute('data-field-id');
      return { initialFieldId, newFirstFieldId };
    }, { startX, startY, endY });

    console.log('Touch drag result:', result);
    if (result.initialFieldId !== result.newFirstFieldId) {
      console.log('🎉 TOUCH DRAG REORDER VERIFIED WORKING 100%!');
    } else {
      console.log('⚠️ Field IDs before and after:', result);
    }
  }

  await browser.close();
})();
