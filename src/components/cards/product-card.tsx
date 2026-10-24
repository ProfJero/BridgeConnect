import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney } from "@/lib/format";
import { orderedMedia } from "@/lib/media";
import { publicMediaUrl } from "@/lib/storage";

export type ProductCardProps = {
  name: string;
  slug: string;
  price: number;
  currency: string;
  unit: string | null;
  status: string;
  entities?: { name: string } | null;
  product_media: { position: number; media_assets: { storage_path: string; alt_text: string | null } | null }[] | null;
};

export function ProductCard({ product }: { product: ProductCardProps }) {
  const image = orderedMedia(product.product_media)[0];
  return (
    <Link
      href={`/marketplace/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {image ? (
          <Image src={publicMediaUrl(image.path)!} alt={image.alt || product.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ShoppingBag aria-hidden className="size-8" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold group-hover:text-primary">{product.name}</h3>
        <p className="text-base font-bold text-primary">
          {formatMoney(product.price, product.currency)}
          {product.unit ? <span className="text-xs font-normal text-muted-foreground"> {product.unit}</span> : null}
        </p>
        {product.entities ? <p className="truncate text-xs text-muted-foreground">{product.entities.name}</p> : null}
        {product.status === "out_of_stock" ? <StatusBadge status="out_of_stock" /> : null}
      </div>
    </Link>
  );
}
