import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/i18n/client";
import { translator, type Locale } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { Nunito } from "next/font/google";
import { SITE_URL } from "@/lib/env";
import { INTRO_SCRIPT, IntroSplash } from "@/components/intro-splash";
import { PwaInstall } from "@/components/pwa";
import { NavProgress } from "@/components/nav-progress";
import { THEME_SCRIPT } from "@/lib/theme";
import { Suspense } from "react";
import "../globals.css";

// Police arrondie, dans l'esprit du nom « Send By Me » du logo.
const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  variable: "--font-nunito",
  display: "swap",
});

const SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Send By Me, vos colis voyagent dans la valise de quelqu'un" };

export function generateStaticParams() {
  return [{ lang: "fr" }, { lang: "en" }];
}

export async function generateMetadata(): Promise<Metadata> {
  const locale: Locale = await getLocale();
  const t = translator(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("Send By Me | Envoyez vos colis avec des voyageurs"),
      template: "%s · Send By Me",
    },
    description: t("Envoyez un colis entre la France, la Belgique et l'Afrique avec un voyageur vérifié qui a de la place dans sa valise."),
    applicationName: "Send By Me",
    keywords: ["envoi colis Afrique", "colis Paris Douala", "colis Paris Dakar", "GP colis", "kilos valise", "transport colis particulier", "send parcel Africa"],
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : "fr_FR",
      siteName: "Send By Me",
      // Déclarée ici : l'objet openGraph de ce layout remplace celui généré par app/opengraph-image.tsx.
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", images: [SHARE_IMAGE.url] },
    appleWebApp: { capable: true, title: "Send By Me", statusBarStyle: "black-translucent" },
    icons: { apple: "/icons/apple-touch-icon.png" },
    formatDetection: { telephone: false },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0E304C",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={nunito.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <I18nProvider locale={locale}>
          <IntroSplash />
          <Suspense fallback={null}>
            <NavProgress />
          </Suspense>
          {children}
          <PwaInstall />
        </I18nProvider>
      </body>
    </html>
  );
}
