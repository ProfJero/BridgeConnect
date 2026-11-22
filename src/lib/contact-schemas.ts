import { z } from "zod";

import { SOCIAL_NETWORKS } from "./contact";

const httpsUrl = z.url({ protocol: /^https$/, error: "Use a full https:// link." }).max(300);

/** Social profiles: known networks only, https links (mirrors private.valid_social_links). */
export const socialLinksSchema = z
  .object(Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n.key, httpsUrl.optional()])) as Record<(typeof SOCIAL_NETWORKS)[number]["key"], z.ZodOptional<typeof httpsUrl>>)
  .strict()
  .optional();

/** A pinned map location, or nothing. */
export const coordinatesSchema = z
  .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
  .nullable()
  .optional();

export const optionalHttpsUrl = z.union([httpsUrl, z.literal("")]).optional();
