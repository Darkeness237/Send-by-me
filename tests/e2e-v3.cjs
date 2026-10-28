// Demandes d'envoi et correspondances, notifications, livraison à domicile Send By Me, suivi d'envoi,
// écran de bienvenue. Prérequis identiques à tests/e2e.cjs. Lancer : node tests/e2e-v3.cjs
const { chromium } = require('playwright');
const Stripe = require('stripe');
const { execSync } = require('child_process');
const path = require('path');
const BASE = 'http://localhost:3000';
const sql = (q) => execSync(`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -X -t -A -c ${JSON.stringify(q)}`).toString().trim();
const log = (...a) => console.log('✔', ...a);
const fx = (n) => path.join(__dirname, 'fixtures', n);

async function signup(b, first, last, email, next) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.goto(`${BASE}/inscription?suite=${encodeURIComponent(next)}`);
  await p.fill('#first_name', first); await p.fill('#last_name', last);
  await p.fill('#email', email); await p.fill('#password', 'motdepasse-solide-1');
  await p.check('input[name=terms]');
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/inscription')), p.click('form:has(#first_name) button[type=submit]')]);
  return p;
}

(async () => {
  const b = await chromium.launch();
  const run = Date.now();
  const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

  // 1. Expéditeur : demande d'envoi avec photo
  const s = await signup(b, 'Nadia', 'Kouam', `req${run}@test.fr`, '/demandes/nouvelle');
  const sid = sql(`select id from auth.users where email='req${run}@test.fr'`);
  await s.fill('#from_city', 'Lyon'); await s.fill('#to_city', 'Abidjan');
  await s.fill('#latest_date', day(30));
  await s.selectOption('#category', 'clothing');
  await s.fill('#weight_kg', '4');
  await s.fill('#description', 'Vêtements pour enfants, carton fermé');
  await s.fill('input[name=length_cm]', '40'); await s.fill('input[name=width_cm]', '30'); await s.fill('input[name=height_cm]', '20');
  await s.check('input[name=wants_home_delivery]');
  await s.locator('input[type=file]').setInputFiles(fx('fixtures-recto.png'));
  await s.waitForSelector('img[alt="Photo du colis"]');
  await Promise.all([s.waitForURL(/\/demandes\/[0-9a-f-]{36}/), s.click('button:has-text("Publier ma demande")')]);
  const requestId = s.url().split('?')[0].split('/').pop();
  log('demande publiée avec photo →', sql(`select cardinality(photos) || ' photo, ' || weight_kg || ' kg, ' || from_city || ' → ' || to_city from shipment_requests where id='${requestId}'`));

  // 2. Voyageur : publie un trajet compatible → l'expéditeur est notifié
  const t = await signup(b, 'Serge', 'Ekane', `trv${run}@test.fr`, '/publier');
  const tid = sql(`select id from auth.users where email='trv${run}@test.fr'`);
  await t.fill('#from_city', 'Lyon'); await t.fill('#to_city', 'Abidjan');
  await t.fill('#departure_date', day(10)); await t.fill('#departure_time', '09:00');
  await t.selectOption('#mode', 'car');
  await t.fill('#capacity_kg', '20'); await t.fill('#price_per_kg', '7');
  await Promise.all([t.waitForURL('**/trajets/**'), t.click('button:has-text("Publier mon trajet")')]);
  const tripUrl = t.url().split('?')[0];
  const tripId = tripUrl.split('/').pop();
  log('notification de l\'expéditeur →', sql(`select title from notifications where user_id='${sid}' and kind='trip_match' order by id desc limit 1`));

  // 3. Le voyageur voit la demande sur son trajet et la propose → discussion ouverte
  await t.goto(tripUrl);
  await t.waitForSelector('text=/cherche(nt)? un voyageur sur votre ligne/');
  await Promise.all([t.waitForURL('**/messages/**'), t.click(`li:has(a[href="/demandes/${requestId}"]) button:has-text("Proposer mon trajet")`)]);
  log('discussion ouverte avec message automatique :', (await t.textContent('main')).includes("J'ai vu votre demande"));
  log('notification « trajet proposé » →', sql(`select title from notifications where user_id='${sid}' and kind='trip_proposed' limit 1`));

  // 4. Expéditeur : la page de la demande liste le trajet correspondant, la cloche affiche les notifications
  await s.goto(`${BASE}/demandes/${requestId}`);
  await s.waitForSelector(`a[href="/trajets/${tripId}"]`);
  log('trajet correspondant affiché sur la demande');
  log('cloche :', await s.getAttribute('header a[href="/notifications"]', 'aria-label'));
  await s.goto(`${BASE}/notifications`);
  await s.waitForSelector('text=Un voyageur vous propose son trajet');
  await s.click('button:has-text("Tout marquer comme lu")');
  for (let i = 0; i < 20 && sql(`select count(*) from notifications where user_id='${sid}' and read_at is null`) !== '0'; i++) await s.waitForTimeout(300);
  log('notifications marquées lues →', sql(`select count(*) from notifications where user_id='${sid}' and read_at is null`), 'non lue');

  // 5. Réservation avec livraison à domicile Send By Me
  await s.goto(tripUrl);
  await s.fill('#weight_kg', '4');
  await s.selectOption('#category', 'clothing');
  await s.fill('#description', 'Vêtements pour enfants');
  await s.fill('#recipient_name', 'Awa Traoré');
  await s.fill('#recipient_phone', '+225 07 00 00 00 00'); await s.fill('#recipient_email', 'destinataire@test.fr');
  await s.check('input[name=home_delivery]');
  await s.fill('#delivery_address', 'Cocody, Riviera 2, villa 14');
  await s.check('input[name=declaration]');
  await Promise.all([s.waitForURL('**/reservations/**'), s.click('button:has-text("Envoyer ma demande")')]);
  const bookingId = s.url().split('?')[0].split('/').pop();
  log('réservation (transport/livraison/frais/total) →', sql(`select base_cents||'/'||delivery_cents||'/'||fee_cents||'/'||total_cents||' '||tracking_code||' '||delivery_status from bookings where id='${bookingId}'`));
  log('notification du voyageur →', sql(`select title from notifications where user_id='${tid}' and kind='booking_requested' limit 1`));

  // L'adresse n'est pas visible par le voyageur, ni dans la page ni par l'API
  await t.goto(`${BASE}/reservations/${bookingId}`);
  await t.waitForSelector('text=Livraison à domicile Send By Me');
  log('adresse visible par le voyageur dans la page ?', (await t.textContent('main')).includes('Riviera') ? 'OUI (KO)' : 'non (OK)');
  const leak = await t.evaluate(async ({ id }) => {
    const parts = document.cookie.split('; ').filter((x) => /-auth-token(\.\d+)?=/.test(x)).sort();
    let v = parts.map((c) => decodeURIComponent(c.split('=').slice(1).join('='))).join('');
    if (v.startsWith('base64-')) { const b64 = v.slice(7).replace(/-/g, '+').replace(/_/g, '/'); v = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)); }
    const token = JSON.parse(v).access_token;
    const r = await fetch(`http://127.0.0.1:54321/rest/v1/booking_deliveries?booking_id=eq.${id}&select=address`, { headers: { apikey: token && 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH', Authorization: `Bearer ${token}` } });
    return (await r.json()).length;
  }, { id: bookingId });
  log('adresse lisible par le voyageur via l\'API :', leak, leak === 0 ? '(OK)' : '(KO)');
  await s.goto(`${BASE}/reservations/${bookingId}`);
  log('adresse visible par l\'expéditeur :', await s.waitForSelector('text=Riviera 2', { timeout: 15000 }).then(() => true, () => false));

  // 6. Acceptation, paiement (webhook signé), remise, étapes du voyage
  await t.click('button:has-text("Accepter la demande")');
  await t.waitForSelector('text=En attente du paiement');
  const total = Number(sql(`select total_cents from bookings where id='${bookingId}'`));
  const stripe = new Stripe('sk_test_local_dummy');
  const payload = JSON.stringify({ id: 'evt_' + run, object: 'event', type: 'checkout.session.completed', data: { object: { id: 'cs_' + run, object: 'checkout.session', metadata: { booking_id: bookingId }, client_reference_id: bookingId, amount_total: total, currency: 'eur', payment_status: 'paid', payment_intent: 'pi_' + run } } });
  await fetch(BASE + '/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_local_test' }), 'content-type': 'application/json' }, body: payload });
  log('payé, notification voyageur →', sql(`select title from notifications where user_id='${tid}' and kind='booking_paid' limit 1`));
  await t.reload();
  await t.click('button:has-text("J\'ai reçu le colis")');
  await t.waitForSelector('button:has-text("Je suis parti")');
  await t.click('button:has-text("Je suis parti")');
  await t.waitForSelector('button:has-text("Je suis arrivé")');
  await t.click('button:has-text("Je suis arrivé")');
  await t.waitForSelector('button:has-text("J\'ai remis le colis au livreur")');
  await t.click('button:has-text("J\'ai remis le colis au livreur")');
  await t.waitForSelector('text=Colis remis au livreur. Le paiement');
  log('étapes enregistrées →', sql(`select string_agg(kind, ' > ' order by created_at) from booking_events where booking_id='${bookingId}'`));

  // 7. Suivi public par numéro (sans nom ni adresse)
  const code = sql(`select tracking_code from bookings where id='${bookingId}'`);
  const pub = await (await b.newContext()).newPage();
  await pub.goto(`${BASE}/suivi`);
  await pub.fill('#code', code.replace('SBM-', ''));
  await Promise.all([pub.waitForURL('**/suivi/SBM-**'), pub.click('button:has-text("Suivre")')]);
  await pub.waitForSelector('text=Où en est le colis');
  const page = await pub.textContent('main');
  log('suivi public :', page.includes('Remis au livreur') ? 'étapes affichées' : 'KO', '| nom/adresse visibles ?', /Riviera|Awa|Nadia/.test(page) ? 'OUI (KO)' : 'non (OK)');
  await pub.screenshot({ path: path.join(__dirname, 'screenshots', 'suivi-public.png'), fullPage: true });

  // 8. Administration : livraison à domicile confirmée → livré, versement dû, notifications
  const a = await signup(b, 'Admin', 'Liv', `adl${run}@test.fr`, '/espace');
  sql(`update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email='adl${run}@test.fr'`);
  sql(`update profiles set onboarded_at = now() where id = (select id from auth.users where email='adl${run}@test.fr')`);
  await a.context().clearCookies();
  await a.goto(BASE + '/connexion?suite=' + encodeURIComponent('/admin?onglet=livraisons'));
  await a.fill('#email', `adl${run}@test.fr`); await a.fill('#password', 'motdepasse-solide-1');
  await Promise.all([a.waitForURL('**/admin**'), a.click('form:has(#email) button[type=submit]')]);
  const item = a.locator('li', { hasText: code });
  log('admin voit l\'adresse de livraison :', (await item.textContent()).includes('Riviera'));
  await item.locator('button:has-text("Livré au destinataire")').click();
  for (let i = 0; i < 30 && sql(`select status from bookings where id='${bookingId}'`) !== 'delivered'; i++) await a.waitForTimeout(400);
  log('livraison →', sql(`select status || ' / ' || delivery_status || ' / versement ' || payout_status from bookings where id='${bookingId}'`));
  log('notification « Colis livré » →', sql(`select title from notifications where user_id='${sid}' and kind='booking_delivered' limit 1`));

  // 9. Première connexion d'un nouveau membre → écran de bienvenue
  const n = await signup(b, 'Paul', 'Mendo', `onb${run}@test.fr`, '/espace');
  await n.context().clearCookies();
  await n.goto(BASE + '/connexion?suite=/recherche');
  await n.fill('#email', `onb${run}@test.fr`); await n.fill('#password', 'motdepasse-solide-1');
  await Promise.all([n.waitForURL('**/bienvenue**'), n.click('form:has(#email) button[type=submit]')]);
  log('première connexion → écran de bienvenue');
  await n.locator('input[type=file]').first().setInputFiles(fx('fixtures-selfie.png'));
  await n.waitForSelector('img[alt^="Photo de"]');
  for (let i = 0; i < 20 && !sql(`select coalesce(avatar_url,'') from profiles where id=(select id from auth.users where email='onb${run}@test.fr')`); i++) await n.waitForTimeout(300);
  log('photo de profil enregistrée :', sql(`select avatar_url like '%/avatars/%' from profiles where id=(select id from auth.users where email='onb${run}@test.fr')`));
  await n.screenshot({ path: path.join(__dirname, 'screenshots', 'bienvenue.png'), fullPage: true });
  await Promise.all([n.waitForURL('**/recherche**'), n.click('button:has-text("Accéder à Send By Me")')]);
  log('après « Accéder à Send By Me » → /recherche ; onboarded :', sql(`select onboarded_at is not null from profiles where id=(select id from auth.users where email='onb${run}@test.fr')`));
  await b.close();
})().catch((e) => { console.error('ÉCHEC', e); process.exit(1); });
