import Link from "next/link";

import { cn } from "@/lib/utils";

/** Horizontally scrollable category filter (links, so it works without JS). */
export function CategoryChips({
  basePath,
  categories,
  active,
  preserve,
  param = "category",
  allLabel = "All",
  label = "Categories",
}: {
  basePath: string;
  categories: { slug: string; name: string }[];
  active?: string;
  preserve?: Record<string, string | undefined>;
  /** Query-string key the chips set (default "category"). */
  param?: string;
  allLabel?: string;
  label?: string;
}) {
  const href = (slug?: string) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve ?? {})) if (v) params.set(k, v);
    if (slug) params.set(param, slug);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const chip =
    "inline-block whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95";
  return (
    <nav aria-label={label} className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
      <ul className="flex gap-2">
        <li className="shrink-0">
          <Link href={href()} aria-current={!active ? "page" : undefined} className={cn(chip, !active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:bg-accent")}>
            {allLabel}
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.slug} className="shrink-0">
            <Link href={href(c.slug)} aria-current={active === c.slug ? "page" : undefined} className={cn(chip, active === c.slug ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:bg-accent")}>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
