// Render the bib posters to PNG: node promo/render.js [baseUrl]
// Needs a static server at the repo root (e.g. python3 -m http.server 8765) and Playwright.
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://127.0.0.1:8765/shop-map/promo/poster.html';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (const lang of ['en', 'th', 'zh']) for (const cat of ['cafe', 'food', 'spa', 'sport']) {
    await p.goto(`${base}?cat=${cat}&lang=${lang}`, { waitUntil: 'networkidle' });
    await p.waitForFunction(() => window.__ready === true, { timeout: 30000 });
    const out = path.join(__dirname, `runner-privileges-${cat}-${lang}.png`);
    await p.screenshot({ path: out });
    console.log(out);
  }
  await b.close();
})();
