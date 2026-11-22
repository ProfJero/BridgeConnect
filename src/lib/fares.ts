export const VEHICLES = ["motorbike", "tricycle", "car", "van", "bicycle"] as const;
export type Vehicle = (typeof VEHICLES)[number];

export const VEHICLE_LABEL: Record<Vehicle, { name: string; local: string; seats: string }> = {
  motorbike: { name: "Motorbike", local: "Okada", seats: "1 passenger · small parcels" },
  tricycle: { name: "Tricycle", local: "Pragya / Aboboyaa", seats: "Up to 3 · medium loads" },
  car: { name: "Car", local: "Taxi", seats: "Up to 4 passengers" },
  van: { name: "Van", local: "Trotro / cargo", seats: "Bulky goods · groups" },
  bicycle: { name: "Bicycle", local: "Bicycle courier", seats: "Small parcels" },
};

/** Suggested fares (GHS). Customers and riders can agree a different amount. */
const RATES: Record<Vehicle, { base: number; perKm: number; min: number }> = {
  motorbike: { base: 5, perKm: 3, min: 8 },
  tricycle: { base: 6, perKm: 3.5, min: 10 },
  car: { base: 10, perKm: 5, min: 15 },
  van: { base: 20, perKm: 7, min: 30 },
  bicycle: { base: 3, perKm: 2, min: 5 },
};

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Road distance is roughly 1.3× the straight line in towns. */
export function suggestFare(vehicle: Vehicle, straightKm?: number | null): number {
  const r = RATES[vehicle];
  if (straightKm == null) return r.min;
  const fare = r.base + r.perKm * straightKm * 1.3;
  return Math.max(r.min, Math.round(fare));
}
