import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  Eye,
  EyeOff,
  HelpCircle,
  PauseCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/format";

type Tone = "green" | "warning" | "destructive" | "soft" | "secondary";

/**
 * Every status shows an icon AND text so meaning never depends on colour.
 */
const STATUS: Record<string, { tone: Tone; icon: LucideIcon; label?: string }> = {
  active: { tone: "green", icon: CheckCircle2 },
  approved: { tone: "green", icon: CheckCircle2 },
  published: { tone: "green", icon: CheckCircle2 },
  open: { tone: "green", icon: CheckCircle2 },
  completed: { tone: "green", icon: CheckCircle2 },
  resolved: { tone: "green", icon: CheckCircle2 },
  hired: { tone: "green", icon: CheckCircle2 },
  confirmed: { tone: "green", icon: CheckCircle2 },
  ready: { tone: "green", icon: CheckCircle2, label: "Ready for collection" },
  verified: { tone: "green", icon: CheckCircle2 },
  shortlisted: { tone: "soft", icon: Eye },
  submitted: { tone: "soft", icon: Clock },
  pending: { tone: "warning", icon: Clock },
  pending_review: { tone: "warning", icon: Clock },
  under_review: { tone: "soft", icon: Eye },
  reviewing: { tone: "soft", icon: Eye },
  info_requested: { tone: "warning", icon: HelpCircle, label: "Information requested" },
  draft: { tone: "secondary", icon: CircleDashed },
  out_of_stock: { tone: "warning", icon: AlertTriangle },
  paused: { tone: "secondary", icon: PauseCircle },
  closed: { tone: "secondary", icon: XCircle },
  archived: { tone: "secondary", icon: XCircle },
  withdrawn: { tone: "secondary", icon: XCircle },
  dismissed: { tone: "secondary", icon: XCircle },
  cancelled: { tone: "secondary", icon: XCircle },
  hidden: { tone: "warning", icon: EyeOff },
  rejected: { tone: "destructive", icon: XCircle },
  declined: { tone: "destructive", icon: XCircle },
  removed: { tone: "destructive", icon: Ban },
  suspended: { tone: "destructive", icon: Ban },
  deactivated: { tone: "secondary", icon: Ban },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const config = STATUS[status] ?? { tone: "secondary" as Tone, icon: CircleDashed };
  const Icon = config.icon;
  return (
    <Badge variant={config.tone}>
      <Icon aria-hidden />
      {label ?? config.label ?? humanize(status)}
    </Badge>
  );
}

const SEVERITY: Record<string, { variant: Tone; label: string }> = {
  critical: { variant: "destructive", label: "Critical" },
  warning: { variant: "warning", label: "Warning" },
  advisory: { variant: "soft", label: "Advisory" },
  info: { variant: "secondary", label: "Information" },
};

export function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY[severity] ?? SEVERITY.info!;
  return (
    <Badge variant={s.variant}>
      <AlertTriangle aria-hidden />
      {s.label}
    </Badge>
  );
}
