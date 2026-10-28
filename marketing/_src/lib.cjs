// Briques communes des visuels : charte, icônes, logo, éléments d'interface.
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../..');
const SRC = __dirname;
const url = (p) => 'file://' + path.resolve(p);
const photo = (name) => {
  const local = path.join(SRC, 'photos', name);
  return url(fs.existsSync(local) ? local : path.join(ROOT, 'public/images', name));
};
const asset = {
  logo: url(path.join(ROOT, 'public/brand/logo-symbol.png')),
  logoBase: url(path.join(ROOT, 'public/brand/logo-symbol-base.png')),
  logoPlane: url(path.join(ROOT, 'public/brand/logo-plane.png')),
  ui: (n) => url(path.join(SRC, 'ui', n + '.png')),
  qr: (n) => fs.readFileSync(path.join(SRC, 'qr', n + '.svg'), 'utf8'),
};

const C = {
  ink: '#0e304c',
  inkSoft: '#2b4a63',
  brand: '#2f7a82',
  brandDeep: '#215a61',
  brandPale: '#e3f0f0',
  signal: '#eb9332',
  signalDeep: '#c46f14',
  paper: '#fbf8f1',
  line: '#ebe3d3',
  muted: '#6b7a86',
  kraft: '#e9d3ae',
  ok: '#1f8a4c',
  danger: '#c9473a',
};

const ICONS = {
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  key: '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="m7.5 4.27 9 5.15"/>',
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  euro: '<path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
  badge: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  suitcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  sparkle: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  graduation: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
};
const icon = (name, size = '1em', color = 'currentColor', stroke = 2) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${ICONS[name]}</svg>`;

const FONT = url(path.join(SRC, 'fonts/Nunito.ttf'));
const BASE_CSS = `
@font-face { font-family: Nunito; src: url('${FONT}') format('truetype'); font-weight: 200 1000; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: var(--w); height: var(--h); overflow: hidden; }
body { font-family: Nunito, sans-serif; color: ${C.ink}; background: ${C.paper}; font-size: var(--f); -webkit-font-smoothing: antialiased; }
.display { font-weight: 900; letter-spacing: -0.02em; line-height: 1.02; }
.wide { letter-spacing: 0.06em; }
.abs { position: absolute; }
.cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pill { display: inline-flex; align-items: center; gap: .5em; border-radius: 999px; font-weight: 800; }
.hl { position: relative; z-index: 0; white-space: nowrap; }
.hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .02em; height: .16em; border-radius: 99px; background: ${C.signal}; opacity: .75; z-index: -1; }
.tabular { font-variant-numeric: tabular-nums; }
`;

function logo({ tone = 'dark', size = 2.4 } = {}) {
  const color = tone === 'light' ? '#fff' : C.ink;
  const badge = tone === 'light' ? `background:${C.paper};border-radius:22%;padding:.12em;` : '';
  return `<div style="display:flex;align-items:center;gap:.35em;font-size:${size}rem;font-weight:900;color:${color};letter-spacing:-.01em">
    <img src="${asset.logo}" style="width:1.45em;height:1.45em;${badge}"/>
    <span>Send By Me</span></div>`;
}

const cta = (text, { bg = C.signal, color = C.ink, size = 1.6, icon: ic = 'arrow' } = {}) =>
  `<span class="pill" style="background:${bg};color:${color};font-size:${size}rem;padding:.6em 1.15em .62em 1.3em;box-shadow:0 .5em 1.4em -.6em rgb(14 48 76/.5)">${text}${ic ? icon(ic, '1.05em', color, 2.6) : ''}</span>`;

const chip = (ic, text, { bg = 'rgb(255 255 255/.14)', color = '#fff', size = 1.2, iconColor = C.signal } = {}) =>
  `<span class="pill" style="background:${bg};color:${color};font-size:${size}rem;padding:.45em .9em;font-weight:700">${icon(ic, '1.1em', iconColor, 2.4)}${text}</span>`;

// Arc pointillé avec avion (même motif que le site)
function arc({ width = '100%', light = true, plane = true, opacity = 1 } = {}) {
  const line = light ? 'rgb(255 255 255/.6)' : 'rgb(14 48 76/.35)';
  const fill = light ? '#fff' : C.ink;
  return `<svg viewBox="0 0 320 84" style="width:${width};opacity:${opacity};overflow:visible">
    <path d="M14 70 Q160 -12 306 70" fill="none" stroke="${line}" stroke-width="2.4" stroke-dasharray="5 9" stroke-linecap="round" class="dash"/>
    <circle cx="14" cy="70" r="6" fill="${C.signal}"/><circle cx="306" cy="70" r="6" fill="${C.signal}"/>
    ${plane ? `<g class="arcplane" transform="translate(160 29) rotate(0)"><g transform="rotate(45) translate(-12 -12)"><path d="${ICONS.plane.match(/d="([^"]+)"/)[1]}" fill="${fill}" stroke="${fill}" stroke-width="1.2"/></g></g>` : ''}
  </svg>`;
}

// Carte d'embarquement (aperçu d'annonce voyageur)
function ticket({ from = 'CDG', fromCity = 'Paris', to = 'DLA', toCity = 'Douala', date = 'Ven. 6 nov.', flight = 'AF946', time = '10:30', kg = 23, price = 9, size = 1, earn = true } = {}) {
  return `<div style="font-size:${size}rem;width:24em;border-radius:1.6em;background:${C.ink};color:#fff;overflow:hidden;box-shadow:0 2em 4em -1.6em rgb(14 48 76/.7);position:relative">
    <div style="padding:1.3em 1.5em 1.4em">
      <div style="display:flex;justify-content:space-between;font-size:.8em;color:rgb(255 255 255/.7)"><b style="color:#fff;letter-spacing:.08em">CARTE D'EMBARQUEMENT</b><span>${date}</span></div>
      <div style="display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:.6em;margin-top:1.1em">
        <div><div class="display" style="font-size:2.6em;color:${C.signal}">${from}</div><div style="font-size:.85em;color:rgb(255 255 255/.75)">${fromCity}</div></div>
        <div style="margin-bottom:1.2em">${arc()}</div>
        <div style="text-align:right"><div class="display" style="font-size:2.6em;color:${C.signal}">${to}</div><div style="font-size:.85em;color:rgb(255 255 255/.75)">${toCity}</div></div>
      </div>
    </div>
    <div style="margin:0 1.5em;border-top:2px dashed rgb(255 255 255/.25)"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.9em 1em;padding:1.1em 1.5em;font-size:.85em">
      <div><div style="color:rgb(255 255 255/.55)">Vol</div><b>${flight}</b></div>
      <div><div style="color:rgb(255 255 255/.55)">Départ</div><b>${time}</b></div>
      <div><div style="color:rgb(255 255 255/.55)">Kilos libres</div><b>${kg} kg</b></div>
      <div><div style="color:rgb(255 255 255/.55)">Prix au kilo</div><b>${price} €</b></div>
    </div>
    ${earn ? `<div style="background:${C.signal};color:${C.ink};padding:.9em 1.5em"><div style="font-size:.85em;font-weight:700">Si tout part, vous gagnez</div><div class="display tabular" style="font-size:2.1em">${kg * price} €</div></div>` : ''}
    <span style="position:absolute;left:-.7em;top:9.7em;width:1.4em;height:1.4em;border-radius:50%;background:var(--notch,${C.paper})"></span>
    <span style="position:absolute;right:-.7em;top:9.7em;width:1.4em;height:1.4em;border-radius:50%;background:var(--notch,${C.paper})"></span>
  </div>`;
}

// Étiquette de colis (aperçu de demande d'envoi)
function parcel({ from = 'CDG', fromCity = 'Paris', to = 'DSS', toCity = 'Dakar', what = 'Vêtements et chaussures', kg = 8, home = true, date = 'avant le 20 déc.', size = 1, rotate = 0 } = {}) {
  const bars = '2131231121322131121312313';
  return `<div style="font-size:${size}rem;width:22em;position:relative;color:${C.ink};transform:rotate(${rotate}deg)">
    <div style="border-radius:1.5em;background:${C.kraft};padding:.45em;box-shadow:0 2em 4em -1.6em rgb(14 48 76/.6);position:relative;overflow:hidden">
      <span style="position:absolute;left:0;right:0;top:50%;height:2.2em;transform:translateY(-50%);background:rgb(217 187 135/.75)"></span>
      <div style="position:relative;background:#fff;border-radius:1.15em;padding:1.2em 1.3em">
        <div style="display:flex;justify-content:space-between;font-size:.8em"><b style="letter-spacing:.08em">COLIS</b><span style="color:${C.muted}">${date}</span></div>
        <div style="display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:.5em;margin-top:.9em">
          <div><div class="display" style="font-size:2.4em">${from}</div><div style="font-size:.8em;color:${C.muted}">${fromCity}</div></div>
          <div style="margin-bottom:1.1em">${arc({ light: false })}</div>
          <div style="text-align:right"><div class="display" style="font-size:2.4em">${to}</div><div style="font-size:.8em;color:${C.muted}">${toCity}</div></div>
        </div>
        <div style="border-top:2px dashed ${C.line};margin:.9em 0"></div>
        <div style="display:flex;justify-content:space-between;align-items:end">
          <div><div style="font-size:.8em;color:${C.muted}">Contenu</div><b style="font-size:.95em">${what}</b></div>
          <div class="display" style="font-size:2.4em">${kg}<span style="font-size:.45em"> kg</span></div>
        </div>
        <div style="display:flex;gap:3px;height:2em;margin-top:.9em">${bars.split('').map((w) => `<span style="width:${w * 1.6}px;background:${C.ink}"></span>`).join('')}</div>
      </div>
    </div>
    ${home ? `<span style="position:absolute;top:-.9em;right:-.6em;transform:rotate(-8deg);display:flex;align-items:center;gap:.35em;border:3px solid ${C.brand};background:#fff;color:${C.brand};border-radius:.6em;padding:.3em .6em;font-weight:900;font-size:.8em;letter-spacing:.05em">${icon('home', '1.1em', C.brand, 2.6)} À DOMICILE</span>` : ''}
  </div>`;
}

// Écran « code de remise »
function codeCard({ code = '482 913', size = 1, hidden = false } = {}) {
  const digits = code.replace(/\s/g, '').split('');
  return `<div style="font-size:${size}rem;width:22em;background:#fff;color:${C.ink};border-radius:1.6em;padding:1.5em;box-shadow:0 2em 4em -1.6em rgb(14 48 76/.55)">
    <div style="display:flex;align-items:center;gap:.5em;font-weight:800">${icon('key', '1.3em', C.brand)} Code de remise</div>
    <p style="font-size:.85em;color:${C.muted};margin-top:.3em">À donner au voyageur à la réception du colis.</p>
    <div style="display:flex;gap:.45em;margin-top:1em">${digits.map((d) => `<span class="display tabular" style="flex:1;display:grid;place-items:center;height:2.4em;border-radius:.5em;background:${C.paper};border:2px solid ${C.line};font-size:1.7em">${hidden ? '•' : d}</span>`).join('')}</div>
    <div style="display:flex;align-items:center;gap:.5em;margin-top:1.1em;background:#e6f4ec;color:${C.ok};border-radius:.8em;padding:.6em .8em;font-weight:800;font-size:.9em">${icon('lock', '1.2em', C.ok)} Paiement bloqué jusqu'à la remise</div>
  </div>`;
}

// Suivi d'envoi
function timeline({ steps, active = 3, size = 1 } = {}) {
  steps = steps || ['Demande acceptée', 'Paiement bloqué', 'Colis remis au voyageur', 'En vol', 'Arrivé à destination', 'Livré, code validé'];
  return `<div style="font-size:${size}rem;width:22em;background:#fff;color:${C.ink};border-radius:1.6em;padding:1.4em 1.5em;box-shadow:0 2em 4em -1.6em rgb(14 48 76/.55)">
    <div style="display:flex;justify-content:space-between;align-items:center"><b>Suivi de votre colis</b><span class="wide" style="font-size:.75em;font-weight:800;color:${C.brand}">SBM-K7Q2M9XA</span></div>
    <ol style="list-style:none;margin-top:1em">${steps
      .map((s, i) => {
        const done = i < active, cur = i === active;
        const dot = done ? `background:${C.brand};border-color:${C.brand}` : cur ? `background:${C.signal};border-color:${C.signal}` : `background:#fff;border-color:${C.line}`;
        return `<li style="display:flex;gap:.8em;align-items:flex-start;position:relative;padding-bottom:${i < steps.length - 1 ? '.85em' : 0}">
          ${i < steps.length - 1 ? `<span style="position:absolute;left:.55em;top:1.3em;bottom:0;width:2px;background:${done ? C.brand : C.line}"></span>` : ''}
          <span style="width:1.15em;height:1.15em;border-radius:50%;border:2px solid;${dot};display:grid;place-items:center;flex-shrink:0;margin-top:.1em">${done ? icon('check', '.7em', '#fff', 4) : ''}</span>
          <span style="font-weight:${cur ? 900 : 700};color:${done || cur ? C.ink : C.muted};font-size:.92em">${s}</span></li>`;
      })
      .join('')}</ol>
  </div>`;
}

// Téléphone contenant une capture d'écran
function phone({ img, size = 1, rotate = 0, top = 0 } = {}) {
  return `<div style="font-size:${size}rem;width:17em;height:35em;border-radius:2.6em;background:#0b1a26;padding:.55em;box-shadow:0 3em 5em -2em rgb(14 48 76/.75);transform:rotate(${rotate}deg);position:relative">
    <div style="width:100%;height:100%;border-radius:2.1em;overflow:hidden;background:#fff;position:relative">
      <img src="${img}" style="width:100%;display:block;margin-top:-${top}em"/>
    </div>
    <span style="position:absolute;top:1.1em;left:50%;transform:translateX(-50%);width:5em;height:1.3em;border-radius:1em;background:#0b1a26"></span>
  </div>`;
}

// Tableau des départs (motif du site)
function board({ rows, size = 1 } = {}) {
  rows = rows || [['08:40', 'CDG', 'DLA', '9 €'], ['11:15', 'ORY', 'DSS', '8 €'], ['14:05', 'CDG', 'ABJ', '10 €'], ['18:30', 'BRU', 'FIH', '11 €']];
  return `<div style="font-size:${size}rem;width:24em;border-radius:1.2em;background:#0b1630;color:#fff;padding:1.1em 1.3em;box-shadow:0 2em 4em -1.6em rgb(0 0 0/.6)">
    <div style="display:flex;justify-content:space-between;font-size:.75em;color:rgb(255 255 255/.75)"><b style="color:#fff">Prochains départs</b><span>Kilos libres · prix au kg</span></div>
    ${rows.map((r) => `<div class="tabular" style="display:grid;grid-template-columns:4.2em 1fr 1fr 3em;gap:.4em;margin-top:.7em;font-family:ui-monospace,Menlo,monospace;font-weight:700;letter-spacing:.12em;color:#ffd38a">
      <span>${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span><span style="text-align:right">${r[3]}</span></div>`).join('')}
  </div>`;
}

// Carte de crédit parrainage
function creditCard({ size = 1, amount = '5 €' } = {}) {
  return `<div style="font-size:${size}rem;display:flex;gap:1.2em;align-items:center">
    ${[['Vous', '-6deg'], ['Votre proche', '6deg']].map(([who, rot]) => `<div style="width:11em;background:#fff;color:${C.ink};border-radius:1.4em;padding:1.2em;box-shadow:0 2em 3em -1.4em rgb(14 48 76/.55);transform:rotate(${rot});text-align:center">
      ${icon('gift', '2.4em', C.signal, 2)}
      <div class="display" style="font-size:2.6em;margin-top:.2em">+${amount}</div>
      <div style="font-weight:800;font-size:.95em">${who}</div>
      <div style="font-size:.75em;color:${C.muted};margin-top:.2em">de crédit</div></div>`).join('')}
  </div>`;
}

// Même calcul que src/lib/pricing.ts (commission dégressive + frais bancaires)
function quote(priceCents, kg) {
  const base = Math.round(priceCents * kg);
  const rate = kg <= 5 ? 0.15 : kg <= 10 ? 0.12 : kg <= 20 ? 0.1 : 0.08;
  const commission = Math.max(150, Math.round(base * rate));
  const total = Math.ceil((base + commission + 25) / (1 - 0.0325) / 10) * 10;
  return { base, fee: total - base, total };
}
const eur = (c) => (c / 100).toLocaleString('fr-FR', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';

// Détail du prix (exemple calculé avec les vrais tarifs)
function priceCard({ size = 1, price = 900, kg = 5, from = 'Paris', to = 'Douala' } = {}) {
  const q = quote(price, kg);
  const row = (a, b, strong) => `<div style="display:flex;justify-content:space-between;${strong ? 'font-weight:900;font-size:1.25em' : ''}"><span>${a}</span><b>${b}</b></div>`;
  return `<div style="font-size:${size}rem;width:21em;background:#fff;color:${C.ink};border-radius:1.6em;padding:1.4em 1.5em;box-shadow:0 2em 4em -1.6em rgb(14 48 76/.55)">
    <div style="font-size:.8em;color:${C.muted}">Exemple : ${kg} kg de ${from} à ${to}, à ${eur(price)} le kilo</div>
    <div class="tabular" style="display:flex;flex-direction:column;gap:.6em;margin-top:1em">
      ${row(`${kg} kg × ${eur(price)}`, eur(q.base))}${row('Frais de service', eur(q.fee))}
      <div style="border-top:2px dashed ${C.line};margin:.3em 0"></div>${row('Total payé', eur(q.total), true)}
    </div>
    <div style="margin-top:.9em;font-size:.8em;color:${C.muted}">Le voyageur reçoit ${eur(q.base)} après la livraison.</div>
  </div>`;
}

// Carte de profil (illustration de l'affichage des badges)
function profileCard({ size = 1, name = 'Awa D.', route = 'Paris → Douala' } = {}) {
  return `<div style="font-size:${size}rem;width:21em;background:#fff;color:${C.ink};border-radius:1.6em;padding:1.4em 1.5em;box-shadow:0 2em 4em -1.6em rgb(14 48 76/.55)">
    <div style="display:flex;gap:.9em;align-items:center">
      <span style="width:3.4em;height:3.4em;border-radius:50%;background:${C.brandPale};color:${C.brandDeep};display:grid;place-items:center;font-weight:900;font-size:1.1em">${name.split(' ').map((w) => w[0]).join('')}</span>
      <div><b style="font-size:1.15em">${name}</b><div style="font-size:.85em;color:${C.muted}">Voyageur · ${route}</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:.5em;margin-top:1.1em;font-size:.9em;font-weight:800">
      <span style="display:flex;gap:.5em;align-items:center;color:${C.brand}">${icon('badge', '1.3em', C.brand)} Identité vérifiée</span>
      <span style="display:flex;gap:.5em;align-items:center;color:${C.signalDeep}">${icon('shield', '1.3em', C.signalDeep)} Compte certifié</span>
      <span style="display:flex;gap:.25em;align-items:center;color:${C.signal}">${icon('star', '1.2em', C.signal)}${icon('star', '1.2em', C.signal)}${icon('star', '1.2em', C.signal)}${icon('star', '1.2em', C.signal)}${icon('star', '1.2em', C.signal)}<span style="color:${C.muted};font-weight:700;margin-left:.4em">Avis des expéditeurs</span></span>
    </div>
    <div style="margin-top:.9em;font-size:.7em;color:${C.muted}">Exemple d'affichage</div>
  </div>`;
}

module.exports = { priceCard, profileCard, creditCard, C, ICONS, icon, logo, cta, chip, arc, ticket, parcel, codeCard, timeline, phone, board, photo, asset, BASE_CSS, ROOT, SRC };
