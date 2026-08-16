/* 將現有程序機體輸出成「只供 ImageGen 身份參考」的放大 PNG。
   這些檔案不是正式美術，也不得由 runtime 載入。 */
'use strict';

const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5833';
const OUT_DIR = path.resolve('assets/artpack/source/legacy-placeholder');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__game && typeof UnitDB !== 'undefined' && typeof UNIT_DEFS !== 'undefined');

  const refs = await page.evaluate(() => UNIT_DEFS.map(unit => {
    const source = UnitDB.spr(unit.id).idle.r;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(0, 0, 256, 256);
    ctx.drawImage(source, 0, 0, 32, 32, 0, 0, 256, 256);
    return {
      id: unit.id,
      code: unit.code,
      name: unit.name,
      data: canvas.toDataURL('image/png')
    };
  }));

  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const ref of refs) {
    const png = Buffer.from(ref.data.split(',')[1], 'base64');
    await fs.writeFile(path.join(OUT_DIR, `${ref.id}.png`), png);
  }
  await fs.writeFile(path.join(OUT_DIR, 'README.md'), [
    '# Legacy placeholder references',
    '',
    '由 `js/sprites.js` 程序圖輸出，只供核准 ImageGen 鎖定既有身份、比例與配色。',
    '不是正式美術，不得放進 runtime atlas，也不得作為美術完成證據。',
    '',
    ...refs.map(ref => `- ${ref.id} ${ref.code} ${ref.name}`),
    ''
  ].join('\n'), 'utf8');

  await browser.close();
  console.log(`legacy_reference_count=${refs.length}`);
  console.log(`folder=${OUT_DIR}`);
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
