import type { JsonLdData } from "@/components/shared/json-ld";
import type { Database } from "@/types/database";

import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "./seo";

type Enums = Database["public"]["Enums"];

/** Location join shape shared by listing queries: community → district → region. */
export type PlaceJoin = { name: string; districts?: { name: string; regions?: { name: string } | null } | null } | null;

export function postalAddress(place: PlaceJoin, street?: string | null): JsonLdData {
  return {
    "@type": "PostalAddress",
    ...(street ? { streetAddress: street } : {}),
    ...(place ? { addressLocality: place.name } : {}),
    ...(place?.districts?.regions ? { addressRegion: place.districts.regions.name } : {}),
    addressCountry: "GH",
  };
}

export function organizationSchema(): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icons/icon-512.png"),
    description: SITE_DESCRIPTION,
    parentOrganization: { "@type": "Organization", name: "Digital Bridge Initiative" },
  };
}

/** WebSite with a SearchAction so Google can show a sitelinks search box. */
export function websiteSchema(): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "en-GH",
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

const EMPLOYMENT_TYPE: Record<Enums["employment_type"], string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  temporary: "TEMPORARY",
  internship: "INTERN",
  volunteer: "VOLUNTEER",
  apprenticeship: "OTHER",
};

const PAY_UNIT: Partial<Record<Enums["pay_period"], string>> = {
  hour: "HOUR",
  day: "DAY",
  week: "WEEK",
  month: "MONTH",
  year: "YEAR",
};

/** Google Jobs `JobPosting` (https://developers.google.com/search/docs/appearance/structured-data/job-posting). */
export function jobPostingSchema(job: {
  slug: string;
  title: string;
  description: string;
  requirements: string | null;
  published_at: string | null;
  created_at: string;
  application_deadline: string | null;
  employment_type: Enums["employment_type"];
  salary_min: number | null;
  salary_max: number | null;
  salary_period: Enums["pay_period"] | null;
  currency: string;
  location_note: string | null;
  communities: PlaceJoin;
  entities: { name: string; slug: string; logo_url?: string | null; website?: string | null };
}): JsonLdData {
  const unit = job.salary_period ? PAY_UNIT[job.salary_period] : undefined;
  const hasSalary = job.salary_min != null || job.salary_max != null;
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: [job.description, job.requirements ? `Requirements:\n${job.requirements}` : null]
      .filter(Boolean)
      .join("\n\n"),
    datePosted: job.published_at ?? job.created_at,
    ...(job.application_deadline ? { validThrough: `${job.application_deadline}T23:59:59Z` } : {}),
    employmentType: EMPLOYMENT_TYPE[job.employment_type],
    url: absoluteUrl(`/jobs/${job.slug}`),
    directApply: true,
    hiringOrganization: {
      "@type": "Organization",
      name: job.entities.name,
      sameAs: job.entities.website ?? absoluteUrl(`/directory/${job.entities.slug}`),
      ...(job.entities.logo_url ? { logo: job.entities.logo_url } : {}),
    },
    jobLocation: { "@type": "Place", address: postalAddress(job.communities, job.location_note) },
    ...(hasSalary && unit
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: job.currency,
            value: {
              "@type": "QuantitativeValue",
              ...(job.salary_min != null ? { minValue: job.salary_min } : {}),
              ...(job.salary_max != null ? { maxValue: job.salary_max } : {}),
              unitText: unit,
            },
          },
        }
      : {}),
  };
}

export function eventSchema(event: {
  slug: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  status: Enums["event_status"];
  is_online: boolean;
  venue: string | null;
  cover_url?: string | null;
  communities: PlaceJoin;
  entities: { name: string; slug: string; website?: string | null };
}): JsonLdData {
  const url = absoluteUrl(`/events/${event.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.starts_at,
    ...(event.ends_at ? { endDate: event.ends_at } : {}),
    eventStatus:
      event.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: event.is_online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: event.is_online
      ? { "@type": "VirtualLocation", url }
      : { "@type": "Place", name: event.venue ?? event.communities?.name, address: postalAddress(event.communities) },
    ...(event.cover_url ? { image: [event.cover_url] } : {}),
    organizer: {
      "@type": "Organization",
      name: event.entities.name,
      url: event.entities.website ?? absoluteUrl(`/directory/${event.entities.slug}`),
    },
    url,
  };
}

const PRODUCT_AVAILABILITY: Partial<Record<Enums["product_status"], string>> = {
  active: "https://schema.org/InStock",
  out_of_stock: "https://schema.org/OutOfStock",
};

export function productSchema(product: {
  slug: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  status: Enums["product_status"];
  images: string[];
  category?: string | null;
  seller: { name: string; slug: string };
}): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(product.images.length ? { image: product.images } : {}),
    ...(product.category ? { category: product.category } : {}),
    url: absoluteUrl(`/marketplace/${product.slug}`),
    offers: {
      "@type": "Offer",
      price: Number(product.price).toFixed(2),
      priceCurrency: product.currency,
      availability: PRODUCT_AVAILABILITY[product.status] ?? "https://schema.org/Discontinued",
      url: absoluteUrl(`/marketplace/${product.slug}`),
      seller: { "@type": "Organization", name: product.seller.name, url: absoluteUrl(`/directory/${product.seller.slug}`) },
    },
  };
}

export function serviceSchema(service: {
  slug: string;
  name: string;
  description: string | null;
  price_from: number | null;
  currency: string;
  service_area: string | null;
  category?: string | null;
  provider: { name: string; slug: string; phone?: string | null; communities: PlaceJoin };
}): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    ...(service.description ? { description: service.description } : {}),
    ...(service.category ? { serviceType: service.category } : {}),
    url: absoluteUrl(`/services/${service.slug}`),
    areaServed: service.service_area ?? service.provider.communities?.name ?? "Ghana",
    provider: {
      "@type": "LocalBusiness",
      name: service.provider.name,
      url: absoluteUrl(`/directory/${service.provider.slug}`),
      ...(service.provider.phone ? { telephone: service.provider.phone } : {}),
      address: postalAddress(service.provider.communities),
    },
    ...(service.price_from != null
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: service.currency,
            priceSpecification: { "@type": "PriceSpecification", minPrice: service.price_from, priceCurrency: service.currency },
          },
        }
      : {}),
  };
}

const ENTITY_TYPE: Record<Enums["entity_type"], string> = {
  business: "LocalBusiness",
  cooperative: "Organization",
  ngo: "NGO",
  school: "School",
  health_facility: "MedicalOrganization",
  government_agency: "GovernmentOrganization",
  faith_organisation: "PlaceOfWorship",
  community_group: "Organization",
};

const DAY_OF_WEEK: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export function entitySchema(entity: {
  slug: string;
  name: string;
  entity_type: Enums["entity_type"];
  tagline: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  opening_hours?: Partial<Record<string, { open: string; close: string } | null>> | null;
  communities: PlaceJoin;
}): JsonLdData {
  const hours = Object.entries(entity.opening_hours ?? {})
    .filter((entry): entry is [string, { open: string; close: string }] => Boolean(entry[1] && DAY_OF_WEEK[entry[0]]))
    .map(([day, h]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_OF_WEEK[day], opens: h.open, closes: h.close }));
  const images = [entity.cover_url, entity.logo_url].filter((u): u is string => Boolean(u));
  return {
    "@context": "https://schema.org",
    "@type": ENTITY_TYPE[entity.entity_type],
    "@id": absoluteUrl(`/directory/${entity.slug}#entity`),
    name: entity.name,
    url: absoluteUrl(`/directory/${entity.slug}`),
    ...(entity.description || entity.tagline ? { description: entity.description ?? entity.tagline } : {}),
    ...(entity.logo_url ? { logo: entity.logo_url } : {}),
    ...(images.length ? { image: images } : {}),
    ...(entity.phone ? { telephone: entity.phone } : {}),
    ...(entity.email ? { email: entity.email } : {}),
    ...(entity.website ? { sameAs: [entity.website] } : {}),
    address: postalAddress(entity.communities, entity.address),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
  };
}
