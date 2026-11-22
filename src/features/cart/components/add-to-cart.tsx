"use client";

import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { useCart, type CartItem } from "../store";

export function AddToCartButton({ item, className }: { item: Omit<CartItem, "quantity">; className?: string }) {
  const cart = useCart();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={className}
      onClick={() => {
        cart.add(item);
        if ("vibrate" in navigator) navigator.vibrate?.(15);
        toast.success(`${item.name} added to cart`, { action: { label: "View cart", onClick: () => router.push("/cart") } });
      }}
    >
      <ShoppingCart aria-hidden /> Add to cart
    </Button>
  );
}

/** Add to cart and go straight to checkout. */
export function BuyNowButton({ item, className }: { item: Omit<CartItem, "quantity">; className?: string }) {
  const cart = useCart();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="green"
      size="lg"
      className={className}
      onClick={() => {
        if (!cart.items.some((i) => i.productId === item.productId)) cart.add(item);
        router.push("/cart");
      }}
    >
      Buy now
    </Button>
  );
}
