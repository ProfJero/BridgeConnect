import {
  Apple,
  BookOpen,
  Gem,
  Hammer,
  Home,
  type LucideIcon,
  MoreHorizontal,
  Palette,
  Shirt,
  Smartphone,
  Sprout,
  Wheat,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, Section } from "@/components/shared/page-header";
import { getCategories } from "@/features/marketplace/queries";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Marketplace categories",
  description: "Browse local products by category: food, farm produce, clothing, electronics, crafts and more.",
  path: "/marketplace/categories",
});

const ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  "food-groceries": { icon: Apple, tone: "bg-destructive-soft text-destructive-soft-foreground" },
  "farm-produce": { icon: Wheat, tone: "bg-brand-green-soft text-brand-green-soft-foreground" },
  "farm-inputs": { icon: Sprout, tone: "bg-brand-green-soft text-brand-green-soft-foreground" },
  "clothing-fabrics": { icon: Shirt, tone: "bg-warning-soft text-warning-soft-foreground" },
  electronics: { icon: Smartphone, tone: "bg-primary-soft text-primary-soft-foreground" },
  "home-household": { icon: Home, tone: "bg-primary-soft text-primary-soft-foreground" },
  "health-beauty": { icon: Gem, tone: "bg-destructive-soft text-destructive-soft-foreground" },
  crafts: { icon: Palette, tone: "bg-warning-soft text-warning-soft-foreground" },
  "books-stationery": { icon: BookOpen, tone: "bg-primary-soft text-primary-soft-foreground" },
};

const POPULAR = ["Rice", "Cassava", "Phones", "Gas cylinder", "Shoes", "Palm oil", "Kente", "Fertiliser"];

export default async function CategoriesPage() {
  const categories = await getCategories("product");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Categories" description="What are you shopping for today?" />
      <ul className="stagger grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-5">
        {categories.map((c) => {
          const meta = ICONS[c.slug] ?? { icon: c.slug === "other" ? MoreHorizontal : Hammer, tone: "bg-muted text-foreground" };
          const Icon = meta.icon;
          return (
            <li key={c.slug}>
              <Link href={`/marketplace?category=${c.slug}`} className="group flex flex-col items-center gap-1.5 text-center">
                <span className={`flex size-16 items-center justify-center rounded-2xl ${meta.tone} shadow-xs transition-transform group-active:scale-90`}>
                  <Icon aria-hidden className="size-7" />
                </span>
                <span className="text-xs leading-tight font-medium">{c.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Section title="Popular searches">
        <ul className="flex flex-wrap gap-2">
          {POPULAR.map((term) => (
            <li key={term}>
              <Link href={`/marketplace?q=${encodeURIComponent(term)}`} className="inline-block rounded-full border bg-card px-4 py-1.5 text-sm transition hover:border-primary hover:text-link active:scale-95">
                {term}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
