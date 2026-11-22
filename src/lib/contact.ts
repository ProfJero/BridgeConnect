/**
 * Contact link helpers. Numbers in Ghana are usually written locally ("024 123 4567"); WhatsApp's click-to-chat
 * needs the international form without "+" (233241234567).
 */
export function toInternationalDigits(phone: string | null | undefined, countryCode = "233"): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length < 7) return null;
  if (phone.trim().startsWith("+") || digits.startsWith(countryCode)) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return countryCode + digits.slice(1);
  return digits;
}

export function whatsappLink(phone: string | null | undefined, message?: string): string | null {
  const digits = toInternationalDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export function telLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9+]/g, "");
  return cleaned.length >= 3 ? `tel:${cleaned}` : null;
}

export const SOCIAL_NETWORKS = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourname" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourname" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/yourname" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/yourname" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
] as const;
export type SocialKey = (typeof SOCIAL_NETWORKS)[number]["key"];
export type SocialLinks = Partial<Record<SocialKey, string>>;

/** Keep only known networks with https links (the database enforces the same rule). */
export function cleanSocialLinks(value: unknown): SocialLinks {
  if (!value || typeof value !== "object") return {};
  const out: SocialLinks = {};
  for (const { key } of SOCIAL_NETWORKS) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === "string" && /^https:\/\/\S+$/i.test(v.trim()) && v.length <= 300) out[key] = v.trim();
  }
  return out;
}

/** Google Maps directions: to the exact pin when known, otherwise a place search. */
export function directionsUrl(opts: { lat?: number | string | null; lng?: number | string | null; query?: string }): string {
  if (opts.lat != null && opts.lng != null && opts.lat !== "" && opts.lng !== "") {
    return `https://www.google.com/maps/dir/?api=1&destination=${Number(opts.lat)},${Number(opts.lng)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opts.query ?? "Ghana")}`;
}

/** Extract coordinates from a pasted Google Maps link or "lat, lng" text. */
export function parseCoordinates(text: string): { lat: number; lng: number } | null {
  const patterns = [/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, /[?&](?:q|query|destination|ll)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
    }
  }
  return null;
}
