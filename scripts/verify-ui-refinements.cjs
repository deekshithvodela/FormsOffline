const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || path.join(__dirname, '..', 'artifacts');
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
const PORT = 4173;

// Simple static file server for dist
function startServer(port = 4173) {
  return new Promise((resolve) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.webmanifest': 'application/manifest+json'
    };

    const server = http.createServer((req, res) => {
      let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading file');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
    });

    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

(async () => {
  const server = await startServer(4173);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile Viewport (390px width)
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  try {
    console.log('--- 1. Testing Forms Dashboard (Mobile) ---');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Verify Tap Highlight CSS is transparent
    const tapHighlight = await page.evaluate(() => {
      const btn = document.querySelector('button');
      return window.getComputedStyle(btn).webkitTapHighlightColor;
    });
    console.log(`Computed webkitTapHighlightColor: ${tapHighlight}`);

    // Take screenshot of Dashboard header with single-row search + compact sort
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_dashboard_singlerow_search_sort.png') });
    console.log('Saved mobile_dashboard_singlerow_search_sort.png');

    // Test Kebab dropdown overlay
    const kebabBtn = page.locator('button[aria-label="Template options"]').first();
    if (await kebabBtn.count() > 0) {
      const cardBoxBefore = await page.locator('.template-card').first().boundingBox();
      await kebabBtn.click();
      await page.waitForTimeout(300);
      const cardBoxAfter = await page.locator('.template-card').first().boundingBox();
      console.log(`Card height before: ${cardBoxBefore?.height}, after: ${cardBoxAfter?.height} (Layout Shift: ${Math.abs(cardBoxAfter.height - cardBoxBefore.height)}px)`);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_dashboard_kebab_overlay_zeroshift.png') });
      console.log('Saved mobile_dashboard_kebab_overlay_zeroshift.png');
      // Dismiss dropdown
      await page.mouse.click(10, 10);
      await page.waitForTimeout(200);
    }

    console.log('--- 2. Testing Form Builder (Squarish Arrows & Question Collapse) ---');
    // Navigate to Form Builder
    await page.locator('button[aria-label="Form Builder"]').first().click();
    await page.waitForTimeout(800);

    // Take screenshot of Form Builder with squarish arrows
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_builder_squarish_arrows.png') });
    console.log('Saved mobile_builder_squarish_arrows.png');

    // Click on the question to edit
    const questionCard = page.locator('.card:has-text("Untitled Question")').first();
    if (await questionCard.count() > 0) {
      await questionCard.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_builder_question_expanded.png') });
      console.log('Saved mobile_builder_question_expanded.png');

      // Click [Done] button to collapse
      const doneBtn = page.locator('button:has-text("Done")').first();
      if (await doneBtn.count() > 0) {
        await doneBtn.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_builder_question_collapsed_done.png') });
        console.log('Saved mobile_builder_question_collapsed_done.png');
      }
    }

    // Save template in Form Builder
    await page.locator('button:has-text("Save Template")').first().click();
    await page.waitForTimeout(400);
    const modalSaveBtn = page.locator('.modal-content button:has-text("Save Template")').first();
    if (await modalSaveBtn.count() > 0) {
      await modalSaveBtn.click();
      await page.waitForTimeout(800);
    }

    console.log('--- 3. Testing Rapid Entry (Squarish Search Button) ---');
    await page.locator('button[aria-label="Rapid Entry"]').first().click();
    await page.waitForTimeout(800);

    const selectFormBtn = page.locator('button:has-text("Select a Form Template")').first();
    if (await selectFormBtn.count() > 0) {
      await selectFormBtn.click();
      await page.waitForTimeout(500);
      // Select the first template in the gallery
      const firstGalleryItem = page.locator('.template-gallery-card, .card:has-text("Untitled Offline Form"), .card:has-text("check")').first();
      if (await firstGalleryItem.count() > 0) {
        await firstGalleryItem.click();
        await page.waitForTimeout(500);
      }
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_rapid_entry_squarish_search.png') });
    console.log('Saved mobile_rapid_entry_squarish_search.png');

    console.log('--- 4. Testing Dataset CMS (Squarish Buttons & Collapsible Search) ---');
    await page.locator('button[aria-label="Dataset CMS"]').first().click();
    await page.waitForTimeout(800);

    const cmsSelectFormBtn = page.locator('button:has-text("Select a Form Template")').first();
    if (await cmsSelectFormBtn.count() > 0) {
      await cmsSelectFormBtn.click();
      await page.waitForTimeout(500);
      const firstGalleryItem = page.locator('.template-gallery-card, .card:has-text("Untitled Offline Form"), .card:has-text("check")').first();
      if (await firstGalleryItem.count() > 0) {
        await firstGalleryItem.click();
        await page.waitForTimeout(500);
      }
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_cms_squarish_search_and_actions.png') });
    console.log('Saved mobile_cms_squarish_search_and_actions.png');

    // Test expanding CMS search
    const cmsSearchBtn = page.locator('button[aria-label="Search Records"]').first();
    if (await cmsSearchBtn.count() > 0) {
      await cmsSearchBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_cms_search_expanded.png') });
      console.log('Saved mobile_cms_search_expanded.png');
    }

    console.log('--- Verification Completed Successfully ---');
  } finally {
    await browser.close();
    server.close();
  }
})();
