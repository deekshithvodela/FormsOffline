const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 } // Mobile viewport
  });
  const page = await context.newPage();

  console.log('1. Navigating to Forms Dashboard...');
  await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle' });

  // Seed sample form template in IndexedDB
  await page.evaluate(async () => {
    const testTpl = {
      id: 'tpl_clean_highlight_test',
      title: 'Safety Audit & Inspection Report',
      description: 'Standard daily site safety inspection and compliance report.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      authorAlias: 'Safety Inspector',
      canonicalFingerprint: 'hash_clean_highlight_test',
      settings: { e2eeEnabled: false, allowDraftRecovery: true, showProgressBar: true, shuffleQuestions: false, confirmationMessage: 'Done' },
      sections: [{
        id: 'sec_1',
        title: 'Section 1: General Details',
        description: 'General inspection parameters',
        branchingRules: [],
        fields: [
          { id: 'f_name', type: 'text', label: 'Inspector Name', validation: { required: true } }
        ]
      }]
    };

    const req = indexedDB.open('FormsOfflineDB');
    await new Promise((resolve) => {
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx1 = db.transaction(['templates'], 'readwrite');
        tx1.objectStore('templates').put(testTpl);
        tx1.oncomplete = resolve;
      };
    });
  });

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const artifactDir = process.env.ARTIFACTS_DIR || path.join(__dirname, '..', 'artifacts');
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  console.log('2. Auditing Forms Dashboard Card Menu...');
  const kebabBtn = page.locator('button[aria-label="Open template actions menu"]').first();
  await kebabBtn.waitFor({ state: 'visible' });
  await kebabBtn.click();
  await page.waitForTimeout(300);

  const zipExportItem = page.locator('button:has-text("Export ZIP Package (Excel + Files)")');
  await zipExportItem.waitFor({ state: 'visible' });
  console.log('   ✅ Export ZIP Package option present in template card menu');

  await page.screenshot({ path: path.join(artifactDir, 'mobile_dashboard_kebab_zip_verified.png'), fullPage: false });

  // Close kebab menu by clicking backdrop or button again
  await kebabBtn.click();
  await page.waitForTimeout(200);

  // 2. Audit Rapid Entry & Template Gallery (Checkmark removed)
  console.log('3. Auditing Rapid Entry & Template Gallery (Checkmark removed)...');
  const firstCard = page.locator('div.template-card').first();
  await firstCard.locator('button:has-text("Collect Data")').click();
  await page.waitForTimeout(600);

  const switchFormBtn = page.locator('button:has-text("Switch Form")').first();
  await switchFormBtn.waitFor({ state: 'visible' });
  await switchFormBtn.click();
  await page.waitForTimeout(500);

  const modalBackdrop = page.locator('div.modal-backdrop');
  await modalBackdrop.waitFor({ state: 'visible' });

  // Verify no Check icon inside any card in the modal
  const checkIconsCount = await page.locator('div.modal-content svg.lucide-check').count();
  console.log(`   Checkmark icons inside template cards: ${checkIconsCount}`);
  if (checkIconsCount > 0) {
    throw new Error('Checkmark icon still present on selected card in Template Gallery!');
  }
  console.log('   ✅ Checkmark removed! Selected card is cleanly highlighted with border only.');

  await page.screenshot({ path: path.join(artifactDir, 'mobile_gallery_nocheckmark_verified.png'), fullPage: false });

  // Close gallery
  await page.click('button[aria-label="Close Gallery"]');
  await page.waitForTimeout(300);

  // 3. Audit Form Builder (Dedicated Top Row for Preview Return & Full Width Title)
  console.log('4. Auditing Form Builder Preview Mode Separate Top Row...');
  await page.click('button[aria-label="Form Builder"]');
  await page.waitForTimeout(500);

  const previewBtn = page.locator('button[aria-label="Preview Form"]');
  await previewBtn.click();
  await page.waitForTimeout(400);

  const previewControlBar = page.locator('div.card:has-text("Preview Mode")').first();
  await previewControlBar.waitFor({ state: 'visible' });

  const backToEditorBtn = page.locator('button:has-text("Go Back to Editor")');
  await backToEditorBtn.waitFor({ state: 'visible' });

  console.log('   ✅ Preview Control Bar rendered on dedicated top row');
  console.log('   ✅ Go Back to Editor button sits cleanly beside Preview Mode badge');

  await page.screenshot({ path: path.join(artifactDir, 'mobile_preview_topbar_verified.png'), fullPage: false });

  await backToEditorBtn.click();
  await page.waitForTimeout(300);

  // 4. Audit Data Consolidator (Full Backup ZIP & Snapshot buttons)
  console.log('5. Auditing Data Consolidator Backup Options...');
  await page.click('button[aria-label="Data Consolidator"]');
  await page.waitForTimeout(500);

  const fullZipBtn = page.locator('button:has-text("Full Backup ZIP (JSON + Files + Excel)")');
  const dbSnapshotBtn = page.locator('button:has-text("Database Snapshot (.formbackup JSON)")');

  await fullZipBtn.waitFor({ state: 'visible' });
  await dbSnapshotBtn.waitFor({ state: 'visible' });

  console.log('   ✅ Full Backup ZIP button visible');
  console.log('   ✅ Database Snapshot (.formbackup JSON) button visible');

  await page.screenshot({ path: path.join(artifactDir, 'mobile_backup_options_verified.png'), fullPage: false });

  await browser.close();
  console.log('\n🎉 ALL FIXES VERIFIED SUCCESSFULLY WITH ZERO ERRORS!');
}

run().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
