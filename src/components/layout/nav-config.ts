import {
  Briefcase,
  CalendarDays,
  Compass,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  Landmark,
  MessagesSquare,
  PlusCircle,
  ShoppingBag,
  Siren,
  Sprout,
  Store,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/community", label: "Community", icon: MessagesSquare },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/events", label: "Events", icon: CalendarDays },
];

export const MOBILE_TABS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/community/new", label: "Post", icon: PlusCircle },
  { href: "/community", label: "Community", icon: MessagesSquare },
  { href: "/profile", label: "Profile", icon: User },
];

export const DIRECTORY_NAV: (NavItem & { description: string })[] = [
  { href: "/businesses", label: "Businesses", icon: Store, description: "Verified local businesses" },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag, description: "Buy from local sellers" },
  { href: "/services", label: "Services", icon: Wrench, description: "Repairs, transport, care and more" },
  { href: "/jobs", label: "Jobs", icon: Briefcase, description: "Opportunities near you" },
  { href: "/education", label: "Education", icon: GraduationCap, description: "Schools and training" },
  { href: "/health", label: "Health", icon: HeartPulse, description: "Clinics and health services" },
  { href: "/agriculture", label: "Agriculture", icon: Sprout, description: "Farms, inputs and cooperatives" },
  { href: "/events", label: "Events", icon: CalendarDays, description: "What's happening" },
  { href: "/ngos", label: "NGOs", icon: HandHeart, description: "Community organisations" },
  { href: "/government", label: "Government", icon: Landmark, description: "Public offices and services" },
  { href: "/emergency", label: "Emergency", icon: Siren, description: "Alerts and emergency contacts" },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
