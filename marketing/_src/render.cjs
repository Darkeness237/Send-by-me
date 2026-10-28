// Rendu des visuels statiques : node marketing/_src/render.cjs [filtre]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { BASE_CSS } = require('./lib.cjs');
const { T } = require('./templates.cjs');
const { S } = require('./specs.cjs');

const OUT = path.resolve(__dirname, '../visuels');
const filter = process.argv[2];

// Typographie française : espace insécable avant ? ! : ; » et après «
const nbsp = (h) => h.replace(/ ([?!:;»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');

function html(spec) {
  const [W, H] = spec.size;
  const small = W < 1000 && H < 1000; // bannières : dimensions réelles, rendues en 2x
  // Échelle du texte selon le format : stories plus grandes, paysages calés sur la hauteur.
  const r = W / H;
  const rem = r > 1.25 ? Math.min(W / 78, H / 36) : r < 0.8 ? (W / 54) * 1.28 : W / 54;
  return `<!doctype html><html style="--w:${W}px;--h:${H}px;--f:1rem;font-size:${rem}px"><head><meta charset="utf-8"><style>${BASE_CSS}</style></head>
  <body style="position:relative">${nbsp(T[spec.tpl](spec.p, W, H))}</body></html>`;
}

(async () => {
  const list = S.filter((s) => !filter || `${s.folder}/${s.file}`.includes(filter));
  const browser = await chromium.launch();
  const pages = {};
  const pageFor = async (dpr) => (pages[dpr] ||= await (await browser.newContext({ deviceScaleFactor: dpr })).newPage());
  let n = 0;
  for (const spec of list) {
    const [W, H] = spec.size;
    const dpr = W < 1000 && H < 1000 ? 2 : 1;
    const page = await pageFor(dpr);
    await page.setViewportSize({ width: W, height: H });
    const tmp = path.join(__dirname, '.tmp.html');
    fs.writeFileSync(tmp, html(spec));
    await page.goto('file://' + tmp, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const dir = path.join(OUT, spec.folder);
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, spec.file + '.png') });
    n++;
  }
  await browser.close();
  console.log(`${n} visuels rendus`);
})();

module.exports = { html };
