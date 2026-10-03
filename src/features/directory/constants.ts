import type { Database } from "@/types/database";

export type EntityType = Database["public"]["Enums"]["entity_type"];
export type Sector = Database["public"]["Enums"]["sector"];

export const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  business: "Business",
  cooperative: "Cooperative",
  ngo: "NGO",
  school: "School",
  health_facility: "Health facility",
  government_agency: "Government agency",
  faith_organisation: "Faith organisation",
  community_group: "Community group",
};

export const ORGANISATION_TYPES: EntityType[] = [
  "cooperative",
  "ngo",
  "school",
  "health_facility",
  "government_agency",
  "faith_organisation",
  "community_group",
];

export const SECTOR_LABEL: Record<Sector, string> = {
  commerce: "Commerce & retail",
  agriculture: "Agriculture",
  education: "Education",
  health: "Health",
  government: "Government",
  civil_society: "Civil society",
  faith: "Faith",
  transport: "Transport",
  hospitality: "Hospitality",
  technology: "Technology",
  finance: "Finance",
  artisan: "Artisans & trades",
  other: "Other",
};

/** Sector hub pages (Education, Health, Agriculture). */
export const SECTOR_HUBS = {
  education: {
    sector: "education" as Sector,
    title: "Education",
    description: "Schools, training providers and learning opportunities in your area.",
    entityTypes: ["school", "ngo", "business", "government_agency"] as EntityType[],
  },
  health: {
    sector: "health" as Sector,
    title: "Health",
    description: "Clinics, health centres, pharmacies and health services you can trust.",
    entityTypes: ["health_facility", "business", "ngo", "government_agency"] as EntityType[],
  },
  agriculture: {
    sector: "agriculture" as Sector,
    title: "Agriculture",
    description: "Farms, cooperatives, inputs, produce and agricultural services.",
    entityTypes: ["business", "cooperative", "ngo", "government_agency"] as EntityType[],
  },
} as const;

export type SectorHubKey = keyof typeof SECTOR_HUBS;
