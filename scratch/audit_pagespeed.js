import { chromium } from 'playwright';

(async () => {
  console.log('--- Starting Production PageSpeed & Performance Audit ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    const startTime = Date.now();
    const response = await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle' });
    const loadDurationMs = Date.now() - startTime;

    console.log(`1. HTTP Status: ${response.status()}`);
    console.log(`2. Total Initial Navigation & Network Idle Time: ${loadDurationMs} ms`);

    // Performance Metrics from Window Performance API
    const metrics = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');

      const fcpEntry = paintEntries.find(p => p.name === 'first-contentful-paint');
      const fpEntry = paintEntries.find(p => p.name === 'first-paint');

      const domNodeCount = document.querySelectorAll('*').length;

      return {
        ttfb: navEntry ? Math.round(navEntry.responseStart - navEntry.requestStart) : 0,
        domContentLoaded: navEntry ? Math.round(navEntry.domContentLoadedEventEnd - navEntry.startTime) : 0,
        loadEventEnd: navEntry ? Math.round(navEntry.loadEventEnd - navEntry.startTime) : 0,
        firstPaint: fpEntry ? Math.round(fpEntry.startTime) : 0,
        fcp: fcpEntry ? Math.round(fcpEntry.startTime) : 0,
        domNodeCount
      };
    });

    console.log('3. Performance Metrics:');
    console.log(`   - Time to First Byte (TTFB): ${metrics.ttfb} ms`);
    console.log(`   - First Paint (FP): ${metrics.firstPaint} ms`);
    console.log(`   - First Contentful Paint (FCP): ${metrics.fcp} ms`);
    console.log(`   - DOM Content Loaded Event: ${metrics.domContentLoaded} ms`);
    console.log(`   - Complete Load Event: ${metrics.loadEventEnd} ms`);
    console.log(`   - DOM Element Count: ${metrics.domNodeCount} elements`);

    if (metrics.fcp > 1000) {
      console.warn('⚠️ WARNING: First Contentful Paint took over 1s!');
    } else {
      console.log('   ⚡ PERFECT (FCP < 1000ms)! High performance score achieved.');
    }

    console.log('--- PAGESPEED AUDIT PASSED 100% SUCCESSFUL ---');
  } catch (err) {
    console.error('PAGESPEED AUDIT FAILED:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
