import { z } from "zod";

import { phoneSchema } from "@/features/orders/schemas";
import { VEHICLES } from "@/lib/fares";

const coord = (min: number, max: number) => z.union([z.literal(""), z.coerce.number().min(min).max(max)]).optional();
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const tripRequestSchema = z
  .object({
    kind: z.enum(["ride", "delivery"]),
    vehicleType: z.union([z.literal(""), z.enum(VEHICLES)]).optional(),
    communityId: z.uuid("Choose your community."),
    pickupAddress: z.string().trim().min(3, "Where should the rider pick up?").max(300),
    dropoffAddress: z.string().trim().min(3, "Where are you going?").max(300),
    pickupLat: coord(-90, 90),
    pickupLng: coord(-180, 180),
    dropoffLat: coord(-90, 90),
    dropoffLng: coord(-180, 180),
    packageDescription: optionalText(500),
    recipientName: optionalText(80),
    recipientPhone: z.union([z.literal(""), phoneSchema]).optional(),
    customerPhone: phoneSchema,
    note: optionalText(500),
    paymentMethod: z.enum(["cash", "mobile_money"]),
    offeredFare: z.coerce.number().positive("Enter a fare.").max(10_000),
    preferredRiderId: z.union([z.literal(""), z.uuid()]).optional(),
    orderId: z.union([z.literal(""), z.uuid()]).optional(),
  })
  .refine((v) => v.kind === "ride" || (v.packageDescription?.length ?? 0) >= 3, {
    message: "Describe what is being delivered.",
    path: ["packageDescription"],
  });

export const riderProfileSchema = z
  .object({
    vehicleType: z.enum(VEHICLES, { error: "Choose your vehicle." }),
    vehicleDescription: z.string().trim().min(2, "Describe your vehicle, e.g. Red Honda 125.").max(120),
    plateNumber: z.union([z.literal(""), z.string().trim().regex(/^[A-Za-z0-9 -]{2,20}$/, "Use letters, numbers and dashes.")]).optional(),
    offersRides: z.boolean(),
    offersDelivery: z.boolean(),
    communityId: z.uuid("Choose your base community."),
    serviceArea: optionalText(200),
    phone: phoneSchema,
    whatsapp: z.union([z.literal(""), phoneSchema]).optional(),
    bio: optionalText(300),
  })
  .refine((v) => v.offersRides || v.offersDelivery, { message: "Offer rides, deliveries or both.", path: ["offersRides"] });

export const TRIP_STATUSES = ["requested", "accepted", "arrived", "in_progress", "completed", "cancelled"] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];
