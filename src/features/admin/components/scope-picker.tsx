"use client";

import { NativeSelect } from "@/components/ui/native-select";

export type LocationOptions = {
  regions: { id: string; name: string }[];
  districts: { id: string; name: string; region_id: string }[];
  communities: { id: string; name: string; district_id: string }[];
};

/** Choose a location at a given scope level (region / district / community). */
export function ScopeOptions({ scope, locations }: { scope: string; locations: LocationOptions }) {
  if (scope === "region") return <>{locations.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</>;
  if (scope === "district") return <>{locations.districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</>;
  if (scope === "community") return <>{locations.communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</>;
  return null;
}

export function ScopeSelect({ scope, locations, ...props }: React.ComponentProps<"select"> & { scope: string; locations: LocationOptions }) {
  if (scope === "platform" || scope === "national") return null;
  return (
    <NativeSelect {...props}>
      <option value="">Choose a {scope}</option>
      <ScopeOptions scope={scope} locations={locations} />
    </NativeSelect>
  );
}
