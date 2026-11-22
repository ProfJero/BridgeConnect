import { ArrowLeftRight, Home } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { DashboardFrame } from "@/components/dashboard/dashboard-frame";
import { Button } from "@/components/ui/button";
import { RiderNav } from "@/features/mobility/components/rider-nav";
import { getMyRiderProfile } from "@/features/mobility/queries";
import { requireActiveViewer } from "@/lib/auth/session";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: { default: "Rider dashboard", template: "%s · Rider" }, robots: noIndex };

const COOKIE = "bc-rider-rail";

export default async function RiderLayout({ children }: LayoutProps<"/rider">) {
  const viewer = await requireActiveViewer("/rider");
  const profile = await getMyRiderProfile(viewer.id);
  const collapsed = (await cookies()).get(COOKIE)?.value === "collapsed";
  return (
    <DashboardFrame
      cookieName={COOKIE}
      initialCollapsed={collapsed}
      title="Rider dashboard"
      brand={
        <Link href="/rider" className="flex items-center gap-3">
          <span className="shrink-0 rounded-xl bg-white p-1 shadow-sm"><LogoMark className="size-8" /></span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-base font-extrabold">Rider</span>
            <span className="block truncate text-xs text-nav-muted">
              {profile ? (profile.status === "approved" ? (profile.is_online ? "● Online" : "○ Offline") : "Awaiting verification") : "Not registered yet"}
            </span>
          </span>
        </Link>
      }
      nav={<RiderNav approved={profile?.status === "approved"} />}
      footer={
        <Link href="/dashboards" className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-sm font-medium hover:bg-white/20">
          <ArrowLeftRight aria-hidden className="size-4" /> All my dashboards
        </Link>
      }
      topRight={<Button asChild variant="ghost" size="icon" aria-label="BridgeConnect home"><Link href="/"><Home aria-hidden className="size-5" /></Link></Button>}
    >
      {children}
    </DashboardFrame>
  );
}
