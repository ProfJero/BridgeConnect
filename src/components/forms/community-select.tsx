import * as React from "react";

import { NativeSelect } from "@/components/ui/native-select";

export type CommunityChoice = { id: string; name: string; districtName: string; regionName: string };

/** Communities grouped by "District, Region" for clarity at scale. */
export function CommunitySelect({
  options,
  placeholder = "Select a community",
  ...props
}: React.ComponentProps<"select"> & { options: CommunityChoice[]; placeholder?: string }) {
  const groups = new Map<string, CommunityChoice[]>();
  for (const option of options) {
    const key = `${option.districtName}, ${option.regionName}`;
    groups.set(key, [...(groups.get(key) ?? []), option]);
  }
  return (
    <NativeSelect {...props}>
      <option value="">{placeholder}</option>
      {[...groups.entries()].map(([group, items]) => (
        <optgroup key={group} label={group}>
          {items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </optgroup>
      ))}
    </NativeSelect>
  );
}
