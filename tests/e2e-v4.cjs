// Négociation du prix, messagerie sans coordonnées, code envoyé au destinataire, transit automatique,
// réception validée et messages de fin. Prérequis identiques à tests/e2e.cjs. Lancer : node tests/e2e-v4.cjs
const { chromium } = require('playwright');
const addPhotos = require('./photos.cjs');
const Stripe = require('stripe');
const { execSync } = require('child_process');
const BASE = 'http://localhost:3000';
const sql = (q) => execSync(`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -X -t -A -c ${JSON.stringify(q)}`).toString().trim();
const log = (...a) => console.log('✔', ...a);
const fail = (m) => { console.log('ÉCHEC', m); process.exitCode = 1; };

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

  // 1. Voyageur : trajet avec arrivée prévue
  const t = await signup(b, 'Moussa', 'Diallo', `tr${run}@test.fr`, '/publier');
  const tid = sql(`select id from auth.users where email='tr${run}@test.fr'`);
  await t.goto(BASE + '/publier');
  await t.fill('#from_city', 'Paris'); await t.fill('#to_city', 'Dakar');
  await t.fill('#departure_date', day(4)); await t.fill('#departure_time', '10:00');
  await t.fill('#arrival_date', day(4)); await t.fill('#arrival_time', '16:30');
  await t.selectOption('#mode', 'car');
  await t.fill('#capacity_kg', '20'); await t.fill('#price_per_kg', '10');
  await Promise.all([t.waitForURL('**/trajets/**'), t.click('button:has-text("Publier mon trajet")')]);
  const tripUrl = t.url().split('?')[0];
  const tripId = tripUrl.split('/').pop();
  log('trajet publié, arrivée enregistrée :', sql(`select arrival_at is not null from trips where id='${tripId}'`));

  // 2. Expéditeur : réservation avec e-mail du destinataire et proposition de prix
  const s = await signup(b, 'Awa', 'Ndiaye', `ex${run}@test.fr`, tripUrl);
  const sid = sql(`select id from auth.users where email='ex${run}@test.fr'`);
  await s.goto(tripUrl);
  await s.fill('#weight_kg', '4'); await s.selectOption('#category', 'clothing');
  await s.fill('#description', 'Vêtements pour la famille');
  await s.fill('#recipient_name', 'Fatou Sow'); await s.fill('#recipient_phone', '+221 77 000 00 00');
  await s.fill('#recipient_email', 'fatou@test.fr');
  await s.click('summary:has-text("Proposer un autre prix")'); await s.fill('#offer_price', '7');
  await s.check('input[name=declaration]');
  await Promise.all([s.waitForURL('**/reservations/**'), s.click('button:has-text("Envoyer ma demande")')]);
  const bookingUrl = s.url().split('?')[0];
  const bid = bookingUrl.split('/').pop();
  log('demande avec e-mail destinataire et offre →', sql(`select recipient_email || ' | offre ' || (select price_per_kg_cents from price_offers where booking_id=b.id and status='pending') from bookings b where id='${bid}'`));

  // 3. Le voyageur fait une contre-proposition, l'expéditeur l'accepte
  await t.goto(bookingUrl);
  await t.waitForSelector('text=Proposition de Awa');
  await t.fill('input[name=price]', '8');
  await t.click('button:has-text("Proposer")');
  await t.waitForSelector('text=Votre proposition');
  await s.goto(bookingUrl);
  await s.waitForSelector('text=Proposition de Moussa');
  await s.click('button:has-text("Accepter ce prix")');
  await s.waitForSelector('text=Prix en vigueur : 8 €');
  log('contre-proposition acceptée → prix/base/total :', sql(`select price_per_kg_cents || ' / ' || base_cents || ' / ' || total_cents from bookings where id='${bid}'`));
  const offers = sql(`select string_agg(price_per_kg_cents || ':' || status, ', ' order by created_at) from price_offers where booking_id='${bid}'`);
  log('historique des offres :', offers);

  // 4. Messagerie : numéros et e-mails bloqués, appel intégré disponible
  for (const msg of ['Appelle-moi au 06 12 34 56 78', 'zéro six douze trente-quatre cinquante-six soixante-dix-huit', 'mon mail awa@gmail.com']) {
    await s.fill('#body', msg);
    await s.click('button:has-text("Envoyer")');
    await s.waitForSelector('text=ne peuvent pas être échangés');
  }
  log('3 tentatives de partage de coordonnées bloquées ; messages en base :', sql(`select count(*) from messages where booking_id='${bid}'`));
  await s.fill('#body', 'Bonjour, je peux vous remettre le colis jeudi soir ?');
  await s.click('button:has-text("Envoyer")');
  await s.waitForSelector('text=jeudi soir');
  log('message normal envoyé');
  const direct = await s.evaluate(async ({ bid, sid }) => {
    const key = Object.keys(localStorage).find((k) => k.includes('auth-token'));
    const raw = document.cookie.split('; ').find((c) => c.includes('auth-token'));
    return { key: Boolean(key), cookie: Boolean(raw) };
  }, { bid, sid });
  try {
    sql(`insert into messages (booking_id, author_id, body) values ('${bid}', '${sid}', 'mon numéro : 0612345678')`);
    fail('le garde-fou de la base aurait dû refuser le numéro');
  } catch { log('garde-fou de la base : insertion directe d\'un numéro refusée'); }
  void direct;
  log('bouton d\'appel intégré présent :', await s.locator('button[aria-label*="ppel"], button:has-text("Appeler")').count() > 0);

  // 5. Acceptation, paiement (webhook signé)
  await t.goto(bookingUrl);
  await t.click('button:has-text("Accepter la demande")');
  await t.waitForSelector('text=En attente du paiement');
  const total = Number(sql(`select total_cents from bookings where id='${bid}'`));
  const stripe = new Stripe('sk_test_local_dummy');
  const payload = JSON.stringify({ id: 'evt_' + run, object: 'event', type: 'checkout.session.completed', data: { object: { id: 'cs_' + run, object: 'checkout.session', metadata: { booking_id: bid }, client_reference_id: bid, amount_total: total, currency: 'eur', payment_status: 'paid', payment_intent: 'pi_' + run } } });
  await fetch(BASE + '/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_local_test' }), 'content-type': 'application/json' }, body: payload });
  await s.goto(bookingUrl);
  log('statut après paiement :', await s.locator('h1 + span, h1 ~ span').first().textContent());
  log('code créé pour le destinataire :', sql(`select delivery_code ~ '^[0-9]{6}$' from booking_secrets where booking_id='${bid}'`), '(e-mail envoyé seulement si Brevo est configuré)');

  // 6. Le voyageur reçoit le colis, puis le vol décolle et atterrit (horaires avancés pour le test)
  // L'expéditeur tente de réutiliser la photo du contenu pour le colis emballé (même recompressée) : refusé
  const sharp = require('sharp');
  const photoA = await addPhotos.image();
  await s.goto(bookingUrl);
  await addPhotos.upload(s, 'contents', photoA);
  await s.waitForSelector('[data-photo-step="contents"] img');
  await s.reload();
  await addPhotos.upload(s, 'packed', await sharp(photoA).resize(320).jpeg({ quality: 45 }).toBuffer());
  await s.waitForSelector('[data-photo-step="packed"] [role=alert]');
  log('même photo réutilisée :', (await s.textContent('[data-photo-step="packed"] [role=alert]')).trim());
  await addPhotos(s, bookingUrl, ['packed']);
  await addPhotos(t, bookingUrl, ['pickup']);
  log('photos départ (contenu, emballé, prise en charge) :', sql(`select count(*) from booking_photos where booking_id='${bid}'`));
  await t.click('button:has-text("J\'ai reçu le colis")');
  await t.waitForSelector('text=Colis reçu par le voyageur');
  log('statut après prise en charge : Colis reçu par le voyageur');
  sql(`update trips set departure_at = now() - interval '2 hours', arrival_at = now() + interval '3 hours' where id='${tripId}'`);
  await s.goto(bookingUrl);
  await s.waitForSelector('span:has-text("En transit")', { timeout: 8000 }).catch(() => s.reload().then(() => s.waitForSelector('span:has-text("En transit")')));
  log('passage automatique en transit au décollage');
  sql(`update trips set arrival_at = now() - interval '5 minutes' where id='${tripId}'`);
  const r = await fetch(BASE + '/api/cron/transit');
  log('tâche planifiée de transit →', r.status, await r.text());
  await s.goto(bookingUrl);
  await s.waitForSelector('span:has-text("Arrivé à destination")');
  log('passage automatique à « Arrivé à destination »');
  log('étapes :', sql(`select string_agg(kind, ' > ' order by created_at) from booking_events where booking_id='${bid}'`));
  log('notifications « en transit » reçues par l\'expéditeur :', sql(`select count(*) from notifications where user_id='${sid}' and kind='booking_departed'`));

  // 7. Réception : le destinataire donne son code, messages de fin
  const code = sql(`select delivery_code from booking_secrets where booking_id='${bid}'`);
  await addPhotos(t, bookingUrl, ['arrival_packed', 'arrival_opened']);
  await t.fill('#code', code);
  await t.click('button:has-text("Valider")');
  await t.waitForSelector('text=Colis réceptionné');
  log('réception validée →', sql(`select status from bookings where id='${bid}'`));
  log('expéditeur :', sql(`select title || ' — ' || body from notifications where user_id='${sid}' and kind='booking_delivered'`));
  log('voyageur :', sql(`select title || ' — ' || body from notifications where user_id='${tid}' and kind='booking_delivered'`));
  await s.goto(BASE + '/suivi/' + sql(`select tracking_code from bookings where id='${bid}'`));
  await s.waitForSelector('text=Colis réceptionné par le destinataire');
  log('suivi public : réception affichée');
  await b.close();
})().catch((e) => { console.log('ÉCHEC', e); process.exit(1); });
