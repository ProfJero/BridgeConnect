"use client";

import { useSyncExternalStore } from "react";

/**
 * Per-device shopping cart. Prices here are for display only: checkout sends
 * product ids and quantities, and the database prices every line itself.
 */
export type CartItem = {
  productId: string;
  entityId: string;
  entityName: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  image: string | null;
  quantity: number;
};

const KEY = "bc-cart-v1";
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    cache = Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.productId === "string" && i.quantity > 0) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: CartItem[]) {
  cache = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Private mode / storage full: the cart still works for this page view.
  }
  listeners.forEach((l) => l());
}

const EMPTY: CartItem[] = [];

export function useCart() {
  const items = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) {
          cache = null;
          cb();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    read,
    () => EMPTY,
  );
  return {
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    add(item: Omit<CartItem, "quantity">, quantity = 1) {
      const current = read();
      const existing = current.find((i) => i.productId === item.productId);
      write(
        existing
          ? current.map((i) => (i.productId === item.productId ? { ...i, quantity: Math.min(i.quantity + quantity, 1000) } : i))
          : [...current, { ...item, quantity }],
      );
    },
    setQuantity(productId: string, quantity: number) {
      write(
        quantity <= 0
          ? read().filter((i) => i.productId !== productId)
          : read().map((i) => (i.productId === productId ? { ...i, quantity: Math.min(quantity, 1000) } : i)),
      );
    },
    removeSeller(entityId: string) {
      write(read().filter((i) => i.entityId !== entityId));
    },
  };
}
