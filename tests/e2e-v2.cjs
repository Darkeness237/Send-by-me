// Fonctions v2 : temps réel, signalement, profil, alertes, annulation, administration.
// Prérequis identiques à tests/e2e.cjs. Lancer : node tests/e2e-v2.cjs
const { chromium } = require('playwright');
const addPhotos = require('./photos.cjs');
const { execSync } = require('child_process');
const Stripe = require('stripe');
const BASE = 'http://localhost:3000';
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const log = (...a) => console.log('✔', ...a);
const sql = (q) => execSync(`psql "${DB}" -X -t -A -c ${JSON.stringify(q)}`).toString().trim();

async function signup(ctx, name, email, next = '/espace') {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.goto(`${BASE}/inscription?suite=${encodeURIComponent(next)}`);
  await p.fill('#first_name', String(name).split(' ')[0]); await p.fill('#last_name', (String(name).split(' ')[1] || 'Test').replace('.', '') + 'ndo'); await p.fill('#email', email); await p.fill('#password', 'motdepasse-solide-1');
  await p.check('input[name=terms]');
  await Promise.all([p.waitForURL('**' + next.split('?')[0] + '**'), p.click('form:has(#password) button[type=submit]')]);
  return p;
}

(async () => {
  const b = await chromium.launch();
  const run = Date.now();
  const ta = await signup(await b.newContext(), 'Fatou S.', `t${run}@test.fr`, '/publier');
  const sb = await signup(await b.newContext(), 'Paul M.', `s${run}@test.fr`);
  const adminCtx = await b.newContext();
  const ad = await signup(adminCtx, 'Admin E.', `a${run}@test.fr`);

  // Profil
  await ta.goto(BASE + '/espace/profil');
  await ta.fill('#bio', 'Je rentre à Dakar chaque mois.'); await ta.fill('#city', 'Paris');
  await ta.click('button:has-text("Enregistrer")');
  await ta.waitForSelector('text=Profil enregistré');
  log('profil modifié');

  // Ligne suivie (avant publication)
  await sb.goto(BASE + '/recherche?from=Paris&to=Dakar');
  await Promise.all([sb.waitForResponse((r) => r.request().method() === 'POST'), sb.click('button:has-text("Suivre cette ligne")')]);
  await sb.waitForLoadState('networkidle');
  await sb.goto(BASE + '/espace');
  await sb.waitForSelector('text=Mes lignes suivies');
  log('ligne suivie, état :', (await sb.textContent('#alertes + ul')).replace(/\s+/g, ' ').trim());

  // Publication de deux trajets
  const publish = async (cap) => {
    await ta.goto(BASE + '/publier');
    const d = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    await ta.fill('#from_city', 'Paris'); await ta.fill('#to_city', 'Dakar');
    await ta.fill('#departure_date', d); await ta.fill('#departure_time', '14:00');
    await ta.fill('#capacity_kg', String(cap)); await ta.fill('#price_per_kg', '8');
    await ta.selectOption('#mode', 'car');
    await Promise.all([ta.waitForURL('**/trajets/**'), ta.click('button:has-text("Publier mon trajet")')]);
    return ta.url().split('?')[0];
  };
  const trip1 = await publish(15);
  const trip2 = await publish(10);
  await sb.goto(BASE + '/espace');
  log('alerte mise à jour :', (await sb.textContent('#alertes + ul')).replace(/\s+/g, ' ').trim());

  // Demande sur trip2 puis annulation du trajet par le voyageur
  const request = async (url) => {
    await sb.goto(url);
    await sb.fill('#weight_kg', '3'); await sb.selectOption('#category', 'clothing');
    await sb.fill('#description', 'Habits pour la famille'); await sb.fill('#recipient_name', 'Awa Diop');
    await sb.fill('#recipient_phone', '+221 77 000 00 00'); await sb.fill('#recipient_email', 'destinataire@test.fr'); await sb.check('input[name=declaration]');
    await Promise.all([sb.waitForURL('**/reservations/**'), sb.click('button:has-text("Envoyer ma demande")')]);
    return sb.url().split('?')[0];
  };
  const bk2 = await request(trip2);
  await ta.goto(BASE + '/espace?onglet=trajets');
  const tripId2 = trip2.split('/').pop();
  await ta.locator(`article:has(a[href="/trajets/${tripId2}"]) button:has-text("Annuler ce trajet")`).click();
  await ta.waitForSelector(`article:has(a[href="/trajets/${tripId2}"]) >> text=Trajet annulé`);
  log('trajet annulé ; demande en attente →', sql(`select status from bookings where id='${bk2.split('/').pop()}'`));

  // Réservation sur trip1, temps réel
  const bk1 = await request(trip1);
  const bookingId = bk1.split('/').pop();
  await ta.goto(bk1);
  await ta.click('button:has-text("Accepter la demande")');
  await ta.waitForSelector('text=En attente du paiement');
  await sb.waitForSelector('button:has-text("Payer")', { timeout: 15000 });
  log('temps réel : l\'expéditeur voit « Payer » sans recharger');
  await ta.fill('#body', 'Rendez-vous gare de Lyon jeudi 18h ?');
  await ta.click('button:has-text("Envoyer")');
  await sb.waitForSelector('text=gare de Lyon jeudi', { timeout: 15000 });
  log('temps réel : message reçu sans recharger');

  // Paiement simulé (webhook signé)
  const total = sql(`select total_cents from bookings where id='${bookingId}'`);
  const stripe = new Stripe('sk_test_local_dummy');
  const payload = JSON.stringify({ id: 'evt_' + run, object: 'event', type: 'checkout.session.completed', data: { object: { id: 'cs_' + run, object: 'checkout.session', metadata: { booking_id: bookingId }, amount_total: +total, currency: 'eur', payment_status: 'paid', payment_intent: 'pi_' + run } } });
  await fetch(BASE + '/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_local_test' }) }, body: payload });
  await sb.waitForSelector('p.tracking-\\[0\\.3em\\]', { timeout: 15000 });
  const code = (await sb.textContent('p.tracking-\\[0\\.3em\\]')).trim();
  log('payé, code affiché à l\'expéditeur en temps réel');

  // Signalement par l'expéditeur
  await sb.click('button:has-text("Signaler un problème")');
  await sb.selectOption('#reason', 'behaviour');
  await sb.fill('#details', 'Le voyageur ne répond plus depuis deux jours.');
  await sb.click('button:has-text("Envoyer le signalement")');
  await sb.waitForSelector('text=Signalement envoyé');
  log('signalement envoyé');

  // Livraison
  await addPhotos(sb, bk1, ['contents', 'packed']);
  await addPhotos(ta, bk1, ['pickup']);
  await ta.click('button:has-text("J\'ai reçu le colis")');
  await ta.waitForSelector('text=Photo attendue');
  await addPhotos(ta, bk1, ['arrival_packed']);
  await ta.waitForSelector('#code');
  await ta.fill('#code', code);
  await ta.click('button:has-text("Valider la réception")');
  await ta.waitForSelector('text=Colis réceptionné');
  log('livré ; versement →', sql(`select payout_status from bookings where id='${bookingId}'`));

  // Non-admin sur /admin
  const r = await sb.goto(BASE + '/admin'); await sb.waitForLoadState('networkidle');
  log('non-admin sur /admin → page 404 :', (await sb.textContent('body')).includes("n'a pas embarqué"));

  // Promotion admin (app_metadata, côté serveur uniquement) puis reconnexion
  sql(`update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email='a${run}@test.fr'`);
  sql(`update profiles set onboarded_at = now() where id = (select id from auth.users where email='a${run}@test.fr')`);
  await adminCtx.clearCookies();
  await ad.goto(BASE + '/connexion?suite=%2Fadmin%3Fonglet%3Dsignalements');
  await ad.fill('#email', `a${run}@test.fr`); await ad.fill('#password', 'motdepasse-solide-1');
  await Promise.all([ad.waitForURL('**/admin**'), ad.click('form:has(#password) button[type=submit]')]);
  await ad.waitForSelector('h1:has-text("Administration")');
  log('admin connecté');
  await ad.waitForSelector('text=ne répond plus depuis deux jours');
  const item = ad.locator('li', { hasText: 'ne répond plus depuis deux jours' }).last();
  await item.locator('input[name=resolution]').fill('Voyageur contacté, livraison confirmée.');
  await item.locator('button:has-text("Clore")').click();
  for (let i = 0; i < 30 && sql(`select status from reports where booking_id='${bookingId}'`) !== 'resolved'; i++) await ad.waitForTimeout(500);
  log('signalement clos →', sql(`select status from reports where booking_id='${bookingId}'`));
  await ad.goto(BASE + '/admin?onglet=versements');
  await ad.fill(`#ref-${bookingId}`, 'VIR-2026-001');
  await ad.locator(`form:has(#ref-${bookingId}) button`).click();
  await ad.waitForSelector(`#ref-${bookingId}`, { state: 'detached' });
  log('versement →', sql(`select payout_status || ' ' || payout_reference from bookings where id='${bookingId}'`));
  await ad.goto(BASE + '/admin?onglet=membres&q=Fatou');
  await ad.locator('li', { hasText: 'Fatou S.' }).first().locator('button:has-text("Marquer vérifié")').click();
  await ad.waitForSelector('button:has-text("Retirer la vérification")');
  log('identité vérifiée →', sql(`select id_verified from profiles where full_name='Fatou S.' order by created_at desc limit 1`));
  await ad.screenshot({ path: __dirname + '/screenshots/admin.png', fullPage: true });

  // Un membre ne peut pas se donner le rôle admin via user_metadata
  await b.close();
})().catch((e) => { console.error('ÉCHEC', e); process.exit(1); });
