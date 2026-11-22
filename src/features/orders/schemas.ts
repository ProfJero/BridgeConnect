import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ]{7,20}$/, "Enter a valid phone number, e.g. +233 24 123 4567.");

export const placeOrderSchema = z
  .object({
    entityId: z.uuid(),
    productId: z.uuid(),
    // The client never sends a price: the database prices every item.
    quantity: z.coerce.number().int("Whole numbers only.").min(1, "At least 1.").max(1000, "At most 1,000."),
    fulfilment: z.enum(["pickup", "delivery"]),
    deliveryAddress: z.string().trim().max(300).optional(),
    contactPhone: phoneSchema,
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.fulfilment === "pickup" || (v.deliveryAddress?.length ?? 0) >= 5, {
    message: "Enter a delivery address.",
    path: ["deliveryAddress"],
  });

/** Cart checkout: one order per seller, several products. Prices never come from the client. */
export const checkoutSchema = z
  .object({
    entityId: z.uuid(),
    items: z
      .array(z.object({ productId: z.uuid(), quantity: z.coerce.number().int().min(1).max(1000) }))
      .min(1, "Your cart is empty.")
      .max(30, "At most 30 different items per order."),
    fulfilment: z.enum(["pickup", "delivery"]),
    deliveryAddress: z.string().trim().max(300).optional(),
    contactPhone: phoneSchema,
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.fulfilment === "pickup" || (v.deliveryAddress?.length ?? 0) >= 5, {
    message: "Enter a delivery address.",
    path: ["deliveryAddress"],
  })
  .refine((v) => new Set(v.items.map((i) => i.productId)).size === v.items.length, {
    message: "Duplicate items.",
    path: ["items"],
  });

export const ORDER_STATUSES = ["pending", "confirmed", "ready", "completed", "cancelled", "declined"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Seller-side transitions (mirrors public.update_order_status). */
export const SELLER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "declined"],
  confirmed: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  declined: [],
};

export const BUYER_CANCELLABLE: OrderStatus[] = ["pending", "confirmed"];

export const updateOrderStatusSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
});
