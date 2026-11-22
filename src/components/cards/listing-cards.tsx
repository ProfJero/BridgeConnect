import { CalendarDays, Clock, MapPin, Users, Wrench } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

import { EntityAvatar } from "@/components/shared/avatars";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export type JobCardProps = {
  title: string;
  slug: string;
  employment_type: Enums["employment_type"];
  salary_min?: number | null;
  salary_max?: number | null;
  salary_period?: Enums["pay_period"] | null;
  currency?: string;
  application_deadline?: string | null;
  communities?: { name: string } | null;
  entities: { name: string; logo_path: string | null };
};

export type EventCardProps = {
  title: string;
  slug: string;
  starts_at: string;
  venue: string | null;
  is_online: boolean;
  status: Enums["event_status"];
  going_count?: number;
  entities: { name: string };
};

export type ServiceCardProps = {
  name: string;
  slug: string;
  description: string | null;
  price_from: number | null;
  currency: string;
  price_note: string | null;
  entities: { name: string };
};
import { formatDate, formatDateTime, formatMoney, humanize } from "@/lib/format";

const cardClass =
  "group pressable relative flex gap-3 rounded-2xl border bg-card p-4 shadow-xs transition-shadow focus-within:ring-[3px] focus-within:ring-ring/40 hover:shadow-md";
const stretched = "after:absolute after:inset-0 focus-visible:outline-none";

export function salaryText(job: Pick<JobCardProps, "salary_min" | "salary_max" | "salary_period" | "currency">) {
  if (job.salary_min == null && job.salary_max == null) return null;
  const range =
    job.salary_min != null && job.salary_max != null
      ? `${formatMoney(job.salary_min, job.currency)} – ${formatMoney(job.salary_max, job.currency)}`
      : formatMoney(job.salary_min ?? job.salary_max, job.currency);
  const short: Record<string, string> = { hour: "/hr", day: "/day", week: "/wk", month: "/mo", year: "/yr", fixed: " fixed" };
  return job.salary_period ? `${range}${short[job.salary_period] ?? ` / ${job.salary_period}`}` : range;
}

/** Job row from the approved design: logo, title, employer, type, green pay, Apply. */
export function JobCard({ job, action }: { job: JobCardProps; action?: React.ReactNode }) {
  const salary = salaryText(job);
  return (
    <article className={cardClass}>
      <EntityAvatar name={job.entities.name} path={job.entities.logo_path} className="size-12 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <h3 className="font-semibold">
          <Link href={`/jobs/${job.slug}`} className={stretched}>{job.title}</Link>
        </h3>
        <p className="truncate text-sm text-muted-foreground">{job.entities.name}</p>
        <p className="text-xs text-muted-foreground">
          {humanize(job.employment_type)}
          {job.communities?.name ? (
            <span className="inline-flex items-center gap-0.5"> · <MapPin aria-hidden className="size-3" /> {job.communities.name}</span>
          ) : null}
        </p>
        {salary ? <p className="pt-0.5 text-sm font-bold text-brand-green">{salary}</p> : null}
        {job.application_deadline ? (
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock aria-hidden className="size-3" /> Apply by {formatDate(job.application_deadline)}
          </p>
        ) : null}
      </div>
      <div className="relative z-10 flex shrink-0 flex-col items-end justify-between gap-2">
        {action}
        <Link
          href={`/jobs/${job.slug}#apply`}
          className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-95"
          aria-label={`Apply for ${job.title}`}
        >
          Apply
        </Link>
      </div>
    </article>
  );
}

/** Event row with a bold date tile. */
export function EventCard({ event, interested }: { event: EventCardProps; interested?: boolean }) {
  const start = new Date(event.starts_at);
  return (
    <article className={cardClass}>
      <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy to-primary text-white shadow-sm">
        <span className="text-[11px] font-semibold tracking-wide uppercase opacity-90">
          {start.toLocaleString("en-GH", { month: "short", timeZone: "Africa/Accra" })}
        </span>
        <span className="text-2xl leading-none font-extrabold">{start.toLocaleString("en-GH", { day: "numeric", timeZone: "Africa/Accra" })}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <h3 className="font-semibold">
          <Link href={`/events/${event.slug}`} className={stretched}>{event.title}</Link>
        </h3>
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays aria-hidden className="size-3" /> {formatDateTime(event.starts_at)}
        </p>
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin aria-hidden className="size-3 shrink-0" /> {event.is_online ? "Online" : event.venue}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
          <span className="text-muted-foreground">{event.entities.name}</span>
          {event.going_count ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground"><Users aria-hidden className="size-3" /> {event.going_count} going</span>
          ) : null}
          {interested ? <span className="font-semibold text-brand-green">Interested</span> : null}
          {event.status === "cancelled" ? <Badge variant="destructive">Cancelled</Badge> : null}
        </div>
      </div>
    </article>
  );
}

export function ServiceCard({ service }: { service: ServiceCardProps }) {
  return (
    <Link href={`/services/${service.slug}`} className={cardClass.replace("relative ", "")}>
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-green-soft text-brand-green-soft-foreground">
        <Wrench aria-hidden className="size-5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="font-semibold group-hover:text-primary">{service.name}</h3>
        <p className="text-sm text-muted-foreground">{service.entities.name}</p>
        {service.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{service.description}</p> : null}
        <p className="pt-1 text-xs font-medium">
          {service.price_from != null ? `From ${formatMoney(service.price_from, service.currency)}` : service.price_note ?? "Contact for pricing"}
        </p>
      </div>
    </Link>
  );
}
