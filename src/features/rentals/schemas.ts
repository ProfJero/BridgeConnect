import { z } from "zod";

import { phoneSchema } from "@/features/orders/schemas";

export const RENTAL_TYPES = ["room", "self_contain", "apartment", "house", "shop", "office", "warehouse", "land", "event_space"] as const;
export type RentalType = (typeof RENTAL_TYPES)[number];
export const RENTAL_PERIODS = ["day", "week", "month", "year"] as const;
export const RENTAL_STATUSES = ["draft", "available", "rented", "archived"] as const;

export const RENTAL_TYPE_LABEL: Record<RentalType, string> = {
  room: "Single room",
  self_contain: "Self-contain",
  apartment: "Apartment",
  house: "House",
  shop: "Shop / store",
  office: "Office",
  warehouse: "Warehouse",
  land: "Land",
  event_space: "Event space",
};

export const PERIOD_SHORT: Record<(typeof RENTAL_PERIODS)[number], string> = { day: "/day", week: "/wk", month: "/mo", year: "/yr" };

export const AMENITY_SUGGESTIONS = [
  "Water", "Prepaid meter", "Parking", "Security", "Fenced", "Tiled", "Kitchen", "Wardrobe",
  "Air conditioning", "Ceiling fan", "Borehole", "Internet", "Roadside", "Generator",
];

const optionalInt = (min: number, max: number) =>
  z.union([z.literal(""), z.coerce.number().int().min(min).max(max)]).optional();

export const rentalSchema = z.object({
  rentalId: z.uuid().optional(),
  communityId: z.uuid("Choose a community."),
  rentalType: z.enum(RENTAL_TYPES, { error: "Choose a property type." }),
  title: z.string().trim().min(5, "Add a short title (5+ characters).").max(140),
  description: z.string().trim().min(20, "Describe the property (20+ characters).").max(5000),
  price: z.coerce.number().positive("Enter the rent.").max(10_000_000),
  period: z.enum(RENTAL_PERIODS),
  advanceMonths: optionalInt(0, 36),
  bedrooms: optionalInt(0, 20),
  bathrooms: optionalInt(0, 20),
  furnished: z.boolean().optional(),
  amenities: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  locationNote: z.string().trim().max(300).optional(),
  contactPhone: phoneSchema,
  whatsapp: z.union([z.literal(""), phoneSchema]).optional(),
  availableFrom: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  status: z.enum(RENTAL_STATUSES),
  mediaIds: z.array(z.uuid()).max(8, "Up to 8 photos.").optional(),
});

export const inquirySchema = z.object({
  rentalId: z.uuid(),
  message: z.string().trim().min(5, "Write a short message.").max(1000),
  contactPhone: phoneSchema,
  preferredDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
});
