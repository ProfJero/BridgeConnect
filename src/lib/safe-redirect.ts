/**
 * Only allow same-origin relative paths as post-auth redirect targets to
 * prevent open redirects (e.g. ?next=https://evil.example or //evil.example).
 */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "http://bridgeconnect.local");
    if (url.origin !== "http://bridgeconnect.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
