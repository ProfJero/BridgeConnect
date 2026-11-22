"use client";

import { Minus, Plus, ShoppingCart, Store, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { checkoutAction } from "@/features/orders/actions";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useCart, type CartItem } from "../store";

function SellerCheckout({ entityId, entityName, items, signedIn }: { entityId: string; entityName: string; items: CartItem[]; signedIn: boolean }) {
  const cart = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fulfilment, setFulfilment] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const currency = items[0]?.currency ?? "GHS";
  const id = entityId.slice(0, 8);

  function checkout() {
    if (!signedIn) {
      router.push("/sign-in?next=/cart");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await checkoutAction({
        entityId,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        fulfilment,
        deliveryAddress: fulfilment === "delivery" ? address : undefined,
        contactPhone: phone,
        note: note || undefined,
      });
      if (!result.ok) {
        setError(result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] ?? result.error : result.error);
        return;
      }
      cart.removeSeller(entityId);
      toast.success(result.message ?? "Order placed.");
      router.push(result.data ? `/orders/${result.data.orderId}` : "/orders");
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-xs" aria-labelledby={`seller-${id}`}>
      <h2 id={`seller-${id}`} className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3 text-sm font-semibold">
        <Store aria-hidden className="size-4 text-link" /> {entityName}
      </h2>
      <ul className="divide-y">
        {items.map((i) => (
          <li key={i.productId} className="flex items-center gap-3 p-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
              {i.image ? <Image src={i.image} alt="" fill sizes="64px" className="object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/marketplace/${i.slug}`} className="line-clamp-1 text-sm font-semibold hover:underline">{i.name}</Link>
              <p className="text-sm font-bold text-price">{formatMoney(i.price, i.currency)}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full border p-0.5">
              <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" aria-label={`Decrease ${i.name}`} onClick={() => cart.setQuantity(i.productId, i.quantity - 1)}>
                {i.quantity === 1 ? <Trash2 aria-hidden /> : <Minus aria-hidden />}
              </Button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">{i.quantity}</span>
              <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" aria-label={`Increase ${i.name}`} onClick={() => cart.setQuantity(i.productId, i.quantity + 1)}>
                <Plus aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="space-y-3 border-t p-4">
        <div role="radiogroup" aria-label="Fulfilment" className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          {(["pickup", "delivery"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={fulfilment === f}
              onClick={() => setFulfilment(f)}
              className={cn("rounded-lg py-2 text-sm font-medium text-muted-foreground transition", fulfilment === f && "bg-card text-foreground shadow-xs")}
            >
              {f === "pickup" ? "Pick up" : "Delivery"}
            </button>
          ))}
        </div>
        {fulfilment === "delivery" ? (
          <div className="grid gap-1.5">
            <Label htmlFor={`addr-${id}`}>Delivery address</Label>
            <Input id={`addr-${id}`} value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} placeholder="House, landmark, community" />
            <p className="text-xs text-muted-foreground">After the seller confirms, you can book a dispatch rider from the order page.</p>
          </div>
        ) : null}
        <div className="grid gap-1.5">
          <Label htmlFor={`phone-${id}`}>Phone number</Label>
          <Input id={`phone-${id}`} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 24 123 4567" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`note-${id}`}>Note for the seller <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea id={`note-${id}`} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error ? <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">{error}</p> : null}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Estimated total</p>
            <p className="text-lg font-extrabold">{formatMoney(subtotal, currency)}</p>
          </div>
          <Button type="button" size="lg" variant="green" className="rounded-full px-6" disabled={pending} onClick={checkout}>
            {pending ? "Placing order…" : "Place order"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">The seller confirms the final price and availability. Pay on pickup or delivery.</p>
      </div>
    </section>
  );
}

export function CartView({ signedIn }: { signedIn: boolean }) {
  const { items } = useCart();
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Your cart is empty"
        description="Add products from local sellers and order them together."
        action={<Button asChild><Link href="/marketplace">Browse the marketplace</Link></Button>}
      />
    );
  }
  const sellers = [...new Map(items.map((i) => [i.entityId, i.entityName])).entries()];
  return (
    <div className="space-y-4">
      {sellers.length > 1 ? (
        <p className="text-sm text-muted-foreground">Your cart has items from {sellers.length} sellers — each seller gets a separate order.</p>
      ) : null}
      {sellers.map(([entityId, entityName]) => (
        <SellerCheckout key={entityId} entityId={entityId} entityName={entityName} items={items.filter((i) => i.entityId === entityId)} signedIn={signedIn} />
      ))}
    </div>
  );
}
