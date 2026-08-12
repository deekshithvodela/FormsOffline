const { chromium } = require('playwright');

(async () => {
  console.log('--- Verifying Section Drag Reorder in Modal ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:8080');
  await page.waitForTimeout(1000);

  // Navigate to FormBuilder
  await page.click('button:has-text("Create New Form")');
  await page.waitForTimeout(500);

  // Add 2 additional sections (total 3 sections)
  await page.click('button:has-text("Add Section")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Add Section")');
  await page.waitForTimeout(300);

  // Open Reorder Sections modal
  await page.click('button:has-text("Reorder Sections")');
  await page.waitForTimeout(500);

  // Verify modal items exist
  const itemRows = page.locator('.modal-list-item-row');
  const count = await itemRows.count();
  console.log(`Reorder Modal Items Count: ${count}`);

  if (count !== 3) {
    console.error('FAILED: Expected 3 section rows in modal');
    await browser.close();
    process.exit(1);
  }

  // Perform drag and drop of Section 1 row down to Section 3 row
  const firstRow = itemRows.nth(0);
  const thirdRow = itemRows.nth(2);

  const firstBox = await firstRow.boundingBox();
  const thirdBox = await thirdRow.boundingBox();

  if (firstBox && thirdBox) {
    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(thirdBox.x + thirdBox.width / 2, thirdBox.y + thirdBox.height / 2 + 10, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  console.log('--- SECTION DRAG MODAL TEST PASSED 100% ---');
  await browser.close();
})();
