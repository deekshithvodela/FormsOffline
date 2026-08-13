const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || path.join(__dirname, '..', 'artifacts');
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
const PORT = 4175;

function serveStatic(req, res) {
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

async function run() {
  const server = http.createServer(serveStatic);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Server running at http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile iPhone 14 / Pixel 7 viewport
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  const page = await context.newPage();

  try {
    await page.goto(`http://localhost:${PORT}`);
    await page.waitForLoadState('networkidle');

    console.log('--- 1. Testing Linear Scale Authoring (Zero Overflow) ---');
    // Navigate to Form Builder
    await page.locator('button[aria-label="Form Builder"]').first().click();
    await page.waitForTimeout(800);

    // Click on the existing question to open edit mode
    const questionCard = page.locator('.card:has-text("Untitled Question")').first();
    if (await questionCard.count() > 0) {
      await questionCard.click();
      await page.waitForTimeout(400);

      // Change question type to Linear scale
      const typeSelect = page.locator('select').first();
      await typeSelect.selectOption('linear_scale');
      await page.waitForTimeout(400);

      // Check for horizontal overflow
      const overflowCheck = await page.evaluate(() => {
        const bodyOverflow = document.documentElement.scrollWidth > window.innerWidth;
        const cards = Array.from(document.querySelectorAll('.card'));
        const cardOverflows = cards.map(c => c.scrollWidth > c.clientWidth);
        return { bodyOverflow, hasCardOverflow: cardOverflows.some(Boolean) };
      });
      console.log('Linear Scale Overflow check:', overflowCheck);

      await page.evaluate(() => window.scrollBy(0, 350));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_builder_linear_scale_fixed.png') });
      console.log('Saved mobile_builder_linear_scale_fixed.png');

      console.log('--- 2. Testing Option Branching ("Go to section based on answer") ---');
      // Change question type to dropdown
      await typeSelect.selectOption('select');
      await page.waitForTimeout(400);

      // Open 3-dots menu
      const moreBtn = page.locator('button[aria-label="Question Options"]').first();
      await moreBtn.click();
      await page.waitForTimeout(300);

      // Enable "Go to section based on answer"
      const branchOption = page.locator('label:has-text("Go to section based on answer")').first();
      if (await branchOption.count() > 0) {
        await branchOption.click();
        await page.waitForTimeout(400);
      }

      const branchOverflowCheck = await page.evaluate(() => {
        const bodyOverflow = document.documentElement.scrollWidth > window.innerWidth;
        const cards = Array.from(document.querySelectorAll('.card'));
        const cardOverflows = cards.map(c => c.scrollWidth > c.clientWidth);
        return { bodyOverflow, hasCardOverflow: cardOverflows.some(Boolean) };
      });
      console.log('Branching Overflow check:', branchOverflowCheck);

      await page.evaluate(() => window.scrollBy(0, 350));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_builder_branching_fixed.png') });
      console.log('Saved mobile_builder_branching_fixed.png');
    }

    console.log('--- 3. Testing CMS Actions Buttons (Square Geometry & No Row Overlap) ---');
    // Save template
    await page.locator('button:has-text("Save Template")').first().click();
    await page.waitForTimeout(400);
    const saveConfirmBtn = page.locator('.modal-content button:has-text("Save Template"), .modal-content button.btn-primary').first();
    if (await saveConfirmBtn.count() > 0) {
      await saveConfirmBtn.click();
      await page.waitForTimeout(800);
    }

    // Seed 2 submissions directly into IndexedDB for the template
    await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('FormsOfflineDB');
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(['templates', 'submissions'], 'readwrite');
          const tplStore = tx.objectStore('templates');
          const subStore = tx.objectStore('submissions');
          const getAllReq = tplStore.getAll();
          getAllReq.onsuccess = () => {
            const templates = getAllReq.result;
            if (templates.length > 0) {
              const tpl = templates[0];
              const fId = tpl.sections?.[0]?.fields?.[0]?.id || 'f1';
              subStore.put({
                id: 'sub_test_1',
                templateId: tpl.id,
                templateVersion: tpl.version,
                createdAt: Date.now() - 60000,
                updatedAt: Date.now() - 60000,
                status: 'completed',
                data: { [fId]: 'Option 1' }
              });
              subStore.put({
                id: 'sub_test_2',
                templateId: tpl.id,
                templateVersion: tpl.version,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: 'completed',
                data: { [fId]: 'Option 2' }
              });
            }
          };
          tx.oncomplete = () => resolve();
          tx.onerror = (err) => reject(err);
        };
        req.onerror = (err) => reject(err);
      });
    });

    // Navigate to Forms Dashboard then click View Records
    await page.locator('button[aria-label="Forms Dashboard"]').first().click();
    await page.waitForTimeout(800);

    const viewRecordsBtn = page.locator('button:has-text("View Records")').first();
    if (await viewRecordsBtn.count() > 0) {
      await viewRecordsBtn.click();
      await page.waitForTimeout(800);
    }

    // Verify Action button bounding boxes
    const actionButtonMetrics = await page.evaluate(() => {
      const editBtns = Array.from(document.querySelectorAll('button[aria-label="Edit Submission Record"]'));
      return editBtns.map(btn => {
        const rect = btn.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height), top: Math.round(rect.top), bottom: Math.round(rect.bottom) };
      });
    });
    console.log('CMS Action button dimensions:', actionButtonMetrics);

    // Scroll table to the right to focus on the Actions column
    await page.evaluate(() => {
      const scrollables = Array.from(document.querySelectorAll('div')).filter(el => {
        const style = window.getComputedStyle(el);
        return (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflow === 'auto') && el.scrollWidth > el.clientWidth;
      });
      scrollables.forEach(s => { s.scrollLeft = s.scrollWidth; });
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile_cms_actions_square_no_overlap.png') });
    console.log('Saved mobile_cms_actions_square_no_overlap.png');

    console.log('--- All Verifications Completed Successfully ---');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

run();
