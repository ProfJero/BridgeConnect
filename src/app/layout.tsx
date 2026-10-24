import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { Toaster } from "@/components/ui/sonner";
import { env } from "@/lib/env";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Ghana community platform",
    "Central Region",
    "Abura-Asebu-Kwamankese",
    "local businesses Ghana",
    "jobs in Ghana",
    "community events",
    "emergency alerts Ghana",
    "Digital Bridge Initiative",
  ],
  authors: [{ name: "Digital Bridge Initiative" }],
  creator: "Digital Bridge Initiative",
  publisher: "Digital Bridge Initiative",
  category: "community",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_GH",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} — ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  verification: env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GH" className={`${inter.variable} h-full`}>
      <body className="min-h-full font-sans">
        <a
          href="#main"
          className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to main content
        </a>
        {children}
        <Toaster />
        <InstallPrompt />
        <ServiceWorker />
      </body>
    </html>
  );
}
