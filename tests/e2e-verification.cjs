// Vérification d'identité, justificatif de voyage et connexion Google (bouton).
// Prérequis identiques à tests/e2e.cjs. Lancer : node tests/e2e-verification.cjs
const { chromium } = require('playwright');
const pubForm = require('./publish.cjs');
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
  await p.fill('#first_name', String(name).split(' ')[0]); await p.fill('#last_name', (String(name).split(' ')[1] || 'Test').replace('.', '') + 'ndo'); await p.fill('#email', email); await p.fill('#password', 'motdepasse-solide-1');
  await p.check('input[name=terms]');
  await Promise.all([p.waitForURL('**' + next + '**'), p.click('form:has(#first_name) button[type=submit]')]);
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
  const NAME = `Awa${String(run).slice(-5)} V.`;
  const m = await signup(b, NAME, `v${run}@test.fr`, '/espace/profil');
  const uid = sql(`select id from auth.users where email='v${run}@test.fr'`);
  await m.waitForSelector('text=Faites certifier votre compte');
  // Avec Stripe configuré, l'envoi manuel des documents est replié sous le bouton de vérification automatique.
  if (await m.locator('summary:has-text("Envoyez vos documents")').count()) await m.click('summary:has-text("Envoyez vos documents")');
  await m.selectOption('#document_type', 'cni');
  const inputs = m.locator('form:has(#document_type) input[type=file]');
  await inputs.nth(0).setInputFiles(fx('fixtures-recto.png'));
  await inputs.nth(1).setInputFiles(fx('fixtures-verso.png'));
  await inputs.nth(2).setInputFiles(fx('fixtures-selfie.png'));
  await m.waitForFunction(() => [...document.querySelectorAll('input[name=front_path], input[name=back_path], input[name=selfie_path]')].every((i) => i.value), null, { timeout: 20000 });
  log('3 fichiers déposés dans le dossier privé du membre');

  // Le membre ne peut pas relire ses fichiers, ni écrire chez un autre
  const probe = await m.evaluate(async (uid) => {
    const { createBrowserClient } = window.__sb || {};
    return null;
  }, uid);
  const front = await m.inputValue('input[name="front_path"]');
  const token = await m.evaluate(() => {
    // Le cookie de session peut être découpé en plusieurs morceaux (.0, .1…)
    const parts = document.cookie.split('; ').filter((x) => /-auth-token(\.\d+)?=/.test(x)).sort();
    if (!parts.length) return null;
    let v = parts.map((c) => decodeURIComponent(c.split('=').slice(1).join('='))).join('');
    if (v.startsWith('base64-')) { const b = v.slice(7).replace(/-/g, '+').replace(/_/g, '/'); v = atob(b + '='.repeat((4 - (b.length % 4)) % 4)); }
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
  await m.waitForSelector('text=/Votre demande est en cours|Notre équipe examine vos documents/', { timeout: 15000 }).catch(async () => {
    await m.screenshot({ path: path.join(__dirname, 'screenshots', 'debug-verif.png'), fullPage: true });
    console.log('message affiché :', await m.locator('[role=alert]').allTextContents(), '| chemins :', await m.locator('input[type=hidden][name$="_path"]').evaluateAll((els) => els.map((e) => e.name + '=' + e.value)));
    throw new Error('demande non acceptée');
  });
  log('demande envoyée →', sql(`select status from identity_verifications where user_id='${uid}'`));

  // Justificatif de voyage
  await m.goto(BASE + '/publier');
  const d = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  await pubForm.openAll(m);
  await m.fill('#from_city', 'Paris'); await m.fill('#to_city', 'Dakar');
  await m.fill('#departure_date', d); await m.fill('#departure_time', '08:00');
  await m.selectOption('#mode', 'car');
    await pubForm.next(m);
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
  sql(`update profiles set onboarded_at = now() where id = (select id from auth.users where email='adm${run}@test.fr')`);
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
  await m.waitForSelector('li:has-text("Identité"):has-text("Vérifié")');
  log('le membre voit son identité vérifiée sur son profil');

  // Adresse : 2e étape → compte certifié
  await m.fill('#addr_phone', '+33 6 12 34 56 78');
  await m.fill('#address_line', '12 rue des Lilas');
  await m.fill('#postal_code', '75011');
  await m.fill('#address_city', 'Paris');
  await m.fill('#country_addr', 'France');
  await m.locator('form:has(#address_line) input[type=file]').setInputFiles(fx('fixtures-recto.png'));
  await m.waitForFunction(() => document.querySelector('input[name="proof_path"]').value, null, { timeout: 20000 });
  await m.click('button:has-text("Envoyer mon justificatif")');
  await m.waitForSelector('text=/justificatif de domicile est en cours/');
  log('justificatif de domicile envoyé →', sql(`select status from identity_verifications where user_id='${uid}' and kind='address'`));
  await a.goto(BASE + '/admin');
  const addrItem = a.locator('li', { hasText: NAME }).filter({ hasText: 'Justificatif de domicile' });
  log('admin voit l\'adresse déclarée :', (await addrItem.textContent()).includes('12 rue des Lilas'));
  await addrItem.locator('button:has-text("Valider")').click();
  for (let i = 0; i < 30 && sql(`select certified from profiles where id='${uid}'`) !== 't'; i++) await a.waitForTimeout(500);
  log('compte certifié →', sql(`select certified from profiles where id='${uid}'`));
  await m.goto(BASE + '/espace/profil');
  await m.waitForSelector('h2:has-text("Compte certifié")');
  await pub.goto(`${BASE}/trajets/${tripId}`);
  await pub.waitForSelector('text=Compte certifié');
  log('badge « Compte certifié » visible publiquement sur le trajet');
  await pub.screenshot({ path: path.join(__dirname, 'screenshots', 'trajet-certifie.png'), fullPage: true });

  // Un autre membre ne voit pas les coordonnées privées
  const other = await signup(b, 'Curieux Z.', `z${run}@test.fr`);
  const leak = await other.evaluate(async ({ API, KEY }) => {
    const parts = document.cookie.split('; ').filter((x) => /-auth-token(\.\d+)?=/.test(x)).sort();
    let v = parts.map((c) => decodeURIComponent(c.split('=').slice(1).join('='))).join('');
    if (v.startsWith('base64-')) { const b = v.slice(7).replace(/-/g, '+').replace(/_/g, '/'); v = atob(b + '='.repeat((4 - (b.length % 4)) % 4)); }
    const token = JSON.parse(v).access_token;
    const r = await fetch(`${API}/rest/v1/member_contacts?select=*`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
    return (await r.json()).length;
  }, { API, KEY });
  log('coordonnées visibles par un autre membre (seulement les siennes attendues = 1) :', leak);
  await b.close();
})().catch((e) => { console.error('ÉCHEC', e); process.exit(1); });
