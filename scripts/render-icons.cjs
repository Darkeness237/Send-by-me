// Rend les icônes PNG de l'application à partir des SVG du logo (voir scripts/build-brand.py).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const jobs = [
  ['src/app/icon.svg', 192, 'public/icons/icon-192.png'],
  ['src/app/icon.svg', 512, 'public/icons/icon-512.png'],
  ['public/brand/icon-maskable.svg', 512, 'public/icons/icon-maskable-512.png'],
  ['public/brand/icon-maskable.svg', 180, 'public/icons/apple-touch-icon.png'],
];
(async () => {
  const b = await chromium.launch();
  for (const [file, size, out] of jobs) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    const svg = fs.readFileSync(path.join(root, file), 'utf8').replace('<svg', `<svg width="${size}" height="${size}"`);
    await p.setContent(`<body style="margin:0;background:transparent">${svg}</body>`);
    await p.screenshot({ path: path.join(root, out), omitBackground: true });
    await p.close();
  }
  await b.close();
  console.log('icônes rendues');
})();
