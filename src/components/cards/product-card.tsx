import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { FavouriteButton } from "@/components/widgets/favourite-button";
import { formatMoney } from "@/lib/format";
import { orderedMedia } from "@/lib/media";
import { publicMediaUrl } from "@/lib/storage";

export type ProductCardProps = {
  id?: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  unit: string | null;
  status: string;
  entities?: { name: string } | null;
  product_media: { position: number; media_assets: { storage_path: string; alt_text: string | null } | null }[] | null;
};

/** Marketplace tile: square photo, heart, name, green price, seller. */
export function ProductCard({
  product,
  saved,
  signedIn,
}: {
  product: ProductCardProps;
  /** Pass to show the heart. */
  saved?: boolean;
  signedIn?: boolean;
}) {
  const image = orderedMedia(product.product_media)[0];
  return (
    <article className="group pressable relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-tint shadow-xs transition-shadow focus-within:ring-[3px] focus-within:ring-ring/40 hover:shadow-md">
      <div className="relative aspect-square bg-muted">
        {image ? (
          <Image
            src={publicMediaUrl(image.path, 640)!}
            alt={image.alt || product.name}
            fill
            sizes="(min-width: 1024px) 22vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary-soft to-brand-green-soft text-primary-soft-foreground">
            <ShoppingBag aria-hidden className="size-9" />
          </div>
        )}
        {saved !== undefined && product.id ? (
          <div className="absolute top-2 right-2">
            <FavouriteButton kind="product" id={product.id} initial={saved} signedIn={Boolean(signedIn)} floating label={product.name} />
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold">
          <Link href={`/marketplace/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <p className="text-[15px] font-bold text-price">
          {formatMoney(product.price, product.currency)}
          {product.unit ? <span className="text-xs font-normal text-muted-foreground"> {product.unit}</span> : null}
        </p>
        {product.entities ? <p className="truncate text-xs text-muted-foreground">{product.entities.name}</p> : null}
        {product.status === "out_of_stock" ? <StatusBadge status="out_of_stock" /> : null}
      </div>
    </article>
  );
}
