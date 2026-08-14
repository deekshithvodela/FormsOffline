const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function generateImages() {
  const browser = await chromium.launch({ headless: true });
  const faviconSvg = fs.readFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), 'utf8');
  const svgBase64 = `data:image/svg+xml;base64,${Buffer.from(faviconSvg).toString('base64')}`;

  // 1. Generate 1200x630 Landscape Card (<150 KB)
  {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1
    });

    const landscapeHtml = `
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
          Zero-Backend <span>Data Digitization</span> & Form Platform
        </h1>
        <p class="subtitle">
          Author multi-section forms, import Google & MS Forms, collect field data with debounced autosave, and export multi-sheet Excel & ZIP archives.
        </p>
      </div>

      <div class="bottom-row">
        <div class="feature-pill"><div class="dot"></div> Dexie IndexedDB</div>
        <div class="feature-pill"><div class="dot"></div> Google/MS Forms</div>
        <div class="feature-pill"><div class="dot"></div> Multi-Sheet Excel</div>
        <div class="feature-pill"><div class="dot"></div> PDF Viewer</div>
        <div class="feature-pill"><div class="dot"></div> Cross-Device Sync</div>
      </div>
    </body>
    </html>
    `;

    await page.setContent(landscapeHtml, { waitUntil: 'networkidle' });
    const landscapePath = path.join(__dirname, '..', 'public', 'og-image.png');
    await page.screenshot({ path: landscapePath, type: 'png' });
    const statLandscape = fs.statSync(landscapePath);
    console.log(`✅ Saved 1200x630 OG image at ${landscapePath} (${Math.round(statLandscape.size / 1024)} KB)`);
    await page.close();
  }

  // 2. Generate 512x512 Square Card (<50 KB for WhatsApp / Mobile Messengers)
  {
    const page = await browser.newPage({
      viewport: { width: 512, height: 512 },
      deviceScaleFactor: 1
    });

    const squareHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 512px;
          height: 512px;
          background: #0b0f19;
          color: #f8fafc;
          font-family: 'Inter', -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }
        .glow {
          position: absolute;
          width: 380px;
          height: 380px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0) 70%);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1;
        }
        .icon-box {
          width: 110px;
          height: 110px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 30px rgba(99, 102, 241, 0.5);
          margin-bottom: 24px;
          z-index: 2;
        }
        .icon-box img {
          width: 68px;
          height: 68px;
        }
        .brand-title {
          font-size: 38px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #ffffff;
          margin-bottom: 8px;
          z-index: 2;
        }
        .tagline {
          font-size: 16px;
          color: #94a3b8;
          font-weight: 500;
          line-height: 1.4;
          max-width: 400px;
          margin-bottom: 24px;
          z-index: 2;
        }
        .badge-offline {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10b981;
          padding: 7px 18px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          z-index: 2;
        }
      </style>
    </head>
    <body>
      <div class="glow"></div>
      <div class="icon-box">
        <img src="${svgBase64}" />
      </div>
      <div class="brand-title">Forms Offline</div>
      <div class="tagline">Zero-Backend Form Authoring & Offline Data Collection</div>
      <div class="badge-offline">⚡ 100% Offline PWA</div>
    </body>
    </html>
    `;

    await page.setContent(squareHtml, { waitUntil: 'networkidle' });
    const squarePath = path.join(__dirname, '..', 'public', 'og-image-square.png');
    await page.screenshot({ path: squarePath, type: 'png' });
    const statSquare = fs.statSync(squarePath);
    console.log(`✅ Saved 512x512 square OG image at ${squarePath} (${Math.round(statSquare.size / 1024)} KB)`);
    await page.close();
  }

  await browser.close();
}

generateImages().catch(console.error);
