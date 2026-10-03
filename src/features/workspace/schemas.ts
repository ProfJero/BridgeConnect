import { z } from "zod";

import { EMPLOYMENT_TYPES } from "@/features/jobs/schemas";
import { phoneSchema } from "@/features/orders/schemas";

const optionalText = (max: number) => z.string().trim().max(max, `Use ${max} characters or fewer.`).optional();
const optionalUuid = z.union([z.uuid(), z.literal("")]).optional();
const money = z.coerce.number({ error: "Enter an amount." }).min(0, "Cannot be negative.").max(10_000_000);
const optionalMoney = z.union([z.literal(""), money]).optional();

export const productSchema = z.object({
  entityId: z.uuid(),
  productId: z.uuid().optional(),
  name: z.string().trim().min(2, "Enter a product name.").max(120),
  categoryId: optionalUuid,
  description: optionalText(5000),
  price: money,
  unit: optionalText(30),
  stockQuantity: z.union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000)]).optional(),
  status: z.enum(["draft", "active", "out_of_stock", "archived"]),
  mediaIds: z.array(z.uuid()).max(6).optional(),
});

export const serviceSchema = z.object({
  entityId: z.uuid(),
  serviceId: z.uuid().optional(),
  name: z.string().trim().min(2, "Enter a service name.").max(120),
  categoryId: optionalUuid,
  description: optionalText(5000),
  priceFrom: optionalMoney,
  priceNote: optionalText(120),
  serviceArea: optionalText(200),
  status: z.enum(["draft", "active", "archived"]),
});

export const jobSchema = z
  .object({
    entityId: z.uuid(),
    jobId: z.uuid().optional(),
    title: z.string().trim().min(3, "Enter a job title.").max(140),
    categoryId: optionalUuid,
    communityId: z.uuid("Choose a location."),
    description: z.string().trim().min(20, "Describe the role (at least 20 characters).").max(8000),
    requirements: optionalText(4000),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    locationNote: optionalText(200),
    salaryMin: optionalMoney,
    salaryMax: optionalMoney,
    salaryPeriod: z.union([z.enum(["hour", "day", "week", "month", "year", "fixed"]), z.literal("")]).optional(),
    applicationDeadline: z.union([z.iso.date("Enter a valid date."), z.literal("")]).optional(),
    status: z.enum(["draft", "open", "closed", "archived"]),
  })
  .refine((v) => v.salaryMin === "" || v.salaryMax === "" || v.salaryMin == null || v.salaryMax == null || Number(v.salaryMax) >= Number(v.salaryMin), {
    message: "Maximum must be at least the minimum.",
    path: ["salaryMax"],
  });

export const eventSchema = z
  .object({
    entityId: z.uuid(),
    eventId: z.uuid().optional(),
    title: z.string().trim().min(3, "Enter a title.").max(140),
    categoryId: optionalUuid,
    communityId: z.uuid("Choose a community."),
    description: z.string().trim().min(10, "Describe the event.").max(8000),
    isOnline: z.boolean(),
    venue: optionalText(200),
    onlineUrl: z.union([z.url({ protocol: /^https$/, error: "Use an https:// link." }).max(300), z.literal("")]).optional(),
    startsAt: z.iso.datetime({ local: true, error: "Choose a start date and time." }),
    endsAt: z.union([z.iso.datetime({ local: true }), z.literal("")]).optional(),
    capacity: z.union([z.literal(""), z.coerce.number().int().min(1).max(1_000_000)]).optional(),
    coverPath: z.string().max(500).nullable().optional(),
    status: z.enum(["draft", "published", "cancelled"]),
  })
  .refine((v) => v.isOnline || (v.venue?.length ?? 0) > 0, { message: "Enter a venue.", path: ["venue"] })
  .refine((v) => !v.endsAt || v.endsAt > v.startsAt, { message: "End must be after the start.", path: ["endsAt"] });

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM.");
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const openingHoursSchema = z
  .record(z.enum(DAYS), z.object({ open: hhmm, close: hhmm }).nullable())
  .refine((h) => Object.values(h).every((d) => !d || d.close > d.open), "Closing time must be after opening time.");

export const entityProfileSchema = z.object({
  entityId: z.uuid(),
  tagline: optionalText(160),
  description: optionalText(5000),
  address: optionalText(300),
  phone: z.union([phoneSchema, z.literal("")]).optional(),
  whatsapp: z.union([phoneSchema, z.literal("")]).optional(),
  email: z.union([z.email("Enter a valid email.").max(254), z.literal("")]).optional(),
  website: z.union([z.url({ protocol: /^https$/, error: "Use an https:// link." }).max(300), z.literal("")]).optional(),
  logoPath: z.string().max(500).nullable().optional(),
  coverPath: z.string().max(500).nullable().optional(),
  openingHours: openingHoursSchema.nullable().optional(),
  yearEstablished: z.union([z.literal(""), z.coerce.number().int().min(1800).max(2100)]).optional(),
  deliveryAvailable: z.boolean().optional(),
  acceptsMobileMoney: z.boolean().optional(),
  mission: optionalText(2000),
  beneficiaries: optionalText(500),
});

export const MEMBER_ROLES = ["owner", "manager", "editor", "member"] as const;
export const addMemberSchema = z.object({
  entityId: z.uuid(),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email.")),
  role: z.enum(MEMBER_ROLES),
});

export const adSchema = z
  .object({
    entityId: z.uuid(),
    adId: z.uuid().optional(),
    title: z.string().trim().min(3, "Enter a headline.").max(80),
    body: optionalText(200),
    linkPath: z.union([z.string().regex(/^\/[A-Za-z0-9/_-]*$/, "Use an in-app path such as /directory/your-name."), z.literal("")]).optional(),
    placement: z.enum(["home_feed", "explore", "marketplace"]),
    targetCommunityId: optionalUuid,
    startsOn: z.iso.date("Choose a start date."),
    endsOn: z.iso.date("Choose an end date."),
    imagePath: z.string().max(500).nullable().optional(),
    submit: z.boolean(),
  })
  .refine((v) => v.endsOn >= v.startsOn, { message: "End must be on or after the start.", path: ["endsOn"] });

export const alertSchema = z.object({
  entityId: z.uuid().optional(),
  title: z.string().trim().min(5, "Enter a clear title.").max(140),
  body: z.string().trim().min(10, "Describe the situation.").max(3000),
  instructions: optionalText(2000),
  severity: z.enum(["info", "advisory", "warning", "critical"]),
  category: z.enum(["fire", "flood", "health", "security", "weather", "utility", "road", "missing_person", "other"]),
  scope: z.enum(["community", "district", "region"]),
  scopeId: z.uuid("Choose an area."),
  expiresAt: z.union([z.iso.datetime({ local: true }), z.literal("")]).optional(),
});
