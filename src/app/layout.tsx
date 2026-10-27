import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { SITE_URL } from "@/lib/env";
import { INTRO_SCRIPT, IntroSplash } from "@/components/intro-splash";
import { PwaInstall } from "@/components/pwa";
import "./globals.css";

// Police arrondie, dans l'esprit du nom « Send By Me » du logo.
const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Send By Me — Envoyez vos colis avec des voyageurs",
    template: "%s · Send By Me",
  },
  description:
    "Envoyez un colis entre la France, la Belgique et l'Afrique avec un voyageur vérifié qui a de la place dans sa valise. Paiement bloqué jusqu'à la livraison.",
  applicationName: "Send By Me",
  keywords: [
    "envoi colis Afrique",
    "colis Paris Douala",
    "colis Paris Dakar",
    "GP colis",
    "kilos valise",
    "transport colis particulier",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Send By Me",
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "Send By Me", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#0E304C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={nunito.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <IntroSplash />
        {children}
        <PwaInstall />
      </body>
    </html>
  );
}
