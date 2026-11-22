export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];
export type OpeningHours = Partial<Record<Day, { open: string; close: string } | null>>;

const JS_DAY: Day[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Ghana is on GMT all year (no DST), so UTC hours equal local hours. */
export function openState(hours: OpeningHours | null | undefined, now: Date = new Date()): "open" | "closed" | null {
  if (!hours || Object.keys(hours).length === 0) return null;
  const today = hours[JS_DAY[now.getUTCDay()]!];
  if (!today) return "closed";
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const open = toMin(today.open);
  const close = toMin(today.close);
  // Overnight hours (e.g. 18:00–02:00).
  const isOpen = close > open ? minutes >= open && minutes < close : minutes >= open || minutes < close;
  return isOpen ? "open" : "closed";
}
