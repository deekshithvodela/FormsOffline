const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
const PORT = 4176;

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

async function auditEnvironment(browser, isMobile = false) {
  const context = await browser.newContext({
    viewport: isMobile ? { width: 390, height: 844 } : { width: 1366, height: 768 },
    isMobile: isMobile,
    hasTouch: isMobile,
    userAgent: isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  // Track Layout Shift
  await page.addInitScript(() => {
    window.__clsScore = 0;
    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__clsScore += entry.value;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}
  });

  const startTime = Date.now();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  const totalLoadTime = Date.now() - startTime;
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paints = performance.getEntriesByType('paint');
    const fcpEntry = paints.find(p => p.name === 'first-contentful-paint');
    const resources = performance.getEntriesByType('resource');

    let totalTransferBytes = 0;
    const resourceTypes = {};
    resources.forEach(r => {
      totalTransferBytes += (r.transferSize || 0);
      const ext = r.name.split('?')[0].split('.').pop() || 'other';
      resourceTypes[ext] = (resourceTypes[ext] || 0) + 1;
    });

    // SEO / Meta Tag Inspection
    const getMeta = (selector, attr = 'content') => {
      const el = document.querySelector(selector);
      return el ? el.getAttribute(attr) : null;
    };

    const title = document.title;
    const metaDesc = getMeta('meta[name="description"]');
    const canonical = getMeta('link[rel="canonical"]', 'href');
    const robots = getMeta('meta[name="robots"]');
    const ogTitle = getMeta('meta[property="og:title"]');
    const ogDesc = getMeta('meta[property="og:description"]');
    const ogImage = getMeta('meta[property="og:image"]');
    const ogUrl = getMeta('meta[property="og:url"]');
    const twitterCard = getMeta('meta[name="twitter:card"]');
    const themeColor = getMeta('meta[name="theme-color"]');
    const viewport = getMeta('meta[name="viewport"]');
    const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => {
      try { return JSON.parse(s.textContent); } catch (e) { return null; }
    }).filter(Boolean);

    // Tap Target Check
    const buttons = Array.from(document.querySelectorAll('button, a, input, select'));
    const smallTargets = buttons.filter(b => {
      const rect = b.getBoundingClientRect();
      return (rect.width > 0 && rect.height > 0) && (rect.width < 24 || rect.height < 24);
    }).map(b => ({ tag: b.tagName, text: b.textContent?.trim().slice(0, 20), width: Math.round(b.getBoundingClientRect().width), height: Math.round(b.getBoundingClientRect().height) }));

    return {
      vitals: {
        ttfbMs: Math.round(nav.responseStart - nav.requestStart) || 0,
        domInteractiveMs: Math.round(nav.domInteractive) || 0,
        domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd) || 0,
        fcpMs: fcpEntry ? Math.round(fcpEntry.startTime) : Math.round(nav.responseEnd || 0),
        cls: Math.round((window.__clsScore || 0) * 1000) / 1000,
        resourceCount: resources.length,
        totalTransferKb: Math.round(totalTransferBytes / 1024),
        resourceTypes
      },
      seo: {
        title,
        titleLength: title ? title.length : 0,
        metaDesc,
        metaDescLength: metaDesc ? metaDesc.length : 0,
        hasCanonical: !!canonical,
        canonicalUrl: canonical,
        hasRobotsMeta: !!robots,
        robotsMeta: robots,
        hasOgTitle: !!ogTitle,
        hasOgDesc: !!ogDesc,
        hasOgImage: !!ogImage,
        hasOgUrl: !!ogUrl,
        hasTwitterCard: !!twitterCard,
        hasThemeColor: !!themeColor,
        hasViewport: !!viewport,
        jsonLdCount: jsonLd.length,
        jsonLdTypes: jsonLd.map(j => j['@type'])
      },
      accessibility: {
        smallTapTargetsCount: smallTargets.length,
        smallTargetsSample: smallTargets.slice(0, 3)
      }
    };
  });

  await context.close();
  return { ...metrics, totalLoadTimeMs: totalLoadTime };
}

async function runAllAudits() {
  const server = http.createServer(serveStatic);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Audit Server running at http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });

  console.log('\n--- Running Mobile PageSpeed & SEO Audit ---');
  const mobileMetrics = await auditEnvironment(browser, true);

  console.log('\n--- Running Desktop PageSpeed & SEO Audit ---');
  const desktopMetrics = await auditEnvironment(browser, false);

  await browser.close();
  server.close();

  const finalReport = {
    timestamp: new Date().toISOString(),
    mobile: mobileMetrics,
    desktop: desktopMetrics
  };

  fs.writeFileSync(path.join(REPORTS_DIR, 'pagespeed_diagnostic.json'), JSON.stringify(finalReport, null, 2));
  console.log('\n=== PageSpeed Diagnostic Results Saved to reports/pagespeed_diagnostic.json ===');
  console.log('Mobile Core Web Vitals:', mobileMetrics.vitals);
  console.log('Desktop Core Web Vitals:', desktopMetrics.vitals);
  console.log('SEO Audit (Mobile):', mobileMetrics.seo);
}

runAllAudits();
