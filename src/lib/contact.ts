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
