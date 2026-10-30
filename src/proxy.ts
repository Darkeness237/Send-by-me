import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

// /publier et /demandes/nouvelle restent ouverts : un visiteur voit ce qui est demandé avant de créer son compte.
// /bienvenue vérifie la session elle-même : c'est la première page après une inscription Google.
const PROTECTED = ["/espace", "/reservations", "/admin", "/messages", "/notifications"];

// Langue : cookie (choix du membre), sinon langue du navigateur. L'adresse ne change pas :
// la page est servie depuis le segment /fr ou /en, rendu à l'avance pour chaque langue.
function localeOf(request: NextRequest) {
  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  return (request.headers.get("accept-language") ?? "").toLowerCase().startsWith("en") ? "en" : "fr";
}

const NOT_PAGES = /^\/(api|auth|_next|manifest\.webmanifest|robots\.txt|sitemap\.xml|opengraph-image|icon|sw\.js)(\/|$|\.)|\.[a-z0-9]+$/i;

function localized(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (NOT_PAGES.test(pathname) || /^\/(fr|en)(\/|$)/.test(pathname)) return null;
  const url = request.nextUrl.clone();
  url.pathname = `/${localeOf(request)}${pathname === "/" ? "" : pathname}`;
  return url;
}

export async function proxy(request: NextRequest) {
  // Adresse technique Netlify (…netlify.app) : on renvoie vers le vrai domaine, seul à porter la session.
  // L'hôte vient de l'en-tête du navigateur : l'URL interne de la requête peut, elle, être l'adresse technique.
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
  if (site && host.endsWith(".netlify.app") && !host.startsWith("deploy-preview")) {
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, site);
    if (target.host !== host) return NextResponse.redirect(target, 308);
  }

  const target = localized(request);
  const pass = () => (target ? NextResponse.rewrite(target, { request }) : NextResponse.next({ request }));
  // Retour de connexion (Google, Facebook, e-mail) arrivé sur l'accueil : Supabase y renvoie quand
  // l'adresse de retour n'est pas dans sa liste autorisée. On le fait suivre vers /auth/confirm.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" && (searchParams.has("code") || searchParams.has("token_hash"))) {
    const confirm = request.nextUrl.clone();
    confirm.pathname = "/auth/confirm";
    return NextResponse.redirect(confirm);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return pass();

  // Visiteur sans session Supabase : rien à rafraîchir, on évite l'appel (plus rapide pour la majorité des visites).
  const isProtected = (p: string) => PROTECTED.some((x) => p === x || p.startsWith(`${x}/`));
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))) {
    if (isProtected(pathname)) {
      const login = request.nextUrl.clone();
      login.pathname = "/connexion";
      login.search = `?suite=${encodeURIComponent(pathname + request.nextUrl.search)}`;
      return NextResponse.redirect(login);
    }
    return pass();
  }

  let response = pass();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = pass();
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Rafraîchit la session et vérifie la signature du jeton.
  const { data, error } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  if (!signedIn && error && isProtected(request.nextUrl.pathname)) console.warn("Session refusée", error.name, error.message);

  const path = request.nextUrl.pathname;
  if (!signedIn && isProtected(path)) {
    const login = request.nextUrl.clone();
    login.pathname = "/connexion";
    login.search = `?suite=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/webhooks|icon.svg|robots.txt|sitemap.xml|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
