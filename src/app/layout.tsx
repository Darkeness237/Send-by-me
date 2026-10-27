import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { SITE_URL } from "@/lib/env";
import { PwaInstall } from "@/components/pwa";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
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
  themeColor: "#12324F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={archivo.variable}>
      <body className="min-h-dvh">
        {children}
        <PwaInstall />
      </body>
    </html>
  );
}
