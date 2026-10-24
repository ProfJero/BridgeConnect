import type { Metadata } from "next";

import { env } from "@/lib/env";

export const SITE_NAME = "BridgeConnect";
export const SITE_TAGLINE = "Connecting Communities. Empowering Lives.";
export const SITE_DESCRIPTION =
  "BridgeConnect connects residents with trusted businesses, organisations, services, jobs, events and emergency information in their community. A Digital Bridge Initiative platform.";

/**
 * Site-wide share image (`src/app/opengraph-image.png`). Pages that define their own `openGraph` replace the
 * file-convention default, so `pageMetadata` always sets an image explicitly.
 */
export const DEFAULT_OG_IMAGE = { url: "/opengraph-image.png", width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_TAGLINE}` };

/** Absolute URL on the canonical site origin. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, env.NEXT_PUBLIC_SITE_URL).toString();
}

/** Collapse whitespace and cut to `max` characters on a word boundary (for meta descriptions). */
export function excerpt(text: string | null | undefined, max = 160): string | undefined {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max / 2))}…`;
}

/**
 * Page metadata with a canonical URL and matching Open Graph / Twitter cards. `image` is an absolute URL
 * (e.g. a Supabase public-media URL); without it the site-wide share image is used.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
}: {
  title: string;
  description?: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
}): Metadata {
  const images = [image ? { url: image, alt: title } : DEFAULT_OG_IMAGE];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type, siteName: SITE_NAME, locale: "en_GH", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

/** Metadata for pages that must never appear in search results (personal or transactional pages). */
export const noIndex: Metadata["robots"] = { index: false, follow: false };
