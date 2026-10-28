// Gabarits de mise en page. Chaque gabarit reçoit (p, W, H) et renvoie le HTML du <body>.
// Unité : 1rem = min(W, H) / 54 (soit 20 px pour un visuel de 1080 px).
const L = require('./lib.cjs');
const { C, icon, logo, cta, chip, arc } = L;

const BG = {
  ink: { bg: C.ink, fg: '#fff', soft: 'rgb(255 255 255/.78)', accent: C.signal },
  brand: { bg: C.brand, fg: '#fff', soft: 'rgb(255 255 255/.82)', accent: C.signal },
  signal: { bg: C.signal, fg: C.ink, soft: 'rgb(14 48 76/.8)', accent: '#fff' },
  paper: { bg: C.paper, fg: C.ink, soft: C.inkSoft, accent: C.brand },
  kraft: { bg: C.kraft, fg: C.ink, soft: C.inkSoft, accent: C.brandDeep },
};

function element(el) {
  if (!el) return '';
  const { type, ...o } = el;
  return L[type](o);
}

const shape = (W, H) => (W / H > 1.25 ? 'land' : W / H < 0.8 ? 'tall' : 'square');

// Halos décoratifs aux couleurs du logo
const halos = (a = C.signal, b = C.brand) => `
  <span class="abs" style="width:60%;aspect-ratio:1;border-radius:50%;background:${a};opacity:.18;filter:blur(6rem);top:-15%;left:-15%"></span>
  <span class="abs" style="width:70%;aspect-ratio:1;border-radius:50%;background:${b};opacity:.18;filter:blur(6rem);bottom:-20%;right:-20%"></span>`;

const titleSize = (p, s, base) => (p.titleSize || base) * (s === 'land' ? 0.92 : 1);

const T = {
  // Photo plein cadre, dégradé, texte en bas (ou à gauche en paysage)
  photoHero(p, W, H) {
    const s = shape(W, H);
    const grad = s === 'land' ? 'linear-gradient(90deg, rgb(14 48 76/.96) 0%, rgb(14 48 76/.82) 42%, rgb(14 48 76/.1) 75%)' : 'linear-gradient(0deg, rgb(14 48 76/.97) 0%, rgb(14 48 76/.86) 46%, rgb(14 48 76/.0) 80%)';
    const box = s === 'land' ? 'left:3.2rem;top:0;bottom:0;width:52%;justify-content:center' : 'left:3rem;right:3rem;bottom:' + (s === 'tall' ? '6rem' : '3rem');
    return `<img class="cover kb" src="${L.photo(p.photo)}" style="object-position:${p.pos || '50% 35%'}"/>
      <div class="abs" style="inset:0;background:${grad}"></div>
      <div class="abs" style="top:${s === 'tall' ? '4.6rem' : '2.4rem'};left:2.6rem;background:${C.paper};border-radius:999px;padding:.45rem 1.1rem .45rem .55rem">${logo({ size: 1.55 })}</div>
      ${p.el ? `<div class="abs el" style="${s === 'land' ? 'right:4rem;top:50%;transform:translateY(-50%)' : `right:3rem;top:${s === 'tall' ? '13rem' : '6rem'}`}">${element(p.el)}</div>` : ''}
      <div class="abs" style="${box};display:flex;flex-direction:column;gap:1.1rem;color:#fff">
        ${p.eyebrow ? `<div class="wide in" style="font-weight:900;font-size:1.25rem;color:${C.signal};text-transform:uppercase">${p.eyebrow}</div>` : ''}
        <h1 class="display in" style="font-size:${titleSize(p, s, s === 'tall' ? 5 : 4.4)}rem">${p.title}</h1>
        ${p.text ? `<p class="in" style="font-size:1.55rem;line-height:1.4;color:rgb(255 255 255/.85);max-width:36rem">${p.text}</p>` : ''}
        ${p.chips ? `<div class="in" style="display:flex;flex-wrap:wrap;gap:.6rem">${p.chips.map(([i, t]) => chip(i, t)).join('')}</div>` : ''}
        ${p.cta ? `<div class="in" style="margin-top:.6rem">${cta(p.cta)}</div>` : ''}
      </div>`;
  },

  // Fond uni, grand titre, élément d'interface
  typo(p, W, H) {
    const s = shape(W, H);
    const t = BG[p.bg || 'ink'];
    if (s === 'tall') return T.typoTall(p, W, H, t);
    const elPos = s === 'land' ? 'right:4rem;top:50%;transform:translateY(-50%)' : s === 'tall' ? 'left:50%;bottom:13rem;transform:translateX(-50%)' : 'right:3rem;bottom:3rem';
    const textBox = s === 'land' ? 'left:3.5rem;top:0;bottom:0;width:50%;justify-content:center' : `left:3rem;right:3rem;top:${s === 'tall' ? '13rem' : '7.5rem'}`;
    return `<div class="abs" style="inset:0;background:${t.bg}"></div>${p.bg === 'paper' || p.bg === 'kraft' ? halos() : halos(C.signal, '#5fb3bb')}
      ${p.arc !== false ? `<div class="abs float" style="width:${s === 'land' ? '34%' : '62%'};top:${s === 'tall' ? '7rem' : '1.5rem'};right:-2rem;opacity:.5">${arc({ light: t.fg === '#fff', plane: true })}</div>` : ''}
      <div class="abs" style="top:${s === 'tall' ? '5rem' : '2.6rem'};left:3rem">${logo({ tone: t.fg === '#fff' ? 'light' : 'dark', size: 1.8 })}</div>
      <div class="abs" style="${textBox};display:flex;flex-direction:column;gap:1.1rem;color:${t.fg}">
        ${p.eyebrow ? `<div class="wide in" style="font-weight:900;font-size:1.25rem;color:${t.accent};text-transform:uppercase">${p.eyebrow}</div>` : ''}
        <h1 class="display in" style="font-size:${titleSize(p, s, s === 'tall' ? 5.2 : 4.3)}rem;max-width:${s === 'square' && p.el ? '30rem' : 'none'}">${p.title}</h1>
        ${p.text ? `<p class="in" style="font-size:1.5rem;line-height:1.42;color:${t.soft};max-width:${s === 'square' && p.el ? '24rem' : '40rem'}">${p.text}</p>` : ''}
        ${p.chips ? `<div class="in" style="display:flex;flex-wrap:wrap;gap:.6rem">${p.chips.map(([i, tx]) => chip(i, tx, t.fg === '#fff' ? {} : { bg: 'rgb(14 48 76/.08)', color: C.ink, iconColor: C.brand })).join('')}</div>` : ''}
        ${p.cta && s !== 'square' ? `<div class="in" style="margin-top:.5rem">${cta(p.cta, t.bg === C.signal ? { bg: C.ink, color: '#fff' } : {})}</div>` : ''}
      </div>
      ${p.el ? `<div class="abs el" style="${elPos}">${element({ size: s === 'square' ? 1.12 : s === 'land' ? 1.05 : 1.3, ...p.el })}</div>` : ''}
      ${p.cta && s === 'square' ? `<div class="abs in" style="left:3rem;bottom:3rem">${cta(p.cta, t.bg === C.signal ? { bg: C.ink, color: '#fff', size: 1.4 } : { size: 1.4 })}</div>` : ''}
      ${p.cta && s === 'tall' && !p.el ? '' : ''}`;
  },

  // Version verticale (stories) : texte, élément, bouton empilés sans chevauchement
  typoTall(p, W, H, t) {
    return `<div class="abs" style="inset:0;background:${t.bg}"></div>${p.bg === 'paper' || p.bg === 'kraft' ? halos() : halos(C.signal, '#5fb3bb')}
      ${p.arc !== false ? `<div class="abs float" style="width:62%;top:7rem;right:-2rem;opacity:.5">${arc({ light: t.fg === '#fff' })}</div>` : ''}
      <div class="abs" style="top:4.5rem;left:3rem">${logo({ tone: t.fg === '#fff' ? 'light' : 'dark', size: 1.8 })}</div>
      <div class="abs" style="left:3rem;right:3rem;top:11rem;bottom:5rem;display:flex;flex-direction:column;gap:1.1rem;color:${t.fg}">
        ${p.eyebrow ? `<div class="wide in" style="font-weight:900;font-size:1.25rem;color:${t.accent};text-transform:uppercase">${p.eyebrow}</div>` : ''}
        <h1 class="display in" style="font-size:${p.titleSize || 4.4}rem">${p.title}</h1>
        ${p.text ? `<p class="in" style="font-size:1.5rem;line-height:1.42;color:${t.soft}">${p.text}</p>` : ''}
        ${p.chips ? `<div class="in" style="display:flex;flex-wrap:wrap;gap:.6rem">${p.chips.map(([i, tx]) => chip(i, tx, t.fg === '#fff' ? {} : { bg: 'rgb(14 48 76/.08)', color: C.ink, iconColor: C.brand })).join('')}</div>` : ''}
        <div style="flex:1;display:flex;align-items:center;justify-content:center;min-height:0">${p.el ? `<div class="el">${element({ size: 1.15, ...p.el })}</div>` : ''}</div>
        ${p.cta ? `<div class="in" style="text-align:center">${cta(p.cta, t.bg === C.signal ? { bg: C.ink, color: '#fff' } : {})}</div>` : ''}
      </div>`;
  },

  // On dit… / En vrai…
  myth(p, W, H) {
    const s = shape(W, H);
    return `<div class="abs" style="inset:0;background:${C.paper}"></div>${halos()}
      <div class="abs" style="top:${s === 'tall' ? '5rem' : '2.6rem'};left:3rem">${logo({ size: 1.8 })}</div>
      <div class="abs" style="left:3rem;right:3rem;top:${s === 'tall' ? '14rem' : '8rem'};display:flex;flex-direction:column;gap:1.6rem">
        <div class="in" style="background:#fff;border-radius:1.6rem;padding:2rem;border:2px solid ${C.line}">
          <div class="wide" style="display:flex;align-items:center;gap:.5rem;font-weight:900;font-size:1.2rem;color:${C.danger}">${icon('x', '1.3em', C.danger, 3)} ON DIT</div>
          <p class="display" style="font-size:${s === 'tall' ? 3.4 : 3}rem;margin-top:.6rem;color:${C.inkSoft}">« ${p.myth} »</p>
        </div>
        <div class="in" style="background:${C.ink};color:#fff;border-radius:1.6rem;padding:2rem">
          <div class="wide" style="display:flex;align-items:center;gap:.5rem;font-weight:900;font-size:1.2rem;color:${C.signal}">${icon('check', '1.3em', C.signal, 3)} EN VRAI</div>
          <p style="font-size:${s === 'tall' ? 2.4 : 2.1}rem;line-height:1.35;margin-top:.6rem;font-weight:700">${p.fact}</p>
        </div>
      </div>
      <div class="abs in" style="left:3rem;bottom:${s === 'tall' ? '6rem' : '2.6rem'}">${cta(p.cta || 'send-by-me.com', { size: 1.4 })}</div>`;
  },

  // Compte à rebours de lancement
  countdown(p, W, H) {
    const s = shape(W, H);
    return `<div class="abs" style="inset:0;background:${C.ink}"></div>${halos(C.signal, '#5fb3bb')}
      <div class="abs" style="top:${s === 'tall' ? '5rem' : '2.6rem'};left:3rem">${logo({ tone: 'light', size: 1.8 })}</div>
      <div class="abs" style="inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;gap:1rem;padding:0 3rem">
        <div class="wide in" style="font-weight:900;font-size:1.4rem;color:${C.signal}">${p.eyebrow || 'LANCEMENT'}</div>
        <div class="display in pop" style="font-size:${s === 'tall' ? 16 : 13}rem;color:${C.signal};line-height:.9">${p.big}</div>
        <h1 class="display in" style="font-size:${s === 'tall' ? 3.6 : 3}rem;max-width:44rem">${p.title}</h1>
        ${p.text ? `<p class="in" style="font-size:1.5rem;color:rgb(255 255 255/.8);max-width:38rem">${p.text}</p>` : ''}
        <div class="in float" style="width:${s === 'tall' ? '80%' : '55%'};margin-top:1rem">${arc()}</div>
      </div>
      ${p.cta ? `<div class="abs in" style="left:0;right:0;bottom:${s === 'tall' ? '6rem' : '2.6rem'};text-align:center">${cta(p.cta, { size: 1.4 })}</div>` : ''}`;
  },

  // Étapes numérotées
  steps(p, W, H) {
    const s = shape(W, H);
    const t = BG[p.bg || 'paper'];
    return `<div class="abs" style="inset:0;background:${t.bg}"></div>${halos()}
      <div class="abs" style="top:${s === 'tall' ? '5rem' : '2.6rem'};left:3rem">${logo({ tone: t.fg === '#fff' ? 'light' : 'dark', size: 1.8 })}</div>
      <div class="abs" style="left:3rem;right:3rem;top:${s === 'tall' ? '13rem' : '7rem'};color:${t.fg}">
        <h1 class="display in" style="font-size:${s === 'tall' ? 4.4 : 3.4}rem">${p.title}</h1>
        <ol style="list-style:none;margin-top:${s === 'tall' ? '3rem' : '1.8rem'};display:flex;flex-direction:column;gap:${s === 'tall' ? '1.6rem' : '1.05rem'}">
          ${p.steps.map(([ic, h, tx], i) => `<li class="in" style="display:flex;gap:1.2rem;align-items:center;background:${t.fg === '#fff' ? 'rgb(255 255 255/.08)' : '#fff'};border-radius:1.4rem;padding:${s === 'tall' ? '1.4rem' : '1rem'} 1.3rem;${t.fg === '#fff' ? '' : `border:2px solid ${C.line}`}">
            <span class="display" style="width:3.2rem;height:3.2rem;border-radius:50%;background:${C.ink};color:${C.signal};display:grid;place-items:center;font-size:1.5rem;flex-shrink:0">${i + 1}</span>
            <span style="flex:1"><b style="font-size:${s === 'tall' ? 1.9 : 1.6}rem;display:flex;align-items:center;gap:.5rem">${icon(ic, '1.1em', C.brand, 2.4)}${h}</b><span style="display:block;font-size:${s === 'tall' ? 1.45 : 1.25}rem;color:${t.soft};margin-top:.15rem">${tx}</span></span>
          </li>`).join('')}
        </ol>
      </div>
      ${p.cta ? `<div class="abs in" style="left:3rem;bottom:${s === 'tall' ? '6rem' : '2.6rem'}">${cta(p.cta, { size: 1.4 })}</div>` : ''}`;
  },

  // Ligne Paris → Douala
  corridor(p, W, H) {
    const s = shape(W, H);
    return `<img class="cover kb" src="${L.photo(p.photo)}" style="object-position:${p.pos || '50% 40%'}"/>
      <div class="abs" style="inset:0;background:linear-gradient(180deg, rgb(14 48 76/.15), rgb(14 48 76/.35) 35%, rgb(14 48 76/.96) 72%)"></div>
      <div class="abs" style="top:${s === 'tall' ? '5rem' : '2.6rem'};left:3rem">${logo({ tone: 'light', size: 1.8 })}</div>
      <div class="abs" style="left:3rem;right:3rem;bottom:${s === 'tall' ? '7rem' : '3rem'};color:#fff">
        <div class="wide in" style="font-weight:900;font-size:1.25rem;color:${C.signal}">${p.eyebrow || 'ENVOYER UN COLIS'}</div>
        <div class="in" style="display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:1rem;margin-top:1rem">
          <div><div class="display" style="font-size:${s === 'tall' ? 5.6 : 6.5}rem;color:${C.signal}">${p.from[0]}</div><div style="font-size:1.6rem;font-weight:800">${p.from[1]}</div></div>
          <div style="margin-bottom:3rem">${arc()}</div>
          <div style="text-align:right"><div class="display" style="font-size:${s === 'tall' ? 5.6 : 6.5}rem;color:${C.signal}">${p.to[0]}</div><div style="font-size:1.6rem;font-weight:800">${p.to[1]}</div></div>
        </div>
        <p class="in" style="font-size:1.55rem;line-height:1.4;color:rgb(255 255 255/.85);margin-top:1.4rem">${p.text}</p>
        <div class="in" style="margin-top:1.4rem">${cta(p.cta || 'Voir les trajets', { size: 1.45 })}</div>
      </div>`;
  },

  // Diapositive de carrousel
  slide(p, W, H) {
    const t = BG[p.bg || 'paper'];
    const last = p.n === p.total;
    return `<div class="abs" style="inset:0;background:${t.bg}"></div>${halos()}
      <div class="abs" style="top:2.6rem;left:3rem">${logo({ tone: t.fg === '#fff' ? 'light' : 'dark', size: 1.6 })}</div>
      <div class="abs wide" style="top:2.9rem;right:3rem;font-weight:900;font-size:1.2rem;color:${t.accent}">${p.n}/${p.total}</div>
      ${p.photo ? `<div class="abs" style="left:3rem;right:3rem;top:7rem;height:40%;border-radius:1.8rem;overflow:hidden"><img class="cover" src="${L.photo(p.photo)}" style="object-position:${p.pos || '50% 40%'}"/></div>` : ''}
      <div class="abs" style="left:3rem;right:3rem;${p.photo ? 'top:52%' : 'top:9rem'};color:${t.fg}">
        ${p.kicker ? `<div class="display" style="font-size:6rem;color:${t.accent};line-height:1">${p.kicker}</div>` : ''}
        <h1 class="display" style="font-size:${p.titleSize || (p.photo ? 3.6 : 4.2)}rem;margin-top:.6rem">${p.title}</h1>
        ${p.text ? `<p style="font-size:${p.photo ? 1.6 : 1.9}rem;line-height:1.42;color:${t.soft};margin-top:1rem">${p.text}</p>` : ''}
      </div>
      ${!p.photo && !p.el && p.icon ? `<div class="abs" style="right:3rem;bottom:6rem;width:15rem;height:15rem;border-radius:50%;background:${t.fg === '#fff' ? 'rgb(255 255 255/.1)' : C.brandPale};display:grid;place-items:center">${icon(p.icon, '7.5rem', t.fg === '#fff' ? C.signal : C.brand, 1.8)}</div>` : ''}
      ${p.el ? `<div class="abs" style="left:50%;bottom:${last ? '8rem' : '4.5rem'};transform:translateX(-50%)">${element({ size: 0.95, ...p.el })}</div>` : ''}
      ${last ? `<div class="abs" style="left:3rem;bottom:3rem">${cta(p.cta || 'send-by-me.com', t.bg === C.signal ? { bg: C.ink, color: '#fff', size: 1.4 } : { size: 1.4 })}</div>` : `<div class="abs" style="right:3rem;bottom:2.8rem;display:flex;align-items:center;gap:.5rem;font-weight:800;font-size:1.2rem;color:${t.accent}">Glissez ${icon('arrow', '1.3em', t.accent, 2.6)}</div>`}`;
  },

  // Téléphone avec écran réel du site
  phoneAd(p, W, H) {
    const s = shape(W, H);
    const t = BG[p.bg || 'brand'];
    const phonePos = s === 'land' ? 'right:6rem;top:50%;transform:translateY(-46%)' : s === 'tall' ? 'left:50%;bottom:-9rem;transform:translateX(-50%)' : 'right:3rem;bottom:-9rem';
    const textBox = s === 'land' ? 'left:3.5rem;top:0;bottom:0;width:52%;justify-content:center' : `left:3rem;right:${s === 'square' ? '24rem' : '3rem'};top:${s === 'tall' ? '13rem' : '7.5rem'}`;
    return `<div class="abs" style="inset:0;background:${t.bg}"></div>${halos(C.signal, '#7cc3ca')}
      <div class="abs" style="top:${s === 'tall' ? '5rem' : '2.6rem'};left:3rem">${logo({ tone: t.fg === '#fff' ? 'light' : 'dark', size: 1.8 })}</div>
      <div class="abs" style="${textBox};display:flex;flex-direction:column;gap:1.1rem;color:${t.fg}">
        ${p.eyebrow ? `<div class="wide in" style="font-weight:900;font-size:1.25rem;color:${t.accent};text-transform:uppercase">${p.eyebrow}</div>` : ''}
        <h1 class="display in" style="font-size:${titleSize(p, s, s === 'tall' ? 4.6 : 3.8)}rem">${p.title}</h1>
        ${p.text ? `<p class="in" style="font-size:1.5rem;line-height:1.42;color:${t.soft}">${p.text}</p>` : ''}
        ${p.cta ? `<div class="in" style="margin-top:.4rem">${cta(p.cta, t.bg === C.signal ? { bg: C.ink, color: '#fff', size: 1.4 } : { size: 1.4 })}</div>` : ''}
      </div>
      <div class="abs el" style="${phonePos}">${L.phone({ img: L.asset.ui(p.screen), size: s === 'tall' ? 1.22 : 1.35, top: p.top || 0 })}</div>`;
  },

  // Photo + panneau de couleur côte à côte
  split(p, W, H) {
    const s = shape(W, H);
    const t = BG[p.bg || 'signal'];
    const photoBox = s === 'land' ? 'left:0;top:0;bottom:0;width:46%' : 'left:0;right:0;top:0;height:50%';
    const panel = s === 'land' ? 'left:46%;right:0;top:0;bottom:0;padding:3.5rem' : 'left:0;right:0;bottom:0;height:50%;padding:3rem';
    return `<div class="abs" style="${photoBox};overflow:hidden"><img class="cover kb" src="${L.photo(p.photo)}" style="object-position:${p.pos || '50% 35%'}"/></div>
      <div class="abs" style="${panel};background:${t.bg};color:${t.fg};display:flex;flex-direction:column;justify-content:center;gap:1rem">
        ${p.eyebrow ? `<div class="wide in" style="font-weight:900;font-size:1.2rem;color:${t.accent};text-transform:uppercase">${p.eyebrow}</div>` : ''}
        <h1 class="display in" style="font-size:${titleSize(p, s, s === 'tall' ? 4.4 : 3.5)}rem">${p.title}</h1>
        ${p.text ? `<p class="in" style="font-size:1.45rem;line-height:1.42;color:${t.soft}">${p.text}</p>` : ''}
        ${p.cta ? `<div class="in" style="margin-top:.4rem">${cta(p.cta, t.bg === C.signal ? { bg: C.ink, color: '#fff', size: 1.35 } : { size: 1.35 })}</div>` : ''}
      </div>
      <div class="abs" style="top:${s === 'tall' ? '4rem' : '2.4rem'};left:2.6rem;background:${C.paper};border-radius:999px;padding:.5rem 1.1rem .5rem .6rem">${logo({ size: 1.4 })}</div>`;
  },

  // Flyer imprimable A6 (recto / verso)
  flyer(p, W, H) {
    if (p.side === 'verso') {
      return `<div class="abs" style="inset:0;background:${C.paper}"></div>${halos()}
        <div class="abs" style="top:3rem;left:3rem">${logo({ size: 1.9 })}</div>
        <div class="abs" style="left:3rem;right:3rem;top:9rem">
          <h2 class="display" style="font-size:3rem">${p.title}</h2>
          <ol style="list-style:none;margin-top:2rem;display:flex;flex-direction:column;gap:1.3rem">
            ${p.steps.map(([ic, h, tx], i) => `<li style="display:flex;gap:1rem;align-items:flex-start"><span class="display" style="width:2.8rem;height:2.8rem;border-radius:50%;background:${C.ink};color:${C.signal};display:grid;place-items:center;font-size:1.3rem;flex-shrink:0">${i + 1}</span><span><b style="font-size:1.55rem">${h}</b><span style="display:block;font-size:1.25rem;color:${C.inkSoft}">${tx}</span></span></li>`).join('')}
          </ol>
        </div>
        <div class="abs" style="left:3rem;right:3rem;bottom:3rem;display:flex;gap:1.6rem;align-items:center;background:#fff;border-radius:1.6rem;padding:1.4rem;border:2px solid ${C.line}">
          <div style="width:11rem;height:11rem;flex-shrink:0">${L.asset.qr(p.qr).replace('<svg', '<svg width="100%" height="100%"')}</div>
          <div><b style="font-size:1.7rem">${p.qrText}</b><div style="font-size:1.3rem;color:${C.brand};font-weight:800;margin-top:.3rem">send-by-me.com</div></div>
        </div>`;
    }
    return T.photoHero({ ...p, cta: p.cta || 'send-by-me.com' }, W, H);
  },

  // Bannières display (formats Google)
  banner(p, W, H) {
    const r = W / H;
    if (r > 3) {
      // Leaderboard / bannière mobile
      return `<div class="abs" style="inset:0;background:${C.ink}"></div>
        <div class="abs" style="inset:0;display:flex;align-items:center;gap:${H * 0.25}px;padding:0 ${H * 0.3}px;color:#fff">
          <img src="${L.asset.logo}" style="height:${Math.min(H * 0.7, W * 0.12)}px;background:${C.paper};border-radius:22%;padding:${H * 0.05}px"/>
          <b class="display" style="font-size:${Math.min(H * 0.3, W * 0.045)}px;flex:1;line-height:1.05">${p.title}</b>
          <span class="pill" style="background:${C.signal};color:${C.ink};font-size:${Math.min(H * 0.2, W * 0.03)}px;padding:.55em 1em;white-space:nowrap">${p.cta}</span>
        </div>`;
    }
    if (r < 0.5) {
      // Skyscraper
      return `<img class="cover" src="${L.photo(p.photo)}" style="object-position:${p.pos || '50% 30%'}"/>
        <div class="abs" style="inset:0;background:linear-gradient(0deg, ${C.ink} 45%, rgb(14 48 76/.2))"></div>
        <div class="abs" style="left:${W * 0.08}px;right:${W * 0.08}px;bottom:${W * 0.1}px;color:#fff;display:flex;flex-direction:column;gap:${W * 0.07}px">
          <img src="${L.asset.logo}" style="width:${W * 0.3}px;background:${C.paper};border-radius:22%;padding:${W * 0.02}px"/>
          <b class="display" style="font-size:${W * 0.15}px">${p.title}</b>
          <span style="font-size:${W * 0.075}px;color:rgb(255 255 255/.8)">${p.text}</span>
          <span class="pill" style="background:${C.signal};color:${C.ink};font-size:${W * 0.08}px;padding:${W * 0.05}px ${W * 0.08}px;align-self:flex-start">${p.cta}</span>
        </div>`;
    }
    // Rectangle / billboard
    return `<img class="cover" src="${L.photo(p.photo)}" style="object-position:${p.pos || '50% 30%'}"/>
      <div class="abs" style="inset:0;background:linear-gradient(${r > 1.5 ? '90deg' : '0deg'}, ${C.ink} 35%, rgb(14 48 76/.1) 85%)"></div>
      <div class="abs" style="${r > 1.5 ? `left:${H * 0.1}px;top:0;bottom:0;width:55%;justify-content:center` : `left:${W * 0.06}px;right:${W * 0.06}px;bottom:${W * 0.06}px`};display:flex;flex-direction:column;gap:${H * 0.04}px;color:#fff">
        <div style="display:flex;align-items:center;gap:${H * 0.03}px;font-weight:900;font-size:${Math.min(W, H) * 0.07}px"><img src="${L.asset.logo}" style="height:1.5em;background:${C.paper};border-radius:22%;padding:.06em"/>Send By Me</div>
        <b class="display" style="font-size:${Math.min(W, H) * (r > 1.5 ? 0.15 : 0.11)}px">${p.title}</b>
        <span class="pill" style="background:${C.signal};color:${C.ink};font-size:${Math.min(W, H) * 0.065}px;padding:.5em .9em;align-self:flex-start">${p.cta}</span>
      </div>`;
  },
};

module.exports = { T, shape };
