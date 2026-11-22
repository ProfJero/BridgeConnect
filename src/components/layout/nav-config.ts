import {
  Bike,
  Briefcase,
  Building2,
  CalendarDays,
  Car,
  Compass,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  House,
  Landmark,
  MessagesSquare,
  Package,
  ShoppingBag,
  Siren,
  Sprout,
  Store,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Desktop side rail. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/community", label: "Community", icon: MessagesSquare },
  { href: "/rides", label: "Rides & delivery", icon: Bike },
  { href: "/rentals", label: "Rentals", icon: House },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/events", label: "Events", icon: CalendarDays },
];

/** Phone bottom tab bar — mirrors the approved app design. */
export const MOBILE_TABS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/community", label: "Community", icon: MessagesSquare },
  { href: "/profile", label: "Profile", icon: User },
];

export type QuickService = NavItem & { tone: string };

/** Home "Quick services" grid. Tones are semantic token pairs. */
export const QUICK_SERVICES: QuickService[] = [
  { href: "/businesses", label: "Businesses", icon: Store, tone: "bg-primary-soft text-primary-soft-foreground" },
  { href: "/jobs", label: "Jobs", icon: Briefcase, tone: "bg-primary-soft text-primary-soft-foreground" },
  { href: "/marketplace", label: "Buy & Sell", icon: ShoppingBag, tone: "bg-warning-soft text-warning-soft-foreground" },
  { href: "/rides", label: "Rides", icon: Car, tone: "bg-brand-green-soft text-brand-green-soft-foreground" },
  { href: "/rides?kind=delivery", label: "Delivery", icon: Package, tone: "bg-brand-green-soft text-brand-green-soft-foreground" },
  { href: "/rentals", label: "Rentals", icon: House, tone: "bg-warning-soft text-warning-soft-foreground" },
  { href: "/events", label: "Events", icon: CalendarDays, tone: "bg-primary-soft text-primary-soft-foreground" },
  { href: "/health", label: "Health", icon: HeartPulse, tone: "bg-destructive-soft text-destructive-soft-foreground" },
  { href: "/education", label: "Education", icon: GraduationCap, tone: "bg-primary-soft text-primary-soft-foreground" },
  { href: "/agriculture", label: "Agriculture", icon: Sprout, tone: "bg-brand-green-soft text-brand-green-soft-foreground" },
  { href: "/services", label: "Services", icon: Wrench, tone: "bg-warning-soft text-warning-soft-foreground" },
  { href: "/emergency", label: "Emergency", icon: Siren, tone: "bg-destructive-soft text-destructive-soft-foreground" },
];

export const DIRECTORY_NAV: (NavItem & { description: string })[] = [
  { href: "/businesses", label: "Businesses", icon: Store, description: "Verified local businesses" },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag, description: "Buy from local sellers" },
  { href: "/services", label: "Services", icon: Wrench, description: "Repairs, transport, care and more" },
  { href: "/rides", label: "Rides & delivery", icon: Bike, description: "Okada, tricycle, taxi and dispatch" },
  { href: "/rentals", label: "Rentals", icon: House, description: "Rooms, houses, shops and land" },
  { href: "/jobs", label: "Jobs", icon: Briefcase, description: "Opportunities near you" },
  { href: "/education", label: "Education", icon: GraduationCap, description: "Schools and training" },
  { href: "/health", label: "Health", icon: HeartPulse, description: "Clinics and health services" },
  { href: "/agriculture", label: "Agriculture", icon: Sprout, description: "Farms, inputs and cooperatives" },
  { href: "/events", label: "Events", icon: CalendarDays, description: "What's happening" },
  { href: "/ngos", label: "NGOs", icon: HandHeart, description: "Community organisations" },
  { href: "/government", label: "Government", icon: Landmark, description: "Public offices and services" },
  { href: "/emergency", label: "Emergency", icon: Siren, description: "Alerts and emergency contacts" },
];

export const ORG_ICON = Building2;

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
