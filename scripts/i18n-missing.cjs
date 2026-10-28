// Liste les textes français passés à t() (et les libellés des listes de src/lib) absents de src/i18n/en.ts.
// Usage : node scripts/i18n-missing.cjs [--json]
/* eslint-disable @typescript-eslint/no-require-imports -- script Node en CommonJS */
const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "src");
const enSrc = fs.readFileSync(path.join(root, "i18n/en.ts"), "utf8");
const enFile = ts.createSourceFile("en.ts", enSrc, ts.ScriptTarget.Latest, true);
const have = new Set();
(function walk(n) {
  if (ts.isPropertyAssignment(n) && ts.isStringLiteral(n.name)) have.add(n.name.text);
  ts.forEachChild(n, walk);
})(enFile);

const LIB_KEYS = new Set(["label", "hint", "group", "title", "text"]);
const LIB_MAPS = /LABEL|TRACKING_END|REASONS/;
const files = [];
(function list(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (!/admin/.test(f.name)) list(p); }
    else if (/\.(tsx?|ts)$/.test(f.name) && !/admin|i18n[\\/]en\.ts/.test(p)) files.push(p);
  }
})(root);

const missing = new Map();
// Identifiants (demo-1, not_delivered…) et noms de marque : pas de traduction.
const SKIP = (k) => /^[a-z0-9_-]+$/.test(k) || ["WhatsApp", "SMS"].includes(k);
const add = (k, where) => { if (k && !SKIP(k) && !have.has(k) && /[A-Za-zÀ-ÿ]/.test(k) && !missing.has(k)) missing.set(k, where); };
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = path.relative(root, file);
  const isLib = rel.startsWith("lib" + path.sep);
  (function walk(n, inMap) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "t" && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0])) add(n.arguments[0].text, rel);
    if (ts.isCallExpression(n) && n.expression.getText(sf).endsWith(")") && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0]) && /getActionT\(\)\)$/.test(n.expression.getText(sf))) add(n.arguments[0].text, rel);
    if (rel.startsWith("app" + path.sep + "actions") && ts.isPropertyAssignment(n) && ["error", "ok"].includes(n.name.getText(sf)) && ts.isStringLiteralLike(n.initializer)) add(n.initializer.text, rel);
    if (rel.endsWith("notify-events.ts") && ts.isCallExpression(n) && /^to(Sender|Traveler)$/.test(n.expression.getText(sf)) && ts.isStringLiteralLike(n.arguments[0])) add(n.arguments[0].text, rel);
    if (/notify-events|actions/.test(rel) && ts.isPropertyAssignment(n) && ["title", "body"].includes(n.name.getText(sf)) && ts.isStringLiteralLike(n.initializer)) add(n.initializer.text, rel);
    let map = inMap;
    if (ts.isVariableDeclaration(n) && LIB_MAPS.test(n.name.getText(sf))) map = true;
    if (isLib && ts.isPropertyAssignment(n) && ts.isStringLiteralLike(n.initializer) && (LIB_KEYS.has(n.name.getText(sf)) || map)) add(n.initializer.text, rel);
    ts.forEachChild(n, (c) => walk(c, map));
  })(sf, false);
}
if (process.argv.includes("--json")) console.log(JSON.stringify(Object.fromEntries(missing), null, 1));
else { for (const [k, w] of missing) console.log(`${w}\t${k}`); console.error(`${missing.size} manquante(s)`); }
process.exitCode = 0;
