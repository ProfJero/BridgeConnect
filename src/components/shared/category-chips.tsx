import Link from "next/link";

import { cn } from "@/lib/utils";

/** Horizontally scrollable category filter (links, so it works without JS). */
export function CategoryChips({
  basePath,
  categories,
  active,
  preserve,
}: {
  basePath: string;
  categories: { slug: string; name: string }[];
  active?: string;
  preserve?: Record<string, string | undefined>;
}) {
  const href = (slug?: string) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve ?? {})) if (v) params.set(k, v);
    if (slug) params.set("category", slug);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const chip = "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors";
  return (
    <nav aria-label="Categories" className="-mx-4 overflow-x-auto px-4 pb-1">
      <ul className="flex gap-2">
        <li>
          <Link href={href()} aria-current={!active ? "page" : undefined} className={cn(chip, !active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}>
            All
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={href(c.slug)} aria-current={active === c.slug ? "page" : undefined} className={cn(chip, active === c.slug ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
