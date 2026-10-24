import { z } from "zod";

import { phoneSchema } from "@/features/orders/schemas";

export const ENTITY_TYPES = [
  "business",
  "cooperative",
  "ngo",
  "school",
  "health_facility",
  "government_agency",
  "faith_organisation",
  "community_group",
] as const;

export const SECTORS = [
  "commerce",
  "agriculture",
  "education",
  "health",
  "government",
  "civil_society",
  "faith",
  "transport",
  "hospitality",
  "technology",
  "finance",
  "artisan",
  "other",
] as const;

export const DOCUMENT_TYPES = [
  "business_registration",
  "tax_certificate",
  "operating_license",
  "ngo_certificate",
  "accreditation",
  "identity_document",
  "other",
] as const;

export const DOCUMENT_TYPE_LABEL: Record<(typeof DOCUMENT_TYPES)[number], string> = {
  business_registration: "Business registration certificate",
  tax_certificate: "Tax (TIN) certificate",
  operating_license: "Operating licence or permit",
  ngo_certificate: "NGO / organisation certificate",
  accreditation: "Accreditation (school, health facility…)",
  identity_document: "Applicant's ID (Ghana Card / passport)",
  other: "Other supporting document",
};

const optionalEmail = z.union([z.email("Enter a valid email address.").max(254), z.literal("")]).optional();

export const applicationSchema = z.object({
  entityType: z.enum(ENTITY_TYPES, { error: "Choose a type." }),
  proposedName: z.string().trim().min(2, "Enter the official name.").max(120),
  sector: z.enum(SECTORS, { error: "Choose a sector." }),
  communityId: z.uuid("Choose the community where you operate."),
  description: z
    .string()
    .trim()
    .min(20, "Describe what you do (at least 20 characters).")
    .max(5000),
  address: z.string().trim().max(300).optional(),
  contactPhone: phoneSchema,
  contactEmail: optionalEmail,
  registrationNumber: z.string().trim().max(80).optional(),
  applicantPosition: z.string().trim().max(80).optional(),
});

export const updateApplicationSchema = applicationSchema
  .omit({ entityType: true, communityId: true })
  .extend({ applicationId: z.uuid() });

export const attachDocumentSchema = z.object({
  applicationId: z.uuid(),
  documentType: z.enum(DOCUMENT_TYPES),
  storagePath: z.string().max(500),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});

export type ApplicationInput = z.input<typeof applicationSchema>;
