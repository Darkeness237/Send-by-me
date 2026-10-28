// Parcours complet sur Supabase local. Prérequis : npm run db:start, puis
// STRIPE_SECRET_KEY=sk_test_local_dummy STRIPE_WEBHOOK_SECRET=whsec_local_test npm run dev
// Lancer : node tests/e2e.cjs
const { chromium } = require('playwright');
const addPhotos = require('./photos.cjs');
const Stripe = require('stripe');
const BASE = 'http://localhost:3000';
const shot = (p, n) => p.screenshot({ path: require('path').join(__dirname, 'screenshots', 'e2e-' + n) + '.png', fullPage: true });
const log = (...a) => console.log('✔', ...a);
const sql = (q) => require('child_process').execSync(`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -X -t -A -c ${JSON.stringify(q)}`).toString().trim();

(async () => {
  const b = await chromium.launch();
  const run = Date.now();
  const A = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const B = await b.newContext({ viewport: { width: 390, height: 844 } });
  const ta = await A.newPage(), sb = await B.newPage();
  for (const p of [ta, sb]) p.on('pageerror', e => console.log('PAGEERROR', e.message));

  // 1. Voyageur : inscription + publication
  await ta.goto(BASE + '/inscription?suite=/publier');
  await ta.fill('#first_name', String('Aïcha N.').split(' ')[0]); await ta.fill('#last_name', (String('Aïcha N.').split(' ')[1] || 'Test').replace('.', '') + 'ndo');
  await ta.fill('#email', `traveler${run}@test.fr`);
  await ta.fill('#password', 'motdepasse-solide-1');
  await ta.check('input[name=terms]');
  await Promise.all([ta.waitForURL('**/publier'), ta.click('form:has(#password) button[type=submit]')]);
  log('voyageur inscrit, redirigé vers /publier');
  const d = new Date(Date.now() + 4 * 864e5).toISOString().slice(0, 10);
  await ta.fill('#from_city', 'Paris'); await ta.fill('#to_city', 'Douala');
  await ta.waitForSelector('#from_airport option[value=CDG]', { state: 'attached' });
  await ta.waitForSelector('#to_airport option[value=DLA]', { state: 'attached' });
  log('aéroports proposés pour Paris :', (await ta.locator('#from_airport option').allTextContents()).map((t) => t.split(' ')[0]).join(', '));
  await ta.fill('#departure_date', d); await ta.fill('#departure_time', '09:30');
  await ta.fill('#capacity_kg', '20'); await ta.fill('#price_per_kg', '9');
  await ta.fill('#pickup_note', 'Gare de Lyon, la veille du départ');
  await ta.fill('#dropoff_note', 'Akwa, le lendemain de mon arrivée');
  // Vol : compagnie, numéro, aéroports, franchise bagage (contrôles automatiques)
  await ta.selectOption('#carrier', 'AF');
  await ta.fill('#transport_ref', 'AF 999');
  await ta.check('input[name=ticket_name_matches]');
  // Erreur volontaire : un vol Air France ne commence pas par SN
  await ta.fill('#transport_ref', 'SN205');
  await ta.click('button:has-text("Publier mon trajet")');
  await ta.waitForSelector('text=ne correspond pas à la compagnie');
  log('numéro de vol incohérent avec la compagnie → refusé');
  await ta.fill('#transport_ref', 'AF 946');
  // Forfait de livraison à domicile (l'option est proposée sur tous les trajets)
  await shot(ta, '01-publier');
  await Promise.all([ta.waitForURL('**/trajets/**'), ta.click('button:has-text("Publier mon trajet")')]);
  const tripUrl = ta.url().split('?')[0];
  log('trajet publié', tripUrl);
  const tripId0 = tripUrl.split('/').pop();
  log('contrôle du vol →', sql(`select transport_check || ' ' || transport_ref || ' ' || from_airport || '>' || to_airport from trips where id='${tripId0}'`));
  await shot(ta, '02-trajet-publie');

  // 2. Expéditeur : inscription + demande
  await sb.goto(BASE + '/inscription?suite=' + encodeURIComponent(new URL(tripUrl).pathname));
  await sb.fill('#first_name', String('Paul M.').split(' ')[0]); await sb.fill('#last_name', (String('Paul M.').split(' ')[1] || 'Test').replace('.', '') + 'ndo');
  await sb.fill('#email', `sender${run}@test.fr`);
  await sb.fill('#password', 'motdepasse-solide-2');
  await sb.check('input[name=terms]');
  await Promise.all([sb.waitForURL('**/trajets/**'), sb.click('form:has(#password) button[type=submit]')]);
  log('expéditeur inscrit, revenu sur le trajet');
  // Question avant réservation
  await Promise.all([sb.waitForURL('**/messages/**'), sb.click('button:has-text("Poser une question")')]);
  await sb.fill('#body', 'Bonjour, acceptez-vous des chaussures ?');
  await sb.click('button:has-text("Envoyer")');
  await sb.waitForSelector('text=acceptez-vous des chaussures');
  log('question envoyée avant réservation');
  await ta.goto(BASE + '/espace');
  log('badge non lu chez le voyageur :', await ta.getAttribute('header a[href="/messages"]', 'aria-label'));
  await ta.goto(BASE + '/messages');
  await ta.click('a:has-text("acceptez-vous des chaussures")');
  await ta.waitForURL('**/messages/**');
  await ta.fill('#body', 'Oui, sans problème.');
  await ta.click('button:has-text("Envoyer")');
  await sb.waitForSelector('text=Oui, sans problème', { timeout: 15000 });
  log('réponse reçue en temps réel par l\'expéditeur');
  await ta.goto(BASE + '/espace');
  log('badge après lecture :', await ta.getAttribute('header a[href="/messages"]', 'aria-label'));
  await sb.goto(tripUrl);
  await sb.fill('#weight_kg', '6');
  await sb.selectOption('#category', 'clothing');
  await sb.fill('#description', 'Vêtements et fournitures scolaires');
  await sb.fill('#recipient_name', 'Marie Ngo');
  await sb.fill('#recipient_phone', '+237 699 00 00 00'); await sb.fill('#recipient_email', 'destinataire@test.fr');
  await sb.check('input[name=declaration]');
  await shot(sb, '03-reserver-mobile');
  await Promise.all([sb.waitForURL('**/reservations/**'), sb.click('button:has-text("Envoyer ma demande")')]).catch(async (e) => { console.log('alerte :', await sb.locator('[role=alert]').allTextContents()); throw e; });
  const bookingUrl = sb.url().split('?')[0];
  const bookingId = bookingUrl.split('/').pop();
  log('demande envoyée', bookingId);
  log('prix enregistré (transport/livraison/frais/total, taux) →', sql(`select base_cents || '/' || delivery_cents || '/' || fee_cents || '/' || total_cents || ' ' || commission_rate from bookings where id='${bookingId}'`));
  await sb.fill('#body', 'Bonjour, je peux passer jeudi soir ?');
  await sb.click('button:has-text("Envoyer")');
  await sb.waitForSelector('text=je peux passer jeudi soir');
  log('message envoyé');

  // 3. Voyageur accepte
  await ta.goto(BASE + '/espace?onglet=trajets');
  await shot(ta, '04-espace-voyageur');
  await ta.click('button:has-text("Accepter")');
  await ta.waitForSelector('text=Acceptée, à payer');
  log('demande acceptée');

  // 4. Expéditeur voit "Payer" ; paiement simulé via webhook signé
  await sb.goto(bookingUrl);
  const payText = await sb.textContent('button:has-text("Payer")');
  log('bouton de paiement :', payText.trim());
  const total = Math.round(parseFloat(payText.replace(/[^\d,]/g, '').replace(',', '.')) * 100);
  const stripe = new Stripe('sk_test_local_dummy');
  const sendEvent = async (amount) => {
    const payload = JSON.stringify({ id: 'evt_' + Date.now() + amount, object: 'event', type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_' + run, object: 'checkout.session', metadata: { booking_id: bookingId }, client_reference_id: bookingId,
        amount_total: amount, currency: 'eur', payment_status: 'paid', payment_intent: 'pi_test_' + run + amount } } });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_local_test' });
    const r = await fetch(BASE + '/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': header, 'content-type': 'application/json' }, body: payload });
    return r.status;
  };
  const bad = await fetch(BASE + '/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=faux' }, body: '{}' });
  log('webhook avec fausse signature →', bad.status);
  log('webhook montant falsifié (1 €) →', await sendEvent(100));
  await sb.reload(); await sb.waitForSelector('button:has-text("Payer")');
  log('statut après montant falsifié :', (await sb.textContent('main')).includes('Acceptée, à payer') ? 'toujours à payer (OK)' : 'CHANGÉ (KO)');
  log('webhook correct →', await sendEvent(total));
  log('webhook rejoué →', await sendEvent(total));
  await sb.reload();
  const code = (await sb.textContent('p.tracking-\\[0\\.3em\\]')).trim();
  log('code de remise visible par l\'expéditeur :', code.replace(/\d/g, '•'));
  await shot(sb, '05-code-remise-mobile');

  // 5. Voyageur : ne voit pas le code, prend le colis, livre
  await addPhotos(sb, bookingUrl, ['contents', 'packed']);
  await ta.goto(bookingUrl);
  log('bouton « J\'ai reçu le colis » avant la photo du voyageur ?', (await ta.locator('button:has-text("J\'ai reçu le colis")').count()) ? 'OUI (KO)' : 'non (OK)');
  await addPhotos(ta, bookingUrl, ['pickup']);
  log('le voyageur voit le code ?', (await ta.textContent('main')).includes(code) ? 'OUI (KO)' : 'non (OK)');
  await ta.click('button:has-text("J\'ai reçu le colis")');
  await ta.waitForSelector('text=Photo attendue');
  await addPhotos(ta, bookingUrl, ['arrival_packed']);
  log('photos du colis →', sql(`select string_agg(kind, ', ' order by created_at) from booking_photos where booking_id='${bookingId}'`));
  await ta.waitForSelector('#code');
  await ta.fill('#code', code === '000000' ? '111111' : '000000');
  await ta.click('button:has-text("Valider la réception")');
  await ta.waitForSelector('text=Code incorrect');
  log('mauvais code refusé :', (await ta.textContent('[role=alert]')).trim());
  await ta.fill('#code', code);
  await ta.click('button:has-text("Valider la réception")');
  await ta.waitForSelector('[role=status]:has-text("Colis réceptionné")');
  log('livraison confirmée avec le bon code');
  await ta.reload();
  await ta.click('label:has-text("5")');
  await ta.fill('textarea[name=comment]', 'Colis bien préparé, échange agréable.');
  await ta.click('button:has-text("Publier mon avis")');
  await ta.waitForSelector('text=Merci pour votre avis');
  log('avis voyageur publié');
  await shot(ta, '06-livre');

  // 6. Expéditeur laisse un avis
  await sb.goto(bookingUrl);
  await sb.click('label:has-text("5")');
  await sb.click('button:has-text("Publier mon avis")');
  await sb.waitForSelector('text=Merci pour votre avis');
  log('avis expéditeur publié');

  // 7. Un tiers ne peut pas voir la réservation
  const C = await b.newContext(); const tc = await C.newPage();
  await tc.goto(BASE + '/inscription');
  await tc.fill('#first_name', String('Intrus X.').split(' ')[0]); await tc.fill('#last_name', (String('Intrus X.').split(' ')[1] || 'Test').replace('.', '') + 'ndo'); await tc.fill('#email', `x${run}@test.fr`); await tc.fill('#password', 'motdepasse-solide-3');
  await tc.check('input[name=terms]');
  await Promise.all([tc.waitForURL('**/espace'), tc.click('form:has(#password) button[type=submit]')]);
  const r = await tc.goto(bookingUrl);
  await tc.waitForLoadState('networkidle');
  const body = await tc.textContent('body');
  log('tiers sur la réservation → HTTP', r.status(), '| page 404 :', body.includes("n'a pas embarqué"), '| fuite de données :', body.includes('Marie Ngo') || body.includes('fournitures'));

  // 8. Recherche publique
  const anon = await (await b.newContext()).newPage();
  await anon.goto(BASE + '/recherche?from=Paris&to=Douala');
  log('recherche publique trouve le trajet :', await anon.locator(`a[href="${new URL(tripUrl).pathname}"]`).count() === 1);
  await shot(anon, '07-recherche');
  await b.close();
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
