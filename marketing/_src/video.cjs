// Vidéos publicitaires : scènes HTML animées, capturées image par image puis encodées en MP4.
// node marketing/_src/video.cjs [filtre]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const { C, icon, logo, cta, chip } = L;

const OUT = path.resolve(__dirname, '../videos');
const FPS = 30;
const filter = process.argv[2];

// ─── Avion qui suit l'arc (images clés calculées sur la courbe) ─────────────
const P0 = [14, 70], P1 = [160, -12], P2 = [306, 70];
const flyKeys = (() => {
  let k = '';
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const x = (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0];
    const y = (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1];
    const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
    const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
    k += `${i * 5}% { transform: translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1)}deg); }\n`;
  }
  return `@keyframes fly { ${k} }`;
})();
const PLANE_D = L.ICONS.plane.match(/d="([^"]+)"/)[1];
function arcV({ width = '100%', light = true, d = 0, dur = 2.2 } = {}) {
  const line = light ? 'rgb(255 255 255/.65)' : 'rgb(14 48 76/.4)';
  const fill = light ? '#fff' : C.ink;
  return `<svg viewBox="0 0 320 84" style="width:${width};overflow:visible">
    <path d="M14 70 Q160 -12 306 70" fill="none" stroke="${line}" stroke-width="2.4" stroke-dasharray="5 9" stroke-linecap="round" style="animation:dashmove 1.4s linear infinite"/>
    <circle cx="14" cy="70" r="6" fill="${C.signal}"/><circle cx="306" cy="70" r="6" fill="${C.signal}"/>
    <g style="animation:fly ${dur}s cubic-bezier(.45,0,.55,1) ${d}s both"><g transform="rotate(45) translate(-12 -12)"><path d="${PLANE_D}" fill="${fill}" stroke="${fill}" stroke-width="1.2"/></g></g>
  </svg>`;
}

const CSS = `
${flyKeys}
@keyframes dashmove { to { stroke-dashoffset: -28; } }
@keyframes up { from { opacity: 0; transform: translateY(1.6rem); } to { opacity: 1; transform: none; } }
@keyframes pop { 0% { opacity: 0; transform: scale(.55); } 70% { opacity: 1; transform: scale(1.06); } 100% { opacity: 1; transform: none; } }
@keyframes left { from { opacity: 0; transform: translateX(-3rem); } to { opacity: 1; transform: none; } }
@keyframes right { from { opacity: 0; transform: translateX(3rem); } to { opacity: 1; transform: none; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes zoom { from { transform: scale(1.16); } to { transform: scale(1); } }
@keyframes pan { from { transform: scale(1.12) translateX(3%); } to { transform: scale(1.12) translateX(-3%); } }
@keyframes stamp { 0% { opacity: 0; transform: rotate(-14deg) scale(2); } 100% { opacity: 1; transform: rotate(-8deg) scale(1); } }
@keyframes strike { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-.6rem); } }
@keyframes check { from { background: #fff; border-color: ${C.line}; } to { background: ${C.brand}; border-color: ${C.brand}; } }
@keyframes grow { from { width: 0; } }
.up, .pop, .left, .right, .fade, .stamp { animation-duration: .8s; animation-timing-function: cubic-bezier(.2,.8,.2,1); animation-fill-mode: both; }
.up { animation-name: up; } .pop { animation-name: pop; } .left { animation-name: left; } .right { animation-name: right; } .fade { animation-name: fade; } .stamp { animation-name: stamp; }
.zoom { animation: zoom linear both; } .pan { animation: pan linear both; }
.scene { position: absolute; inset: 0; overflow: hidden; }
@property --n { syntax: '<integer>'; initial-value: 0; inherits: false; }
.count { counter-reset: n var(--n); } .count::after { content: counter(n); }
`;

// ─── Construction des vidéos ────────────────────────────────────────────────
// Une vidéo = une liste de scènes { dur, html(at) } ; at(d) donne le délai absolu d'un élément.
function build({ W, H, scenes }) {
  const total = scenes.reduce((n, s) => n + s.dur, 0);
  let start = 0, keyframes = '', body = '';
  scenes.forEach((s, i) => {
    const a = (start / total) * 100, b = ((start + s.dur) / total) * 100, f = (0.35 / total) * 100;
    const first = i === 0, last = i === scenes.length - 1;
    keyframes += `@keyframes sc${i} { 0% { opacity: ${first ? 1 : 0}; } ${first ? '' : `${a.toFixed(3)}% { opacity: 0; } ${(a + f).toFixed(3)}% { opacity: 1; }`} ${last ? '' : `${(b - f).toFixed(3)}% { opacity: 1; } ${b.toFixed(3)}% { opacity: 0; }`} 100% { opacity: ${last ? 1 : 0}; } }\n`;
    const s0 = start;
    const at = (d) => `animation-delay:${(s0 + d).toFixed(2)}s`;
    const dur = (d) => `animation-duration:${d}s`;
    body += `<div class="scene" style="animation:sc${i} ${total}s linear both">${s.html(at, dur, s0, s.dur).replace(/ ([?!:;»])/g, '\u00a0$1').replace(/« /g, '«\u00a0')}</div>`;
    start += s.dur;
  });
  const rem = W / H > 1.25 ? Math.min(W / 78, H / 36) : W / H < 0.8 ? (W / 54) * 1.28 : W / 54;
  const html = `<!doctype html><html style="--w:${W}px;--h:${H}px;--f:1rem;font-size:${rem}px"><head><meta charset="utf-8"><style>${L.BASE_CSS}${CSS}${keyframes}</style></head><body style="position:relative;background:${C.ink}">${body}</body></html>`;
  return { html, total };
}

const tall = (W, H) => W / H < 0.8;
const logoPill = (top = '4.6rem') => `<div class="abs" style="top:${top};left:2.6rem;background:${C.paper};border-radius:999px;padding:.45rem 1.1rem .45rem .55rem;z-index:5">${logo({ size: 1.55 })}</div>`;
const bg = (color) => `<div class="abs" style="inset:0;background:${color}"></div>`;
const halo = () => `<span class="abs" style="width:70%;aspect-ratio:1;border-radius:50%;background:${C.signal};opacity:.18;filter:blur(6rem);top:-15%;left:-15%"></span><span class="abs" style="width:80%;aspect-ratio:1;border-radius:50%;background:#5fb3bb;opacity:.18;filter:blur(6rem);bottom:-20%;right:-20%"></span>`;
const photoBg = (name, pos, at, dur, sceneDur, kind = 'zoom') =>
  `<img class="cover ${kind}" src="${L.photo(name)}" style="object-position:${pos};${at(0)};${dur(sceneDur + 0.4)}"/><div class="abs" style="inset:0;background:linear-gradient(0deg, rgb(14 48 76/.97) 0%, rgb(14 48 76/.82) 45%, rgb(14 48 76/.1) 78%)"></div>`;

// Carte de fin, commune à toutes les vidéos
const endCard = (line, url = 'send-by-me.com', dur = 3.2) => ({
  dur,
  html: (at) => `${bg(C.ink)}${halo()}
    <div class="abs" style="inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.6rem;color:#fff;text-align:center;padding:0 3rem">
      <img class="pop" src="${L.asset.logo}" style="width:11rem;height:11rem;background:${C.paper};border-radius:22%;padding:.6rem;${at(0.1)}"/>
      <div class="display up" style="font-size:3.6rem;${at(0.35)}">Send By Me</div>
      <div class="up" style="font-size:1.7rem;color:rgb(255 255 255/.8);max-width:40rem;${at(0.6)}">${line}</div>
      <div class="pop" style="${at(1)}">${cta(url, { size: 1.6 })}</div>
      <div class="up" style="width:60%;margin-top:1rem;${at(0.4)}">${arcV({ d: 0.6, dur: 2.2 })}</div>
    </div>`,
});

// Scène texte plein écran
const textScene = (dur, { eyebrow, title, text, color = C.ink, fg = '#fff', accent = C.signal, el, elDelay = 0.9 }) => ({
  dur,
  html: (at) => `${bg(color)}${color === C.paper ? '' : halo()}${logoPill()}
    <div class="abs" style="left:3rem;right:3rem;top:${el ? '12rem' : '0'};bottom:${el ? '6rem' : '0'};display:flex;flex-direction:column;gap:1.2rem;justify-content:${el ? 'flex-start' : 'center'};color:${fg}">
      ${eyebrow ? `<div class="wide up" style="font-weight:900;font-size:1.3rem;color:${accent};text-transform:uppercase;${at(0.1)}">${eyebrow}</div>` : ''}
      <h1 class="display up" style="font-size:4.6rem;${at(0.25)}">${title}</h1>
      ${text ? `<p class="up" style="font-size:1.7rem;line-height:1.4;opacity:.85;${at(0.5)}">${text}</p>` : ''}
      ${el ? `<div style="flex:1;display:flex;align-items:center;justify-content:center"><div class="pop" style="${at(elDelay)}">${el}</div></div>` : `<div class="up" style="width:70%;margin-top:2rem;${at(0.7)}">${arcV({ light: fg === '#fff', d: 0.9, dur: 2 })}</div>`}
    </div>`,
});

// Scène photo + titre
const photoScene = (dur, { photo, pos = '50% 35%', eyebrow, title, text, chips, kind = 'zoom' }) => ({
  dur,
  html: (at, d, s0, sd) => `${photoBg(photo, pos, at, d, sd, kind)}${logoPill()}
    <div class="abs" style="left:3rem;right:3rem;bottom:7rem;display:flex;flex-direction:column;gap:1.1rem;color:#fff">
      ${eyebrow ? `<div class="wide up" style="font-weight:900;font-size:1.3rem;color:${C.signal};text-transform:uppercase;${at(0.3)}">${eyebrow}</div>` : ''}
      <h1 class="display up" style="font-size:4.6rem;${at(0.5)}">${title}</h1>
      ${text ? `<p class="up" style="font-size:1.65rem;line-height:1.4;color:rgb(255 255 255/.85);${at(0.8)}">${text}</p>` : ''}
      ${chips ? `<div style="display:flex;flex-wrap:wrap;gap:.7rem">${chips.map(([i, t], k) => `<span class="pop" style="${at(1.1 + k * 0.25)}">${chip(i, t, { size: 1.35 })}</span>`).join('')}</div>` : ''}
    </div>`,
});

// Code de remise qui apparaît chiffre par chiffre
const codeAnim = (at, start, digits = '482913') => `<div style="width:24rem;background:#fff;color:${C.ink};border-radius:1.8rem;padding:1.6rem;box-shadow:0 2rem 4rem -1.6rem rgb(0 0 0/.6)">
  <div style="display:flex;align-items:center;gap:.5rem;font-weight:900;font-size:1.3rem">${icon('key', '1.3em', C.brand)} Code de remise</div>
  <div style="display:flex;gap:.5rem;margin-top:1.1rem">${digits.split('').map((n, i) => `<span style="flex:1;height:4.2rem;border-radius:.7rem;background:${C.paper};border:2px solid ${C.line};display:grid;place-items:center"><b class="display pop tabular" style="font-size:2.4rem;${at(start + i * 0.22)}">${n}</b></span>`).join('')}</div>
  <div class="up" style="display:flex;align-items:center;gap:.5rem;margin-top:1.1rem;background:#e6f4ec;color:${C.ok};border-radius:.9rem;padding:.7rem .9rem;font-weight:900;font-size:1.15rem;${at(start + 1.6)}">${icon('check', '1.2em', C.ok, 3)} Code validé, paiement libéré</div>
</div>`;

// Suivi qui avance étape par étape
const trackAnim = (at, start, steps = ['Demande acceptée', 'Paiement bloqué', 'Colis remis au voyageur', 'En vol', 'Arrivé à destination', 'Livré, code validé']) => `<div style="width:26rem;background:#fff;color:${C.ink};border-radius:1.8rem;padding:1.6rem 1.7rem;box-shadow:0 2rem 4rem -1.6rem rgb(0 0 0/.55)">
  <div style="display:flex;justify-content:space-between;align-items:center;font-size:1.25rem"><b>Suivi de votre colis</b><span class="wide" style="font-size:.85rem;font-weight:900;color:${C.brand}">SBM-K7Q2M9XA</span></div>
  <ol style="list-style:none;margin-top:1.2rem">${steps.map((s, i) => `<li style="display:flex;gap:.9rem;align-items:center;padding-bottom:${i < steps.length - 1 ? '1rem' : 0}">
    <span style="width:1.5rem;height:1.5rem;border-radius:50%;border:2px solid ${C.line};background:#fff;display:grid;place-items:center;animation:check .4s ease both;${at(start + i * 0.55)}">${icon('check', '.9rem', '#fff', 4)}</span>
    <span class="fade" style="font-weight:800;font-size:1.25rem;opacity:.35;animation-name:fade;${at(start + i * 0.55)}">${s}</span></li>`).join('')}</ol>
</div>`;

const countEarn = (at, start, kg = 23, price = 9) => {
  const id = 'c' + Math.random().toString(36).slice(2, 7);
  return `<style>@keyframes ${id} { from { --n: 0; } to { --n: ${kg * price}; } }</style>
  <div style="font-size:1.25rem">${L.ticket({ kg, price, earn: false, size: 1.25 })}
  <div class="up" style="margin-top:-1px;background:${C.signal};color:${C.ink};border-radius:0 0 2rem 2rem;padding:1.1rem 1.9rem;${at(start)}">
    <div style="font-weight:800;font-size:1.25rem">Si tout part, vous gagnez</div>
    <div class="display tabular" style="font-size:3.6rem"><span class="count" style="animation:${id} 1.6s cubic-bezier(.2,.8,.2,1) both;${at(start + 0.2)}"></span> €</div>
  </div></div>`;
};

// ─── Catalogue des vidéos ───────────────────────────────────────────────────
const P = { voy: 'voyageuse-valise.jpg', remise: 'remise-colis.jpg', valise: 'preparer-valise.jpg', aero: 'aeroport-depart.jpg', famille: 'cadeau-famille.jpg', lagos: 'px-30677594.jpg', hublot: 'px-3646733.jpg', terminal: 'px-3885493.jpg', sofa: 'px-5711715.jpg', habits: 'px-6612087.jpg', aile: 'px-731217.jpg', carton: 'px-7464408.jpg', mug: 'px-7464379.jpg' };
const V9 = [1080, 1920], V1 = [1080, 1080], V16 = [1920, 1080];
const VIDEOS = [];
const vid = (file, sizes, scenes, caption) => VIDEOS.push({ file, sizes, scenes, caption });

vid('01-teaser-lancement', [V9, V1], [
  { dur: 3.4, html: (at) => `${bg(C.ink)}${halo()}<div class="abs" style="inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2rem;color:#fff;text-align:center;padding:0 3rem">
      <img class="pop" src="${L.asset.logoBase}" style="width:14rem;${at(0.2)}"/>
      <div class="up" style="width:80%;${at(0.6)}">${arcV({ d: 0.9, dur: 2.2 })}</div>
      <div class="wide up" style="font-weight:900;font-size:1.5rem;color:${C.signal};${at(1.2)}">BIENTÔT</div></div>` },
  textScene(3.6, { eyebrow: 'Lancement', title: 'Vos colis vont voyager autrement.', text: 'Avec des voyageurs vérifiés, entre l’Europe et l’Afrique.' }),
  endCard('Suivez-nous pour ne pas rater le lancement.'),
], 'Teaser de lancement (10 s). Légende : « Quelque chose arrive pour vos colis entre l’Europe et l’Afrique… ✈️📦 Activez les notifications. #SendByMe #KilosLibres »');

vid('02-compte-a-rebours', [V9], [
  ...['3', '2', '1'].map((n) => ({ dur: 1.1, html: (at) => `${bg(C.ink)}${halo()}<div class="abs" style="inset:0;display:grid;place-items:center"><div class="display pop" style="font-size:24rem;color:${C.signal};${at(0.05)}">${n}</div></div>` })),
  { dur: 2.6, html: (at) => `${bg(C.signal)}<div class="abs" style="inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2rem;text-align:center;padding:0 3rem">
      <h1 class="display pop" style="font-size:6.4rem;${at(0.05)}">On décolle !</h1><div style="width:85%">${arcV({ light: false, d: 0.3, dur: 2 })}</div></div>` },
  endCard('Send By Me est en ligne.'),
], 'Compte à rebours le jour J (9 s). Légende : « 3… 2… 1… On décolle ! Send By Me est en ligne 🎉 »');

vid('03-lancement-officiel', [V9, V1, V16], [
  photoScene(4.2, { photo: P.voy, pos: '50% 20%', eyebrow: 'C’est parti', title: 'Vos colis voyagent dans la <span class="hl">valise</span> de quelqu’un.' }),
  photoScene(4.4, { photo: P.remise, pos: '55% 50%', eyebrow: 'Comment ?', title: 'Des voyageurs vérifiés proposent leurs kilos libres.', chips: [['badge', 'Identité vérifiée'], ['lock', 'Paiement bloqué'], ['key', 'Code de remise']] }),
  photoScene(4, { photo: P.famille, pos: '50% 35%', eyebrow: 'À l’arrivée', title: 'Le voyageur n’est payé que quand votre famille a le colis.' }),
  endCard('Envoyez vos colis entre l’Europe et l’Afrique.'),
], 'Vidéo de lancement (16 s). Légende : « Send By Me est en ligne ! Des voyageurs vérifiés, un paiement bloqué jusqu’à la livraison, un code que seule votre famille connaît. 👉 send-by-me.com »');

vid('04-comment-ca-marche', [V9, V1], [
  textScene(3, { eyebrow: 'Expéditeurs', title: 'Envoyer un colis avec un voyageur, comment ça marche ?', el: `<div style="font-size:1.2rem">${L.parcel({ size: 1.2 })}</div>` }),
  photoScene(3.6, { photo: P.sofa, pos: '50% 40%', eyebrow: 'Étape 1', title: 'Trouvez un trajet.', text: 'Comparez dates, prix au kilo et avis.' }),
  photoScene(3.6, { photo: P.carton, pos: '60% 40%', eyebrow: 'Étape 2', title: 'Demandez des kilos.', text: 'Décrivez votre colis, discutez avec le voyageur.' }),
  { dur: 4, html: (at) => `${bg(C.paper)}${logoPill()}<div class="abs" style="left:3rem;right:3rem;top:12rem;color:${C.ink}"><div class="wide up" style="font-weight:900;font-size:1.3rem;color:${C.brand};${at(0.1)}">ÉTAPE 3</div><h1 class="display up" style="font-size:4.6rem;margin-top:1rem;${at(0.25)}">Payez en ligne.</h1><p class="up" style="font-size:1.7rem;color:${C.inkSoft};margin-top:1rem;${at(0.45)}">Le montant reste bloqué par Send By Me.</p></div>
      <div class="abs pop" style="left:50%;bottom:16%;margin-left:-11rem;${at(0.8)}"><div style="width:22rem;background:${C.ink};color:#fff;border-radius:1.8rem;padding:2rem;text-align:center">${icon('lock', '6rem', C.signal, 1.8)}<div class="display" style="font-size:2.4rem;margin-top:1rem">Paiement bloqué</div><div style="font-size:1.2rem;opacity:.75;margin-top:.4rem">jusqu’à la remise du colis</div></div></div>` },
  { dur: 4.4, html: (at) => `${bg(C.ink)}${halo()}${logoPill()}<div class="abs" style="left:3rem;right:3rem;top:12rem;color:#fff"><div class="wide up" style="font-weight:900;font-size:1.3rem;color:${C.signal};${at(0.1)}">ÉTAPE 4</div><h1 class="display up" style="font-size:4.6rem;margin-top:1rem;${at(0.25)}">Remise avec un code.</h1></div><div class="abs" style="left:50%;bottom:14%;transform:translateX(-50%)">${codeAnim(at, 0.8)}</div>` },
  endCard('Inscription gratuite.'),
], 'Tuto « Comment ça marche » (22 s). Légende : « 4 étapes pour envoyer un colis avec un voyageur, et votre argent protégé du début à la fin. »');

vid('05-voyageur-kilos', [V9, V1], [
  photoScene(3.4, { photo: P.aero, pos: '50% 30%', eyebrow: 'Vous partez bientôt ?', title: 'Votre valise a de la place ?' }),
  { dur: 5, html: (at) => `${bg(C.signal)}${logoPill()}<div class="abs" style="left:3rem;right:3rem;top:12rem;color:${C.ink}"><h1 class="display up" style="font-size:4.6rem;${at(0.1)}">Vos kilos libres ont de la valeur.</h1><p class="up" style="font-size:1.6rem;margin-top:1rem;${at(0.3)}">Exemple : 23 kg à 9 € le kilo.</p></div>
      <div class="abs" style="left:0;right:0;bottom:12%;display:flex;justify-content:center"><div class="pop" style="${at(0.6)}">${countEarn(at, 1.4)}</div></div>` },
  textScene(3.6, { eyebrow: 'Voyageurs', title: 'Publier votre trajet est gratuit.', text: 'Vous fixez votre prix. Vous êtes payé à la remise, à coup sûr.', color: C.ink }),
  endCard('Proposez vos kilos en deux minutes.', 'send-by-me.com/publier'),
], 'Recrutement voyageurs (15 s). Légende : « Votre valise a de la place ? Exemple : 23 kg à 9 €/kg = 207 € si tout part. Publier est gratuit. 👉 send-by-me.com/publier »');

vid('06-plus-d-arnaque', [V9, V1], [
  { dur: 3.4, html: (at) => `${bg(C.paper)}${logoPill()}<div class="abs" style="inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 3rem;gap:1.4rem;color:${C.ink}">
      <h1 class="display up" style="font-size:5rem;${at(0.1)}">Payer d’avance un inconnu…</h1>
      <h1 class="display up" style="font-size:5rem;color:${C.inkSoft};position:relative;align-self:flex-start;${at(0.6)}">et croiser les doigts ?<span style="position:absolute;left:0;right:0;top:52%;height:.5rem;background:${C.danger};transform-origin:left;animation:strike .5s ease both;${at(1.6)}"></span></h1></div>` },
  textScene(3.8, { eyebrow: 'Avec Send By Me', title: 'Votre argent reste bloqué jusqu’à la livraison.', el: `<div style="width:22rem;background:#fff;color:${C.ink};border-radius:1.8rem;padding:2rem;text-align:center;box-shadow:0 2rem 4rem -1.6rem rgb(0 0 0/.6)">${icon('lock', '6rem', C.brand, 1.8)}<div class="display" style="font-size:2.3rem;margin-top:1rem">Paiement bloqué</div></div>` }),
  { dur: 4.4, html: (at) => `${bg(C.ink)}${halo()}${logoPill()}<div class="abs" style="left:3rem;right:3rem;top:12rem;color:#fff"><h1 class="display up" style="font-size:4.4rem;${at(0.1)}">Votre famille donne le code. Le voyageur est payé.</h1></div><div class="abs" style="left:50%;bottom:12%;transform:translateX(-50%)">${codeAnim(at, 0.9)}</div>` },
  endCard('Envoyez vos colis sans payer d’avance un inconnu.'),
], 'Expéditeurs (15 s). Légende : « Payer d’avance un inconnu et croiser les doigts ? C’est fini. Votre argent reste bloqué jusqu’à la livraison. »');

vid('07-code-de-remise', [V9], [
  { dur: 5.2, html: (at) => `${bg(C.ink)}${halo()}${logoPill()}<div class="abs" style="left:3rem;right:3rem;top:12rem;color:#fff"><div class="wide up" style="font-weight:900;font-size:1.3rem;color:${C.signal};${at(0.1)}">LE CODE DE REMISE</div><h1 class="display up" style="font-size:4.4rem;margin-top:1rem;${at(0.25)}">6 chiffres que seule votre famille connaît.</h1></div><div class="abs" style="left:50%;bottom:14%;transform:translateX(-50%)">${codeAnim(at, 1)}</div>` },
  textScene(3.4, { title: 'Sans le code, pas de livraison validée.', text: 'Et le voyageur n’est pas payé.', color: C.brand }),
  endCard('La sécurité, à chaque colis.', 'send-by-me.com/securite'),
], 'Explication du code de remise (12 s). Légende : « Le code de remise : 6 chiffres que seule votre famille connaît. Sans lui, pas de livraison validée. »');

const corridors = [['CDG', 'Paris', 'DLA', 'Douala'], ['CDG', 'Paris', 'DSS', 'Dakar'], ['CDG', 'Paris', 'ABJ', 'Abidjan'], ['CDG', 'Paris', 'NSI', 'Yaoundé'], ['BRU', 'Bruxelles', 'FIH', 'Kinshasa'], ['LYS', 'Lyon', 'DLA', 'Douala']];
vid('08-nos-lignes', [V9, V1], [
  textScene(2.4, { eyebrow: 'Nos lignes', title: 'Vers où envoyez-vous ?', color: C.ink }),
  ...corridors.map(([a, ac, b, bc], i) => ({ dur: 1.7, html: (at, d, s0, sd) => `<img class="cover pan" src="${L.photo([P.aile, P.hublot, P.aero, P.terminal][i % 4])}" style="${at(0)};${d(sd + 0.4)}"/><div class="abs" style="inset:0;background:rgb(14 48 76/.8)"></div>${logoPill()}
      <div class="abs" style="left:3rem;right:3rem;top:50%;transform:translateY(-50%);display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:1rem;color:#fff">
        <div class="left" style="${at(0.05)}"><div class="display" style="font-size:6rem;color:${C.signal}">${a}</div><div style="font-size:1.8rem;font-weight:800">${ac}</div></div>
        <div style="margin-bottom:3rem">${arcV({ d: 0.15, dur: 1.4 })}</div>
        <div class="right" style="text-align:right;${at(0.05)}"><div class="display" style="font-size:6rem;color:${C.signal}">${b}</div><div style="font-size:1.8rem;font-weight:800">${bc}</div></div></div>` })),
  endCard('Trouvez les voyageurs de votre ligne.'),
], 'Les lignes (16 s). Légende : « Paris → Douala, Dakar, Abidjan, Yaoundé · Bruxelles → Kinshasa · Lyon → Douala. Trouvez les voyageurs de votre ligne. »');

vid('09-suivi-colis', [V9], [
  { dur: 6, html: (at) => `${bg(C.paper)}${logoPill()}<div class="abs" style="left:3rem;right:3rem;top:12rem;color:${C.ink}"><div class="wide up" style="font-weight:900;font-size:1.3rem;color:${C.brand};${at(0.1)}">SUIVI</div><h1 class="display up" style="font-size:4.4rem;margin-top:1rem;${at(0.25)}">Suivez votre colis, étape par étape.</h1></div><div class="abs" style="left:0;right:0;bottom:11%;display:flex;justify-content:center"><div class="pop" style="${at(0.5)}">${trackAnim(at, 1)}</div></div>` },
  textScene(3, { title: 'Votre destinataire peut le suivre aussi.', text: 'Avec le numéro de suivi, sans compte.', color: C.brand }),
  endCard('Suivez un colis', 'send-by-me.com/suivi'),
], 'Suivi d’envoi (12 s). Légende : « Accepté, payé, remis, en vol, arrivé, livré : suivez chaque étape de votre colis. »');

vid('10-demande-envoi', [V9], [
  textScene(3, { eyebrow: 'Nouveau', title: 'Pas de trajet qui vous convient ?', color: C.ink }),
  { dur: 5, html: (at) => `${bg(C.paper)}${logoPill()}<div class="abs" style="left:3rem;right:3rem;top:12rem;color:${C.ink}"><h1 class="display up" style="font-size:4.4rem;${at(0.1)}">Publiez votre colis. Les voyageurs viennent à vous.</h1></div>
      <div class="abs" style="left:0;right:0;bottom:16%;display:flex;justify-content:center"><div class="pop" style="${at(0.7)}">${L.parcel({ size: 1.35, home: false })}</div></div>
      <div class="abs stamp" style="left:62%;bottom:44%;${at(2)}"><span style="display:flex;align-items:center;gap:.4rem;border:4px solid ${C.brand};background:#fff;color:${C.brand};border-radius:.8rem;padding:.4rem .8rem;font-weight:900;font-size:1.3rem">${icon('home', '1.2em', C.brand, 2.6)} À DOMICILE</span></div>` },
  endCard('Publiez une demande d’envoi.', 'send-by-me.com/demandes'),
], 'Demande d’envoi (11 s). Légende : « Pas de trajet ? Publiez votre colis : poids, photos, dates. Les voyageurs qui partent sur votre ligne vous la proposent. »');

vid('11-parrainage', [V9, V1], [
  { dur: 4.4, html: (at) => `${bg(C.signal)}${logoPill()}<div class="abs" style="left:3rem;right:3rem;top:12rem;color:${C.ink}"><div class="wide up" style="font-weight:900;font-size:1.3rem;${at(0.1)}">PARRAINAGE</div><h1 class="display up" style="font-size:5rem;margin-top:1rem;${at(0.25)}">5 € pour vous, 5 € pour eux.</h1></div><div class="abs" style="left:0;right:0;bottom:16%;display:flex;justify-content:center"><div class="pop" style="${at(0.9)}">${L.creditCard({ size: 1.3 })}</div></div>` },
  textScene(3.2, { title: 'Partagez votre lien depuis Mon espace.', text: 'Le crédit arrive après leur première livraison réussie.', color: C.ink }),
  endCard('Invitez vos proches.'),
], 'Parrainage (10 s). Légende : « 5 € pour vous, 5 € pour eux 🎁 Partagez votre lien depuis Mon espace › Parrainage. »');

vid('12-mythe-realite', [V9, V1], [
  { dur: 3.6, html: (at) => `${bg(C.paper)}${logoPill()}<div class="abs" style="left:3rem;right:3rem;top:50%;transform:translateY(-50%)"><div class="pop" style="background:#fff;border:2px solid ${C.line};border-radius:1.8rem;padding:2.2rem;${at(0.1)}"><div class="wide" style="display:flex;align-items:center;gap:.5rem;font-weight:900;font-size:1.3rem;color:${C.danger}">${icon('x', '1.3em', C.danger, 3)} ON DIT</div><p class="display" style="font-size:3.6rem;margin-top:.8rem;color:${C.inkSoft}">« Il faut toujours payer d’avance et croiser les doigts. »</p></div></div>` },
  { dur: 4.4, html: (at) => `${bg(C.ink)}${halo()}${logoPill()}<div class="abs" style="left:3rem;right:3rem;top:50%;transform:translateY(-50%);color:#fff"><div class="wide up" style="display:flex;align-items:center;gap:.5rem;font-weight:900;font-size:1.3rem;color:${C.signal};${at(0.1)}">${icon('check', '1.3em', C.signal, 3)} EN VRAI</div><p class="up" style="font-size:2.6rem;line-height:1.35;font-weight:800;margin-top:1rem;${at(0.3)}">Votre paiement reste bloqué par Send By Me. Le voyageur n’est payé qu’à la remise, avec le code de votre destinataire.</p></div>` },
  endCard('Envoyez en toute confiance.'),
], 'Mythe / réalité (11 s). Légende : « On dit qu’il faut toujours payer d’avance… En vrai, votre paiement reste bloqué jusqu’à la remise. »');

vid('13-fin-annee', [V9, V1], [
  photoScene(4.4, { photo: P.famille, pos: '50% 35%', eyebrow: 'Fêtes de fin d’année', title: 'Les cadeaux arrivent avant les fêtes.' }),
  textScene(3.4, { eyebrow: 'Conseil', title: 'Réservez tôt : les kilos de décembre partent vite.', color: C.signal, fg: C.ink, accent: C.ink }),
  endCard('Trouvez un voyageur qui rentre pour les fêtes.'),
], 'Fin d’année (11 s). Légende : « 🎁 Envoyez vos cadeaux à la famille avec un voyageur qui rentre en décembre. Réservez tôt ! »');

vid('14-ambassadeurs', [V9], [
  photoScene(4.2, { photo: P.lagos, pos: '50% 30%', eyebrow: 'Recrutement', title: 'Deviens ambassadeur Send By Me sur ton campus.' }),
  textScene(3.2, { title: 'Fais connaître Send By Me aux étudiants qui rentrent au pays.', color: C.brand }),
  endCard('Écris-nous en message privé.'),
], 'Ambassadeurs étudiants (10 s). Légende : « 🎓 Deviens ambassadeur Send By Me sur ton campus ! Écris-nous en message privé. »');

vid('15-film-marque', [V16, V9], [
  photoScene(3.6, { photo: P.valise, pos: '50% 40%', title: 'Quelqu’un prépare sa valise.', kind: 'pan' }),
  photoScene(3.6, { photo: P.habits, pos: '50% 50%', title: 'Quelqu’un prépare un colis.', kind: 'pan' }),
  photoScene(3.6, { photo: P.aile, pos: '50% 50%', title: 'Le colis voyage avec lui.', kind: 'pan' }),
  photoScene(3.6, { photo: P.remise, pos: '55% 50%', title: 'Il est remis en main propre.', kind: 'pan' }),
  photoScene(3.8, { photo: P.famille, pos: '50% 35%', title: 'Et c’est la famille qui valide.', kind: 'pan' }),
  endCard('Vos colis voyagent dans la valise de quelqu’un.', 'send-by-me.com', 3.6),
], 'Film de marque (22 s), pour YouTube, Facebook et la page d’accueil. Ajoutez une musique libre de droits dans l’outil de publication.');

// ─── Voix off : une phrase par scène (null = pas de voix) ───────────────────
// « Send baille mi » : orthographe phonétique pour que la voix française prononce « Sènd baï mi ».
const VO = {
  '01-teaser-lancement': ['Quelque chose arrive pour vos colis.', 'Bientôt, vos colis voyageront autrement, avec des voyageurs vérifiés, entre l’Europe et l’Afrique.', 'Send baille mi. Suivez-nous pour ne pas rater le lancement.'],
  '02-compte-a-rebours': ['Trois.', 'Deux.', 'Un.', 'On décolle !', 'Send baille mi est en ligne.'],
  '03-lancement-officiel': ['C’est parti ! Vos colis voyagent dans la valise de quelqu’un.', 'Des voyageurs vérifiés proposent leurs kilos libres. Identité vérifiée, paiement bloqué, code de remise.', 'À l’arrivée, le voyageur n’est payé que quand votre famille a le colis en main.', 'Send baille mi. Envoyez vos colis entre l’Europe et l’Afrique, sur send baille mi point com.'],
  '04-comment-ca-marche': ['Envoyer un colis avec un voyageur, comment ça marche ?', 'Étape un : trouvez un trajet. Comparez les dates, les prix au kilo et les avis.', 'Étape deux : demandez des kilos. Décrivez votre colis, et discutez avec le voyageur.', 'Étape trois : payez en ligne. Le montant reste bloqué par Send baille mi.', 'Étape quatre : votre destinataire donne son code au voyageur. Le paiement est alors libéré.', 'Inscription gratuite, sur send baille mi point com.'],
  '05-voyageur-kilos': ['Vous partez bientôt ? Votre valise a de la place ?', 'Vos kilos libres ont de la valeur. Par exemple, vingt-trois kilos à neuf euros le kilo, c’est deux cent sept euros si tout part.', 'Publier votre trajet est gratuit. Vous fixez votre prix, et vous êtes payé à la remise.', 'Proposez vos kilos en deux minutes, sur send baille mi point com.'],
  '06-plus-d-arnaque': ['Payer d’avance un inconnu, et croiser les doigts ?', 'Avec Send baille mi, votre argent reste bloqué jusqu’à la livraison.', 'Votre famille donne le code au voyageur, et c’est seulement là qu’il est payé.', 'Send baille mi. Envoyez vos colis sans payer d’avance un inconnu.'],
  '07-code-de-remise': ['Le code de remise : six chiffres que seule votre famille connaît.', 'Sans le code, pas de livraison validée. Et le voyageur n’est pas payé.', 'Send baille mi. La sécurité, à chaque colis.'],
  '08-nos-lignes': ['Vers où envoyez-vous ?', 'Paris, Douala.', 'Paris, Dakar.', 'Paris, Abidjan.', 'Paris, Yaoundé.', 'Bruxelles, Kinshasa.', 'Lyon, Douala.', 'Trouvez les voyageurs de votre ligne, sur send baille mi point com.'],
  '09-suivi-colis': ['Suivez votre colis, étape par étape : accepté, payé, remis au voyageur, en vol, arrivé, livré.', 'Votre destinataire peut le suivre aussi, avec le numéro de suivi.', 'Send baille mi.'],
  '10-demande-envoi': ['Pas de trajet qui vous convient ?', 'Publiez votre colis : poids, contenu, photos, dates. Les voyageurs qui partent sur votre ligne viennent à vous.', 'Publiez votre demande, sur send baille mi point com.'],
  '11-parrainage': ['Parrainez vos proches : cinq euros pour vous, cinq euros pour eux.', 'Partagez votre lien depuis votre espace. Le crédit arrive après leur première livraison réussie.', 'Send baille mi. Invitez vos proches.'],
  '12-mythe-realite': ['On dit qu’il faut toujours payer d’avance, et croiser les doigts.', 'En vrai, votre paiement reste bloqué par Send baille mi. Le voyageur n’est payé qu’à la remise, avec le code de votre destinataire.', 'Envoyez en toute confiance.'],
  '13-fin-annee': ['Les fêtes approchent. Les cadeaux arrivent avant les fêtes.', 'Un conseil : réservez tôt, les kilos de décembre partent vite.', 'Trouvez un voyageur qui rentre pour les fêtes, sur send baille mi point com.'],
  '14-ambassadeurs': ['Étudiant ? Deviens ambassadeur Send baille mi sur ton campus.', 'Fais connaître Send baille mi aux étudiants qui rentrent au pays.', 'Écris-nous en message privé.'],
  '15-film-marque': ['Quelqu’un prépare sa valise.', 'Quelqu’un prépare un colis.', 'Le colis voyage avec lui.', 'Il est remis en main propre.', 'Et c’est la famille qui valide.', 'Send baille mi. Vos colis voyagent dans la valise de quelqu’un.'],
};
for (const v of VIDEOS) {
  const vo = VO[v.file] || [];
  if (vo.length && vo.length !== v.scenes.length) throw new Error(`Voix off de ${v.file} : ${vo.length} phrases pour ${v.scenes.length} scènes`);
  v.vo = vo;
}

module.exports = { VIDEOS };

// ─── Rendu ──────────────────────────────────────────────────────────────────
const VO_DIR = path.join(__dirname, 'vo');
const VO_LEAD = 0.3; // la voix démarre 0,3 s après le début de la scène
const keyOf = (text) => require('crypto').createHash('sha1').update(text).digest('hex').slice(0, 12);
const run = (cmd, args) => new Promise((ok, ko) => { const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] }); p.on('close', (c) => (c ? ko(new Error(`${cmd} ${c}`)) : ok())); });

// Synthèse des phrases manquantes (Piper, voix fr_FR-siwis), puis lecture des durées.
async function synthesize(list) {
  fs.mkdirSync(VO_DIR, { recursive: true });
  const lines = [...new Set(list.flatMap((v) => v.vo.filter(Boolean)))].map((text) => ({ key: keyOf(text), text }));
  const missing = lines.filter((l) => !fs.existsSync(path.join(VO_DIR, l.key + '.wav')));
  if (missing.length) {
    fs.writeFileSync(path.join(VO_DIR, '.todo.json'), JSON.stringify(missing));
    await run(process.env.PIPER_PYTHON || 'python3', [path.join(__dirname, 'tts.py'), path.join(VO_DIR, '.todo.json'), VO_DIR]);
  }
  const dur = {};
  for (const l of lines) dur[l.text] = parseFloat(require('child_process').execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(VO_DIR, l.key + '.wav')]).toString());
  return dur;
}

// Mixage : voix calée sur chaque scène + musique originale qui baisse sous la voix.
async function mixAudio(silent, out, starts, vo, total) {
  const music = path.join(VO_DIR, `music-${Math.ceil(total)}.wav`);
  if (!fs.existsSync(music)) await run('python3', [path.join(__dirname, 'music.py'), music, String(Math.ceil(total) + 1)]);
  const inputs = ['-i', silent, '-i', music];
  const parts = [];
  const labels = [];
  vo.forEach((text, i) => {
    if (!text) return;
    inputs.push('-i', path.join(VO_DIR, keyOf(text) + '.wav'));
    const ms = Math.round((starts[i] + VO_LEAD) * 1000);
    const idx = inputs.filter((x) => x === '-i').length - 1;
    parts.push(`[${idx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.6,adelay=${ms}|${ms}[v${i}]`);
    labels.push(`[v${i}]`);
  });
  const fade = Math.max(0, total - 1.2).toFixed(2);
  let graph;
  if (labels.length) {
    parts.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,apad[vo]`, `[vo]asplit[vo1][vo2]`);
    parts.push(`[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.32[mu]`);
    parts.push(`[mu][vo1]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[duck]`);
    parts.push(`[duck][vo2]amix=inputs=2:normalize=0,atrim=0:${total.toFixed(2)},afade=t=out:st=${fade}:d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
  } else {
    parts.push(`[1:a]volume=0.6,atrim=0:${total.toFixed(2)},afade=t=out:st=${fade}:d=1.2,loudnorm=I=-14:TP=-1.5[a]`);
  }
  await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', parts.join(';'), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-movflags', '+faststart', out]);
}

async function render() {
  fs.mkdirSync(OUT, { recursive: true });
  const list = VIDEOS.filter((v) => !filter || v.file.includes(filter));
  const durations = await synthesize(list);
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  for (const v of list) {
    // Chaque scène dure au moins le temps de sa phrase.
    const scenes = v.scenes.map((sc, i) => ({ ...sc, dur: Math.max(sc.dur, v.vo[i] ? durations[v.vo[i]] + VO_LEAD + 0.6 : 0) }));
    const starts = scenes.reduce((a, sc, i) => (a.push(i ? a[i - 1] + scenes[i - 1].dur : 0), a), []);
    for (const [W, H] of v.sizes) {
      const fmt = W === H ? '1x1' : W > H ? '16x9' : '9x16';
      const out = path.join(OUT, `${v.file}-${fmt}.mp4`);
      const silent = path.join(__dirname, '.tmp-silent.mp4');
      const { html, total } = build({ W, H, scenes });
      await page.setViewportSize({ width: W, height: H });
      const tmp = path.join(__dirname, '.tmp-video.html');
      fs.writeFileSync(tmp, html);
      await page.goto('file://' + tmp, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', silent]);
      const frames = Math.round(total * FPS);
      for (let i = 0; i < frames; i++) {
        const t = (i / FPS) * 1000;
        await page.evaluate((t) => document.getAnimations().forEach((a) => { a.currentTime = t; }), t);
        const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
      await new Promise((r) => ff.on('close', r));
      await mixAudio(silent, out, starts, v.vo, total);
      console.log('✔', path.basename(out), `${total.toFixed(1)} s`);
    }
  }
  await browser.close();
}
if (require.main === module) render();
