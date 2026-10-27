// Vérification d'identité, justificatif de voyage et connexion Google (bouton).
// Prérequis identiques à tests/e2e.cjs. Lancer : node tests/e2e-verification.cjs
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');
const BASE = 'http://localhost:3000';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q) => execSync(`psql "${DB}" -X -t -A -c ${JSON.stringify(q)}`).toString().trim();
const log = (...a) => console.log('✔', ...a);
const fx = (n) => path.join(__dirname, 'fixtures', n);

async function signup(b, name, email, next = '/espace') {
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.goto(`${BASE}/inscription?suite=${encodeURIComponent(next)}`);
  await p.fill('#full_name', name); await p.fill('#email', email); await p.fill('#password', 'motdepasse-solide-1');
  await p.check('input[name=terms]');
  await Promise.all([p.waitForURL('**' + next + '**'), p.click('form:has(#full_name) button[type=submit]')]);
  return p;
}

(async () => {
  const b = await chromium.launch();
  const run = Date.now();

  // Bouton Google : le fournisseur n'est pas activé en local → retour propre avec message
  const g = await (await b.newContext()).newPage();
  await g.goto(BASE + '/connexion');
  await Promise.all([g.waitForURL(/accounts\.google\.com|erreur=google|authorize/, { timeout: 20000 }).catch(() => {}), g.click('button:has-text("Continuer avec Google")')]);
  log('bouton Google → redirige vers :', new URL(g.url()).host + new URL(g.url()).pathname, g.url().includes('erreur=google') ? '(fournisseur non activé : message affiché)' : '');

  // Membre : dépôt de pièce d'identité
  const NAME = `Awa ${String(run).slice(-5)}`;
  const m = await signup(b, NAME, `v${run}@test.fr`, '/espace/profil');
  const uid = sql(`select id from auth.users where email='v${run}@test.fr'`);
  await m.waitForSelector('text=Faites vérifier votre identité');
  await m.selectOption('#document_type', 'cni');
  const inputs = m.locator('input[type=file]');
  await inputs.nth(0).setInputFiles(fx('fixtures-recto.png'));
  await inputs.nth(1).setInputFiles(fx('fixtures-verso.png'));
  await inputs.nth(2).setInputFiles(fx('fixtures-selfie.png'));
  await m.waitForFunction(() => [...document.querySelectorAll('input[type=hidden][name$="_path"]')].every((i) => i.value), null, { timeout: 20000 });
  log('3 fichiers déposés dans le dossier privé du membre');

  // Le membre ne peut pas relire ses fichiers, ni écrire chez un autre
  const probe = await m.evaluate(async (uid) => {
    const { createBrowserClient } = window.__sb || {};
    return null;
  }, uid);
  const front = await m.inputValue('input[name="front_path"]');
  const token = await m.evaluate(() => {
    const c = document.cookie.split('; ').find((x) => x.includes('auth-token'));
    if (!c) return null;
    let v = decodeURIComponent(c.split('=').slice(1).join('='));
    if (v.startsWith('base64-')) v = atob(v.slice(7));
    try { return JSON.parse(v).access_token; } catch { return null; }
  });
  const env = Object.fromEntries(require('fs').readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n').filter(Boolean).map((l) => [l.split('=')[0], l.split('=').slice(1).join('=').replace(/^"|"$/g, '')]));
  const API = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (token) {
    const read = await fetch(`${API}/storage/v1/object/verification-documents/${front}`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
    log('le membre relit son propre document → HTTP', read.status, read.status >= 400 ? '(refusé, OK)' : '(KO)');
    const anon = await fetch(`${API}/storage/v1/object/public/verification-documents/${front}`);
    log('accès public au document → HTTP', anon.status, anon.status >= 400 ? '(refusé, OK)' : '(KO)');
    const other = await fetch(`${API}/storage/v1/object/verification-documents/00000000-0000-0000-0000-000000000000/${crypto.randomUUID()}.png`, {
      method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'content-type': 'image/png' }, body: require('fs').readFileSync(fx('fixtures-recto.png')),
    });
    log('dépôt dans le dossier d\'un autre membre → HTTP', other.status, other.status >= 400 ? '(refusé, OK)' : '(KO)');
  } else console.log('! jeton introuvable dans les cookies, tests de stockage directs ignorés');

  // Faux chemin : le serveur refuse
  const realFront = front;
  await m.evaluate(() => { document.querySelector('input[name="front_path"]').value = document.querySelector('input[name="front_path"]').value.replace(/^[^/]+/, '00000000-0000-0000-0000-000000000000'); });
  await m.click('button:has-text("Envoyer pour vérification")');
  await m.waitForSelector('text=Ajoutez la photo du recto');
  log('chemin de fichier falsifié → refusé par le serveur');
  await m.evaluate((v) => { document.querySelector('input[name="front_path"]').value = v; }, realFront);
  await m.click('button:has-text("Envoyer pour vérification")');
  await m.waitForSelector('text=/Votre demande est en cours|Vérification en cours/', { timeout: 15000 }).catch(async () => {
    await m.screenshot({ path: path.join(__dirname, 'screenshots', 'debug-verif.png'), fullPage: true });
    console.log('message affiché :', await m.locator('[role=alert]').allTextContents(), '| chemins :', await m.locator('input[type=hidden][name$="_path"]').evaluateAll((els) => els.map((e) => e.name + '=' + e.value)));
    throw new Error('demande non acceptée');
  });
  log('demande envoyée →', sql(`select status from identity_verifications where user_id='${uid}'`));

  // Justificatif de voyage
  await m.goto(BASE + '/publier');
  const d = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  await m.fill('#from_city', 'Paris'); await m.fill('#to_city', 'Dakar');
  await m.fill('#departure_date', d); await m.fill('#departure_time', '08:00');
  await Promise.all([m.waitForURL('**/trajets/**'), m.click('button:has-text("Publier mon trajet")')]);
  const tripId = m.url().split('?')[0].split('/').pop();
  await m.locator('input[type=file]').setInputFiles(fx('fixtures-recto.png'));
  await m.waitForFunction(() => document.querySelector('input[name="file_path"]').value, null, { timeout: 20000 });
  await m.click('button:has-text("Envoyer le justificatif")');
  await m.waitForSelector('text=/Justificatif envoyé|en cours de vérification/');
  log('justificatif de voyage envoyé →', sql(`select status from trip_proofs where trip_id='${tripId}'`));

  // Admin : valide les deux, les fichiers sont supprimés
  const a = await signup(b, 'Admin V.', `adm${run}@test.fr`);
  sql(`update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email='adm${run}@test.fr'`);
  await a.context().clearCookies();
  await a.goto(BASE + '/connexion?suite=/admin');
  await a.fill('#email', `adm${run}@test.fr`); await a.fill('#password', 'motdepasse-solide-1');
  await Promise.all([a.waitForURL('**/admin**'), a.click('form:has(#email) button[type=submit]')]);
  await a.waitForSelector('text=Pièces d\'identité');
  const filesBefore = sql(`select count(*) from storage.objects where bucket_id='verification-documents' and name like '${uid}/%'`);
  const idItem = a.locator('li', { hasText: NAME }).filter({ hasText: "Carte d'identité" });
  const imgs = await idItem.locator('img').count();
  log('admin voit la demande avec', imgs, 'documents (liens signés)');
  await a.screenshot({ path: path.join(__dirname, 'screenshots', 'admin-verification.png'), fullPage: true });
  await idItem.locator('button:has-text("Valider")').click();
  for (let i = 0; i < 30 && sql(`select status from identity_verifications where user_id='${uid}'`) !== 'approved'; i++) await a.waitForTimeout(500);
  await a.waitForLoadState('networkidle');
  const proofItem = a.locator('li', { hasText: NAME }).filter({ hasText: 'Départ annoncé' });
  await proofItem.locator('button:has-text("Valider")').click();
  for (let i = 0; i < 30 && sql(`select status from trip_proofs where trip_id='${tripId}'`) !== 'approved'; i++) await a.waitForTimeout(500);
  const filesAfter = sql(`select count(*) from storage.objects where bucket_id='verification-documents' and name like '${uid}/%'`);
  log('fichiers du membre dans le stockage : avant', filesBefore, '→ après', filesAfter);
  log('profil vérifié →', sql(`select id_verified from profiles where id='${uid}'`), '| trajet vérifié →', sql(`select ticket_verified from trips where id='${tripId}'`));

  // Côté public : badge visible
  const pub = await (await b.newContext()).newPage();
  await pub.goto(`${BASE}/trajets/${tripId}`);
  await pub.waitForSelector('text=Trajet vérifié');
  log('badge « Trajet vérifié » visible publiquement');
  await m.goto(BASE + '/espace/profil');
  await m.waitForSelector('text=Identité vérifiée');
  log('le membre voit « Identité vérifiée » sur son profil');
  await b.close();
})().catch((e) => { console.error('ÉCHEC', e); process.exit(1); });
