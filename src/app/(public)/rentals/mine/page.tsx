import { House, PlusCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DeleteRentalButton, InquiryControls } from "@/features/rentals/components/owner-tools";
import { RentalCard } from "@/features/rentals/components/rental-card";
import { listMyInquiries, listMyRentals } from "@/features/rentals/queries";
import { requireViewer } from "@/lib/auth/session";
import { formatDate, formatRelative } from "@/lib/format";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "My rentals", robots: noIndex };

export default async function MyRentalsPage() {
  const viewer = await requireViewer("/rentals/mine");
  const [rentals, sent] = await Promise.all([listMyRentals(viewer.id), listMyInquiries(viewer.id)]);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="My rentals"
        description="Your listings, the viewing requests you received, and the ones you sent."
        actions={<Button asChild size="sm" className="rounded-full"><Link href="/rentals/new"><PlusCircle aria-hidden /> List property</Link></Button>}
      />
      <Section title={`My listings (${rentals.length})`}>
        {rentals.length === 0 ? (
          <EmptyState icon={House} title="No listings yet" description="List a room, house, shop or land for free." />
        ) : (
          <div className="space-y-4">
            {rentals.map((r) => (
              <div key={r.id} className="grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[240px_1fr]">
                <RentalCard rental={r} />
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={r.status} />
                    <div className="flex gap-1">
                      {r.status !== "removed" ? <Button asChild variant="outline" size="sm"><Link href={`/rentals/${r.slug}/edit`}>Edit</Link></Button> : null}
                      <DeleteRentalButton rentalId={r.id} />
                    </div>
                  </div>
                  {r.moderation_reason ? <p className="text-xs text-destructive">{r.moderation_reason}</p> : null}
                  <h3 className="text-sm font-semibold">Viewing requests ({r.rental_inquiries.length})</h3>
                  {r.rental_inquiries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No requests yet.</p>
                  ) : (
                    <ul className="divide-y rounded-xl border">
                      {r.rental_inquiries.map((q) => (
                        <li key={q.id} className="space-y-1.5 p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{q.profiles?.display_name ?? "Resident"}</span>
                            <span className="text-xs text-muted-foreground">{formatRelative(q.created_at)}</span>
                          </div>
                          <p className="text-muted-foreground">{q.message}</p>
                          {q.preferred_date ? <p className="text-xs">Preferred day: {formatDate(q.preferred_date)}</p> : null}
                          <InquiryControls id={q.id} status={q.status} phone={q.contact_phone} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
      <Section title="Requests I sent">
        {sent.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven&apos;t requested any viewings.</p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {sent.map((q) => (
              <li key={q.id}>
                <Link href={q.rental_listings ? `/rentals/${q.rental_listings.slug}` : "/rentals"} className="flex items-center justify-between gap-3 p-4 hover:bg-accent">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{q.rental_listings?.title ?? "Listing removed"}</span>
                    <span className="block text-xs text-muted-foreground">{formatRelative(q.created_at)}</span>
                  </span>
                  <StatusBadge status={q.status === "new" ? "submitted" : q.status === "contacted" ? "confirmed" : "closed"} label={q.status === "new" ? "Sent" : q.status === "contacted" ? "Landlord contacted you" : "Closed"} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
