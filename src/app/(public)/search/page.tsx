import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchForm } from "@/components/widgets/search-form";
import { Badge } from "@/components/ui/badge";
import { SEARCH_KINDS, searchDirectory, searchResultHref, type SearchKind } from "@/features/search/queries";
import { getViewer } from "@/lib/auth/session";
import { enumParam, stringParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Search" };

const KIND_LABEL: Record<SearchKind, string> = {
  entity: "Organisations",
  product: "Products",
  service: "Services",
  job: "Jobs",
  event: "Events",
  post: "Posts",
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = stringParam(sp.q) ?? "";
  const kind = enumParam(sp.type, SEARCH_KINDS);
  const viewer = await getViewer();
  const results = q.length >= 2 ? await searchDirectory(q, viewer?.profile.home_community_id, kind ? [kind] : undefined) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Search" />
      <SearchForm action="/search" defaultValue={q} placeholder="Businesses, products, jobs, events…" hidden={{ type: kind }} />
      {q ? (
        <nav aria-label="Result types" className="flex flex-wrap gap-2">
          {[undefined, ...SEARCH_KINDS].map((k) => (
            <Link
              key={k ?? "all"}
              href={`/search?q=${encodeURIComponent(q)}${k ? `&type=${k}` : ""}`}
              aria-current={kind === k ? "page" : undefined}
              className={cn("rounded-full border px-3 py-1 text-sm font-medium", kind === k ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}
            >
              {k ? KIND_LABEL[k] : "All"}
            </Link>
          ))}
        </nav>
      ) : null}
      {q.length < 2 ? (
        <EmptyState icon={Search} title="What are you looking for?" description="Search verified businesses, organisations, products, services, jobs, events and community posts." />
      ) : results.length === 0 ? (
        <EmptyState icon={Search} title={`No results for "${q}"`} description="Try fewer or different words." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card" aria-live="polite">
          {results.map((r) => (
            <li key={`${r.kind}-${r.id}`}>
              <Link href={searchResultHref(r.kind, r.slug, r.id)} className="flex items-start justify-between gap-3 p-4 hover:bg-accent">
                <div className="min-w-0">
                  <p className="font-semibold">{r.title}</p>
                  {r.subtitle ? <p className="line-clamp-2 text-sm text-muted-foreground">{r.subtitle}</p> : null}
                </div>
                <Badge variant="soft">{KIND_LABEL[r.kind as SearchKind] ?? r.kind}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
