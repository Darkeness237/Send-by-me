// Génère marketing/CONTENUS.md (légendes) et marketing/index.html (galerie) à partir des catalogues.
const fs = require('fs');
const path = require('path');
const { S } = require('./specs.cjs');
const { VIDEOS } = require('./video.cjs');

const ROOT = path.resolve(__dirname, '..');
const TITLES = {
  '01-lancement': 'Lancement « Kilos libres »', '02-voyageurs': 'Voyageurs', '03-expediteurs': 'Expéditeurs', '04-confiance': 'Confiance et sécurité',
  '05-lignes': 'Lignes', '06-saisons': 'Saisons et temps forts', '07-parrainage': 'Parrainage', '08-ambassadeurs': 'Ambassadeurs étudiants',
  '09-mythes-realites': 'Mythes et réalités', '10-carrousels': 'Carrousels', '11-imprimes': 'Imprimés', '12-bannieres': 'Bannières display', '13-application': 'Application', '14-conseils': 'Conseils pratiques',
};
const videoFiles = fs.existsSync(path.join(ROOT, 'videos')) ? fs.readdirSync(path.join(ROOT, 'videos')).filter((f) => f.endsWith('.mp4')).sort() : [];

// ── CONTENUS.md ──
let md = `# Contenus prêts à publier\n\nChaque visuel avec son texte de publication. Les légendes sont à copier telles quelles (ajustez les emojis et hashtags selon le réseau).\nVoir \`CAMPAGNES.md\` pour le calendrier et le mode d'emploi.\n\n**${S.length} visuels · ${videoFiles.length} vidéos**\n`;
let folder = '';
for (const s of S) {
  if (s.folder !== folder) {
    folder = s.folder;
    md += `\n## ${TITLES[folder] || folder}\n`;
  }
  if (!s.caption && !s.where) continue;
  md += `\n### \`visuels/${s.folder}/${s.file}.png\` · ${s.size[0]}×${s.size[1]}\n`;
  if (s.where) md += `*Où :* ${s.where}\n\n`;
  if (s.caption) md += s.caption.split('\n').map((l) => `> ${l}`).join('\n') + '\n';
}
md += `\n## Vidéos\n`;
for (const v of VIDEOS) {
  const files = videoFiles.filter((f) => f.startsWith(v.file));
  md += `\n### ${v.file}\n*Fichiers :* ${files.map((f) => `\`videos/${f}\``).join(', ') || '(à générer)'}\n\n> ${v.caption}\n`;
}
fs.writeFileSync(path.join(ROOT, 'CONTENUS.md'), md);

// ── index.html ──
const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const groups = {};
for (const s of S) (groups[s.folder] ||= []).push(s);
const cards = Object.entries(groups).map(([f, list]) => `<section><h2>${esc(TITLES[f] || f)} <small>${list.length}</small></h2><div class="grid">${list.map((s) => `
  <figure><a href="visuels/${f}/${s.file}.png" target="_blank"><img loading="lazy" src="visuels/${f}/${s.file}.png" alt=""></a>
  <figcaption><b>${esc(s.file)}</b><span>${s.size[0]}×${s.size[1]}${s.where ? ' · ' + esc(s.where) : ''}</span>${s.caption ? `<details><summary>Légende</summary><p>${esc(s.caption).replace(/\n/g, '<br>')}</p></details>` : ''}</figcaption></figure>`).join('')}</div></section>`).join('');
const vids = `<section><h2>Vidéos <small>${videoFiles.length}</small></h2><div class="grid">${videoFiles.map((f) => `
  <figure><video src="videos/${f}" controls muted playsinline preload="metadata"></video><figcaption><b>${esc(f)}</b></figcaption></figure>`).join('')}</div></section>`;
fs.writeFileSync(path.join(ROOT, 'index.html'), `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kit marketing Send By Me</title>
<style>
:root { --ink:#0e304c; --brand:#2f7a82; --signal:#eb9332; --paper:#fbf8f1; --line:#ebe3d3; }
body { margin:0; font-family: system-ui, sans-serif; background: var(--paper); color: var(--ink); }
header { background: var(--ink); color:#fff; padding: 32px 16px; } header div, main { max-width: 1200px; margin: 0 auto; }
h1 { margin:0; font-size: 28px; } header p { opacity:.8; margin:.4em 0 0; }
main { padding: 0 16px 48px; } h2 { margin: 40px 0 16px; } h2 small { color: var(--brand); font-size: 14px; }
.grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
figure { margin:0; background:#fff; border:1px solid var(--line); border-radius: 14px; overflow:hidden; }
figure img, figure video { width:100%; display:block; background:#eee; max-height: 360px; object-fit: contain; }
figcaption { padding: 10px 12px; font-size: 13px; display:flex; flex-direction:column; gap:4px; } figcaption span { color:#6b7a86; }
details p { margin:.5em 0 0; color:#2b4a63; } summary { cursor:pointer; color: var(--brand); font-weight:600; }
</style></head><body><header><div><h1>Kit marketing Send By Me</h1><p>${S.length} visuels et ${videoFiles.length} vidéos. Cliquez sur un visuel pour l'ouvrir en taille réelle. Mode d'emploi : CAMPAGNES.md</p></div></header>
<main>${vids}${cards}</main></body></html>`);
console.log('CONTENUS.md et index.html générés');
