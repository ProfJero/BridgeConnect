import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

/** Keep crawlers out of personal, transactional and back-office areas; everything public is crawlable. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/workspace",
          "/auth/",
          "/api/",
          "/go/",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
          "/profile",
          "/orders",
          "/notifications",
          "/favourites",
          "/jobs/applications",
          "/apply/",
          "/community/new",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
