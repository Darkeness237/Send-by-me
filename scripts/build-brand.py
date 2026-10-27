"""Régénère le logo (composant React, SVG brut, icônes) à partir de public/brand/logo-mark.svg.
Usage : python3 scripts/build-brand.py   (les PNG sont rendus avec Playwright : node scripts/render-icons.cjs)"""
import re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
svg = (root / "public/brand/logo-mark.svg").read_text()
inner = svg[svg.index(">") + 1 : svg.rindex("</svg>")]

# Composant React
jsx = re.sub(r"<!--(.*?)-->", lambda m: "{/*" + m.group(1) + "*/}", inner)
for a, b in [("stroke-width", "strokeWidth"), ("stroke-linecap", "strokeLinecap"), ("stroke-linejoin", "strokeLinejoin")]:
    jsx = jsx.replace(a, b)
jsx = "\n".join("      " + l.strip() for l in jsx.strip().splitlines())
p = root / "src/components/logo.tsx"
s = p.read_text()
a = s.index('    <svg viewBox="0 0 64 64"')
b = s.index("    </svg>", a)
s = s[:a] + '    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">\n' + jsx + "\n" + s[b:]
p.write_text(s)

# SVG brut (image de partage)
flat = re.sub(r"\s+", " ", re.sub(r"<!--.*?-->", "", svg)).replace("> <", "><").strip()
(root / "src/lib/logo-svg.ts").write_text(
    "// Symbole du logo en SVG brut (image de partage, e-mails). Source : public/brand/logo-mark.svg\n"
    f"export const LOGO_SVG = `{flat}`;\n"
)

# Icônes SVG : carré crème (favicon) et version « maskable » avec marge de sécurité
(root / "src/app/icon.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#FFF4E0"/><g transform="translate(5 5) scale(0.84375)">{inner}</g></svg>'
)
(root / "public/brand/icon-maskable.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#FFF4E0"/><g transform="translate(12 12) scale(0.625)">{inner}</g></svg>'
)
print("ok")
