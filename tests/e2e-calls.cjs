// Appel audio entre l'expéditeur et le voyageur, avec micro/caméra simulés.
// Prérequis identiques à tests/e2e.cjs. Lancer : node tests/e2e-calls.cjs
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
const log = (...a) => console.log('✔', ...a);

async function signup(b, name, email, next) {
  const ctx = await b.newContext({ permissions: ['microphone', 'camera'], viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', name, e.message));
  await p.goto(`${BASE}/inscription?suite=${encodeURIComponent(next)}`);
  await p.fill('#full_name', name); await p.fill('#email', email); await p.fill('#password', 'motdepasse-solide-1');
  await p.check('input[name=terms]');
  await Promise.all([p.waitForURL('**' + next + '**'), p.click('form:has(#password) button[type=submit]')]);
  return p;
}

(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const run = Date.now();
  const ta = await signup(b, 'Ibrahim K.', `ct${run}@test.fr`, '/publier');
  const d = new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10);
  await ta.fill('#from_city', 'Paris'); await ta.fill('#to_city', 'Abidjan');
  await ta.fill('#departure_date', d); await ta.fill('#departure_time', '11:00');
  await Promise.all([ta.waitForURL('**/trajets/**'), ta.click('button:has-text("Publier mon trajet")')]);
  const tripUrl = ta.url().split('?')[0];

  const sb = await signup(b, 'Nadia T.', `cs${run}@test.fr`, new URL(tripUrl).pathname);
  await sb.fill('#weight_kg', '2'); await sb.selectOption('#category', 'documents');
  await sb.fill('#description', 'Dossier administratif'); await sb.fill('#recipient_name', 'Koffi A.');
  await sb.fill('#recipient_phone', '+225 07 00 00 00 00'); await sb.check('input[name=declaration]');
  await Promise.all([sb.waitForURL('**/reservations/**'), sb.click('button:has-text("Envoyer ma demande")')]);
  const bookingUrl = sb.url().split('?')[0];
  await ta.goto(bookingUrl);
  log('réservation prête, les deux participants sont sur la conversation');

  const callBtn = (p) => p.locator('button[title="Appel audio"]');
  await callBtn(sb).waitFor(); await callBtn(ta).waitFor();
  await sb.waitForFunction(() => !document.querySelector('button[title="Appel audio"]').disabled, null, { timeout: 15000 });
  await ta.waitForFunction(() => !document.querySelector('button[title="Appel audio"]').disabled, null, { timeout: 15000 });
  log('canal d\'appel privé rejoint des deux côtés');

  await callBtn(sb).click();
  await sb.waitForSelector('text=Appel en cours…');
  await ta.waitForSelector('text=Appel audio entrant', { timeout: 15000 });
  log('le voyageur reçoit l\'appel entrant');
  await ta.click('button[aria-label="Décrocher"]');
  await sb.waitForSelector('text=/0 min \\d{2} s/', { timeout: 20000 });
  await ta.waitForSelector('text=/0 min \\d{2} s/', { timeout: 20000 });
  log('appel connecté des deux côtés (WebRTC)');
  await sb.waitForTimeout(2500);
  const tracks = await ta.evaluate(() => document.querySelector('audio')?.srcObject?.getAudioTracks().length ?? 0);
  log('piste audio reçue par le voyageur :', tracks);
  await sb.screenshot({ path: __dirname + '/screenshots/appel-en-cours.png' });
  await sb.click('button[aria-label="Raccrocher"]');
  await ta.waitForSelector('text=Appel terminé.', { timeout: 10000 });
  log('raccroché : l\'autre côté est prévenu');
  await sb.waitForSelector('text=/Appel audio terminé · 0 min/', { timeout: 15000 });
  log('trace de l\'appel dans la conversation');

  // Appel refusé
  await callBtn(ta).click();
  await sb.waitForSelector('text=Appel audio entrant', { timeout: 15000 });
  await sb.click('button[aria-label="Refuser l\'appel"]');
  await ta.waitForSelector('text=Nadia T. a refusé l\'appel.', { timeout: 10000 });
  log('appel refusé : l\'appelant est prévenu');
  await b.close();
})().catch((e) => { console.error('ÉCHEC', e); process.exit(1); });
