import Link from "next/link";

import { Logo } from "@/components/brand/logo";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Discover",
    links: [
      { href: "/explore", label: "Explore" },
      { href: "/marketplace", label: "Marketplace" },
      { href: "/services", label: "Services" },
      { href: "/jobs", label: "Jobs" },
      { href: "/events", label: "Events" },
    ],
  },
  {
    title: "Directory",
    links: [
      { href: "/businesses", label: "Businesses" },
      { href: "/health", label: "Health" },
      { href: "/education", label: "Education" },
      { href: "/government", label: "Government" },
      { href: "/agriculture", label: "Agriculture" },
      { href: "/ngos", label: "NGOs" },
    ],
  },
  {
    title: "Get involved",
    links: [
      { href: "/community", label: "Community feed" },
      { href: "/emergency", label: "Emergency" },
      { href: "/apply", label: "Register your organisation" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-card pb-24 lg:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo showTagline />
          <p className="text-sm text-muted-foreground">
            Emergency? Call <a className="font-semibold text-foreground underline" href="tel:112">112</a>.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="space-y-2">
            <h2 className="text-sm font-semibold">{col.title}</h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-muted-foreground sm:grid-cols-1">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Digital Bridge Initiative · Connecting Communities. Empowering Lives.
        </p>
      </div>
    </footer>
  );
}
