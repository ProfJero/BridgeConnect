"use client";

import { Bike, History, LayoutDashboard, UserCog } from "lucide-react";
import { usePathname } from "next/navigation";

import { DashboardGroupLabel, DashboardLink } from "@/components/dashboard/dashboard-frame";

export function RiderNav({ approved }: { approved: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/rider", label: approved ? "Overview & jobs" : "My application", icon: LayoutDashboard },
    ...(approved ? [{ href: "/rider/trips", label: "Trips & earnings", icon: History }] : []),
    { href: "/rider/profile", label: "My rider profile", icon: UserCog },
    { href: "/rides", label: "Book a ride myself", icon: Bike },
  ];
  return (
    <nav aria-label="Rider" className="space-y-1">
      <DashboardGroupLabel>Rider</DashboardGroupLabel>
      <ul className="space-y-0.5">
        {items.map((i) => (
          <li key={i.href}><DashboardLink href={i.href} label={i.label} icon={i.icon} active={pathname === i.href} /></li>
        ))}
      </ul>
    </nav>
  );
}
