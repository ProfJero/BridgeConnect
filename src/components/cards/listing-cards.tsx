import { Briefcase, CalendarDays, Clock, MapPin, Users, Wrench } from "lucide-react";
import Link from "next/link";

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
  "group flex gap-3 rounded-xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none";

export function salaryText(job: Pick<JobCardProps, "salary_min" | "salary_max" | "salary_period" | "currency">) {
  if (job.salary_min == null && job.salary_max == null) return null;
  const range =
    job.salary_min != null && job.salary_max != null
      ? `${formatMoney(job.salary_min, job.currency)} – ${formatMoney(job.salary_max, job.currency)}`
      : formatMoney(job.salary_min ?? job.salary_max, job.currency);
  return job.salary_period ? `${range} / ${job.salary_period}` : range;
}

export function JobCard({ job }: { job: JobCardProps }) {
  const salary = salaryText(job);
  return (
    <Link href={`/jobs/${job.slug}`} className={cardClass}>
      <EntityAvatar name={job.entities.name} path={job.entities.logo_path} className="size-11" />
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="font-semibold group-hover:text-primary">{job.title}</h3>
        <p className="text-sm text-muted-foreground">{job.entities.name}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
          <Badge variant="soft">
            <Briefcase aria-hidden /> {humanize(job.employment_type)}
          </Badge>
          {job.communities?.name ? (
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden className="size-3" /> {job.communities.name}
            </span>
          ) : null}
          {salary ? <span className="font-medium text-foreground">{salary}</span> : null}
          {job.application_deadline ? (
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden className="size-3" /> Apply by {formatDate(job.application_deadline)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function EventCard({ event }: { event: EventCardProps }) {
  const start = new Date(event.starts_at);
  return (
    <Link href={`/events/${event.slug}`} className={cardClass}>
      <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
        <span className="text-[11px] font-semibold uppercase">
          {start.toLocaleString("en-GH", { month: "short" })}
        </span>
        <span className="text-xl leading-none font-bold">{start.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="font-semibold group-hover:text-primary">{event.title}</h3>
        <p className="text-sm text-muted-foreground">{event.entities.name}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays aria-hidden className="size-3" /> {formatDateTime(event.starts_at)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden className="size-3" /> {event.is_online ? "Online" : event.venue}
          </span>
          {event.going_count ? (
            <span className="inline-flex items-center gap-1">
              <Users aria-hidden className="size-3" /> {event.going_count} going
            </span>
          ) : null}
          {event.status === "cancelled" ? <Badge variant="destructive">Cancelled</Badge> : null}
        </div>
      </div>
    </Link>
  );
}

export function ServiceCard({ service }: { service: ServiceCardProps }) {
  return (
    <Link href={`/services/${service.slug}`} className={cardClass}>
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
