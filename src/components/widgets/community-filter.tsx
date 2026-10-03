"use client";

import { MapPin } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CommunitySelect, type CommunityChoice } from "@/components/forms/community-select";

/** Community selector that updates ?community= in the URL (server re-renders). */
export function CommunityFilter({ options, value }: { options: CommunityChoice[]; value?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex min-w-56 items-center gap-2">
      <MapPin aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="sr-only">Community</span>
      <div className="flex-1">
        <CommunitySelect
          options={options}
          placeholder="All communities"
          value={value ?? ""}
          onChange={(e) => {
            const next = new URLSearchParams(params.toString());
            // "all" is explicit so pages that default to the viewer's home
            // community can still show every community.
            next.set("community", e.target.value || "all");
            next.delete("page");
            router.push(`${pathname}?${next.toString()}`);
          }}
        />
      </div>
    </label>
  );
}
