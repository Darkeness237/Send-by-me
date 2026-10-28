// Moyen de versement : IBAN refusé s'il est faux, enregistré s'il est valide, Mobile Money, onglets du profil.
// Prérequis : app sur localhost:3000, Supabase local.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const BASE = 'http://localhost:3000';
const run = Date.now();
const sql = (q) => execSync(`docker exec supabase_db_send-by-me psql -U postgres -Atc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const log = (...a) => console.log('✔', ...a);

(async () => {
  const b = await chromium.launch();
  try {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
    await p.goto(`${BASE}/inscription?suite=${encodeURIComponent('/espace/profil?onglet=compte')}`);
    await p.fill('#first_name', 'Paul'); await p.fill('#last_name', 'Mbarga');
    await p.fill('#email', `pay${run}@test.fr`); await p.fill('#password', 'motdepasse-solide-1');
    await p.check('input[name=terms]');
    await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/inscription')), p.click('form:has(#first_name) button[type=submit]')]);
    await p.goto(`${BASE}/espace/profil?onglet=compte`);
    await p.waitForSelector('text=À ajouter pour recevoir vos gains');
    log('onglet Compte : moyen de versement à ajouter');

    await p.click('a:has-text("Moyen de versement")');
    await p.waitForURL('**/espace/profil/versement');
    await p.fill('#holder_name', 'Paul Mbarga');
    await p.fill('#iban', 'FR76 3000 6000 0112 3456 7890 180');
    await p.click('button:has-text("Enregistrer mon moyen de versement")');
    await p.waitForSelector('text=IBAN invalide');
    log('IBAN faux refusé');
    await p.fill('#iban', 'FR76 3000 6000 0112 3456 7890 189');
    await p.click('button:has-text("Enregistrer mon moyen de versement")');
    await p.waitForSelector('text=/Moyen de versement enregistré|IBAN enregistré/');
    const uid = sql(`select id from auth.users where email='pay${run}@test.fr'`);
    log('IBAN valide enregistré →', sql(`select kind || ' ' || iban || ' ' || country from payout_methods where user_id='${uid}'`));

    await p.goto(`${BASE}/espace/profil/versement`);
    await p.check('input[value=mobile_money]');
    await p.selectOption('#mobile_operator', 'orange');
    await p.fill('#mobile_number', '+237 6 99 11 22 33');
    await p.fill('#country', 'Cameroun');
    await p.click('button:has-text("Mettre à jour")');
    await p.waitForSelector('text=Moyen de versement enregistré');
    log('Mobile Money enregistré →', sql(`select kind || ' ' || mobile_operator || ' ' || mobile_number || ' iban=' || coalesce(iban,'∅') from payout_methods where user_id='${uid}'`));

    await p.goto(`${BASE}/espace/profil?onglet=compte`);
    log('onglet Compte affiche :', (await p.textContent('a[href="/espace/profil/versement"]')).replace(/\s+/g, ' ').trim());
    await p.goto(`${BASE}/espace/profil/versements`); await p.waitForSelector('text=À recevoir');
    await p.goto(`${BASE}/espace/profil/paiements`); await p.waitForSelector('text=Aucun paiement');
    log('pages versements reçus et paiements affichées');

    // Un autre membre ne lit pas ces coordonnées (RLS)
    const other = sql(`select id from auth.users where email<>'pay${run}@test.fr' limit 1`);
    const leak = sql(`begin; set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', '${other}', 'role', 'authenticated')::text, true); select count(*) from payout_methods where user_id='${uid}'; commit`).split('\n').filter((l) => /^\d+$/.test(l)).pop();
    log('lecture par un autre membre →', leak, '(0 attendu)');
  } catch (e) {
    console.log('ÉCHEC', e);
    process.exitCode = 1;
  } finally {
    await b.close();
  }
})();
