import type { MetadataRoute } from "next";

import { listSitemapRows } from "@/features/seo/queries";
import { absoluteUrl } from "@/lib/seo";

/** Hubs that are always worth crawling, with a rough priority. */
const STATIC_ROUTES: [path: string, priority: number, changeFrequency: "daily" | "weekly"][] = [
  ["/", 1, "daily"],
  ["/explore", 0.9, "daily"],
  ["/marketplace", 0.9, "daily"],
  ["/services", 0.8, "daily"],
  ["/jobs", 0.9, "daily"],
  ["/events", 0.8, "daily"],
  ["/community", 0.7, "daily"],
  ["/emergency", 0.8, "daily"],
  ["/businesses", 0.7, "weekly"],
  ["/government", 0.6, "weekly"],
  ["/health", 0.6, "weekly"],
  ["/education", 0.6, "weekly"],
  ["/agriculture", 0.6, "weekly"],
  ["/ngos", 0.6, "weekly"],
  ["/apply", 0.5, "weekly"],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let rows: Awaited<ReturnType<typeof listSitemapRows>> = [];
  try {
    rows = await listSitemapRows();
  } catch {
    // Database unavailable: still serve the static hubs rather than a 500.
  }
  return [
    ...STATIC_ROUTES.map(([path, priority, changeFrequency]) => ({
      url: absoluteUrl(path),
      changeFrequency,
      priority,
    })),
    ...rows.map((r) => ({ url: absoluteUrl(r.path), lastModified: r.lastModified, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
