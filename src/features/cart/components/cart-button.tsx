"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { useCart } from "../store";

export function CartButton() {
  const { count } = useCart();
  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href="/cart" aria-label={count ? `Cart, ${count} items` : "Cart"}>
        <ShoppingCart aria-hidden className="size-5" />
        {count ? (
          <span key={count} className="animate-pop absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-brand-green px-1 text-[10px] leading-4 font-bold text-brand-green-foreground">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
