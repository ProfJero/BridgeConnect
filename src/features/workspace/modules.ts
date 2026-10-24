import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  Package,
  Settings,
  ShoppingBag,
  Siren,
  Store,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { EntityCapability, MembershipRole } from "@/lib/auth/permissions";

export type WorkspaceModule = {
  segment: string;
  label: string;
  icon: LucideIcon;
  /** Capability required (null = always available to members). */
  capability: EntityCapability | null;
  /** Minimum role when no capability applies. */
  minRole?: MembershipRole;
};

/** Every module a workspace MAY have. Visibility is computed per entity. */
export const WORKSPACE_MODULES: WorkspaceModule[] = [
  { segment: "", label: "Dashboard", icon: LayoutDashboard, capability: null },
  { segment: "profile", label: "Profile", icon: Store, capability: null, minRole: "manager" },
  { segment: "posts", label: "Posts", icon: MessagesSquare, capability: "posts" },
  { segment: "products", label: "Products", icon: ShoppingBag, capability: "products" },
  { segment: "orders", label: "Orders", icon: Package, capability: "orders" },
  { segment: "services", label: "Services", icon: Wrench, capability: "services" },
  { segment: "jobs", label: "Jobs", icon: Briefcase, capability: "jobs" },
  { segment: "events", label: "Events", icon: CalendarDays, capability: "events" },
  { segment: "media", label: "Media", icon: ImageIcon, capability: "media" },
  { segment: "ads", label: "Advertising", icon: Megaphone, capability: "advertising" },
  { segment: "alerts", label: "Emergency alerts", icon: Siren, capability: "emergency_alerts" },
  { segment: "members", label: "Members", icon: Users, capability: "members" },
  { segment: "analytics", label: "Analytics", icon: BarChart3, capability: "analytics" },
  { segment: "settings", label: "Settings", icon: Settings, capability: null },
];
