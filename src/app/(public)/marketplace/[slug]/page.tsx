import { MapPin, MessageCircle, Phone, Store } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EntityAvatar } from "@/components/shared/avatars";
import { JsonLd } from "@/components/shared/json-ld";
import { SafetyTips } from "@/components/shared/safety-tips";
import { StatusBadge } from "@/components/shared/status-badge";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { FavouriteButton } from "@/components/widgets/favourite-button";
import { ReportDialog } from "@/components/widgets/report-dialog";
import { ShareButton } from "@/components/widgets/share-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isFavourite } from "@/features/favourites/queries";
import { OrderForm } from "@/features/marketplace/components/order-form";
import { getProductBySlug } from "@/features/marketplace/queries";
import { getViewer } from "@/lib/auth/session";
import { telLink, whatsappLink } from "@/lib/contact";
import { formatMoney } from "@/lib/format";
import { orderedMedia } from "@/lib/media";
import { absoluteUrl, excerpt, pageMetadata } from "@/lib/seo";
import { publicMediaUrl } from "@/lib/storage";
import { breadcrumbSchema, productSchema } from "@/lib/structured-data";

export async function generateMetadata({ params }: PageProps<"/marketplace/[slug]">): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Product not found" };
  const cover = orderedMedia(product.product_media)[0];
  const price = formatMoney(product.price, product.currency);
  return pageMetadata({
    title: `${product.name} — ${price}`,
    description: excerpt(
      `${price}${product.unit ? ` ${product.unit}` : ""} from ${product.entities.name}${product.entities.communities ? `, ${product.entities.communities.name}` : ""}. ${product.description ?? ""}`,
    ),
    path: `/marketplace/${product.slug}`,
    image: cover ? publicMediaUrl(cover.path) : null,
  });
}

export default async function ProductPage({ params }: PageProps<"/marketplace/[slug]">) {
  const { slug } = await params;
  const [product, viewer] = await Promise.all([getProductBySlug(slug), getViewer()]);
  if (!product) notFound();
  const saved = await isFavourite("product", product.id, viewer?.id);
  const media = orderedMedia(product.product_media);
  const seller = product.entities;
  const isOwnEntity = viewer?.workspaces.some((w) => w.entityId === seller.id) ?? false;
  const orderable = product.status === "active";
  const enquiry = `Hello ${seller.name}, I saw "${product.name}" on BridgeConnect and I'm interested: ${absoluteUrl(`/marketplace/${product.slug}`)}`;
  const whatsapp = whatsappLink(seller.whatsapp ?? seller.phone, enquiry);
  const call = telLink(seller.phone);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <JsonLd
        data={productSchema({
          ...product,
          images: media.map((m) => publicMediaUrl(m.path)!),
          category: product.listing_categories?.name,
          seller,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Marketplace", path: "/marketplace" },
          { name: product.name, path: `/marketplace/${product.slug}` },
        ])}
      />
      <div className="space-y-5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-muted">
          {media[0] ? (
            <Image src={publicMediaUrl(media[0].path)!} alt={media[0].alt || product.name} fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">No photo</div>
          )}
        </div>
        {media.length > 1 ? (
          <ul className="grid grid-cols-4 gap-2">
            {media.slice(1).map((m) => (
              <li key={m.path} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                <Image src={publicMediaUrl(m.path, 480)!} alt={m.alt} fill sizes="25vw" className="object-cover" />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {product.listing_categories ? <Badge variant="soft">{product.listing_categories.name}</Badge> : null}
            {product.status !== "active" ? <StatusBadge status={product.status} /> : null}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
          <p className="text-2xl font-bold text-primary">
            {formatMoney(product.price, product.currency)}
            {product.unit ? <span className="text-base font-normal text-muted-foreground"> {product.unit}</span> : null}
          </p>
          {product.description ? <p className="leading-relaxed whitespace-pre-line text-muted-foreground">{product.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <FavouriteButton kind="product" id={product.id} initial={saved} signedIn={Boolean(viewer)} />
          <ShareButton path={`/marketplace/${product.slug}`} title={product.name} text={formatMoney(product.price, product.currency)} />
          {!isOwnEntity ? <ReportDialog targetKind="product" targetId={product.id} signedIn={Boolean(viewer)} variant="outline" /> : null}
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sold by</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/directory/${seller.slug}`} className="flex items-center gap-3 hover:underline">
              <EntityAvatar name={seller.name} path={seller.logo_path} className="size-11" />
              <div>
                <p className="flex items-center gap-1 font-semibold">
                  {seller.name} <VerifiedBadge compact />
                </p>
                {seller.communities ? (
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin aria-hidden className="size-3" /> {seller.communities.name}
                  </p>
                ) : null}
              </div>
            </Link>
            {!isOwnEntity && (whatsapp || call) ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {whatsapp ? (
                  <Button asChild variant="green">
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                      <MessageCircle aria-hidden /> WhatsApp
                    </a>
                  </Button>
                ) : null}
                {call ? (
                  <Button asChild variant="outline">
                    <a href={call}>
                      <Phone aria-hidden /> Call
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order</CardTitle>
          </CardHeader>
          <CardContent>
            {!orderable ? (
              <Alert variant="warning"><AlertDescription>This product is currently unavailable.</AlertDescription></Alert>
            ) : isOwnEntity ? (
              <Alert variant="info">
                <AlertDescription>
                  This is your listing.{" "}
                  <Link className="font-semibold underline" href={`/workspace/${seller.id}/products`}>Manage products</Link>
                </AlertDescription>
              </Alert>
            ) : !viewer ? (
              <Button asChild className="w-full">
                <Link href={`/sign-in?next=/marketplace/${product.slug}`}>
                  <Store aria-hidden /> Sign in to order
                </Link>
              </Button>
            ) : !viewer.isActive ? (
              <Alert variant="destructive"><AlertDescription>Your account is suspended.</AlertDescription></Alert>
            ) : (
              <OrderForm
                entityId={seller.id}
                productId={product.id}
                price={Number(product.price)}
                currency={product.currency}
                maxQuantity={product.stock_quantity}
                deliveryAvailable={seller.business_profiles?.delivery_available ?? false}
              />
            )}
          </CardContent>
        </Card>
        {!isOwnEntity ? <SafetyTips kind="product" /> : null}
      </div>
    </div>
  );
}
