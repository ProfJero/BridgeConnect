import { z } from "zod";

export const FAVOURITE_KINDS = ["entity", "product", "service", "job", "event"] as const;
export type FavouriteKind = (typeof FAVOURITE_KINDS)[number];

export const FAVOURITE_COLUMN = {
  entity: "entity_id",
  product: "product_id",
  service: "service_id",
  job: "job_id",
  event: "event_id",
} as const satisfies Record<FavouriteKind, string>;

export const favouriteTargetSchema = z.object({ kind: z.enum(FAVOURITE_KINDS), id: z.uuid() });
export type FavouriteTarget = z.infer<typeof favouriteTargetSchema>;
