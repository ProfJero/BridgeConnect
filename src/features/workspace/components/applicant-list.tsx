"use client";

import { FileText, Phone } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { formatRelative } from "@/lib/format";

import { getCvLinkAction, setApplicantStatusAction } from "../actions";

type Applicant = {
  id: string;
  status: string;
  cover_letter: string;
  contact_phone: string;
  cv_path: string | null;
  created_at: string;
  profiles: { display_name: string } | null;
};

const NEXT: Record<string, ("reviewing" | "shortlisted" | "rejected" | "hired")[]> = {
  submitted: ["reviewing", "shortlisted", "rejected"],
  reviewing: ["shortlisted", "rejected"],
  shortlisted: ["hired", "rejected"],
};

export function ApplicantList({ entityId, jobId, applicants }: { entityId: string; jobId: string; applicants: Applicant[] }) {
  const { pending, run } = useServerAction();
  async function openCv(path: string) {
    const result = await getCvLinkAction(entityId, path);
    if (result.ok && result.data) window.open(result.data.url, "_blank", "noopener,noreferrer");
    else toast.error(result.ok ? "Could not open CV." : result.error);
  }
  return (
    <ul className="space-y-3">
      {applicants.map((a) => (
        <li key={a.id} className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{a.profiles?.display_name ?? "Applicant"}</p>
              <p className="text-xs text-muted-foreground">Applied {formatRelative(a.created_at)}</p>
            </div>
            <StatusBadge status={a.status} />
          </div>
          <p className="text-sm whitespace-pre-line">{a.cover_letter}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><a href={`tel:${a.contact_phone.replace(/\s/g, "")}`}><Phone aria-hidden /> {a.contact_phone}</a></Button>
            {a.cv_path ? <Button variant="outline" size="sm" onClick={() => void openCv(a.cv_path!)}><FileText aria-hidden /> View CV</Button> : null}
            {(NEXT[a.status] ?? []).map((s) => (
              <Button key={s} size="sm" variant={s === "rejected" ? "outline" : "default"} disabled={pending} onClick={() => run(() => setApplicantStatusAction({ entityId, jobId, applicationId: a.id, status: s }))}>
                {s === "reviewing" ? "Start review" : s === "shortlisted" ? "Shortlist" : s === "hired" ? "Mark hired" : "Reject"}
              </Button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
