const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function generateOgImage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2
  });

  const faviconSvg = fs.readFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), 'utf8');
  const svgBase64 = `data:image/svg+xml;base64,${Buffer.from(faviconSvg).toString('base64')}`;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1200px;
        height: 630px;
        background: #0b0f19;
        color: #f8fafc;
        font-family: 'Inter', -apple-system, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 60px 70px;
        position: relative;
        overflow: hidden;
      }
      /* Ambient background glow */
      .glow-1 {
        position: absolute;
        top: -100px;
        right: -100px;
        width: 550px;
        height: 550px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%);
        border-radius: 50%;
      }
      .glow-2 {
        position: absolute;
        bottom: -150px;
        left: -100px;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 70%);
        border-radius: 50%;
      }
      .top-row {
        display: flex;
        align-items: center;
        gap: 20px;
        z-index: 2;
      }
      .icon-box {
        width: 72px;
        height: 72px;
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
      }
      .icon-box img {
        width: 44px;
        height: 44px;
      }
      .brand-title {
        font-size: 38px;
        font-weight: 900;
        letter-spacing: -0.5px;
        background: linear-gradient(to right, #ffffff, #cbd5e1);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .badge-offline {
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.4);
        color: #10b981;
        padding: 6px 14px;
        border-radius: 9999px;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-left: auto;
      }
      .main-content {
        z-index: 2;
        margin-top: 10px;
      }
      .headline {
        font-size: 48px;
        font-weight: 800;
        line-height: 1.15;
        letter-spacing: -1px;
        margin-bottom: 16px;
        color: #ffffff;
      }
      .headline span {
        background: linear-gradient(135deg, #818cf8, #c084fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .subtitle {
        font-size: 21px;
        color: #94a3b8;
        line-height: 1.5;
        max-width: 980px;
      }
      .bottom-row {
        display: flex;
        gap: 14px;
        z-index: 2;
      }
      .feature-pill {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(51, 65, 85, 0.9);
        padding: 10px 18px;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 600;
        color: #e2e8f0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .feature-pill .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #6366f1;
      }
    </style>
  </head>
  <body>
    <div class="glow-1"></div>
    <div class="glow-2"></div>

    <div class="top-row">
      <div class="icon-box">
        <img src="${svgBase64}" />
      </div>
      <div class="brand-title">Forms Offline</div>
      <div class="badge-offline">⚡ 100% Offline PWA</div>
    </div>

    <div class="main-content">
      <h1 class="headline">
        Zero-Backend <span>Data Digitization</span> & Form Authoring Platform
      </h1>
      <p class="subtitle">
        Author multi-section forms, import Google & MS Forms, collect field data with debounced autosave, and export multi-sheet Excel & ZIP archives.
      </p>
    </div>

    <div class="bottom-row">
      <div class="feature-pill"><div class="dot"></div> Dexie IndexedDB</div>
      <div class="feature-pill"><div class="dot"></div> Google/MS Form Importer</div>
      <div class="feature-pill"><div class="dot"></div> Multi-Sheet Excel Exports</div>
      <div class="feature-pill"><div class="dot"></div> In-App PDF & Office Viewer</div>
      <div class="feature-pill"><div class="dot"></div> Cross-Device Sync</div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  const outputPath = path.join(__dirname, '..', 'public', 'og-image.png');
  await page.screenshot({ path: outputPath, type: 'png' });
  console.log(`Saved 1200x630 OG image at ${outputPath}`);

  await browser.close();
}

generateOgImage().catch(console.error);
