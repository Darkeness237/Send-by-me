// Parrainage, prix conseillé et livraison à domicile. Prérequis identiques à tests/e2e.cjs.
// Lancer : node tests/e2e-referral.cjs
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const BASE = 'http://localhost:3000';
const sql = (q) => execSync(`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -X -t -A -c ${JSON.stringify(q)}`).toString().trim();
const log = (...a) => console.log('✔', ...a);

async function signup(b, first, last, email, path) {
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.goto(BASE + path);
  await p.fill('#first_name', first); await p.fill('#last_name', last);
  await p.fill('#email', email); await p.fill('#password', 'motdepasse-solide-1');
  await p.check('input[name=terms]');
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/inscription')), p.click('form:has(#first_name) button[type=submit]')]);
  return p;
}

(async () => {
  const b = await chromium.launch();
  const run = Date.now();

  // Parrain : récupère son code et son lien
  const a = await signup(b, 'Yannick', 'Mbappe', `ref${run}@test.fr`, '/inscription?suite=/espace/parrainage');
  await a.waitForSelector('text=Votre code de parrainage');
  const code = sql(`select referral_code from profiles p join auth.users u on u.id = p.id where u.email='ref${run}@test.fr'`);
  log('code de parrainage :', code, '| lien affiché :', (await a.textContent('main')).includes(`/inscription?parrain=${code}`));

  // Prix conseillé et plafond à la publication
  await a.goto(BASE + '/publier');
  const d = new Date(Date.now() + 8 * 864e5).toISOString().slice(0, 10);
  await a.fill('#from_city', 'Lyon'); await a.fill('#to_city', 'Abidjan');
  await a.fill('#departure_date', d);
  await a.selectOption('#mode', 'car');
  await a.fill('#capacity_kg', '150');
  await a.fill('#price_per_kg', '40');
  log('jauge avec 40 €/kg :', (await a.textContent('[aria-live=polite]')).match(/Trop élevé[^.]*/)?.[0]);
  log('le voyageur voit-il le total expéditeur ?', (await a.textContent('[aria-live=polite]')).includes("l'expéditeur paie") ? 'OUI (KO)' : 'non (OK)');
  log('le navigateur bloque le champ :', await a.evaluate(() => !document.querySelector('#price_per_kg').checkValidity()));
  await a.evaluate(() => document.querySelector('#price_per_kg').removeAttribute('max')); // contourne le contrôle du navigateur
  await a.click('button:has-text("Publier mon trajet")');
  await a.waitForSelector('text=Prix trop élevé pour cette ligne');
  log('prix au-dessus du plafond → refusé par le serveur');
  await a.fill('#price_per_kg', '5');
  await Promise.all([a.waitForURL('**/trajets/**'), a.click('button:has-text("Publier mon trajet")')]);
  const tripUrl = a.url().split('?')[0];
  log('trajet de 150 kg publié, forfait livraison →', sql(`select home_delivery_cents from trips where id='${tripUrl.split('/').pop()}'`));

  // Filleul : arrive par le lien, voit l'invitation, reçoit 5 €
  const f = await (await b.newContext()).newPage();
  await f.goto(`${BASE}/inscription?parrain=${code}&suite=${encodeURIComponent(new URL(tripUrl).pathname)}`);
  log('bandeau d\'invitation :', (await f.textContent('[role=status]')).trim());
  await f.fill('#first_name', 'Grace'); await f.fill('#last_name', 'Kamga');
  await f.fill('#email', `fil${run}@test.fr`); await f.fill('#password', 'motdepasse-solide-1');
  await f.check('input[name=terms]');
  await Promise.all([f.waitForURL('**/trajets/**'), f.click('form:has(#first_name) button[type=submit]')]);
  const fid = sql(`select id from auth.users where email='fil${run}@test.fr'`);
  log('parrainage enregistré →', sql(`select status from referrals where referee_id='${fid}'`), '| crédit filleul →', sql(`select sum(amount_cents) from credit_entries where user_id='${fid}'`));

  // Réservation avec livraison à domicile choisie par l'expéditeur, crédit déduit
  await f.fill('#weight_kg', '3');
  await f.selectOption('#category', 'documents');
  await f.fill('#description', 'Dossier administratif');
  await f.fill('#recipient_name', 'Koffi A.');
  await f.fill('#recipient_phone', '+225 07 00 00 00 00'); await f.fill('#recipient_email', 'destinataire@test.fr');
  await f.check('input[name=home_delivery]');
  await f.fill('#delivery_address', 'Cocody, Riviera 2');
  await f.check('input[name=declaration]');
  log('récapitulatif :', (await f.textContent('dl.tabular')).replace(/\s+/g, ' ').trim());
  await Promise.all([f.waitForURL('**/reservations/**'), f.click('button:has-text("Envoyer ma demande")')]);
  const bookingId = f.url().split('?')[0].split('/').pop();
  log('réservation (transport/livraison/frais/remise/total) →', sql(`select base_cents||'/'||delivery_cents||'/'||fee_cents||'/'||discount_cents||'/'||total_cents from bookings where id='${bookingId}'`));
  log('crédit restant →', sql(`select sum(amount_cents) from credit_entries where user_id='${fid}'`));

  // Annulation : le crédit est rendu
  await f.click('button:has-text("Annuler la demande")');
  for (let i = 0; i < 20 && sql(`select status from bookings where id='${bookingId}'`) !== 'cancelled'; i++) await f.waitForTimeout(500);
  log('après annulation, crédit →', sql(`select sum(amount_cents) from credit_entries where user_id='${fid}'`));

  // Première livraison du filleul (simulée en base) : le parrain est récompensé, une seule fois
  sql(`update bookings set status='delivered', delivered_at=now() where id='${bookingId}'`);
  sql(`update bookings set status='picked_up' where id='${bookingId}'`);
  sql(`update bookings set status='delivered' where id='${bookingId}'`);
  const aid = sql(`select id from auth.users where email='ref${run}@test.fr'`);
  log('parrainage →', sql(`select status from referrals where referee_id='${fid}'`), '| crédit parrain →', sql(`select coalesce(sum(amount_cents),0) from credit_entries where user_id='${aid}'`), '(500 attendu, une seule fois)');
  await a.goto(BASE + '/espace/parrainage');
  log('page parrainage :', (await a.textContent('main')).includes('gagnés') ? 'filleul affiché comme récompensé' : 'KO');
  await a.screenshot({ path: require('path').join(__dirname, 'screenshots', 'parrainage.png'), fullPage: true });

  // Un code inventé ou le sien ne donne rien
  log('auto-parrainage refusé →', sql(`select public.attach_referral('${aid}', '${code}')`));
  await b.close();
})().catch((e) => { console.error('ÉCHEC', e); process.exit(1); });
