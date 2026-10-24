import {
  BarChart3,
  Bell,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  FileClock,
  Flag,
  HandHeart,
  KeyRound,
  LayoutDashboard,
  MapPinned,
  Megaphone,
  Package,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Siren,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/lib/auth/permissions";

export type AdminNavItem = { href: string; label: string; icon: LucideIcon; permission: Permission };
export type AdminNavGroup = { label: string; items: AdminNavItem[] };

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "admin.access" },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, permission: "analytics.read" },
    ],
  },
  {
    label: "People & access",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, permission: "users.read" },
      { href: "/admin/roles", label: "Roles & permissions", icon: KeyRound, permission: "roles.read" },
    ],
  },
  {
    label: "Trust & verification",
    items: [
      { href: "/admin/verification", label: "Verification queue", icon: BadgeCheck, permission: "entities.verify" },
      { href: "/admin/businesses", label: "Businesses", icon: Building2, permission: "entities.read_all" },
      { href: "/admin/organisations", label: "Organisations", icon: HandHeart, permission: "entities.read_all" },
      { href: "/admin/reports", label: "Reports", icon: Flag, permission: "reports.read" },
      { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert, permission: "content.moderate" },
    ],
  },
  {
    label: "Marketplace & listings",
    items: [
      { href: "/admin/marketplace", label: "Marketplace", icon: ShoppingBag, permission: "marketplace.manage" },
      { href: "/admin/orders", label: "Orders", icon: Package, permission: "orders.read_all" },
      { href: "/admin/jobs", label: "Jobs", icon: Briefcase, permission: "jobs.manage" },
      { href: "/admin/events", label: "Events", icon: CalendarDays, permission: "events.manage" },
      { href: "/admin/advertisements", label: "Advertisements", icon: Megaphone, permission: "ads.review" },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/admin/emergency", label: "Emergency", icon: Siren, permission: "emergency.publish" },
      { href: "/admin/notifications", label: "Notifications", icon: Bell, permission: "notifications.broadcast" },
      { href: "/admin/locations", label: "Locations", icon: MapPinned, permission: "locations.manage" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/audit-logs", label: "Audit logs", icon: FileClock, permission: "audit.read" },
      { href: "/admin/settings", label: "Platform settings", icon: Settings, permission: "settings.manage" },
    ],
  },
];
