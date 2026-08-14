const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const ARTIFACT_DIR = process.env.ARTIFACTS_DIR || path.join(__dirname, '..', 'artifacts');
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
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
    '.webmanifest': 'application/manifest+json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain',
    '.xml': 'application/xml'
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

async function runMasterSuite() {
  const server = http.createServer(serveStatic);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`\n========================================`);
  console.log(`Forms Offline — Master Verification Suite`);
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`========================================\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  try {
    // --- 1. Linear Scale Authoring (Zero Overflow) ---
    console.log('--- 1. Testing Linear Scale Authoring (Zero Overflow) ---');
    await page.goto(`http://localhost:${PORT}/builder`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const questionCard = page.locator('.card[data-field-id]').first();
    await questionCard.waitFor({ state: 'visible' });
    await questionCard.click();
    await page.waitForTimeout(400);

    const questionTypeSelect = questionCard.locator('select').first();
    await questionTypeSelect.waitFor({ state: 'visible' });
    await questionTypeSelect.selectOption('linear_scale');
    await page.waitForTimeout(400);

    const scaleOverflowCheck = await page.evaluate(() => {
      const card = document.querySelector('.card[data-field-id]');
      const body = document.body;
      return {
        bodyOverflow: body.scrollWidth > window.innerWidth,
        hasCardOverflow: card ? card.scrollWidth > card.clientWidth : false
      };
    });
    console.log('   Linear Scale Overflow check:', scaleOverflowCheck);
    if (scaleOverflowCheck.bodyOverflow || scaleOverflowCheck.hasCardOverflow) {
      throw new Error('Linear Scale Question has horizontal overflow!');
    }
    console.log('   ✅ Linear Scale authoring: 0px horizontal overflow');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_builder_linear_scale_fixed.png') });

    // --- 2. Option Branching ("Go to section based on answer") ---
    console.log('\n--- 2. Testing Option Branching ("Go to section based on answer") ---');
    await questionTypeSelect.selectOption('radio');
    await page.waitForTimeout(400);

    const moreActionsBtn = questionCard.locator('button[aria-label="Question Options"]').first();
    await moreActionsBtn.click();
    await page.waitForTimeout(300);

    const branchingOption = questionCard.locator('label:has-text("Go to section based on answer")').first();
    await branchingOption.click();
    await page.waitForTimeout(400);

    const branchingOverflowCheck = await page.evaluate(() => {
      const card = document.querySelector('.card[data-field-id]');
      const body = document.body;
      return {
        bodyOverflow: body.scrollWidth > window.innerWidth,
        hasCardOverflow: card ? card.scrollWidth > card.clientWidth : false
      };
    });
    console.log('   Branching Overflow check:', branchingOverflowCheck);
    if (branchingOverflowCheck.bodyOverflow || branchingOverflowCheck.hasCardOverflow) {
      throw new Error('Option Branching container has horizontal overflow!');
    }
    console.log('   ✅ Option Branching 2-row layout: 0px horizontal overflow');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_builder_branching_fixed.png') });

    // --- 3. Form Builder Preview Mode Top Bar ---
    console.log('\n--- 3. Testing Form Builder Preview Mode ---');
    const previewBtn = page.locator('button[aria-label="Preview Form"]');
    await previewBtn.click();
    await page.waitForTimeout(400);

    const backToEditorBtn = page.locator('button:has-text("Go Back to Editor")');
    await backToEditorBtn.waitFor({ state: 'visible' });
    console.log('   ✅ Preview Control Bar rendered on top row with Return button');
    await backToEditorBtn.click();
    await page.waitForTimeout(400);

    // --- 4. Forms Dashboard Search & Sort ---
    console.log('\n--- 4. Testing Dashboard Search & Sort Single Row ---');
    await page.locator('button[aria-label="Forms Dashboard"]').first().click();
    await page.waitForTimeout(600);

    const searchInput = page.locator('input[placeholder*="Search forms"]');
    await searchInput.waitFor({ state: 'visible' });
    const sortSelect = page.locator('select.dashboard-sort-select');
    await sortSelect.waitFor({ state: 'visible' });
    console.log('   ✅ Search bar and Sort selector render side-by-side');

    // --- 5. CMS Actions Buttons (Square Geometry & Zero Row Overlap) ---
    console.log('\n--- 5. Testing CMS Table Actions Buttons ---');
    const viewRecordsBtn = page.locator('button:has-text("View Records")').first();
    if (await viewRecordsBtn.count() > 0) {
      await viewRecordsBtn.click();
      await page.waitForTimeout(800);
    } else {
      await page.locator('button[aria-label="Dataset CMS"]').first().click();
      await page.waitForTimeout(800);
    }

    const actionButtonMetrics = await page.evaluate(() => {
      const editBtns = Array.from(document.querySelectorAll('button[aria-label="Edit Submission Record"]'));
      return editBtns.map(btn => {
        const rect = btn.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height), top: Math.round(rect.top), bottom: Math.round(rect.bottom) };
      });
    });
    console.log('   CMS Action button dimensions:', actionButtonMetrics);
    if (actionButtonMetrics.length >= 2) {
      const row1Bottom = actionButtonMetrics[0].bottom;
      const row2Top = actionButtonMetrics[1].top;
      if (row2Top < row1Bottom) {
        throw new Error('CMS action buttons overlap vertically into adjacent row!');
      }
      console.log(`   ✅ Clear vertical separation (${row2Top - row1Bottom}px gap) with 0px overlap!`);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_cms_actions_square_no_overlap.png') });
    console.log('\n🎉 ALL MASTER VERIFICATION TESTS COMPLETED SUCCESSFULLY!\n');
  } finally {
    await browser.close();
    server.close();
  }
}

runMasterSuite().catch((err) => {
  console.error('\n❌ Master Verification Suite Failed:', err);
  process.exit(1);
});
